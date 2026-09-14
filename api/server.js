
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

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
        horarios
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
                (usuario_id, nome, categoria, telefone, endereco)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id`,
                [
                    usuario_id,
                    nome,
                    categoria,
                    telefone,
                    endereco
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
                     endereco = $4
                 WHERE usuario_id = $5
                 RETURNING id`,
                [
                    nome,
                    categoria,
                    telefone,
                    endereco,
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
            `SELECT id, nome, categoria, telefone, endereco, aberta
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

        res.json({
            loja: loja,
            pagamentos: pagamentosResultado.rows.map(p => p.tipo),
            horarios: horariosResultado.rows
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








app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});