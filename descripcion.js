document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const pictogramaImg = document.getElementById('pictograma-img');
    const opcionesContainer = document.getElementById('opciones-container');
    const feedbackEl = document.getElementById('feedback-descripcion');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const parlanteBtnPregunta = document.getElementById('parlante-btn-pregunta'); // Referencia al icono del parlante
    const pictogramaContainer = document.getElementById('pictograma-container'); // Referencia a todo el contenedor del pictograma
    
    // Acceso a los elementos de audio directamente del DOM (rutas especificadas en HTML)
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');

    // --- BASE DE DATOS Y FUNCIONES DE AUDIO ---
    let db;
    let audioPlayer;

    async function initDB() {
        return new Promise((resolve, reject) => {
            // Se usa una versión diferente para evitar conflictos con otras bases de datos del mismo origen si las hubiera.
            const request = window.indexedDB.open('comunicador-db-descripcion-v1', 1);
            request.onerror = e => reject(e.target.error);
            request.onsuccess = e => resolve(e.target.result);
            request.onupgradeneeded = e => {
                const dbInstance = e.target.result;
                if (!dbInstance.objectStoreNames.contains('audios')) {
                    dbInstance.createObjectStore('audios');
                }
                if (!dbInstance.objectStoreNames.contains('pictogramas')) {
                    dbInstance.createObjectStore('pictogramas'); // Aunque no se usa directamente aquí, es buena práctica mantenerlo
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
            console.log("DB de descripcion.js inicializada.");
        } catch (error) {
            console.error("No se pudo inicializar la base de datos en descripcion.js", error);
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
            return null; // Devuelve null para que el fallback a SpeechSynthesis se active
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
                // Fallback a SpeechSynthesis si no se pudo obtener el audio por API/cache
                const utterance = new SpeechSynthesisUtterance(texto);
                utterance.lang = 'es-ES';
                window.speechSynthesis.speak(utterance);
                await new Promise(resolve => utterance.onend = resolve); // Esperar a que termine de hablar
            }
        } catch (error) {
            console.error("Error en reproducción individual de letra/palabra:", error);
        }
    }

    async function obtenerUrlPictograma(texto) {
        try {
            // También se podría cachear los pictogramas en IndexedDB, pero por simplicidad se omite aquí.
            const url = `https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(texto)}`;
            const res = await fetch(url);
            const data = await res.json();
            return data.length > 0 ? `https://api.arasaac.org/api/pictograms/${data[0]._id}` : 'imagenes/placeholder.png';
        } catch (error) {
            console.error("Error al buscar pictograma:", error);
            return 'imagenes/placeholder.png';
        }
    }
    // --- FIN BASE DE DATOS Y FUNCIONES DE AUDIO ---

    // --- LISTA DE PALABRAS ---
    const LISTA_PALABRAS = [
        { palabra: "SOL", picto: "sol" },
        { palabra: "CASA", picto: "casa" },
        { palabra: "GATO", picto: "gato" },
        { palabra: "AGUA", picto: "agua" },
        { palabra: "PERRO", picto: "perro" },
        { palabra: "MESA", picto: "mesa" },
        { palabra: "MANO", picto: "mano" },
        { palabra: "PELOTA", picto: "pelota" },
        { palabra: "COCHE", picto: "coche" },
        { palabra: "ARBOL", picto: "arbol" },
        { palabra: "FLOR", picto: "flor" },
        { palabra: "NIÑO", picto: "nino" }, 
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
        { palabra: "PAN", picto: "pan" },
        { palabra: "CAFE", picto: "cafe" }, 
        { palabra: "FRIO", picto: "frio" },
        { palabra: "CALOR", picto: "calor" },
        { palabra: "GRANDE", picto: "grande" },
        { palabra: "ROJO", picto: "rojo" },
        { palabra: "AZUL", picto: "azul" },
        { palabra: "VERDE", picto: "verde" },
        { palabra: "ABAJO", picto: "abajo" },
        { palabra: "ARRIBA", picto: "arriba" },
        { palabra: "DORMIR", picto: "dormir" },
        { palabra: "COMER", picto: "comer" },
        { palabra: "BEBER", picto: "beber" },
        { palabra: "JUGAR", picto: "jugar" },
        { palabra: "CORRER", picto: "correr" },
        { palabra: "SALTAR", picto: "saltar" },
        { palabra: "ESCUCHAR", picto: "escuchar" },
        { palabra: "MIRAR", picto: "mirar" },
        { palabra: "FELIZ", picto: "feliz" },
        { palabra: "TRISTE", picto: "triste" },
        { palabra: "LEER", picto: "leer" },
        { palabra: "ESCRIBIR", picto: "escribir" },
        { palabra: "LAPIZ", picto: "lapiz" }, 
        { palabra: "CUADERNO", picto: "cuaderno" },
        { palabra: "ESCUELA", picto: "escuela" },
        { palabra: "AMIGO", picto: "amigo" },
        { palabra: "FAMILIA", picto: "familia" }
    ];

    // --- ESTADO DEL JUEGO ---
    let palabraActual = null;
    let palabrasUsadas = []; // Para evitar repeticiones rápidas

    // --- FUNCIONES AUXILIARES ---

    function mezclarArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- LÓGICA DEL JUEGO DE DESCRIPCIÓN ---

    async function iniciarNuevaRonda() {
        // Reiniciar estado visual y botones
        feedbackEl.textContent = '';
        siguienteBtn.classList.add('hidden');
        opcionesContainer.innerHTML = '';
        
        // Seleccionar una palabra al azar para la respuesta correcta
        let palabrasDisponibles = LISTA_PALABRAS.filter(p => !palabrasUsadas.includes(p.palabra));
        if (palabrasDisponibles.length === 0) {
            palabrasUsadas = [];
            palabrasDisponibles = LISTA_PALABRAS;
        }
        
        const indiceCorrecto = Math.floor(Math.random() * palabrasDisponibles.length);
        palabraActual = palabrasDisponibles[indiceCorrecto];
        palabrasUsadas.push(palabraActual.palabra);
        if (palabrasUsadas.length > LISTA_PALABRAS.length / 2) { 
            palabrasUsadas.shift(); 
        }

        // Cargar pictograma de la palabra correcta
        pictogramaImg.src = 'imagenes/placeholder.png'; // Placeholder mientras carga
        const urlPicto = await obtenerUrlPictograma(palabraActual.picto);
        pictogramaImg.src = urlPicto;
        
        // Crear opciones de respuesta (una correcta y 3 incorrectas)
        let opciones = [];
        opciones.push(palabraActual.palabra); // La palabra correcta

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
        // Deshabilitar todos los botones de opción después de la selección
        opcionesContainer.querySelectorAll('.opcion-btn').forEach(btn => btn.disabled = true);

        if (palabraElegida === palabraActual.palabra) {
            // Correcto
            if(audioCorrecto) audioCorrecto.play();
            feedbackEl.textContent = '¡Muy Bien!';
            boton.classList.add('correcto');
        } else {
            // Incorrecto
            if(audioIncorrecto) audioIncorrecto.play();
            feedbackEl.textContent = '';
            boton.classList.add('incorrecto');
            // Resaltar la respuesta correcta
            opcionesContainer.querySelectorAll('.opcion-btn').forEach(btn => {
                if (btn.textContent === palabraActual.palabra) {
                    btn.classList.add('correcto');
                }
            });
        }
        // Mostrar el botón "Siguiente"
        siguienteBtn.classList.remove('hidden');
    }

    // --- ASIGNACIÓN DE EVENTOS E INICIALIZACIÓN ---
    
    // Al hacer clic en CUALQUIER PARTE del contenedor del pictograma, se reproduce el audio
    pictogramaContainer.addEventListener('click', () => {
        hablarTextoIndividual(palabraActual.palabra);
    });

    // El botón del parlante (icono) es parte del contenedor, no necesita su propio listener
    // para evitar doble reproducción. Si se cliquea directamente el icono, el evento burbujeará
    // hasta el contenedor y activará el listener de este.

    siguienteBtn.addEventListener('click', iniciarNuevaRonda);

    // Iniciar la primera ronda del juego
    iniciarNuevaRonda();
});