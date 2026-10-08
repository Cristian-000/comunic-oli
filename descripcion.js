document.addEventListener('DOMContentLoaded', () => {

    // --- CONTROL DEL BOTÓN ATRÁS DEL MÓVIL ---
    window.history.pushState({ pagina: "minijuego" }, "", "");
    window.addEventListener('popstate', function(event) {
        window.location.replace('index.html');
    });
    // ------------------------------------------

    const pictogramaImg = document.getElementById('pictograma-img');
    const opcionesContainer = document.getElementById('opciones-container');
    const feedbackEl = document.getElementById('feedback-descripcion');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const pictogramaContainer = document.getElementById('pictograma-container'); 
    
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');

    function hablarTextoIndividual(texto) {
        if (!texto || texto.trim() === '') return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }

    // Volvemos a la lista solo de palabras
    const LISTA_PALABRAS = [
        "SOL", "CASA", "GATO", "AGUA", "PERRO", "MESA", "MANO", "PELOTA",
        "COCHE", "ÁRBOL", "FLOR", "NIÑO", "LIBRO", "LUNA", "TREN", "OSO",
        "PEZ", "PATO", "UVA", "LECHE", "PIE", "BOCA", "OJO", "CAMA", "SILLA",
        "PAN", "GRANDE", "ROJO", "AZUL", "DORMIR", "COMER", "JUGAR", "CORRER",
        "FELIZ", "TRISTE"
    ];

    let palabraActual = null;
    let palabrasUsadas = [];
    const cachePictogramas = {}; // Memoria para que carguen rápido después de la 1ra vez

    // BUSCADOR AUTOMÁTICO (El método seguro)
    async function obtenerUrlPictogramaSeguro(palabra) {
        if (cachePictogramas[palabra]) return cachePictogramas[palabra];
        try {
            const url = `https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(palabra.toLowerCase())}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && data.length > 0) {
                const pictoUrl = `https://api.arasaac.org/api/pictograms/${data[0]._id}?download=false`;
                cachePictogramas[palabra] = pictoUrl;
                return pictoUrl;
            }
            return 'imagenes/placeholder.png';
        } catch (error) {
            return 'imagenes/placeholder.png';
        }
    }

    function mezclarArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async function iniciarNuevaRonda() {
        feedbackEl.textContent = '';
        feedbackEl.className = 'feedback-texto';
        siguienteBtn.classList.add('hidden');
        opcionesContainer.innerHTML = '';
        
        // Estado de carga visual
        pictogramaImg.src = 'imagenes/placeholder.png';
        pictogramaImg.style.opacity = '0.5';
        
        let palabrasDisponibles = LISTA_PALABRAS.filter(p => !palabrasUsadas.includes(p));
        if (palabrasDisponibles.length === 0) {
            palabrasUsadas = [];
            palabrasDisponibles = LISTA_PALABRAS;
        }
        
        const indiceCorrecto = Math.floor(Math.random() * palabrasDisponibles.length);
        palabraActual = palabrasDisponibles[indiceCorrecto];
        palabrasUsadas.push(palabraActual);
        
        // Buscar y mostrar imagen segura
        const urlPicto = await obtenerUrlPictogramaSeguro(palabraActual);
        pictogramaImg.src = urlPicto;
        pictogramaImg.style.opacity = '1';

        hablarTextoIndividual("¿Qué ves?");
        
        let opciones = [palabraActual];
        let palabrasIncorrectas = LISTA_PALABRAS.filter(p => p !== palabraActual);
        palabrasIncorrectas = mezclarArray(palabrasIncorrectas);

        for (let i = 0; i < 3 && i < palabrasIncorrectas.length; i++) {
            opciones.push(palabrasIncorrectas[i]);
        }
        
        const opcionesMezcladas = mezclarArray(opciones);

        opcionesMezcladas.forEach(palabra => {
            const opcionBtn = document.createElement('button');
            opcionBtn.className = 'opcion-btn';
            opcionBtn.textContent = palabra;
            opcionBtn.onclick = () => manejarClickOpcion(palabra, opcionBtn);
            opcionesContainer.appendChild(opcionBtn);
        });
    }
    
    function manejarClickOpcion(palabraElegida, boton) {
        hablarTextoIndividual(palabraElegida);
        opcionesContainer.querySelectorAll('.opcion-btn').forEach(btn => btn.disabled = true);

        if (palabraElegida === palabraActual) {
            if(audioCorrecto) audioCorrecto.play();
            feedbackEl.textContent = '¡Excelente!';
            feedbackEl.classList.add('correcto-texto');
            boton.classList.add('correcto');

            if (typeof confetti === 'function') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
        } else {
            if(audioIncorrecto) audioIncorrecto.play();
            feedbackEl.textContent = 'Intenta otra vez';
            feedbackEl.classList.add('incorrecto-texto');
            boton.classList.add('incorrecto');
            
            opcionesContainer.querySelectorAll('.opcion-btn').forEach(btn => {
                if (btn.textContent === palabraActual) {
                    btn.classList.add('correcto-sutil'); 
                }
            });
        }
        siguienteBtn.classList.remove('hidden');
    }

    pictogramaContainer.addEventListener('click', () => hablarTextoIndividual(palabraActual));
    siguienteBtn.addEventListener('click', iniciarNuevaRonda);

    iniciarNuevaRonda();
});
