const perfilPermitido = document.body.dataset.perfil;

const usuarioAtual = JSON.parse(
    localStorage.getItem('usuarioLogado')
);

if (!usuarioAtual) {
    window.location.href = '../../login/index.html';
} 
else if (usuarioAtual.perfil !== perfilPermitido) {
    window.location.href = '../../login/index.html';
}