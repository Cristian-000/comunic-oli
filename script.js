document.addEventListener('DOMContentLoaded', async () => {
    let db;

    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('audios-db-v2', 1); // v2 para asegurar que sea una DB nueva
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

    try {
        db = await initDB();
        console.log("Base de datos inicializada correctamente.");
    } catch (error) {
        console.error("No se pudo inicializar la base de datos, la app funcionará sin guardar audios.", error);
        db = null;
    }

    let audioPlayer;

// --- FUNCIÓN hablarTexto CON PROXY CORS ---
async function hablarTexto(texto) {
    if (!texto || texto.trim() === '') return;
    
    if (audioPlayer && !audioPlayer.paused) {
        audioPlayer.pause();
    }

    try {
        // 1. Buscar en la base de datos primero
        const readTransaction = db.transaction('audios', 'readonly');
        const audioStore = readTransaction.objectStore('audios');
        const audioGuardado = await promisifyRequest(audioStore.get(texto));

        if (audioGuardado) {
            // 2. Si se encuentra, reproducirlo desde la base de datos
            console.log(`Reproduciendo audio cacheado para: "${texto}"`);
            const url = URL.createObjectURL(audioGuardado);
            audioPlayer = new Audio(url);
            await audioPlayer.play();
            URL.revokeObjectURL(url);
        } else {
            // 3. Si NO se encuentra, obtenerlo de la API externa usando el proxy
            console.log(`Obteniendo audio de API para: "${texto}"`);

            const encodedText = encodeURIComponent(texto);
            const originalUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=es&client=tw-ob`;
            
            // --- AQUÍ ESTÁ LA LÍNEA MÁGICA ---
            // Usamos un proxy para evitar el error de CORS
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`La respuesta de la red no fue válida: ${response.statusText}`);

            const audioBlob = await response.blob();

            // Guardar el nuevo audio en la base de datos
            const writeTransaction = db.transaction('audios', 'readwrite');
            const store = writeTransaction.objectStore('audios');
            store.put(audioBlob, texto);
            console.log(`Audio para "${texto}" guardado en la base de datos.`);

            // Reproducir el audio recién descargado
            const url = URL.createObjectURL(audioBlob);
            audioPlayer = new Audio(url);
            await audioPlayer.play();
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error(`Error al procesar el audio para "${texto}":`, error);
        // Fallback: si todo falla, usar la voz del navegador (no se guardará)
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-ES';
        synth.speak(utterance);
    }
}
    
    // --- FUNCIONES DE LA INTERFAZ ---

    function cargarDatos() {
        fetch('datos.json')
            .then(response => response.json())
            .then(data => {
                const categoriasGrid = document.querySelector('.categorias-grid');
                if (!categoriasGrid) return;
                const dropdownContent = document.querySelector('.dropdown-content');
                categoriasGrid.innerHTML = '';
                dropdownContent.innerHTML = '';
                data.categorias.forEach(categoria => {
                    const categoriaButton = document.createElement('button');
                    categoriaButton.classList.add('categoria-button');
                    const imagen = document.createElement('img');
                    imagen.src = categoria.src;
                    categoriaButton.appendChild(imagen);
                    categoriaButton.addEventListener('click', () => {
                        mostrarImagenes(categoria.imagenes);
                        hablarTexto(categoria.texto || categoria.nombre);
                        document.querySelector('.categorias-grid').style.display = 'none';
                        document.querySelector('.imagenes-grid').style.display = 'grid';
                        document.querySelector('#back-button').classList.remove('hidden');
                        const footer = document.querySelector('footer');
                        if (footer) footer.style.display = 'none';
                    });
                    categoriasGrid.appendChild(categoriaButton);
                    const dropdownButton = document.createElement('button');
                    dropdownButton.textContent = categoria.nombre;
                    dropdownButton.addEventListener('click', () => {
                        mostrarImagenes(categoria.imagenes);
                        hablarTexto(categoria.texto || categoria.nombre);
                        document.querySelector('.categorias-grid').style.display = 'none';
                        document.querySelector('.imagenes-grid').style.display = 'grid';
                        document.querySelector('#back-button').classList.remove('hidden');
                        const footer = document.querySelector('footer');
                        if (footer) footer.style.display = 'none';
                    });
                    dropdownContent.appendChild(dropdownButton);
                });
            });
    }

    function mostrarImagenes(imagenes) {
        const imagenesGrid = document.querySelector('.imagenes-grid');
        imagenesGrid.innerHTML = '';
        imagenes.forEach(imagen => {
            if (imagen.separador) {
                const separador = document.createElement('hr');
                separador.classList.add('separador');
                imagenesGrid.appendChild(separador);
            } else {
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('imagen-container');
                const imgElement = document.createElement('img');
                imgElement.src = `imagenes/${imagen.src}`;
                imgElement.alt = imagen.texto;
                imgElement.addEventListener('click', () => hablarTexto(imagen.texto));
                imgContainer.appendChild(imgElement);
                imagenesGrid.appendChild(imgContainer);
            }
        });
    }

    // --- FUNCIONES DE HISTORIAL Y RECONOCIMIENTO DE VOZ ---
    
    function cargarHistorial() {
        const historialLista = document.getElementById('historial-lista');
        if (historialLista) {
            historialLista.innerHTML = '';
            const historial = JSON.parse(localStorage.getItem('historial')) || [];
            historial.reverse().forEach(texto => {
                const li = document.createElement('li');
                li.textContent = texto;
                li.addEventListener('click', () => hablarTexto(texto));
                historialLista.appendChild(li);
            });
        }
        const historialListaEscuchar = document.getElementById('historial-lista-escuchar');
        if (historialListaEscuchar) {
            historialListaEscuchar.innerHTML = '';
            const historialEscuchar = JSON.parse(localStorage.getItem('historialEscuchar')) || [];
            historialEscuchar.reverse().forEach(texto => {
                const li = document.createElement('li');
                li.textContent = texto;
                li.addEventListener('click', () => hablarTexto(texto));
                historialListaEscuchar.appendChild(li);
            });
        }
    }

    function agregarAlHistorial(texto) {
        if (texto.trim() === "") return;
        const historial = JSON.parse(localStorage.getItem('historial')) || [];
        historial.push(texto);
        localStorage.setItem('historial', JSON.stringify(historial));
        cargarHistorial();
    }

    function agregarAlHistorialEscuchar(texto) {
        if (texto.trim() === "") return;
        const historialEscuchar = JSON.parse(localStorage.getItem('historialEscuchar')) || [];
        historialEscuchar.push(texto);
        localStorage.setItem('historialEscuchar', JSON.stringify(historialEscuchar));
        cargarHistorial();
    }

    function empezarEscuchar() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Tu navegador no soporta la API de reconocimiento de voz');
            return;
        }
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        const escucharButton = document.getElementById('empezar-escuchar');
        escucharButton.classList.add('pulsing');
        recognition.start();
        recognition.onresult = (event) => {
            const texto = event.results[0][0].transcript;
            document.getElementById('texto-escuchado').textContent = texto;
            agregarAlHistorialEscuchar(texto);
        };
        recognition.onspeechend = () => {
            recognition.stop();
            escucharButton.classList.remove('pulsing');
        };
        recognition.onerror = (event) => {
            console.error('Error en el reconocimiento de voz: ', event.error);
            escucharButton.classList.remove('pulsing');
        };
    }

    // --- CONFIGURACIÓN DE EVENT LISTENERS PARA CADA PÁGINA ---

    if (document.querySelector('.categorias-grid')) {
        cargarDatos();
        const backButton = document.getElementById('back-button');
        backButton.addEventListener('click', () => {
            document.querySelector('.categorias-grid').style.display = 'grid';
            document.querySelector('.imagenes-grid').style.display = 'none';
            const footer = document.querySelector('footer');
            if (footer) footer.style.display = 'flex';
            backButton.classList.add('hidden');
        });
    }

    if (document.getElementById('texto-escribir')) {
        document.getElementById('back-button-escribir').addEventListener('click', () => window.history.back());
        document.getElementById('leer-texto').addEventListener('click', () => {
            const texto = document.getElementById('texto-escribir').value;
            hablarTexto(texto);
            agregarAlHistorial(texto);
        });
        cargarHistorial();
    }

    if (document.getElementById('empezar-escuchar')) {
        document.getElementById('back-button-escuchar').addEventListener('click', () => window.history.back());
        document.getElementById('empezar-escuchar').addEventListener('click', empezarEscuchar);
        cargarHistorial();
    }
});


// --- REGISTRO DEL SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker registrado.', reg))
            .catch(err => console.error('Error en registro de Service Worker:', err));
    });
}