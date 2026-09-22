/* =========================================================
   VERIFICA LOGIN
========================================================= */

const usuarioLogado = JSON.parse(
    localStorage.getItem('usuarioLogado')
);

if (!usuarioLogado) {
    window.location.href = '../../login/index.html';
}


/* =========================================================
   ELEMENTOS
========================================================= */

const listaCategorias =
    document.getElementById('lista-categorias');

const listaProdutos =
    document.getElementById('lista-produtos');

const estadoVazio =
    document.getElementById('estado-vazio');

const tituloCategoria =
    document.getElementById('titulo-categoria');

const contadorProdutos =
    document.getElementById('contador-produtos');

const categoriaProduto =
    document.getElementById('categoria-produto');

const mensagem =
    document.getElementById('mensagem');

const textoMensagem =
    document.getElementById('texto-mensagem');

const iconeMensagem =
    document.getElementById('icone-mensagem');

const modalCategoria =
    document.getElementById('modal-categoria');

const modalProduto =
    document.getElementById('modal-produto');

const listaGrupos =
    document.getElementById('lista-grupos');

const semGrupos =
    document.getElementById('sem-grupos');

const fotoProduto =
    document.getElementById('foto-produto');

const previewProduto =
    document.getElementById('preview-produto');

const placeholderFoto =
    document.getElementById('placeholder-foto');


/* =========================================================
   ESTADO
========================================================= */

let categorias = [];

let produtos = [];

let categoriaSelecionada = 'TODAS';

let categoriaEditando = null;
let produtoEditando = null;


/* =========================================================
   SALVAR LOCALMENTE
========================================================= */

function salvarEstado() {
}

/* =========================================================
   ID
========================================================= */

function gerarId() {

    return Date.now().toString() +
        Math.random().toString(16).slice(2);
}


/* =========================================================
   MENSAGEM
========================================================= */

function mostrarMensagem(texto, tipo) {

    textoMensagem.textContent = texto;

    mensagem.classList.remove(
        'erro',
        'sucesso'
    );

    mensagem.classList.add(tipo);

    if (tipo === 'sucesso') {
        iconeMensagem.textContent = '✓';
    } else {
        iconeMensagem.textContent = '!';
    }

    mensagem.style.display = 'flex';

    setTimeout(() => {

        mensagem.style.display = 'none';

    }, 4000);
}



/* =========================================================
   CARREGAR CATEGORIAS
========================================================= */

async function carregarCategorias() {

    try {

        const resposta = await fetch(
            `http://localhost:3000/categorias/${usuarioLogado.id}`
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem || 'Não foi possível carregar as categorias.',
                'erro'
            );

            return;
        }

        categorias = dados;

        renderizarTudo();

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            'Não foi possível conectar com a API.',
            'erro'
        );
    }
}


/* =========================================================
   MODAIS
========================================================= */

function abrirModal(modal) {

    modal.classList.add('aberto');
}

function fecharModal(modal) {

    modal.classList.remove('aberto');
}


document.querySelectorAll(
    '[data-fechar]'
).forEach(botao => {

    botao.addEventListener('click', () => {

        const idModal =
            botao.dataset.fechar;

        fecharModal(
            document.getElementById(idModal)
        );

    });

});


/* =========================================================
   CATEGORIAS
========================================================= */

function renderizarCategorias() {

    listaCategorias.innerHTML = '';

    const todos = document.createElement('div');

    todos.className =
        'categoria-item ' +
        (categoriaSelecionada === 'TODAS'
            ? 'ativo'
            : '');

    const totalProdutos =
        produtos.length;

    todos.innerHTML = `
        <div class="categoria-nome">
            <span>🍽️</span>
            <span>Todos os produtos</span>
        </div>

        <span class="categoria-contador">
            ${totalProdutos}
        </span>
    `;

    todos.addEventListener(
        'click',
        () => {

            categoriaSelecionada =
                'TODAS';

            renderizarTudo();
        }
    );

    listaCategorias.appendChild(todos);


    categorias.forEach(categoria => {

        const quantidade =
            produtos.filter(
                produto =>
                    produto.categoriaId === categoria.id
            ).length;


        const item =
            document.createElement('div');

        item.className =
            'categoria-item ' +
            (
                categoriaSelecionada === categoria.id
                    ? 'ativo'
                    : ''
            );


        item.innerHTML = `

            <div class="categoria-nome">

                <span>📁</span>

                <span>
                    ${categoria.nome}
                </span>

            </div>


            <div class="categoria-acoes">

                <span class="categoria-contador">
                    ${quantidade}
                </span>

                <button
                    class="editar-categoria"
                    title="Editar categoria"
                >
                    ✏️
                </button>

                <button
                    class="excluir-categoria"
                    title="Excluir categoria"
                >
                    🗑️
                </button>

            </div>

        `;


        item.addEventListener(
            'click',
            (evento) => {

                if (
                    evento.target.closest(
                        '.categoria-acoes'
                    )
                ) {
                    return;
                }

                categoriaSelecionada =
                    categoria.id;

                renderizarTudo();
            }
        );


        item.querySelector(
            '.editar-categoria'
        ).addEventListener(
            'click',
            () => editarCategoria(categoria.id)
        );


        item.querySelector(
            '.excluir-categoria'
        ).addEventListener(
            'click',
            () => excluirCategoria(categoria.id)
        );


        listaCategorias.appendChild(item);

    });

}


/* =========================================================
   NOVA CATEGORIA
========================================================= */

function abrirNovaCategoria() {

    categoriaEditando = null;

    document.getElementById(
        'titulo-modal-categoria'
    ).textContent = 'Nova categoria';

    document.getElementById(
        'nome-categoria'
    ).value = '';

    document.getElementById(
        'btn-salvar-categoria'
    ).textContent = 'Salvar categoria';

    abrirModal(modalCategoria);
}


document.getElementById(
    'btn-nova-categoria'
).addEventListener(
    'click',
    abrirNovaCategoria
);


document.getElementById(
    'btn-nova-categoria-2'
).addEventListener(
    'click',
    abrirNovaCategoria
);


/* =========================================================
   SALVAR CATEGORIA
========================================================= */

document.getElementById(
    'btn-salvar-categoria'
).addEventListener(
    'click',
    async () => {

        const nome =
            document.getElementById(
                'nome-categoria'
            ).value.trim();


        if (!nome) {

            mostrarMensagem(
                'Informe o nome da categoria.',
                'erro'
            );

            return;
        }


        try {

            let resposta;


            /* =================================================
               CRIAR
            ================================================= */

            if (!categoriaEditando) {

                resposta = await fetch(
                    'http://localhost:3000/categorias',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({

                            usuario_id: usuarioLogado.id,

                            nome: nome

                        })
                    }
                );

            }


            /* =================================================
               EDITAR
            ================================================= */

            else {

                resposta = await fetch(
                    `http://localhost:3000/categorias/${categoriaEditando}`,
                    {
                        method: 'PUT',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({

                            usuario_id: usuarioLogado.id,

                            nome: nome

                        })
                    }
                );
            }


            const dados = await resposta.json();


            if (!resposta.ok) {

                mostrarMensagem(
                    dados.mensagem || 'Não foi possível salvar a categoria.',
                    'erro'
                );

                return;
            }


            mostrarMensagem(
                dados.mensagem,
                'sucesso'
            );


            fecharModal(modalCategoria);


            categoriaEditando = null;


            await carregarCategorias();


        } catch (erro) {

            console.error(erro);

            mostrarMensagem(
                'Não foi possível conectar com a API.',
                'erro'
            );
        }

    }
);



/* =========================================================
   EDITAR CATEGORIA
========================================================= */

function editarCategoria(id) {

    const categoria =
        categorias.find(
            categoria =>
                categoria.id === id
        );

    if (!categoria) {
        return;
    }

    categoriaEditando = id;

    document.getElementById(
        'titulo-modal-categoria'
    ).textContent =
        'Editar categoria';

    document.getElementById(
        'nome-categoria'
    ).value =
        categoria.nome;

    document.getElementById(
        'btn-salvar-categoria'
    ).textContent =
        'Salvar alterações';

    abrirModal(modalCategoria);
}


/* =========================================================
   EXCLUIR CATEGORIA
========================================================= */

async function excluirCategoria(id) {

    const categoria =
        categorias.find(
            categoria =>
                categoria.id === id
        );

    if (!categoria) {
        return;
    }


    const confirmou =
        confirm(
            `Excluir a categoria "${categoria.nome}"?`
        );

    if (!confirmou) {
        return;
    }


    try {

        const resposta = await fetch(
            `http://localhost:3000/categorias/${id}`,
            {
                method: 'DELETE',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    usuario_id: usuarioLogado.id
                })
            }
        );


        const dados = await resposta.json();


        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem || 'Não foi possível excluir a categoria.',
                'erro'
            );

            return;
        }


        mostrarMensagem(
            dados.mensagem,
            'sucesso'
        );


        categoriaSelecionada = 'TODAS';

        await carregarCategorias();


    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            'Não foi possível conectar com a API.',
            'erro'
        );
    }
}


/* =========================================================
   SELECT DE CATEGORIAS
========================================================= */

function atualizarSelectCategorias() {

    categoriaProduto.innerHTML = `
        <option value="">
            Selecione uma categoria
        </option>
    `;


    categorias.forEach(categoria => {

        const option =
            document.createElement('option');

        option.value =
            categoria.id;

        option.textContent =
            categoria.nome;

        categoriaProduto.appendChild(option);

    });

}


/* =========================================================
   CARREGAR PRODUTOS
========================================================= */

async function carregarProdutos() {

    try {

        const resposta = await fetch(
            `http://localhost:3000/produtos/${usuarioLogado.id}`
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem ||
                'Não foi possível carregar os produtos.',
                'erro'
            );

            return;
        }

        produtos = dados;

        renderizarProdutos();

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            'Não foi possível conectar com a API.',
            'erro'
        );
    }
}


/* =========================================================
   PRODUTOS
========================================================= */

function renderizarProdutos() {

    listaProdutos.innerHTML = '';


    let produtosFiltrados;


    if (categoriaSelecionada === 'TODAS') {

        produtosFiltrados =
            produtos;

        tituloCategoria.textContent =
            'Todos os produtos';

    } else {

        produtosFiltrados =
            produtos.filter(
                produto =>
                    produto.categoriaId ===
                    categoriaSelecionada
            );


        const categoria =
            categorias.find(
                categoria =>
                    categoria.id === categoriaSelecionada
            );


        tituloCategoria.textContent =
            categoria
                ? categoria.nome
                : 'Categoria';

    }


    contadorProdutos.textContent =
        `${produtosFiltrados.length} produto` +
        (produtosFiltrados.length === 1
            ? ''
            : 's');


    if (produtosFiltrados.length === 0) {

        estadoVazio.style.display =
            'block';

        return;

    }


    estadoVazio.style.display =
        'none';


    produtosFiltrados.forEach(
        produto => {

            criarCardProduto(produto);

        }
    );

}


/* =========================================================
   CARD DO PRODUTO
========================================================= */

function criarCardProduto(produto) {

    const card =
        document.createElement('div');

    card.className =
        'produto-card ' +
        (
            produto.disponivel
                ? ''
                : 'indisponivel'
        );


    const imagem =
        produto.foto
            ? `
                <img
                    src="${produto.foto}"
                    alt="${produto.nome}"
                >
            `
            : `
                <div class="produto-sem-imagem">
                    🍔
                </div>
            `;


    const badge =
        produto.disponivel

            ? `
                <div
                    class="badge-disponibilidade badge-disponivel"
                >
                    Disponível
                </div>
            `

            : `
                <div
                    class="badge-disponibilidade badge-indisponivel"
                >
                    Indisponível
                </div>
            `;


    const quantidadeGrupos =
        produto.grupos
            ? produto.grupos.length
            : 0;


    card.innerHTML = `

        <div class="produto-imagem">

            ${imagem}

            ${badge}

        </div>


        <div class="produto-info">

            <h3>
                ${produto.nome}
            </h3>


            <p class="produto-descricao">
                ${produto.descricao || 'Sem descrição.'}
            </p>


            <div class="produto-rodape">

                <div>

                    <div class="produto-preco">
                        R$ ${Number(produto.preco).toFixed(2).replace('.', ',')}
                    </div>

                    <small>
                        ${quantidadeGrupos}
                        grupo${quantidadeGrupos === 1 ? '' : 's'}
                        de complemento
                    </small>

                </div>


                <div class="produto-acoes">

                    <label class="switch">

                        <input
                            type="checkbox"
                            class="switch-produto"
                            ${produto.disponivel ? 'checked' : ''}
                        >

                        <span></span>

                    </label>


                    <button
                        class="btn-acao-produto editar-produto"
                        title="Editar"
                    >
                        ✏️
                    </button>


                    <button
                        class="btn-acao-produto excluir-produto"
                        title="Excluir"
                    >
                        🗑️
                    </button>

                </div>

            </div>

        </div>

    `;


    card.querySelector(
        '.switch-produto'
    ).addEventListener(
        'change',
        evento => {

            alterarDisponibilidade(
                produto.id,
                evento.target.checked
            );

        }
    );


    card.querySelector(
        '.editar-produto'
    ).addEventListener(
        'click',
        () => editarProduto(produto.id)
    );


    card.querySelector(
        '.excluir-produto'
    ).addEventListener(
        'click',
        () => excluirProduto(produto.id)
    );


    listaProdutos.appendChild(card);

}


/* =========================================================
   NOVO PRODUTO
========================================================= */

function abrirNovoProduto() {

    if (categorias.length === 0) {

        mostrarMensagem(
            'Crie pelo menos uma categoria antes de cadastrar um produto.',
            'erro'
        );

        abrirNovaCategoria();

        return;
    }


    produtoEditando = null;


    document.getElementById(
        'titulo-modal-produto'
    ).textContent =
        'Novo produto';


    document.getElementById(
        'btn-salvar-produto'
    ).textContent =
        'Salvar produto';


    document.getElementById(
        'nome-produto'
    ).value = '';


    document.getElementById(
        'descricao-produto'
    ).value = '';


    document.getElementById(
        'preco-produto'
    ).value = '';


    document.getElementById(
        'produto-disponivel'
    ).checked = true;


    document.getElementById(
        'texto-disponibilidade'
    ).textContent =
        'Disponível';


    atualizarSelectCategorias();


    categoriaProduto.value =
        categoriaSelecionada !== 'TODAS'
            ? categoriaSelecionada
            : '';


    listaGrupos.innerHTML = '';

    semGrupos.style.display =
        'block';


    resetarFoto();


    abrirModal(modalProduto);

}


document.getElementById(
    'btn-novo-produto'
).addEventListener(
    'click',
    abrirNovoProduto
);


document.getElementById(
    'btn-vazio-produto'
).addEventListener(
    'click',
    abrirNovoProduto
);


/* =========================================================
   DISPONIBILIDADE DO FORM
========================================================= */

document.getElementById(
    'produto-disponivel'
).addEventListener(
    'change',
    evento => {

        document.getElementById(
            'texto-disponibilidade'
        ).textContent =

            evento.target.checked
                ? 'Disponível'
                : 'Indisponível';

    }
);


/* =========================================================
   FOTO
========================================================= */

fotoProduto.addEventListener(
    'change',
    () => {

        const arquivo =
            fotoProduto.files[0];

        if (!arquivo) {
            return;
        }


        const leitor =
            new FileReader();


        leitor.onload =
            evento => {

                previewProduto.src =
                    evento.target.result;

                previewProduto.style.display =
                    'block';

                placeholderFoto.style.display =
                    'none';

            };


        leitor.readAsDataURL(arquivo);

    }
);


function resetarFoto() {

    fotoProduto.value = '';

    previewProduto.src = '';

    previewProduto.style.display =
        'none';

    placeholderFoto.style.display =
        'flex';

}


/* =========================================================
   EDITAR PRODUTO
========================================================= */

function editarProduto(id) {

    const produto =
        produtos.find(
            produto =>
                produto.id === id
        );

    if (!produto) {
        return;
    }


    produtoEditando = id;


    document.getElementById(
        'titulo-modal-produto'
    ).textContent =
        'Editar produto';


    document.getElementById(
        'btn-salvar-produto'
    ).textContent =
        'Salvar alterações';


    atualizarSelectCategorias();


    document.getElementById(
        'nome-produto'
    ).value =
        produto.nome;


    categoriaProduto.value =
        produto.categoriaId;


    document.getElementById(
        'descricao-produto'
    ).value =
        produto.descricao || '';


    document.getElementById(
        'preco-produto'
    ).value =
        produto.preco;


    document.getElementById(
        'produto-disponivel'
    ).checked =
        produto.disponivel;


    document.getElementById(
        'texto-disponibilidade'
    ).textContent =
        produto.disponivel
            ? 'Disponível'
            : 'Indisponível';


    listaGrupos.innerHTML = '';


    if (
        produto.grupos &&
        produto.grupos.length > 0
    ) {

        produto.grupos.forEach(
            grupo => {

                adicionarGrupoNaTela(grupo);

            }
        );

        semGrupos.style.display =
            'none';

    } else {

        semGrupos.style.display =
            'block';

    }


    if (produto.foto) {

        previewProduto.src =
            produto.foto;

        previewProduto.style.display =
            'block';

        placeholderFoto.style.display =
            'none';

    } else {

        resetarFoto();

    }


    abrirModal(modalProduto);

}


/* =========================================================
   SALVAR PRODUTO
========================================================= */

document.getElementById(
    'btn-salvar-produto'
).addEventListener(
    'click',
    async () => {

        const nome =
            document.getElementById(
                'nome-produto'
            ).value.trim();

        const categoriaId =
            categoriaProduto.value;

        const descricao =
            document.getElementById(
                'descricao-produto'
            ).value.trim();

        const preco =
            Number(
                document.getElementById(
                    'preco-produto'
                ).value
            );

        const disponivel =
            document.getElementById(
                'produto-disponivel'
            ).checked;

        if (
            !nome ||
            !categoriaId ||
            !descricao ||
            !preco ||
            preco <= 0
        ) {

            mostrarMensagem(
                'Preencha nome, categoria, descrição e preço corretamente.',
                'erro'
            );

            return;
        }

        

        const grupos = [...document.querySelectorAll(
    '#lista-grupos .grupo-complemento'
)]
.map(grupoElement => {

    const nome =
        grupoElement.querySelector('.nome-grupo').value.trim();

    const min =
        Number(grupoElement.querySelector('.min-grupo').value);

    const max =
        Number(grupoElement.querySelector('.max-grupo').value);

    const opcoes = [
        ...grupoElement.querySelectorAll('.opcao-complemento')
    ]
    .map(opcaoElement => {

        return {
            nome: opcaoElement
                .querySelector('.nome-opcao')
                .value
                .trim(),

            preco: Number(
                opcaoElement
                    .querySelector('.preco-opcao')
                    .value
            ) || 0
        };

    })
    .filter(opcao => opcao.nome);

    return {
        nome: nome,
        min: min,
        max: max,
        opcoes: opcoes
    };

})
.filter(grupo => grupo.nome);

console.log(
    'GRUPOS ENVIADOS:',
    JSON.stringify(grupos, null, 2)
);










        let foto = '';

        if (
            previewProduto.src &&
            previewProduto.style.display !== 'none'
        ) {
            foto = previewProduto.src;
        }

        try {

            let resposta;

            if (produtoEditando) {

                resposta = await fetch(
                    `http://localhost:3000/produtos/${produtoEditando}`,
                    {
                        method: 'PUT',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({

                            usuario_id:
                                usuarioLogado.id,

                            categoria_id:
                                categoriaId,

                            nome:
                                nome,

                            descricao:
                                descricao,

                            preco:
                                preco,

                            foto:
                                foto,

                            disponivel:
                                disponivel,

                            grupos:
                                grupos
                        })
                    }
                );

            } else {

                resposta = await fetch(
                    'http://localhost:3000/produtos',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({

                            usuario_id:
                                usuarioLogado.id,

                            categoria_id:
                                categoriaId,

                            nome:
                                nome,

                            descricao:
                                descricao,

                            preco:
                                preco,

                            foto:
                                foto,

                            disponivel:
                                disponivel,

                            grupos:
                                grupos
                        })
                    }
                );
            }


            const dados =
                await resposta.json();


            if (!resposta.ok) {

                mostrarMensagem(
                    dados.mensagem ||
                    'Não foi possível salvar o produto.',
                    'erro'
                );

                return;
            }


            mostrarMensagem(
                dados.mensagem,
                'sucesso'
            );


            fecharModal(modalProduto);

            produtoEditando = null;

            await carregarProdutos();

        } catch (erro) {

            console.error(erro);

            mostrarMensagem(
                'Não foi possível conectar com a API.',
                'erro'
            );
        }

    }
);


/* =========================================================
   DISPONIBILIDADE
========================================================= */
async function alterarDisponibilidade(
    id,
    disponivel
) {

    try {

        const resposta = await fetch(
            `http://localhost:3000/produtos/${id}/disponibilidade`,
            {
                method: 'PATCH',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    usuario_id: usuarioLogado.id,
                    disponivel: disponivel
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem ||
                'Não foi possível alterar a disponibilidade.',
                'erro'
            );

            await carregarProdutos();

            return;
        }

        const produto = produtos.find(
            produto => produto.id === id
        );

        if (produto) {
            produto.disponivel = dados.disponivel;
        }

        renderizarProdutos();

        mostrarMensagem(
            dados.mensagem,
            'sucesso'
        );

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            'Não foi possível conectar com a API.',
            'erro'
        );

        await carregarProdutos();
    }
}

/* =========================================================
   EXCLUIR PRODUTO
========================================================= */

async function excluirProduto(id) {

    const produto = produtos.find(
        produto => produto.id === id
    );

    if (!produto) {
        return;
    }

    const confirmou = confirm(
        `Excluir o produto "${produto.nome}"?`
    );

    if (!confirmou) {
        return;
    }

    try {

        const resposta = await fetch(
            `http://localhost:3000/produtos/${id}`,
            {
                method: 'DELETE',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    usuario_id: usuarioLogado.id
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {

            mostrarMensagem(
                dados.mensagem ||
                'Não foi possível remover o produto.',
                'erro'
            );

            return;
        }

        mostrarMensagem(
            dados.mensagem,
            'sucesso'
        );

        await carregarProdutos();

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            'Não foi possível conectar com a API.',
            'erro'
        );
    }
}


/* =========================================================
   GRUPOS DE COMPLEMENTO
========================================================= */

document.getElementById(
    'btn-novo-grupo'
).addEventListener(
    'click',
    () => {

        adicionarGrupoNaTela();

        semGrupos.style.display =
            'none';

    }
);


function adicionarGrupoNaTela(
    grupo = null
) {

    const grupoId =
        grupo?.id || gerarId();


    const div =
        document.createElement('div');

    div.className =
        'grupo-complemento';

    div.dataset.id =
        grupoId;


    div.innerHTML = `

        <div class="grupo-topo">

            <div class="grupo-titulo">

                <div class="campo-modal">

                    <label>
                        Nome do grupo
                    </label>

                    <input
                        type="text"
                        class="nome-grupo"
                        placeholder="Ex: Tamanho"
                        value="${grupo?.nome || ''}"
                    >

                </div>

            </div>


            <div class="grupo-limites">

                <div class="campo-modal">

                    <label>
                        Mínimo
                    </label>

                    <input
                        type="number"
                        class="min-grupo"
                        min="0"
                        value="${grupo?.min ?? 0}"
                    >

                </div>


                <div class="campo-modal">

                    <label>
                        Máximo
                    </label>

                    <input
                        type="number"
                        class="max-grupo"
                        min="1"
                        value="${grupo?.max ?? 1}"
                    >

                </div>


                <button
                    class="btn-remover-grupo"
                    title="Remover grupo"
                >
                    ×
                </button>

            </div>

        </div>


        <div class="opcoes-grupo">

        </div>


        <button
            class="btn-adicionar-opcao"
        >
            + Adicionar opção
        </button>

    `;


    const opcoes =
        div.querySelector(
            '.opcoes-grupo'
        );


    const botaoAdicionar =
        div.querySelector(
            '.btn-adicionar-opcao'
        );


    div.querySelector(
        '.btn-remover-grupo'
    ).addEventListener(
        'click',
        () => {

            div.remove();

            if (
                listaGrupos.children.length === 0
            ) {

                semGrupos.style.display =
                    'block';

            }

        }
    );


    botaoAdicionar.addEventListener(
        'click',
        () => {

            adicionarOpcao(
                opcoes
            );

        }
    );


    listaGrupos.appendChild(div);


    if (
        grupo &&
        grupo.opcoes
    ) {

        grupo.opcoes.forEach(
            opcao => {

                adicionarOpcao(
                    opcoes,
                    opcao
                );

            }
        );

    } else {

        adicionarOpcao(opcoes);

    }

}


function adicionarOpcao(
    container,
    opcao = null
) {

    const div =
        document.createElement('div');

    div.className =
        'opcao-complemento';


    div.innerHTML = `

        <input
            type="text"
            class="nome-opcao"
            placeholder="Ex: Bacon"
            value="${opcao?.nome || ''}"
        >


        <input
            type="number"
            class="preco-opcao"
            placeholder="R$ 0,00"
            min="0"
            step="0.01"
            value="${opcao?.preco ?? 0}"
        >


        <button
            class="btn-remover-opcao"
            title="Remover opção"
        >
            ×
        </button>

    `;


    div.querySelector(
        '.btn-remover-opcao'
    ).addEventListener(
        'click',
        () => {

            div.remove();

        }
    );


    container.appendChild(div);

}


function coletarGrupos() {

    const grupos = [];

    const elementos =
        Array.from(listaGrupos.children);

    elementos.forEach(elemento => {

        if (!elemento.classList.contains('grupo-complemento')) {
            return;
        }

        const nomeCampo =
            elemento.querySelector('.nome-grupo');

        const minCampo =
            elemento.querySelector('.min-grupo');

        const maxCampo =
            elemento.querySelector('.max-grupo');

        if (!nomeCampo || !minCampo || !maxCampo) {
            return;
        }

        const nome = nomeCampo.value.trim();
        const min = Number(minCampo.value);
        const max = Number(maxCampo.value);

        if (!nome) {
            return;
        }

        const opcoes = [];

        elemento
            .querySelectorAll('.opcao-complemento')
            .forEach(opcao => {

                const nomeOpcao =
                    opcao.querySelector('.nome-opcao');

                const precoOpcao =
                    opcao.querySelector('.preco-opcao');

                if (!nomeOpcao || !precoOpcao) {
                    return;
                }

                if (!nomeOpcao.value.trim()) {
                    return;
                }

                opcoes.push({
                    nome: nomeOpcao.value.trim(),
                    preco: Number(precoOpcao.value) || 0
                });

            });

        grupos.push({
            nome: nome,
            min: min,
            max: max,
            opcoes: opcoes
        });

    });

    console.log('GRUPOS COLETADOS:', grupos);

    return grupos;
}


/* =========================================================
   BOTÃO SAIR
========================================================= */

document.getElementById(
    'btn-sair'
).addEventListener(
    'click',
    () => {

        localStorage.removeItem(
            'usuarioLogado'
        );

        window.location.href =
            '../../login/index.html';

    }
);


/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function renderizarTudo() {

    renderizarCategorias();

    atualizarSelectCategorias();

    renderizarProdutos();

}


/* =========================================================
   INICIALIZA
========================================================= */

carregarCategorias();
carregarProdutos();