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
    const opcionesContainer = document.getElementById('opciones-container');
    const feedbackEl = document.getElementById('feedback-descripcion');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const pictogramaContainer = document.getElementById('pictograma-container'); 
    
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');

    // --- MOTOR NATIVO DE VOZ (Offline) ---
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

    // --- LISTA DE PALABRAS (Con IDs fijos de ARASAAC para carga instantánea) ---
    const LISTA_PALABRAS = [
        { palabra: "SOL", id: 2772 },
        { palabra: "CASA", id: 2277 },
        { palabra: "GATO", id: 2414 },
        { palabra: "AGUA", id: 2311 },
        { palabra: "PERRO", id: 2415 },
        { palabra: "MESA", id: 3266 },
        { palabra: "MANO", id: 2289 },
        { palabra: "PELOTA", id: 2884 },
        { palabra: "COCHE", id: 2420 },
        { palabra: "ÁRBOL", id: 2626 },
        { palabra: "FLOR", id: 2623 },
        { palabra: "NIÑO", id: 2261 }, 
        { palabra: "LIBRO", id: 3173 },
        { palabra: "LUNA", id: 2771 },
        { palabra: "TREN", id: 2424 },
        { palabra: "OSO", id: 2397 },
        { palabra: "PEZ", id: 2410 },
        { palabra: "PATO", id: 2411 },
        { palabra: "UVA", id: 2344 },
        { palabra: "LECHE", id: 2309 },
        { palabra: "PIE", id: 2292 },
        { palabra: "BOCA", id: 2285 },
        { palabra: "OJO", id: 2284 },
        { palabra: "CAMA", id: 3262 },
        { palabra: "SILLA", id: 3267 },
        { palabra: "PAN", id: 2331 },
        { palabra: "GRANDE", id: 4945 },
        { palabra: "ROJO", id: 2795 },
        { palabra: "AZUL", id: 2796 },
        { palabra: "DORMIR", id: 2603 },
        { palabra: "COMER", id: 2596 },
        { palabra: "JUGAR", id: 2589 },
        { palabra: "CORRER", id: 2588 },
        { palabra: "FELIZ", id: 2854 },
        { palabra: "TRISTE", id: 2857 }
    ];

    // --- ESTADO DEL JUEGO ---
    let palabraActual = null;
    let palabrasUsadas = [];

    // --- FUNCIONES AUXILIARES ---
    function mezclarArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- LÓGICA DEL JUEGO DE DESCRIPCIÓN ---
    function iniciarNuevaRonda() {
        // Reiniciar estado
        feedbackEl.textContent = '';
        feedbackEl.className = 'feedback-texto';
        siguienteBtn.classList.add('hidden');
        opcionesContainer.innerHTML = '';
        pictogramaImg.style.opacity = '0'; // Efecto de aparición
        
        let palabrasDisponibles = LISTA_PALABRAS.filter(p => !palabrasUsadas.includes(p.palabra));
        if (palabrasDisponibles.length === 0) {
            palabrasUsadas = [];
            palabrasDisponibles = LISTA_PALABRAS;
        }
        
        const indiceCorrecto = Math.floor(Math.random() * palabrasDisponibles.length);
        palabraActual = palabrasDisponibles[indiceCorrecto];
        palabrasUsadas.push(palabraActual.palabra);
        
        // Cargar pictograma instantáneo
        pictogramaImg.src = `https://api.arasaac.org/api/pictograms/${palabraActual.id}?download=false`;
        pictogramaImg.onload = () => { pictogramaImg.style.opacity = '1'; }; // Muestra cuando carga

        // Animar entrada de pregunta
        hablarTextoIndividual("¿Qué ves?");
        
        // Crear opciones (1 correcta + 3 incorrectas)
        let opciones = [palabraActual.palabra];
        let palabrasIncorrectas = LISTA_PALABRAS.filter(p => p.palabra !== palabraActual.palabra);
        palabrasIncorrectas = mezclarArray(palabrasIncorrectas);

        for (let i = 0; i < 3 && i < palabrasIncorrectas.length; i++) {
            opciones.push(palabrasIncorrectas[i].palabra);
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
        // Leer la palabra que tocó el niño
        hablarTextoIndividual(palabraElegida);

        opcionesContainer.querySelectorAll('.opcion-btn').forEach(btn => btn.disabled = true);

        if (palabraElegida === palabraActual.palabra) {
            // Correcto
            if(audioCorrecto) audioCorrecto.play();
            feedbackEl.textContent = '¡Excelente!';
            feedbackEl.classList.add('correcto-texto');
            boton.classList.add('correcto');

            // Lanzar confeti
            if (typeof confetti === 'function') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }

        } else {
            // Incorrecto
            if(audioIncorrecto) audioIncorrecto.play();
            feedbackEl.textContent = 'Intenta otra vez';
            feedbackEl.classList.add('incorrecto-texto');
            boton.classList.add('incorrecto');
            
            // Mostrar la correcta
            opcionesContainer.querySelectorAll('.opcion-btn').forEach(btn => {
                if (btn.textContent === palabraActual.palabra) {
                    btn.classList.add('correcto-sutil'); 
                }
            });
        }
        siguienteBtn.classList.remove('hidden');
    }

    // --- ASIGNACIÓN DE EVENTOS ---
    
    pictogramaContainer.addEventListener('click', () => {
        // Ayuda auditiva: dice la palabra de la imagen
        hablarTextoIndividual(palabraActual.palabra);
    });

    siguienteBtn.addEventListener('click', iniciarNuevaRonda);

    // Iniciar
    iniciarNuevaRonda();
});
