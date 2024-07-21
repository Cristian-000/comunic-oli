// Event listener para el botón de regresar en escribir.html
const backButtonUsuario = document.getElementById('back-button-usuario');
if (backButtonUsuario) {
    backButtonUsuario.addEventListener('click', () => {
        window.history.back();
    });
