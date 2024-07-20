document.addEventListener('DOMContentLoaded', () => {
    const rateSlider = document.getElementById('rate-slider');
    const pitchSlider = document.getElementById('pitch-slider');
    const rateValue = document.getElementById('rate-value');
    const pitchValue = document.getElementById('pitch-value');

    // Cargar valores guardados de localStorage
    const savedRate = localStorage.getItem('speechRate') || 1;
    const savedPitch = localStorage.getItem('speechPitch') || 1;

    if (savedRate) {
        rateSlider.value = savedRate;
        rateValue.textContent = savedRate;
    }

    if (savedPitch) {
        pitchSlider.value = savedPitch;
        pitchValue.textContent = savedPitch;
    }

    // Event listeners para actualizar los valores en localStorage
    rateSlider.addEventListener('input', () => {
        const value = rateSlider.value;
        rateValue.textContent = value;
        localStorage.setItem('speechRate', value);
    });

    pitchSlider.addEventListener('input', () => {
        const value = pitchSlider.value;
        pitchValue.textContent = value;
        localStorage.setItem('speechPitch', value);
    });

    // Event listener para el botón de regresar
    document.getElementById('back-button-ajustes').addEventListener('click', () => {
        window.history.back();
    });
});
