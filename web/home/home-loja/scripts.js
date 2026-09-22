console.log("script da loja carregado");

const usuarioLogado = JSON.parse(
    localStorage.getItem('usuarioLogado')
);


/* ==================================================
   VERIFICA SE EXISTE USUÁRIO LOGADO
================================================== */

if (!usuarioLogado) {

    window.location.href = '../../login/index.html';
}


/* ==================================================
   ELEMENTOS
================================================== */

const nomeLojaTopo = document.getElementById('nome-loja-topo');

const btnStatus = document.getElementById('btn-status');
const statusIndicador = document.getElementById('status-indicador');
const statusTexto = document.getElementById('status-texto');

const btnSalvar = document.getElementById('btn-salvar');
const btnSair = document.getElementById('btn-sair');

const mensagem = document.getElementById('mensagem');
const textoMensagem = document.getElementById('texto-mensagem');
const iconeMensagem = document.getElementById('icone-mensagem');

const foto = document.getElementById('foto');
const previewFoto = document.getElementById('preview-foto');


/* ==================================================
   NOME DO USUÁRIO
================================================== */

if (usuarioLogado) {

    nomeLojaTopo.textContent = usuarioLogado.nome || 'Loja';
}


/* ==================================================
   FUNÇÃO DE MENSAGEM
================================================== */

function mostrarMensagem(texto, tipo) {

    textoMensagem.textContent = texto;

    mensagem.classList.remove('erro', 'sucesso');

    mensagem.classList.add(tipo);

    if (tipo === 'sucesso') {
        iconeMensagem.textContent = '✓';
    } else {
        iconeMensagem.textContent = '!';
    }

    mensagem.style.display = 'flex';
}


/* ==================================================
   PRÉ-VISUALIZAÇÃO DA FOTO
================================================== */

let fotoImagem = '';

foto.addEventListener('change', () => {

    const arquivo = foto.files[0];

    if (!arquivo) {
        return;
    }

    const leitor = new FileReader();

    leitor.onload = evento => {

        fotoImagem = evento.target.result;

        previewFoto.src = fotoImagem;
    };

    leitor.readAsDataURL(arquivo);
});


/* ==================================================
   ABRIR / FECHAR LOJA
================================================== */

let lojaAberta = false;


/*
   Aqui inicialmente usamos false.

   Depois vamos buscar esse valor da API.
*/

function atualizarStatusTela() {

    if (lojaAberta) {

        statusIndicador.classList.remove('fechada');
        statusIndicador.classList.add('aberta');

        statusTexto.textContent = 'Aberta';

        btnStatus.textContent = 'Fechar loja';

    } else {

        statusIndicador.classList.remove('aberta');
        statusIndicador.classList.add('fechada');

        statusTexto.textContent = 'Fechada';

        btnStatus.textContent = 'Abrir loja';
    }
}


btnStatus.addEventListener('click', async () => {

    const novoStatus = !lojaAberta;

    try {

        /*
            Endpoint que iremos criar na API:
            PATCH /lojas/status
        */

        const resposta = await fetch(
            'http://localhost:3000/lojas/status',
            {
                method: 'PATCH',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    usuario_id: usuarioLogado.id,
                    aberta: novoStatus
                })
            }
        );


        const dados = await resposta.json();


        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem || 'Não foi possível alterar o status da loja.',
                'erro'
            );

            return;
        }


        lojaAberta = dados.aberta;

        atualizarStatusTela();


        mostrarMensagem(
            lojaAberta
                ? 'Sua loja está aberta e pode receber pedidos.'
                : 'Sua loja foi fechada e não receberá novos pedidos.',
            'sucesso'
        );


    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            'Não foi possível conectar com a API.',
            'erro'
        );
    }
});



/* ==================================================
   ÁREA DE ENTREGA
================================================== */

const faixasEntrega = document.getElementById('faixas-entrega');
const btnAdicionarFaixa = document.getElementById('btn-adicionar-faixa');


/* ==================================================
   ADICIONAR FAIXA
================================================== */

function adicionarFaixa(distancia = '', taxa = '') {

    const novaFaixa = document.createElement('div');

    novaFaixa.className = 'faixa-entrega';

    novaFaixa.innerHTML = `
        <div class="campo">
            <label>Distância máxima</label>

            <div class="campo-distancia">
                <input
                    type="number"
                    class="distancia"
                    min="0.1"
                    step="0.1"
                    placeholder="Ex: 5"
                    value="${distancia}"
                >

                <span>km</span>
            </div>
        </div>

        <div class="campo">
            <label>Taxa de entrega</label>

            <div class="campo-taxa">
                <span>R$</span>

                <input
                    type="number"
                    class="taxa"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 8,00"
                    value="${taxa}"
                >
            </div>
        </div>

        <button
            type="button"
            class="btn-remover-faixa"
            onclick="removerFaixa(this)"
        >
            Remover
        </button>
    `;

    faixasEntrega.appendChild(novaFaixa);
}


/* ==================================================
   BOTÃO ADICIONAR
================================================== */

btnAdicionarFaixa.addEventListener('click', () => {

    adicionarFaixa();

});


function removerFaixa(botao) {

    const todasFaixas = document.querySelectorAll('.faixa-entrega');

    // Não permite remover a última faixa
    if (todasFaixas.length === 1) {
        mostrarMensagem(
            'A loja precisa ter pelo menos uma faixa de entrega.',
            'erro'
        );

        return;
    }

    botao.closest('.faixa-entrega').remove();
}


/* ==================================================
   SALVAR DADOS DA LOJA
================================================== */

btnSalvar.addEventListener('click', async () => {

    const nome = document.getElementById('nome').value;
    const categoria = document.getElementById('categoria').value;
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value;


    /* ==================================================
       PAGAMENTOS
    ================================================== */

    const pagamentos = [];

    document
        .querySelectorAll('input[name="pagamento"]:checked')
        .forEach(input => {

            pagamentos.push(input.value);

        });


    /* ==================================================
       VALIDAÇÃO
    ================================================== */

    if (!nome || !categoria || !telefone || !endereco) {

        mostrarMensagem(
            'Preencha todos os dados da loja.',
            'erro'
        );

        return;
    }


    /* ==================================================
       HORÁRIOS
    ================================================== */

    const horarios = [

        {
            dia: 'SEGUNDA',
            ativo: document.getElementById('seg-ativo').checked,
            abertura: document.getElementById('seg-abertura').value,
            fechamento: document.getElementById('seg-fechamento').value
        },

        {
            dia: 'TERCA',
            ativo: document.getElementById('ter-ativo').checked,
            abertura: document.getElementById('ter-abertura').value,
            fechamento: document.getElementById('ter-fechamento').value
        },

        {
            dia: 'QUARTA',
            ativo: document.getElementById('qua-ativo').checked,
            abertura: document.getElementById('qua-abertura').value,
            fechamento: document.getElementById('qua-fechamento').value
        },

        {
            dia: 'QUINTA',
            ativo: document.getElementById('qui-ativo').checked,
            abertura: document.getElementById('qui-abertura').value,
            fechamento: document.getElementById('qui-fechamento').value
        },

        {
            dia: 'SEXTA',
            ativo: document.getElementById('sex-ativo').checked,
            abertura: document.getElementById('sex-abertura').value,
            fechamento: document.getElementById('sex-fechamento').value
        },

        {
            dia: 'SABADO',
            ativo: document.getElementById('sab-ativo').checked,
            abertura: document.getElementById('sab-abertura').value,
            fechamento: document.getElementById('sab-fechamento').value
        },

        {
            dia: 'DOMINGO',
            ativo: document.getElementById('dom-ativo').checked,
            abertura: document.getElementById('dom-abertura').value,
            fechamento: document.getElementById('dom-fechamento').value
        }

    ];


    /* ==================================================
       FAIXAS DE ENTREGA
    ================================================== */

    const faixas = [];

    document
        .querySelectorAll('.faixa-entrega')
        .forEach(faixa => {

            const distancia = faixa
                .querySelector('.distancia')
                .value;

            const taxa = faixa
                .querySelector('.taxa')
                .value;

            if (distancia && taxa) {

                faixas.push({
                    distancia_maxima: parseFloat(distancia),
                    taxa: parseFloat(taxa)
                });

            }

        });


    /* ==================================================
       ENVIO PARA A API
    ================================================== */

    try {

        const resposta = await fetch(
            'http://localhost:3000/lojas',
            {
                method: 'PUT',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    usuario_id: usuarioLogado.id,

                    nome: nome,

                    categoria: categoria,

                    telefone: telefone,

                    endereco: endereco,

                    pagamentos: pagamentos,

                    horarios: horarios,

                    faixas: faixas,

                    foto: fotoImagem

                })
            }
        );


        const dados = await resposta.json();


        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem || 'Não foi possível salvar os dados.',
                'erro'
            );

            return;
        }


        mostrarMensagem(
            'Dados da loja salvos com sucesso!',
            'sucesso'
        );


    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            'Não foi possível conectar com a API.',
            'erro'
        );
    }

});


/* ==================================================
   SAIR
================================================== */

btnSair.addEventListener('click', () => {

    localStorage.removeItem('usuarioLogado');

    window.location.href = '../../login/index.html';

});





/* ==================================================
   CARREGAR DADOS DA LOJA
================================================== */

async function carregarDadosLoja() {

    try {

        const resposta = await fetch(
            `http://localhost:3000/lojas/${usuarioLogado.id}`
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            mostrarMensagem(
                dados.mensagem || 'Não foi possível carregar os dados da loja.',
                'erro'
            );

            return;
        }

        const loja = dados.loja;

        // Dados principais
        document.getElementById('nome').value = loja.nome || '';
        document.getElementById('categoria').value = loja.categoria || '';
        document.getElementById('telefone').value = loja.telefone || '';
        document.getElementById('endereco').value = loja.endereco || '';


        if (loja.foto) {

            fotoImagem = loja.foto;

            previewFoto.src = loja.foto;

        }


        // Formas de pagamento
        document
            .querySelectorAll('input[name="pagamento"]')
            .forEach(input => {

                input.checked = dados.pagamentos.includes(input.value);

            });

        // Horários
        dados.horarios.forEach(horario => {

            const dia = horario.dia.toLowerCase();

            let prefixo;

            switch (dia) {

                case 'segunda':
                    prefixo = 'seg';
                    break;

                case 'terca':
                    prefixo = 'ter';
                    break;

                case 'quarta':
                    prefixo = 'qua';
                    break;

                case 'quinta':
                    prefixo = 'qui';
                    break;

                case 'sexta':
                    prefixo = 'sex';
                    break;

                case 'sabado':
                    prefixo = 'sab';
                    break;

                case 'domingo':
                    prefixo = 'dom';
                    break;
            }

            if (!prefixo) {
                return;
            }

            document.getElementById(`${prefixo}-ativo`).checked = horario.ativo;

            document.getElementById(`${prefixo}-abertura`).value =
                horario.abertura ? horario.abertura.substring(0, 5) : '';

            document.getElementById(`${prefixo}-fechamento`).value =
                horario.fechamento ? horario.fechamento.substring(0, 5) : '';

        });

        /* ==================================================
        FAIXAS DE ENTREGA
        ================================================== */

        faixasEntrega.innerHTML = '';

        if (dados.faixas.length === 0) {

            adicionarFaixa();

        } else {

            dados.faixas.forEach(faixa => {

                adicionarFaixa(
                    faixa.distancia_maxima,
                    faixa.taxa
                );

            });

        }

        // Status da loja
        lojaAberta = loja.aberta;
        atualizarStatusTela();

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            'Não foi possível carregar os dados da loja.',
            'erro'
        );
    }
}







/* ==================================================
   STATUS INICIAL
================================================== */

carregarDadosLoja();