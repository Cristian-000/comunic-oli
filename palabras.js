document.addEventListener('DOMContentLoaded', () => {
    // --- CONTROL DEL BOTÓN ATRÁS DEL MÓVIL ---
    // Añadimos un estado "falso" a la memoria del celular
    window.history.pushState({ pagina: "minijuego" }, "", "");

    // Cuando el usuario presiona el botón físico de "Atrás"
    window.addEventListener('popstate', function(event) {
        // En lugar de ir a donde el celular quiere, lo forzamos a ir al inicio
        window.location.replace('index.html');
    });
    // ------------------------------------------

    // --- ELEMENTOS DEL DOM ---
    const pictogramaImg = document.getElementById('pictograma-img');
    const respuestaContainer = document.getElementById('respuesta-container');
    const letrasContainer = document.getElementById('letras-container');
    const feedbackEl = document.getElementById('feedback-palabras');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');

    // --- FUNCIONES DE AUDIO (100% Nativo Offline) ---
    function hablarTextoIndividual(texto) {
        if (!texto || texto.trim() === '') return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            // Bajar un poco la velocidad ayuda a la comprensión de los niños
            utterance.rate = 0.85; 
            window.speechSynthesis.speak(utterance);
        }
    }

    // --- LISTA DE PALABRAS ---
    const LISTA_PALABRAS = [
        { palabra: "SOL", picto: "sol" },
        { palabra: "CASA", picto: "casa" },
        { palabra: "GATO", picto: "gato" },
        { palabra: "PERRO", picto: "perro" },
        { palabra: "MESA", picto: "mesa" },
        { palabra: "MANO", picto: "mano" },
        { palabra: "PELOTA", picto: "pelota" },
        { palabra: "COCHE", picto: "coche" },
        { palabra: "ARBOL", picto: "arbol" },
        { palabra: "FLOR", picto: "flor" },
        { palabra: "NIÑO", picto: "niño" },
        { palabra: "LIBRO", picto: "libro" },
        { palabra: "LUNA", picto: "luna" },
        { palabra: "TREN", picto: "tren" },
        { palabra: "OSO", picto: "oso" },
        { palabra: "PEZ", picto: "pez" },
        { palabra: "PATO", picto: "pato" },
        { palabra: "UVA", picto: "uva" },
        { palabra: "LECHE", picto: "leche" },
        { palabra: "PALA", picto: "pala" },
        { palabra: "PIE", picto: "pie" },
        { palabra: "BOCA", picto: "boca" },
        { palabra: "OJO", picto: "ojo" },
        { palabra: "NARIZ", picto: "nariz" },
        { palabra: "CAMA", picto: "cama" },
        { palabra: "SILLA", picto: "silla" },
        { palabra: "AVE", picto: "ave" },
        { palabra: "PAN", picto: "pan" },
        { palabra: "FRIO", picto: "frio" },
        { palabra: "CALOR", picto: "calor" },
        { palabra: "AGUA", picto: "agua" }
    ];

    // --- ESTADO DEL JUEGO ---
    let palabrasRestantes = [];
    let palabraActual = null;
    let letrasAdivinadas = 0;

    // --- FUNCIONES DEL JUEGO ---
    function mezclarArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async function iniciarNuevaPalabra() {
        feedbackEl.textContent = '';
        letrasAdivinadas = 0;
        siguienteBtn.classList.add('hidden');

        if (palabrasRestantes.length === 0) {
            palabrasRestantes = [...LISTA_PALABRAS];
        }

        const indicePalabra = Math.floor(Math.random() * palabrasRestantes.length);
        palabraActual = palabrasRestantes.splice(indicePalabra, 1)[0];

        const pictogramaContainer = document.getElementById('pictograma-container');
        pictogramaContainer.innerHTML = ''; 

        pictogramaImg.src = 'imagenes/placeholder.png'; 
        const urlPicto = await obtenerUrlPictograma(palabraActual.picto);
        pictogramaImg.src = urlPicto;

        pictogramaContainer.appendChild(pictogramaImg);

        const parlanteIconBtn = document.createElement('button');
        parlanteIconBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        parlanteIconBtn.className = 'parlante-icon-btn';
        parlanteIconBtn.setAttribute('aria-label', `Escuchar la palabra ${palabraActual.palabra}`);
        pictogramaContainer.appendChild(parlanteIconBtn);

        pictogramaContainer.style.cursor = 'pointer';
        pictogramaContainer.setAttribute('aria-label', `Escuchar la palabra ${palabraActual.palabra}`);
        pictogramaContainer.onclick = () => hablarTextoIndividual(palabraActual.palabra);

        respuestaContainer.innerHTML = '';
        letrasContainer.innerHTML = '';

        palabraActual.palabra.split('').forEach(() => {
            const casillero = document.createElement('div');
            casillero.className = 'casillero';
            respuestaContainer.appendChild(casillero);
        });

        const letrasMezcladas = mezclarArray([...palabraActual.palabra]);
        letrasMezcladas.forEach(letra => {
            const letraBtn = document.createElement('button');
            letraBtn.className = 'letra-btn';
            letraBtn.textContent = letra;
            letraBtn.onclick = () => manejarClickLetra(letra, letraBtn);
            letrasContainer.appendChild(letraBtn);
        });
    }

    function manejarClickLetra(letra, boton) {
        if (boton.classList.contains('usado')) return;

        // Leer la letra en voz alta al tocarla
        hablarTextoIndividual(letra.toLowerCase());

        if (palabraActual.palabra[letrasAdivinadas] === letra) {
            boton.classList.add('usado');
            const casillero = respuestaContainer.children[letrasAdivinadas];
            casillero.textContent = letra;
            casillero.classList.add('lleno');
            letrasAdivinadas++;

            if (letrasAdivinadas === palabraActual.palabra.length) {
                palabraCompletada();
            }
        } else {
            if(audioIncorrecto) audioIncorrecto.play();
            boton.style.animation = 'shake 0.5s';
            setTimeout(() => boton.style.animation = '', 500);
        }
    }

    function palabraCompletada() {
        if(audioCorrecto) audioCorrecto.play();
        feedbackEl.textContent = '¡Muy Bien!';
        siguienteBtn.classList.remove('hidden');
        hablarTextoIndividual(palabraActual.palabra);
        
        // Lanzar confeti (recompensa visual)
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#1b74e4', '#28a745', '#ffc107', '#dc3545']
            });
        }
    }

    async function obtenerUrlPictograma(texto) {
        try {
            const url = `https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(texto)}`;
            const res = await fetch(url);
            const data = await res.json();
            return data.length > 0 ? `https://api.arasaac.org/api/pictograms/${data[0]._id}` : 'imagenes/placeholder.png';
        } catch (error) {
            return 'imagenes/placeholder.png';
        }
    }

    // --- INICIALIZACIÓN ---
    siguienteBtn.addEventListener('click', iniciarNuevaPalabra);
    iniciarNuevaPalabra();
});

// Estilos dinámicos para el error
const style = document.createElement('style');
style.innerHTML = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
}`;
document.head.appendChild(style);
