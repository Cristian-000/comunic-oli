document.addEventListener('DOMContentLoaded', () => {
    const rateSlider = document.getElementById('rate-slider');
    const pitchSlider = document.getElementById('pitch-slider');
    const rateValue = document.getElementById('rate-value');
    const pitchValue = document.getElementById('pitch-value');
    const voiceSelect = document.getElementById('voice-select');

    // --- LÓGICA PARA CARGAR LAS VOCES ---

    let voices = [];

    function populateVoiceList() {
        voices = window.speechSynthesis.getVoices();
        const savedVoiceName = localStorage.getItem('selectedVoiceName');
        voiceSelect.innerHTML = ''; // Limpiar el select

        voices.forEach(voice => {
            // Mostrar solo las voces en español para que la lista sea más limpia
            if (voice.lang.startsWith('es')) {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                
                // Atributo para guardar el nombre único de la voz
                option.setAttribute('data-name', voice.name);
                
                // Si esta es la voz que el usuario ya había guardado, la pre-seleccionamos
                if (voice.name === savedVoiceName) {
                    option.selected = true;
                }

                voiceSelect.appendChild(option);
            }
        });
        
        // Si no hay voces en español, mostrar un mensaje
        if (voiceSelect.options.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'No se encontraron voces en español';
            voiceSelect.appendChild(option);
        }
    }

    // El navegador carga las voces de forma asíncrona.
    // Usamos este evento para saber cuándo están listas.
    window.speechSynthesis.onvoiceschanged = populateVoiceList;

    // --- LÓGICA DE LOS SLIDERS Y SELECTOR ---

    // Cargar valores guardados de localStorage
    const savedRate = localStorage.getItem('speechRate') || 1;
    const savedPitch = localStorage.getItem('speechPitch') || 1;

    if (rateSlider) {
        rateSlider.value = savedRate;
        rateValue.textContent = savedRate;
        
        rateSlider.addEventListener('input', () => {
            const value = rateSlider.value;
            rateValue.textContent = value;
            localStorage.setItem('speechRate', value);
        });
    }

    if (pitchSlider) {
        pitchSlider.value = savedPitch;
        pitchValue.textContent = savedPitch;

        pitchSlider.addEventListener('input', () => {
            const value = pitchSlider.value;
            pitchValue.textContent = value;
            localStorage.setItem('speechPitch', value);
        });
    }

    if (voiceSelect) {
        voiceSelect.addEventListener('change', () => {
            const selectedOption = voiceSelect.selectedOptions[0];
            const voiceName = selectedOption.getAttribute('data-name');
            localStorage.setItem('selectedVoiceName', voiceName);
        });
    }

    // Event listener para el botón de regresar
    document.getElementById('back-button-ajustes').addEventListener('click', () => {
        window.history.back();
    });
});
/*document.addEventListener('DOMContentLoaded', () => {
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
*/