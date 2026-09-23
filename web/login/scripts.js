const botaoLogin = document.getElementById('btn-login');
const mensagemErro = document.getElementById('mensagem-erro');

botaoLogin.addEventListener('click', async () => {


const email = document.getElementById('email').value;
const senha = document.getElementById('senha').value;

// Esconde a mensagem anterior
mensagemErro.style.display = 'none';

if (!email || !senha) {

    mensagemErro.querySelector('p').textContent =
        'Preencha o e-mail e a senha.';

    mensagemErro.style.display = 'flex';

    return;
}

try {

    const resposta = await fetch('http://localhost:3000/login', {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            email: email,
            senha: senha
        })
    });

    const dados = await resposta.json();

    if (resposta.ok) {

        localStorage.setItem(
            'usuarioLogado',
            JSON.stringify(dados.usuario)
        );

        localStorage.setItem(
            'token',
            dados.token
        );

        const perfil = dados.usuario.perfil;

        if (perfil === 'ADMINISTRADOR') {

            window.location.href = '../home/home-adm/index.html';

        } else if (perfil === 'LOJA') {

            window.location.href = '../home/home-loja/index.html';

        } else {

            mensagemErro.querySelector('p').textContent =
                'Este perfil não possui acesso à versão web.';

            mensagemErro.style.display = 'flex';
        }

    } else {

        mensagemErro.querySelector('p').textContent =
            'E-mail ou senha inválidos.';

        mensagemErro.style.display = 'flex';
    }

} catch (erro) {

    console.error(erro);

    mensagemErro.querySelector('p').textContent =
        'Não foi possível conectar com a API.';

    mensagemErro.style.display = 'flex';
}

});
