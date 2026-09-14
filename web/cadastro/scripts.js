const botaoCadastro = document.getElementById('btn-cadastro');

const mensagem = document.getElementById('mensagem');
const textoMensagem = document.getElementById('texto-mensagem');
const iconeMensagem = document.getElementById('icone-mensagem');

botaoCadastro.addEventListener('click', async () => {

const nome = document.getElementById('nome').value;
const email = document.getElementById('email').value;
const telefone = document.getElementById('telefone').value;
const senha = document.getElementById('senha').value;

const perfilSelecionado = document.querySelector(
    'input[name="perfil"]:checked'
);

mensagem.style.display = 'none';
mensagem.classList.remove('erro', 'sucesso');

if (!nome || !email || !telefone || !senha || !perfilSelecionado) {

    textoMensagem.textContent = 'Preencha todos os campos!';
    iconeMensagem.textContent = '!';

    mensagem.classList.add('erro');
    mensagem.style.display = 'flex';

    return;
}

const perfil = perfilSelecionado.value;

try {

    const resposta = await fetch('http://localhost:3000/usuarios', {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            nome: nome,
            email: email,
            telefone: telefone,
            senha: senha,
            perfil: perfil
        })
    });

    const dados = await resposta.json();

    if (resposta.ok) {

        textoMensagem.textContent =
            'Usuário cadastrado com sucesso!';

        iconeMensagem.textContent = '✓';

        mensagem.classList.add('sucesso');
        mensagem.style.display = 'flex';

        document.getElementById('nome').value = '';
        document.getElementById('email').value = '';
        document.getElementById('telefone').value = '';
        document.getElementById('senha').value = '';

        perfilSelecionado.checked = false;

    } else {

        textoMensagem.textContent =
            dados.mensagem || 'Não foi possível realizar o cadastro.';

        iconeMensagem.textContent = '!';

        mensagem.classList.add('erro');
        mensagem.style.display = 'flex';
    }

} catch (erro) {

    console.error(erro);

    textoMensagem.textContent =
        'Não foi possível conectar com a API.';

    iconeMensagem.textContent = '!';

    mensagem.classList.add('erro');
    mensagem.style.display = 'flex';
}

});
