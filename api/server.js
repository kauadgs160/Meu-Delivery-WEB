
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

async function geocodificarEndereco(endereco) {

    // Primeira tentativa: endereço completo
    let consultas = [
        endereco
    ];

    // Segunda tentativa:
    // remove o número da casa e tenta apenas a rua + cidade
    const enderecoSimplificado = endereco.replace(
        /,\s*\d+\s*,/,
        ','
    );

    if (enderecoSimplificado !== endereco) {
        consultas.push(enderecoSimplificado);
    }

    for (const consulta of consultas) {

        const url =
            'https://nominatim.openstreetmap.org/search?' +
            new URLSearchParams({
                q: consulta,
                format: 'json',
                limit: '1',
                countrycodes: 'br'
            });

        const resposta = await fetch(url, {
            headers: {
                'User-Agent': 'MeuDeliveryWeb/1.0'
            }
        });

        if (!resposta.ok) {
            continue;
        }

        const resultados = await resposta.json();

        console.log('Busca de endereço:', consulta);
        console.log('Resultado:', resultados);

        if (resultados.length > 0) {

            return {
                latitude: Number(resultados[0].lat),
                longitude: Number(resultados[0].lon)
            };
        }
    }

    return null;
}






function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Number((R * c).toFixed(2));
}



function verificarLojaAberta(loja, horarios) {

    // O interruptor da loja precisa estar ligado
    if (!loja.aberta) {
        return false;
    }

    // Horário atual de São Paulo/Brasília
    const agora = new Date();

    const partesData = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(agora);

    const diaAtual = partesData
        .find(parte => parte.type === 'weekday')
        .value
        .toLowerCase();

    const horaAtual = partesData
        .find(parte => parte.type === 'hour')
        .value;

    const minutoAtual = partesData
        .find(parte => parte.type === 'minute')
        .value;

    const horaAtualMinutos =
        Number(horaAtual) * 60 +
        Number(minutoAtual);

    const mapaDias = {
        'segunda-feira': 'SEGUNDA',
        'terça-feira': 'TERCA',
        'quarta-feira': 'QUARTA',
        'quinta-feira': 'QUINTA',
        'sexta-feira': 'SEXTA',
        'sábado': 'SABADO',
        'domingo': 'DOMINGO'
    };

    const diaBanco = mapaDias[diaAtual];

    const horario = horarios.find(
        item => item.dia === diaBanco
    );

    // Não funciona nesse dia
    if (!horario || !horario.ativo) {
        return false;
    }

    // Sem horário definido
    if (!horario.abertura || !horario.fechamento) {
        return false;
    }

    const [horaAbertura, minutoAbertura] =
        horario.abertura
            .substring(0, 5)
            .split(':')
            .map(Number);

    const [horaFechamento, minutoFechamento] =
        horario.fechamento
            .substring(0, 5)
            .split(':')
            .map(Number);

    const aberturaMinutos =
        horaAbertura * 60 +
        minutoAbertura;

    const fechamentoMinutos =
        horaFechamento * 60 +
        minutoFechamento;

    return (
        horaAtualMinutos >= aberturaMinutos &&
        horaAtualMinutos <= fechamentoMinutos
    );
}




app.get('/', (req, res) => {
    res.send('API do Meu Delivery funcionando!');
});

app.get('/teste-banco', async (req, res) => {
    try {
        const resultado = await db.query('SELECT NOW()');

        res.json({
            mensagem: 'Conexão com PostgreSQL funcionando!',
            horario: resultado.rows[0].now
        });
    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao conectar com o PostgreSQL.',
            erro: erro.message
        });
    }
});

app.post('/usuarios', async (req, res) => {

    const { nome, email, telefone, senha, perfil } = req.body;

    // Verifica se todos os campos foram preenchidos
    if (!nome || !email || !telefone || !senha || !perfil) {
        return res.status(400).json({
            mensagem: 'Todos os campos são obrigatórios.'
        });
    }

    try {

        // Verifica se o e-mail já existe
        const usuarioExistente = await db.query(
            'SELECT id FROM usuario WHERE email = $1',
            [email]
        );

        if (usuarioExistente.rows.length > 0) {
            return res.status(409).json({
                mensagem: 'Este e-mail já está cadastrado.'
            });
        }

        // Cria o hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Insere o usuário no banco
        const resultado = await db.query(
            `INSERT INTO usuario
            (nome, email, telefone, senha, perfil)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, nome, email, telefone, perfil`,
            [nome, email, telefone, senhaHash, perfil]
        );

        res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            usuario: resultado.rows[0]
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao cadastrar usuário.'
        });
    }
});


app.post('/login', async (req, res) => {

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            mensagem: 'E-mail ou senha inválidos.'
        });
    }

    try {

        const resultado = await db.query(
            `SELECT id, nome, email, telefone, senha, perfil
             FROM usuario
             WHERE email = $1`,
            [email]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha inválidos.'
            });
        }

        const usuario = resultado.rows[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha inválidos.'
            });
        }

        res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                telefone: usuario.telefone,
                perfil: usuario.perfil
            }
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro interno do servidor.'
        });
    }
});



app.put('/lojas', async (req, res) => {

    const {
    usuario_id,
    nome,
    categoria,
    telefone,
    endereco,
    pagamentos,
    horarios,
    faixas,
    foto
} = req.body;

    if (
        !usuario_id ||
        !nome ||
        !categoria ||
        !telefone ||
        !endereco
    ) {
        return res.status(400).json({
            mensagem: 'Preencha todos os dados obrigatórios da loja.'
        });
    }

    try {

        const coordenadas = await geocodificarEndereco(endereco);

        if (!coordenadas) {
            return res.status(400).json({
                mensagem: 'Não foi possível localizar o endereço da loja.'
            });
        }

        // Verifica se o usuário existe e é uma loja
        const usuario = await db.query(
            `SELECT id
             FROM usuario
             WHERE id = $1
             AND perfil = 'LOJA'`,
            [usuario_id]
        );

        if (usuario.rows.length === 0) {
            return res.status(403).json({
                mensagem: 'Usuário não possui perfil de loja.'
            });
        }

        // Verifica se a loja já existe
        const lojaExistente = await db.query(
            `SELECT id
             FROM loja
             WHERE usuario_id = $1`,
            [usuario_id]
        );

        let lojaId;

        if (lojaExistente.rows.length === 0) {

            // Cria a loja
            const novaLoja = await db.query(
                `INSERT INTO loja
                (usuario_id, nome, categoria, telefone, endereco, latitude, longitude, foto)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id`,
                [
                    usuario_id,
                    nome,
                    categoria,
                    telefone,
                    endereco,
                    coordenadas.latitude,
                    coordenadas.longitude,
                    foto || null
                ]
            );

            lojaId = novaLoja.rows[0].id;

        } else {

            // Atualiza a loja existente
            const lojaAtualizada = await db.query(
                `UPDATE loja
                SET nome = $1,
                    categoria = $2,
                    telefone = $3,
                    endereco = $4,
                    foto = $5
                WHERE usuario_id = $6
                RETURNING id`,
                [
                    nome,
                    categoria,
                    telefone,
                    endereco,
                    foto || null,
                    usuario_id
                ]
            );

            lojaId = lojaAtualizada.rows[0].id;
        }


        // ==========================
        // FORMAS DE PAGAMENTO
        // ==========================

        await db.query(
            `DELETE FROM pagamento_loja
             WHERE loja_id = $1`,
            [lojaId]
        );

        if (Array.isArray(pagamentos)) {

            for (const pagamento of pagamentos) {

                await db.query(
                    `INSERT INTO pagamento_loja
                    (loja_id, tipo)
                    VALUES ($1, $2)`,
                    [lojaId, pagamento]
                );

            }
        }


        // ==========================
        // HORÁRIOS
        // ==========================

        if (Array.isArray(horarios)) {

            for (const horario of horarios) {

                await db.query(
                    `INSERT INTO horario_loja
                    (loja_id, dia, ativo, abertura, fechamento)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (loja_id, dia)
                    DO UPDATE SET
                        ativo = EXCLUDED.ativo,
                        abertura = EXCLUDED.abertura,
                        fechamento = EXCLUDED.fechamento`,
                    [
                        lojaId,
                        horario.dia,
                        horario.ativo,
                        horario.abertura || null,
                        horario.fechamento || null
                    ]
                );

            }
        }



        // ==========================
        // FAIXAS DE ENTREGA
        // ==========================

        await db.query(
            `DELETE FROM faixa_entrega
            WHERE loja_id = $1`,
            [lojaId]
        );

        if (Array.isArray(faixas)) {

            for (const faixa of faixas) {

                await db.query(
                    `INSERT INTO faixa_entrega
                    (loja_id, distancia_maxima, taxa)
                    VALUES ($1, $2, $3)`,
                    [
                        lojaId,
                        faixa.distancia_maxima,
                        faixa.taxa
                    ]
                );

            }
        }



        res.status(200).json({
            mensagem: 'Dados da loja salvos com sucesso!'
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao salvar os dados da loja.'
        });
    }
});




app.get('/lojas/:usuario_id', async (req, res) => {

    const { usuario_id } = req.params;

    try {

        const lojaResultado = await db.query(
            `SELECT id, nome, categoria, telefone, endereco, aberta, foto
             FROM loja
             WHERE usuario_id = $1`,
            [usuario_id]
        );

        if (lojaResultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Loja não encontrada.'
            });
        }

        const loja = lojaResultado.rows[0];

        const pagamentosResultado = await db.query(
            `SELECT tipo
             FROM pagamento_loja
             WHERE loja_id = $1`,
            [loja.id]
        );

        const horariosResultado = await db.query(
            `SELECT dia, ativo, abertura, fechamento
             FROM horario_loja
             WHERE loja_id = $1
             ORDER BY id`,
            [loja.id]
        );

        const faixasResultado = await db.query(
            `SELECT id, distancia_maxima, taxa
            FROM faixa_entrega
            WHERE loja_id = $1
            ORDER BY distancia_maxima`,
            [loja.id]
        );


        res.json({
            loja: loja,
            pagamentos: pagamentosResultado.rows.map(p => p.tipo),
            horarios: horariosResultado.rows,
            faixas: faixasResultado.rows
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao buscar os dados da loja.'
        });
    }
});







app.patch('/lojas/status', async (req, res) => {

    const { usuario_id, aberta } = req.body;

    if (!usuario_id || typeof aberta !== 'boolean') {
        return res.status(400).json({
            mensagem: 'Dados inválidos.'
        });
    }

    try {

        const resultado = await db.query(
            `UPDATE loja
             SET aberta = $1
             WHERE usuario_id = $2
             RETURNING aberta`,
            [aberta, usuario_id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Loja não encontrada.'
            });
        }

        res.json({
            mensagem: 'Status da loja atualizado.',
            aberta: resultado.rows[0].aberta
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao alterar o status da loja.'
        });
    }
});




app.post('/lojas/:loja_id/taxa-entrega', async (req, res) => {
    const { loja_id } = req.params;
    const { endereco } = req.body;

    if (!endereco) {
        return res.status(400).json({
            erro: 'Endereço é obrigatório.'
        });
    }

    try {
        // Busca a localização da loja
        const resultadoLoja = await db.query(
            `SELECT latitude, longitude
             FROM loja
             WHERE id = $1`,
            [loja_id]
        );

        if (resultadoLoja.rows.length === 0) {
            return res.status(404).json({
                erro: 'Loja não encontrada.'
            });
        }

        const loja = resultadoLoja.rows[0];

        if (loja.latitude === null || loja.longitude === null) {
            return res.status(400).json({
                erro: 'A loja ainda não possui localização cadastrada.'
            });
        }

        // Converte o endereço do cliente em coordenadas
        const coordenadasCliente = await geocodificarEndereco(endereco);

        if (!coordenadasCliente) {
            return res.status(400).json({
                erro: 'Não foi possível localizar o endereço informado.'
            });
        }

        // Calcula a distância entre a loja e o endereço
        const distanciaKm = calcularDistanciaKm(
            Number(loja.latitude),
            Number(loja.longitude),
            coordenadasCliente.latitude,
            coordenadasCliente.longitude
        );

        // Procura a primeira faixa que atende essa distância
        const resultadoFaixa = await db.query(
            `SELECT distancia_maxima, taxa
             FROM faixa_entrega
             WHERE loja_id = $1
               AND distancia_maxima >= $2
             ORDER BY distancia_maxima ASC
             LIMIT 1`,
            [loja_id, distanciaKm]
        );

        // Fora de todas as faixas
        if (resultadoFaixa.rows.length === 0) {
            return res.json({
                dentro_area: false,
                endereco,
                distancia_km: distanciaKm,
                taxa: null,
                mensagem: 'Endereço fora da área de entrega.'
            });
        }

        const faixa = resultadoFaixa.rows[0];

        return res.json({
            dentro_area: true,
            endereco,
            distancia_km: distanciaKm,
            taxa: Number(faixa.taxa),
            distancia_maxima: Number(faixa.distancia_maxima)
        });

    } catch (erro) {
        console.error('Erro ao consultar taxa de entrega:', erro);

        res.status(500).json({
            erro: 'Erro ao calcular taxa de entrega.'
        });
    }
});




// ==================================================
// CATEGORIAS - LISTAR
// ==================================================

app.get('/categorias/:usuario_id', async (req, res) => {

    const { usuario_id } = req.params;

    try {

        const resultado = await db.query(
            `SELECT c.id, c.nome
             FROM categoria c
             INNER JOIN loja l ON l.id = c.loja_id
             WHERE l.usuario_id = $1
             ORDER BY c.nome`,
            [usuario_id]
        );

        res.json(resultado.rows);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao buscar categorias.'
        });
    }
});


// ==================================================
// CATEGORIAS - CRIAR
// ==================================================

app.post('/categorias', async (req, res) => {

    const { usuario_id, nome } = req.body;

    if (!usuario_id || !nome) {
        return res.status(400).json({
            mensagem: 'Informe o usuário e o nome da categoria.'
        });
    }

    try {

        const loja = await db.query(
            `SELECT id
             FROM loja
             WHERE usuario_id = $1`,
            [usuario_id]
        );

        if (loja.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Loja não encontrada.'
            });
        }

        const lojaId = loja.rows[0].id;

        const resultado = await db.query(
            `INSERT INTO categoria
            (loja_id, nome)
            VALUES ($1, $2)
            RETURNING id, nome`,
            [lojaId, nome.trim()]
        );

        res.status(201).json({
            mensagem: 'Categoria criada com sucesso!',
            categoria: resultado.rows[0]
        });

    } catch (erro) {

        console.error(erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                mensagem: 'Essa categoria já existe.'
            });
        }

        res.status(500).json({
            mensagem: 'Erro ao criar categoria.'
        });
    }
});


// ==================================================
// CATEGORIAS - EDITAR
// ==================================================

app.put('/categorias/:id', async (req, res) => {

    const { id } = req.params;
    const { usuario_id, nome } = req.body;

    if (!usuario_id || !nome) {
        return res.status(400).json({
            mensagem: 'Informe o usuário e o nome da categoria.'
        });
    }

    try {

        const resultado = await db.query(
            `UPDATE categoria c
             SET nome = $1
             FROM loja l
             WHERE c.id = $2
             AND c.loja_id = l.id
             AND l.usuario_id = $3
             RETURNING c.id, c.nome`,
            [nome.trim(), id, usuario_id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Categoria não encontrada.'
            });
        }

        res.json({
            mensagem: 'Categoria atualizada com sucesso!',
            categoria: resultado.rows[0]
        });

    } catch (erro) {

        console.error(erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                mensagem: 'Essa categoria já existe.'
            });
        }

        res.status(500).json({
            mensagem: 'Erro ao atualizar categoria.'
        });
    }
});


// ==================================================
// CATEGORIAS - EXCLUIR
// ==================================================

app.delete('/categorias/:id', async (req, res) => {

    const { id } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) {
        return res.status(400).json({
            mensagem: 'Usuário não informado.'
        });
    }

    try {

        const produtos = await db.query(
            `SELECT p.id
             FROM produto p
             INNER JOIN categoria c ON c.id = p.categoria_id
             INNER JOIN loja l ON l.id = c.loja_id
             WHERE c.id = $1
             AND l.usuario_id = $2
             LIMIT 1`,
            [id, usuario_id]
        );

        if (produtos.rows.length > 0) {
            return res.status(409).json({
                mensagem: 'Não é possível excluir uma categoria que possui produtos.'
            });
        }

        const resultado = await db.query(
            `DELETE FROM categoria c
             USING loja l
             WHERE c.id = $1
             AND c.loja_id = l.id
             AND l.usuario_id = $2
             RETURNING c.id`,
            [id, usuario_id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Categoria não encontrada.'
            });
        }

        res.json({
            mensagem: 'Categoria excluída com sucesso!'
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao excluir categoria.'
        });
    }
});




// ==================================================
// PRODUTOS - LISTAR
// ==================================================

app.post('/produtos', async (req, res) => {

    const {
        usuario_id,
        categoria_id,
        nome,
        descricao,
        preco,
        foto,
        disponivel,
        grupos
    } = req.body;

    if (
        !usuario_id ||
        !categoria_id ||
        !nome ||
        !descricao ||
        preco === undefined
    ) {
        return res.status(400).json({
            mensagem: 'Preencha todos os dados do produto.'
        });
    }

    try {

        const categoria = await db.query(
            `SELECT c.id
             FROM categoria c
             INNER JOIN loja l ON l.id = c.loja_id
             WHERE c.id = $1
             AND l.usuario_id = $2`,
            [categoria_id, usuario_id]
        );

        if (categoria.rows.length === 0) {
            return res.status(403).json({
                mensagem: 'Categoria não pertence à loja.'
            });
        }

        // Cria o produto
        const produtoResultado = await db.query(
            `INSERT INTO produto
            (categoria_id, nome, descricao, preco, foto, disponivel)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [
                categoria_id,
                nome.trim(),
                descricao.trim(),
                Number(preco),
                foto || null,
                disponivel !== false
            ]
        );

        const produtoId = produtoResultado.rows[0].id;

        console.log('Produto criado:', produtoId);
        console.log('Grupos recebidos:', grupos);

        // Cria os grupos
        if (Array.isArray(grupos)) {

            for (const grupo of grupos) {

                if (!grupo.nome) {
                    continue;
                }

                const grupoResultado = await db.query(
                    `INSERT INTO grupo_complemento
                    (produto_id, nome, minimo, maximo)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id`,
                    [
                        produtoId,
                        grupo.nome.trim(),
                        Number(grupo.min) || 0,
                        Number(grupo.max) || 1
                    ]
                );

                const grupoId = grupoResultado.rows[0].id;

                console.log('Grupo criado:', grupoId);

                // Cria os complementos do grupo
                if (Array.isArray(grupo.opcoes)) {

                    for (const opcao of grupo.opcoes) {

                        if (!opcao.nome) {
                            continue;
                        }

                        await db.query(
                            `INSERT INTO complemento
                            (grupo_id, nome, preco)
                            VALUES ($1, $2, $3)`,
                            [
                                grupoId,
                                opcao.nome.trim(),
                                Number(opcao.preco) || 0
                            ]
                        );

                        console.log(
                            'Complemento criado:',
                            opcao.nome
                        );
                    }
                }
            }
        }

        res.status(201).json({
            mensagem: 'Produto cadastrado com sucesso!'
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao cadastrar produto.'
        });
    }
});


// ==================================================
// PRODUTOS - CRIAR
// ==================================================

app.post('/produtos', async (req, res) => {

    const {
        usuario_id,
        categoria_id,
        nome,
        descricao,
        preco,
        foto,
        disponivel,
        grupos
    } = req.body;

    if (
        !usuario_id ||
        !categoria_id ||
        !nome ||
        !descricao ||
        preco === undefined
    ) {
        return res.status(400).json({
            mensagem: 'Preencha todos os dados do produto.'
        });
    }

    try {

        const categoria = await db.query(
            `SELECT c.id
             FROM categoria c
             INNER JOIN loja l
                ON l.id = c.loja_id
             WHERE c.id = $1
             AND l.usuario_id = $2`,
            [categoria_id, usuario_id]
        );

        if (categoria.rows.length === 0) {
            return res.status(403).json({
                mensagem: 'Categoria não pertence à loja.'
            });
        }

        await db.query('BEGIN');

        const produtoResultado = await db.query(
            `INSERT INTO produto
            (
                categoria_id,
                nome,
                descricao,
                preco,
                foto,
                disponivel
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [
                categoria_id,
                nome.trim(),
                descricao.trim(),
                Number(preco),
                foto || null,
                disponivel !== false
            ]
        );

        const produtoId = produtoResultado.rows[0].id;

        if (Array.isArray(grupos)) {

            for (const grupo of grupos) {

                if (!grupo.nome) {
                    continue;
                }

                const grupoResultado = await db.query(
                    `INSERT INTO grupo_complemento
                    (produto_id, nome, minimo, maximo)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id`,
                    [
                        produtoId,
                        grupo.nome.trim(),
                        Number(grupo.min) || 0,
                        Number(grupo.max) || 1
                    ]
                );

                const grupoId = grupoResultado.rows[0].id;

                if (Array.isArray(grupo.opcoes)) {

                    for (const opcao of grupo.opcoes) {

                        if (!opcao.nome) {
                            continue;
                        }

                        await db.query(
                            `INSERT INTO complemento
                            (grupo_id, nome, preco)
                            VALUES ($1, $2, $3)`,
                            [
                                grupoId,
                                opcao.nome.trim(),
                                Number(opcao.preco) || 0
                            ]
                        );
                    }
                }
            }
        }

        await db.query('COMMIT');

        res.status(201).json({
            mensagem: 'Produto cadastrado com sucesso!'
        });

    } catch (erro) {

        await db.query('ROLLBACK');

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao cadastrar produto.'
        });
    }
});




// ==================================================
// PRODUTOS - EDITAR
// ==================================================

app.put('/produtos/:id', async (req, res) => {

    const { id } = req.params;

    const {
        usuario_id,
        categoria_id,
        nome,
        descricao,
        preco,
        foto,
        disponivel,
        grupos
    } = req.body;

    if (
        !usuario_id ||
        !categoria_id ||
        !nome ||
        !descricao ||
        preco === undefined
    ) {
        return res.status(400).json({
            mensagem: 'Preencha todos os dados do produto.'
        });
    }

    try {

        // Confirma que a categoria pertence à loja
        const categoria = await db.query(
            `SELECT c.id
             FROM categoria c
             INNER JOIN loja l
                ON l.id = c.loja_id
             WHERE c.id = $1
             AND l.usuario_id = $2`,
            [categoria_id, usuario_id]
        );

        if (categoria.rows.length === 0) {
            return res.status(403).json({
                mensagem: 'Categoria não pertence à loja.'
            });
        }


        // Atualiza o produto
        const produtoResultado = await db.query(
            `UPDATE produto p
             SET categoria_id = $1,
                 nome = $2,
                 descricao = $3,
                 preco = $4,
                 foto = $5,
                 disponivel = $6
             FROM categoria c
             INNER JOIN loja l
                ON l.id = c.loja_id
             WHERE p.id = $7
             AND p.categoria_id = c.id
             AND l.usuario_id = $8
             AND p.excluido = FALSE
             RETURNING p.id`,
            [
                categoria_id,
                nome.trim(),
                descricao.trim(),
                Number(preco),
                foto || null,
                disponivel !== false,
                id,
                usuario_id
            ]
        );

        if (produtoResultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }


        // Remove os grupos atuais
        await db.query(
            `DELETE FROM grupo_complemento
             WHERE produto_id = $1`,
            [id]
        );


        // Cria novamente os grupos atuais
        if (Array.isArray(grupos)) {

            for (const grupo of grupos) {

                if (!grupo.nome) {
                    continue;
                }

                const grupoResultado = await db.query(
                    `INSERT INTO grupo_complemento
                    (produto_id, nome, minimo, maximo)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id`,
                    [
                        id,
                        grupo.nome.trim(),
                        Number(grupo.min) || 0,
                        Number(grupo.max) || 1
                    ]
                );

                const grupoId = grupoResultado.rows[0].id;


                if (Array.isArray(grupo.opcoes)) {

                    for (const opcao of grupo.opcoes) {

                        if (!opcao.nome) {
                            continue;
                        }

                        await db.query(
                            `INSERT INTO complemento
                            (grupo_id, nome, preco)
                            VALUES ($1, $2, $3)`,
                            [
                                grupoId,
                                opcao.nome.trim(),
                                Number(opcao.preco) || 0
                            ]
                        );
                    }
                }
            }
        }


        res.json({
            mensagem: 'Produto atualizado com sucesso!'
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao atualizar produto.'
        });
    }
});






// ==================================================
// PRODUTOS - EXCLUIR LOGICAMENTE
// ==================================================

app.delete('/produtos/:id', async (req, res) => {

    const { id } = req.params;
    const { usuario_id } = req.body;

    try {

        const resultado = await db.query(
            `UPDATE produto p
             SET excluido = TRUE,
                 disponivel = FALSE
             FROM categoria c
             INNER JOIN loja l
                ON l.id = c.loja_id
             WHERE p.id = $1
             AND p.categoria_id = c.id
             AND l.usuario_id = $2
             AND p.excluido = FALSE
             RETURNING p.id`,
            [id, usuario_id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        res.json({
            mensagem: 'Produto removido com sucesso!'
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao excluir produto.'
        });
    }
});


// ==================================================
// PRODUTOS - DISPONIBILIDADE
// ==================================================

app.patch('/produtos/:id/disponibilidade', async (req, res) => {

    const { id } = req.params;
    const { usuario_id, disponivel } = req.body;

    try {

        const resultado = await db.query(
            `UPDATE produto p
             SET disponivel = $1
             FROM categoria c
             INNER JOIN loja l
                ON l.id = c.loja_id
             WHERE p.id = $2
             AND p.categoria_id = c.id
             AND l.usuario_id = $3
             AND p.excluido = FALSE
             RETURNING p.disponivel`,
            [disponivel, id, usuario_id]
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        res.json({
            mensagem: disponivel
                ? 'Produto disponibilizado no cardápio.'
                : 'Produto retirado do cardápio do aplicativo.',
            disponivel: resultado.rows[0].disponivel
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao alterar disponibilidade.'
        });
    }
});



app.get('/produtos/:usuario_id', async (req, res) => {

    const { usuario_id } = req.params;

    try {

        const resultado = await db.query(
            `SELECT
                p.id,
                p.categoria_id,
                p.nome,
                p.descricao,
                p.preco,
                p.foto,
                p.disponivel
             FROM produto p
             INNER JOIN categoria c
                ON c.id = p.categoria_id
             INNER JOIN loja l
                ON l.id = c.loja_id
             WHERE l.usuario_id = $1
             AND p.excluido = FALSE
             ORDER BY p.id`,
            [usuario_id]
        );

        const produtos = [];

        for (const produto of resultado.rows) {

            const gruposResultado = await db.query(
                `SELECT id, nome, minimo, maximo
                 FROM grupo_complemento
                 WHERE produto_id = $1
                 ORDER BY id`,
                [produto.id]
            );

            const grupos = [];

            for (const grupo of gruposResultado.rows) {

                const opcoesResultado = await db.query(
                    `SELECT id, nome, preco
                     FROM complemento
                     WHERE grupo_id = $1
                     ORDER BY id`,
                    [grupo.id]
                );

                grupos.push({
                    id: grupo.id,
                    nome: grupo.nome,
                    min: grupo.minimo,
                    max: grupo.maximo,
                    opcoes: opcoesResultado.rows
                });
            }

            produtos.push({
                id: produto.id,
                categoriaId: produto.categoria_id,
                nome: produto.nome,
                descricao: produto.descricao,
                preco: Number(produto.preco),
                foto: produto.foto,
                disponivel: produto.disponivel,
                grupos: grupos
            });
        }

        res.json(produtos);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao buscar produtos.'
        });
    }
});



// ==================================================
// ALTERAR DISPONIBILIDADE DO PRODUTO
// ==================================================

app.patch('/produtos/:id/disponibilidade', async (req, res) => {

    const { id } = req.params;
    const { usuario_id, disponivel } = req.body;

    if (!usuario_id || typeof disponivel !== 'boolean') {
        return res.status(400).json({
            mensagem: 'Dados inválidos.'
        });
    }

    try {

        const resultado = await db.query(
            `UPDATE produto p
             SET disponivel = $1
             FROM categoria c
             INNER JOIN loja l
                ON l.id = c.loja_id
             WHERE p.id = $2
             AND p.categoria_id = c.id
             AND l.usuario_id = $3
             AND p.excluido = FALSE
             RETURNING p.id, p.disponivel`,
            [disponivel, id, usuario_id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Produto não encontrado.'
            });
        }

        res.json({
            mensagem: disponivel
                ? 'Produto disponibilizado no cardápio.'
                : 'Produto retirado do cardápio do aplicativo.',
            disponivel: resultado.rows[0].disponivel
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao alterar disponibilidade.'
        });
    }
});



app.get('/cardapio/:loja_id', async (req, res) => {

    const { loja_id } = req.params;

    try {

        const categoriasResultado = await db.query(
            `SELECT id, nome
             FROM categoria
             WHERE loja_id = $1
             ORDER BY id`,
            [loja_id]
        );

        const categorias = [];

        for (const categoria of categoriasResultado.rows) {

            const produtosResultado = await db.query(
                `SELECT
                    id,
                    nome,
                    descricao,
                    preco,
                    foto,
                    disponivel
                 FROM produto
                 WHERE categoria_id = $1
                 AND disponivel = TRUE
                 AND excluido = FALSE
                 ORDER BY id`,
                [categoria.id]
            );

            const produtos = [];

            for (const produto of produtosResultado.rows) {

                const gruposResultado = await db.query(
                    `SELECT
                        id,
                        nome,
                        minimo,
                        maximo
                     FROM grupo_complemento
                     WHERE produto_id = $1
                     ORDER BY id`,
                    [produto.id]
                );

                const grupos = [];

                for (const grupo of gruposResultado.rows) {

                    const complementosResultado = await db.query(
                        `SELECT
                            id,
                            nome,
                            preco
                         FROM complemento
                         WHERE grupo_id = $1
                         ORDER BY id`,
                        [grupo.id]
                    );

                    grupos.push({
                        id: grupo.id,
                        nome: grupo.nome,
                        minimo: grupo.minimo,
                        maximo: grupo.maximo,
                        complementos: complementosResultado.rows
                    });
                }

                produtos.push({
                    id: produto.id,
                    nome: produto.nome,
                    descricao: produto.descricao,
                    preco: Number(produto.preco),
                    foto: produto.foto,
                    grupos: grupos
                });
            }

            categorias.push({
                id: categoria.id,
                nome: categoria.nome,
                produtos: produtos
            });
        }

        res.json({
            loja_id: Number(loja_id),
            categorias: categorias
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao buscar o cardápio.'
        });
    }
});




app.post('/pedidos', async (req, res) => {
    const {
        loja_id,
        usuario_id,
        endereco_entrega,
        distancia_km,
        subtotal_itens
    } = req.body;

    if (
        !loja_id ||
        !endereco_entrega ||
        distancia_km === undefined ||
        subtotal_itens === undefined
    ) {
        return res.status(400).json({
            erro: 'Dados do pedido incompletos.'
        });
    }

    const cliente = await db.connect();

    try {
        await cliente.query('BEGIN');

        // Verifica se a loja existe
        const lojaResultado = await cliente.query(
            `SELECT id, nome, aberta
            FROM loja
            WHERE id = $1`,
            [loja_id]
        );

        if (lojaResultado.rows.length === 0) {

            await cliente.query('ROLLBACK');

            return res.status(404).json({
                mensagem: 'Loja não encontrada.'
            });
        }

        const loja = lojaResultado.rows[0];

        // Busca os horários da loja
        const horariosResultado = await cliente.query(
            `SELECT dia, ativo, abertura, fechamento
            FROM horario_loja
            WHERE loja_id = $1`,
            [loja_id]
        );

        // Verifica interruptor + horário
        const lojaAbertaAgora = verificarLojaAberta(
            loja,
            horariosResultado.rows
        );

        if (!lojaAbertaAgora) {

            await cliente.query('ROLLBACK');

            return res.status(400).json({
                mensagem: 'A loja está fechada no momento.'
            });
        }

        // Busca a taxa atual da loja para a distância informada
        const resultadoFaixa = await cliente.query(
            `SELECT distancia_maxima, taxa
             FROM faixa_entrega
             WHERE loja_id = $1
               AND distancia_maxima >= $2
             ORDER BY distancia_maxima ASC
             LIMIT 1`,
            [loja_id, distancia_km]
        );

        if (resultadoFaixa.rows.length === 0) {
            await cliente.query('ROLLBACK');

            return res.status(400).json({
                dentro_area: false,
                mensagem: 'Endereço fora da área de entrega.'
            });
        }

        const taxa_entrega = Number(resultadoFaixa.rows[0].taxa);
        const total = Number(subtotal_itens) + taxa_entrega;

        // Guarda a taxa que estava valendo neste momento
        const resultadoPedido = await cliente.query(
            `INSERT INTO pedido
            (
                loja_id,
                usuario_id,
                endereco_entrega,
                distancia_km,
                subtotal_itens,
                taxa_entrega,
                total
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                loja_id,
                usuario_id || null,
                endereco_entrega,
                distancia_km,
                subtotal_itens,
                taxa_entrega,
                total
            ]
        );

        await cliente.query('COMMIT');

        res.status(201).json({
            mensagem: 'Pedido criado com sucesso.',
            pedido: resultadoPedido.rows[0]
        });

    } catch (erro) {
        await cliente.query('ROLLBACK');

        console.error('Erro ao criar pedido:', erro);

        res.status(500).json({
            erro: 'Erro ao criar pedido.'
        });

    } finally {
        cliente.release();
    }
});







app.get('/lojas/:loja_id/aberta-agora', async (req, res) => {

    const { loja_id } = req.params;

    try {

        const lojaResultado = await db.query(
            `SELECT id, nome, aberta
             FROM loja
             WHERE id = $1`,
            [loja_id]
        );

        if (lojaResultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Loja não encontrada.'
            });
        }

        const loja = lojaResultado.rows[0];

        const horariosResultado = await db.query(
            `SELECT dia, ativo, abertura, fechamento
             FROM horario_loja
             WHERE loja_id = $1`,
            [loja_id]
        );

        const abertaAgora = verificarLojaAberta(
            loja,
            horariosResultado.rows
        );

        res.json({
            loja_id: Number(loja_id),
            aberta_agora: abertaAgora
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            mensagem: 'Erro ao verificar horário da loja.'
        });
    }
});





app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});