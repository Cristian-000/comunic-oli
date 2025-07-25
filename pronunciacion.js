document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const targetTextEl = document.getElementById('target-text');
    const listenTargetBtn = document.getElementById('listen-target-btn'); // El icono del parlante (visual)
    const targetDisplayContainer = document.getElementById('target-display-container'); // Todo el contenedor del texto/parlante
    const startRecognitionBtn = document.getElementById('start-recognition-btn');
    const recognitionFeedbackEl = document.getElementById('recognition-feedback');
    const resultFeedbackEl = document.getElementById('result-feedback');
    const nextItemBtn = document.getElementById('next-item-btn');
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');

    // --- LISTA DE PALABRAS/LETRAS PARA PRONUNCIAR ---
    const ITEMS_PRONUNCIACION = [
        "A", "E", "I", "O", "U",
        "M", "P", "S", "L", "T",
        "N", "D", "R", "C", "B",
        "V", "F", "G", "J", "Z",
        "SOL", "CASA", "MESA", "GATO", "LUNA", "AGUA", "ARBOL", "PERRO"
    ];

    // --- BASE DE DATOS Y FUNCIONES DE AUDIO ---
    let db;
    let audioPlayer;

    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('comunicador-db-pronunciacion-v1', 1); // Nueva DB para este juego
            request.onerror = e => reject(e.target.error);
            request.onsuccess = e => resolve(e.target.result);
            request.onupgradeneeded = e => {
                const dbInstance = e.target.result;
                if (!dbInstance.objectStoreNames.contains('audios')) {
                    dbInstance.createObjectStore('audios');
                }
            };
        });
    }

    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Inicializar la DB al cargar el script
    (async () => {
        try {
            db = await initDB();
            console.log("DB de pronunciacion.js inicializada.");
        } catch (error) {
            console.error("No se pudo inicializar la base de datos en pronunciacion.js", error);
            db = null;
        }
    })();

    async function obtenerAudio(texto) {
        if (!texto || texto.trim() === '') return null;
        try {
            if (!db) throw new Error("DB no disponible para audio.");
            const audioGuardado = await promisifyRequest(db.transaction('audios', 'readonly').objectStore('audios').get(texto));
            if (audioGuardado) return audioGuardado;

            const urlOriginal = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=es&client=tw-ob`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(urlOriginal)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Respuesta de red no válida para audio: ${response.statusText}`);
            const audioBlob = await response.blob();
            await promisifyRequest(db.transaction('audios', 'readwrite').objectStore('audios').put(audioBlob, texto));
            return audioBlob;
        } catch (error) {
            console.error(`Error al obtener audio para "${texto}":`, error);
            return null;
        }
    }

    function reproducirAudio(blob) {
        return new Promise((resolve, reject) => {
            if (!blob) return reject("Blob de audio nulo.");
            const url = URL.createObjectURL(blob);
            audioPlayer = new Audio(url);
            audioPlayer.onended = () => { URL.revokeObjectURL(url); resolve(); };
            audioPlayer.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            audioPlayer.play();
        });
    }

    async function hablarTextoIndividual(texto) {
        if (!texto || texto.trim() === '') return;
        try {
            const audioBlob = await obtenerAudio(texto);
            if (audioBlob) {
                await reproducirAudio(audioBlob);
            } else {
                const utterance = new SpeechSynthesisUtterance(texto);
                utterance.lang = 'es-ES';
                window.speechSynthesis.speak(utterance);
                await new Promise(resolve => utterance.onend = resolve);
            }
        } catch (error) {
            console.error("Error en reproducción individual de letra/palabra:", error);
        }
    }
    // --- FIN BASE DE DATOS Y FUNCIONES DE AUDIO ---

    // --- WEB SPEECH API (Reconocimiento de voz) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let currentItem = '';
    let usedItems = [];

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            recognitionFeedbackEl.textContent = 'Escuchando... Di "' + currentItem + '"'; // Guía al usuario
            recognitionFeedbackEl.classList.remove('correct-feedback', 'incorrect-feedback');
            startRecognitionBtn.classList.add('listening');
            startRecognitionBtn.disabled = true;
            nextItemBtn.classList.add('hidden');
            resultFeedbackEl.textContent = '';
        };

        recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            recognitionFeedbackEl.textContent = `Has dicho: "${result}"`;
            checkPronunciation(result);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            startRecognitionBtn.disabled = false;
            startRecognitionBtn.classList.remove('listening');
            nextItemBtn.classList.remove('hidden');

            if (event.error === 'not-allowed') {
                recognitionFeedbackEl.textContent = 'Permiso de micrófono denegado. Haz clic en "Hablar" de nuevo para solicitarlo o revisa la configuración del navegador.';
            } else if (event.error === 'no-speech') {
                recognitionFeedbackEl.textContent = 'No se detectó voz. Intenta de nuevo.';
            } else if (event.error === 'aborted') {
                recognitionFeedbackEl.textContent = 'Reconocimiento cancelado.';
            } else if (event.error === 'network') {
                recognitionFeedbackEl.textContent = 'Problema de red. Asegúrate de tener conexión.';
            } else {
                recognitionFeedbackEl.textContent = `Error: ${event.error}`;
            }
        };

        recognition.onend = () => {
            startRecognitionBtn.disabled = false;
            startRecognitionBtn.classList.remove('listening');
        };

    } else {
        recognitionFeedbackEl.textContent = 'Tu navegador no soporta el reconocimiento de voz. Prueba con Chrome o Edge.';
        startRecognitionBtn.disabled = true;
        listenTargetBtn.disabled = true; // Deshabilitar también el botón de escuchar si no hay soporte
    }

    // --- LÓGICA DEL JUEGO ---

    function getRandomItem() {
        let availableItems = ITEMS_PRONUNCIACION.filter(item => !usedItems.includes(item));
        if (availableItems.length === 0) {
            usedItems = [];
            availableItems = ITEMS_PRONUNCIACION;
        }
        const randomIndex = Math.floor(Math.random() * availableItems.length);
        const selectedItem = availableItems[randomIndex];
        usedItems.push(selectedItem);
        if (usedItems.length > ITEMS_PRONUNCIACION.length / 2) { 
            usedItems.shift(); 
        }
        return selectedItem;
    }

    function startNewRound() {
        currentItem = getRandomItem();
        targetTextEl.textContent = currentItem;
        recognitionFeedbackEl.textContent = '';
        resultFeedbackEl.textContent = '';
        resultFeedbackEl.classList.remove('correct-feedback', 'incorrect-feedback');
        nextItemBtn.classList.add('hidden');
        startRecognitionBtn.disabled = false;
        // Hablar el elemento automáticamente al iniciar la ronda para guiar al usuario
        hablarTextoIndividual(currentItem); 
    }

    async function checkPronunciation(spokenText) {
        const normalizedSpoken = spokenText.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normalizedTarget = currentItem.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Para permitir cierta flexibilidad, podríamos usar un umbral de similitud
        // Pero para empezar, una coincidencia exacta normalizada es lo más simple.
        if (normalizedSpoken === normalizedTarget) {
            resultFeedbackEl.textContent = '¡Correcto!';
            resultFeedbackEl.classList.add('correct-feedback');
            resultFeedbackEl.classList.remove('incorrect-feedback');
            if(audioCorrecto) audioCorrecto.play();
        } else {
            resultFeedbackEl.textContent = `Incorrecto. Has dicho "${spokenText}". Intenta de nuevo.`;
            resultFeedbackEl.classList.add('incorrect-feedback');
            resultFeedbackEl.classList.remove('correct-feedback');
            if(audioIncorrecto) audioIncorrecto.play();
        }
        nextItemBtn.classList.remove('hidden');
    }

    // --- ASIGNACIÓN DE EVENTOS E INICIALIZACIÓN ---
    
    // Al hacer clic en CUALQUIER PARTE del contenedor del texto, se reproduce el audio
    targetDisplayContainer.addEventListener('click', () => {
        hablarTextoIndividual(targetTextEl.textContent);
    });

    // El botón del parlante (listenTargetBtn) es visual, su clic es manejado por el contenedor padre.
    // Esto previene duplicidad de eventos.
    
    // Botón para iniciar el reconocimiento de voz
    startRecognitionBtn.addEventListener('click', () => {
        if (recognition) {
            // Intentar iniciar el reconocimiento. Esto solicitará permiso si es necesario.
            try {
                recognition.start();
            } catch (e) {
                // Manejar casos donde el reconocimiento ya está activo o hay un problema de permiso previo
                if (e.name === 'InvalidStateError') {
                    recognitionFeedbackEl.textContent = 'El micrófono ya está escuchando o no se pudo iniciar. Intenta de nuevo.';
                } else if (e.name === 'NotAllowedError') {
                     recognitionFeedbackEl.textContent = 'Permiso de micrófono denegado. Habilítalo en la configuración de tu navegador para este sitio.';
                } else {
                     recognitionFeedbackEl.textContent = `Error al iniciar el micrófono: ${e.message}`;
                }
                console.error('Error al iniciar el reconocimiento:', e);
                startRecognitionBtn.disabled = false;
                startRecognitionBtn.classList.remove('listening');
            }
        } else {
            recognitionFeedbackEl.textContent = 'El reconocimiento de voz no está disponible en tu navegador.';
        }
    });

    // Botón para pasar al siguiente elemento
    nextItemBtn.addEventListener('click', startNewRound);

    // Iniciar el juego
    startNewRound();
});