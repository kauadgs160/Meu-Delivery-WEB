const perfilPermitido = document.body.dataset.perfil;

const usuarioAtual = JSON.parse(
    localStorage.getItem('usuarioLogado')
);

if (!usuarioAtual) {

    window.location.href = '../../login/index.html';

} else if (usuarioAtual.perfil !== perfilPermitido) {

    window.location.href = '../../login/index.html';

}


/* ==================================================
   ENVIA O TOKEN AUTOMATICAMENTE PARA A API
================================================== */

const fetchOriginal = window.fetch.bind(window);

window.fetch = function(url, opcoes = {}) {

    const token = localStorage.getItem('token');

    const config = {
        ...opcoes,
        headers: new Headers(opcoes.headers || {})
    };

    if (
        token &&
        typeof url === 'string' &&
        url.startsWith('http://localhost:3000')
    ) {

        config.headers.set(
            'Authorization',
            `Bearer ${token}`
        );

    }

    return fetchOriginal(url, config);
};