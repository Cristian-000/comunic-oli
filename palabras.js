document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const pictogramaImg = document.getElementById('pictograma-img');
    const respuestaContainer = document.getElementById('respuesta-container');
    const letrasContainer = document.getElementById('letras-container');
    const feedbackEl = document.getElementById('feedback-palabras');
    const siguienteBtn = document.getElementById('siguiente-btn');
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');

    // --- BASE DE DATOS Y FUNCIONES DE AUDIO ---
    let db;
    let audioPlayer;

    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('comunicador-db-v4', 1); // Asegúrate de que el nombre y versión sean consistentes
            request.onerror = e => reject(e.target.error);
            request.onsuccess = e => resolve(e.target.result);
            request.onupgradeneeded = e => {
                const dbInstance = e.target.result;
                if (!dbInstance.objectStoreNames.contains('audios')) {
                    dbInstance.createObjectStore('audios');
                }
                if (!dbInstance.objectStoreNames.contains('pictogramas')) {
                    dbInstance.createObjectStore('pictogramas');
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
            console.log("DB de palabras.js inicializada.");
        } catch (error) {
            console.error("No se pudo inicializar la base de datos en palabras.js", error);
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
    // --- FIN BLOQUE DE BASE DE DATOS Y AUDIO ---

 // --- LISTA DE PALABRAS ---
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
    { palabra: "CAFÉ", picto: "cafe" },
    { palabra: "FRIO", picto: "frio" },
    { palabra: "CALOR", picto: "calor" },
    { palabra: "GRANDE", picto: "grande" },
    { palabra: "PEQUEÑO", picto: "pequeno" },
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
    { palabra: "AGUA", picto: "agua" },
    { palabra: "LEER", picto: "leer" },
    { palabra: "ESCRIBIR", picto: "escribir" },
    { palabra: "LAPIZ", picto: "lapiz" },
    { palabra: "CUADERNO", picto: "cuaderno" },
    { palabra: "COLEGIO", picto: "colegio" },
    { palabra: "AMIGO", picto: "amigo" },
    { palabra: "FAMILIA", picto: "familia" }
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
        // Reiniciar estado
        feedbackEl.textContent = '';
        letrasAdivinadas = 0;
        siguienteBtn.classList.add('hidden');

        // Si no quedan palabras, reiniciar la lista
        if (palabrasRestantes.length === 0) {
            palabrasRestantes = [...LISTA_PALABRAS];
        }

        // Seleccionar y remover una palabra al azar
        const indicePalabra = Math.floor(Math.random() * palabrasRestantes.length);
        palabraActual = palabrasRestantes.splice(indicePalabra, 1)[0];

        const pictogramaContainer = document.getElementById('pictograma-container');

        // Limpiar el contenedor antes de añadir la imagen y el botón
        pictogramaContainer.innerHTML = ''; // Limpiamos para quitar el icono anterior si lo había

        // Cargar pictograma
        pictogramaImg.src = 'imagenes/placeholder.png'; // Placeholder mientras carga
        const urlPicto = await obtenerUrlPictograma(palabraActual.picto);
        pictogramaImg.src = urlPicto;

        // Añadir el pictograma al contenedor
        pictogramaContainer.appendChild(pictogramaImg);

        // --- NUEVO: Crear y añadir el botón de parlante (icono) ---
        const parlanteIconBtn = document.createElement('button');
        parlanteIconBtn.innerHTML = '<i class="fas fa-volume-up"></i>'; // Icono de Font Awesome
        parlanteIconBtn.className = 'parlante-icon-btn'; // Nueva clase para estilos
        parlanteIconBtn.setAttribute('aria-label', `Escuchar la palabra ${palabraActual.palabra}`);
        // El onclick de este botón no hace nada directamente, el sonido lo maneja el contenedor
        // Esto es para que el icono sea solo visualmente cliqueable, pero el contenedor grande maneje la acción.
        // Si quieres que solo el icono sea cliqueable, quita el onclick del pictogramaContainer y ponlo aquí.
        // En este caso, lo dejamos para que el icono sea una "señal" pero toda el área sea clic.
        pictogramaContainer.appendChild(parlanteIconBtn);
        // --- FIN NUEVO ---

        // Hacer todo el contenedor del pictograma un botón cliqueable para el sonido
        pictogramaContainer.style.cursor = 'pointer';
        pictogramaContainer.setAttribute('aria-label', `Escuchar la palabra ${palabraActual.palabra}`);
        pictogramaContainer.onclick = () => hablarTextoIndividual(palabraActual.palabra);


        // Limpiar contenedores de respuesta y letras
        respuestaContainer.innerHTML = '';
        letrasContainer.innerHTML = '';

        // Crear casilleros de respuesta vacíos
        palabraActual.palabra.split('').forEach(() => {
            const casillero = document.createElement('div');
            casillero.className = 'casillero';
            respuestaContainer.appendChild(casillero);
        });

        // Crear botones de letras desordenadas
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

        // Comprueba si la letra es la correcta en la secuencia
        if (palabraActual.palabra[letrasAdivinadas] === letra) {
            // ¡Correcto!
            boton.classList.add('usado');
            const casillero = respuestaContainer.children[letrasAdivinadas];
            casillero.textContent = letra;
            casillero.classList.add('lleno');
            letrasAdivinadas++;

            // Comprobar si se completó la palabra
            if (letrasAdivinadas === palabraActual.palabra.length) {
                palabraCompletada();
            }
        } else {
            // Incorrecto
            if(audioIncorrecto) audioIncorrecto.play();
            boton.style.animation = 'shake 0.5s';
            setTimeout(() => boton.style.animation = '', 500);
        }
    }

    function palabraCompletada() {
        if(audioCorrecto) audioCorrecto.play();
        feedbackEl.textContent = '¡Muy Bien!';
        siguienteBtn.classList.remove('hidden');
    }

    async function obtenerUrlPictograma(texto) {
        try {
            const url = `https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(texto)}`;
            const res = await fetch(url);
            const data = await res.json();
            return data.length > 0 ? `https://api.arasaac.org/api/pictograms/${data[0]._id}` : 'imagenes/placeholder.png';
        } catch (error) {
            console.error("Error al buscar pictograma:", error);
            return 'imagenes/placeholder.png';
        }
    }

    // --- INICIALIZACIÓN ---
    siguienteBtn.addEventListener('click', iniciarNuevaPalabra);
    iniciarNuevaPalabra();
});

// Añadimos la animación de "shake" si no está en el CSS principal
const style = document.createElement('style');
style.innerHTML = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
}`;
document.head.appendChild(style);