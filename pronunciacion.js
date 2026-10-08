document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const targetTextEl = document.getElementById('target-text');
    const targetDisplayContainer = document.getElementById('target-display-container'); 
    const startRecognitionBtn = document.getElementById('start-recognition-btn');
    const recognitionFeedbackEl = document.getElementById('recognition-feedback');
    const resultFeedbackEl = document.getElementById('result-feedback');
    const nextItemBtn = document.getElementById('next-item-btn');
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');

    // --- LISTA INTELIGENTE DE PRONUNCIACIÓN (Fonemas y Palabras) ---
    // mostrar: Letra o palabra en pantalla
    // hablar: Cómo lo pronuncia la tablet (fonética)
    // aceptado: Qué palabras o letras acepta el micrófono como correctas
    const ITEMS_PRONUNCIACION = [
        // Vocales
        { mostrar: "A", hablar: "a", aceptado: ["a", "ah"] },
        { mostrar: "E", hablar: "e", aceptado: ["e", "eh"] },
        { mostrar: "I", hablar: "i", aceptado: ["i", "y"] },
        { mostrar: "O", hablar: "o", aceptado: ["o", "oh"] },
        { mostrar: "U", hablar: "u", aceptado: ["u", "uh"] },
        
        // Consonantes (Sonidos fonéticos alargados)
        { mostrar: "M", hablar: "mmmm", aceptado: ["m", "eme", "mmmm", "mm", "hmm"] },
        { mostrar: "S", hablar: "ssss", aceptado: ["s", "ese", "ssss", "ss", "sh"] },
        { mostrar: "F", hablar: "ffff", aceptado: ["f", "efe", "ffff", "ff"] },
        { mostrar: "R", hablar: "rrrr", aceptado: ["r", "erre", "rrrr", "rr"] },
        { mostrar: "L", hablar: "llll", aceptado: ["l", "ele", "llll", "ll"] },
        
        // Consonantes cortas (Difíciles de aislar, se usa una vocal de apoyo muy leve)
        { mostrar: "P", hablar: "p...", aceptado: ["p", "pe", "pa"] },
        { mostrar: "T", hablar: "t...", aceptado: ["t", "te", "ta"] },
        
        // Palabras completas
        { mostrar: "SOL", hablar: "sol", aceptado: ["sol", "son"] },
        { mostrar: "CASA", hablar: "casa", aceptado: ["casa", "caza"] },
        { mostrar: "MESA", hablar: "mesa", aceptado: ["mesa", "meza"] },
        { mostrar: "GATO", hablar: "gato", aceptado: ["gato", "dato"] },
        { mostrar: "AGUA", hablar: "agua", aceptado: ["agua", "awa"] }
    ];

    let currentItem = null;
    let usedItems = [];

    // --- MOTOR NATIVO DE VOZ (Offline) ---
    function hablarTextoIndividual(texto) {
        if (!texto || texto.trim() === '') return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            // Velocidad más lenta para que el niño escuche bien el fonema
            utterance.rate = 0.7; 
            window.speechSynthesis.speak(utterance);
        }
    }

    // --- RECONOCIMIENTO DE VOZ (Micrófono) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            // Instrucción visual para el niño
            recognitionFeedbackEl.textContent = `Escuchando... Di "${currentItem.mostrar}"`; 
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
            console.error('Error de micrófono:', event.error);
            startRecognitionBtn.disabled = false;
            startRecognitionBtn.classList.remove('listening');
            nextItemBtn.classList.remove('hidden');

            if (event.error === 'not-allowed') {
                recognitionFeedbackEl.textContent = 'Permiso de micrófono denegado.';
            } else if (event.error === 'no-speech') {
                recognitionFeedbackEl.textContent = 'No escuché nada. Intenta de nuevo.';
            } else {
                recognitionFeedbackEl.textContent = `Error: ${event.error}`;
            }
        };

        recognition.onend = () => {
            startRecognitionBtn.disabled = false;
            startRecognitionBtn.classList.remove('listening');
        };

    } else {
        recognitionFeedbackEl.textContent = 'Tu navegador no soporta el micrófono. Prueba con Chrome.';
        startRecognitionBtn.disabled = true;
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
        targetTextEl.textContent = currentItem.mostrar; // Muestra la letra (Ej: "M")
        
        recognitionFeedbackEl.textContent = '';
        resultFeedbackEl.textContent = '';
        resultFeedbackEl.classList.remove('correct-feedback', 'incorrect-feedback');
        nextItemBtn.classList.add('hidden');
        startRecognitionBtn.disabled = false;
        
        // Pronuncia el fonema automáticamente (Ej: "mmmm")
        hablarTextoIndividual(currentItem.hablar); 
    }

    // Función auxiliar para limpiar tildes y mayúsculas
    function normalizarTexto(texto) {
        return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }

    function checkPronunciation(spokenText) {
        const spokenNormal = normalizarTexto(spokenText);
        
        // Comprobar si lo que dijo coincide con alguna de las opciones aceptadas
        const esCorrecto = currentItem.aceptado.some(opcion => normalizarTexto(opcion) === spokenNormal);

        if (esCorrecto || spokenNormal === normalizarTexto(currentItem.mostrar)) {
            resultFeedbackEl.textContent = '¡Correcto! ¡Muy bien!';
            resultFeedbackEl.classList.add('correct-feedback');
            resultFeedbackEl.classList.remove('incorrect-feedback');
            if(audioCorrecto) audioCorrecto.play();
        } else {
            resultFeedbackEl.textContent = `Intenta de nuevo. (Escuché: "${spokenText}")`;
            resultFeedbackEl.classList.add('incorrect-feedback');
            resultFeedbackEl.classList.remove('correct-feedback');
            if(audioIncorrecto) audioIncorrecto.play();
        }
        nextItemBtn.classList.remove('hidden');
    }

    // --- EVENTOS ---
    
    // Al tocar el recuadro gigante, repite el sonido fonético
    targetDisplayContainer.addEventListener('click', () => {
        hablarTextoIndividual(currentItem.hablar);
    });
    
    startRecognitionBtn.addEventListener('click', () => {
        if (recognition) {
            try {
                recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
    });

    nextItemBtn.addEventListener('click', startNewRound);

    // Iniciar el juego
    startNewRound();
});
