document.addEventListener('DOMContentLoaded', async () => {
    // --- VARIABLES GLOBALES ---
    let db;
    let fraseActual = [];
    let audioPlayer;

    // --- INICIALIZACIÓN DE LA BASE DE DATOS (IndexedDB) ---
    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('comunicador-db-v3', 1);
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

    try {
        db = await initDB();
        console.log("Base de datos inicializada correctamente.");
    } catch (error) {
        console.error("No se pudo inicializar la base de datos.", error);
        db = null;
    }

    // --- FUNCIONES DE CACHÉ Y API ---
    async function obtenerYCachearPictograma(texto) {
        if (!texto || texto.trim() === '') return 'imagenes/placeholder.png';
        if (!db) { // Fallback si IndexedDB falla
            try {
                const textoBusqueda = encodeURIComponent(texto);
                const urlBusqueda = `https://api.arasaac.org/api/pictograms/es/search/${textoBusqueda}`;
                const response = await fetch(urlBusqueda);
                if (!response.ok) throw new Error('Error en la búsqueda de ARASAAC');
                const resultados = await response.json();
                if (resultados.length === 0) return 'imagenes/placeholder.png';
                const pictogramaId = resultados[0]._id;
                return `https://api.arasaac.org/api/pictograms/${pictogramaId}?download=false`;
            } catch (e) {
                return 'imagenes/placeholder.png';
            }
        }
        try {
            const transaccionLectura = db.transaction('pictogramas', 'readonly');
            const almacenPictogramas = transaccionLectura.objectStore('pictogramas');
            const pictogramaGuardado = await promisifyRequest(almacenPictogramas.get(texto));
            if (pictogramaGuardado) {
                return URL.createObjectURL(pictogramaGuardado);
            }
            const textoBusqueda = encodeURIComponent(texto);
            const urlBusqueda = `https://api.arasaac.org/api/pictograms/es/search/${textoBusqueda}`;
            let response = await fetch(urlBusqueda);
            if (!response.ok) throw new Error('Error en la búsqueda de ARASAAC');
            const resultados = await response.json();
            if (resultados.length === 0) return 'imagenes/placeholder.png';
            const pictogramaId = resultados[0]._id;
            const urlImagen = `https://api.arasaac.org/api/pictograms/${pictogramaId}?download=false`;
            response = await fetch(urlImagen);
            if (!response.ok) throw new Error('Error al descargar la imagen');
            const imagenBlob = await response.blob();
            const transaccionEscritura = db.transaction('pictogramas', 'readwrite');
            const almacenParaGuardar = transaccionEscritura.objectStore('pictogramas');
            await promisifyRequest(almacenParaGuardar.put(imagenBlob, texto));
            return URL.createObjectURL(imagenBlob);
        } catch (error) {
            console.error('Error procesando el pictograma:', error);
            return 'imagenes/placeholder.png';
        }
    }

    async function hablarTexto(texto) {
        if (!texto || texto.trim() === '') return;
        if (audioPlayer && !audioPlayer.paused) {
            audioPlayer.pause();
        }
        try {
            if (!db) throw new Error("La base de datos no está disponible.");
            const readTransaction = db.transaction('audios', 'readonly');
            const audioStore = readTransaction.objectStore('audios');
            const audioGuardado = await promisifyRequest(audioStore.get(texto));
            if (audioGuardado) {
                const url = URL.createObjectURL(audioGuardado);
                audioPlayer = new Audio(url);
                await audioPlayer.play();
                audioPlayer.onended = () => URL.revokeObjectURL(url);
            } else {
                const encodedText = encodeURIComponent(texto);
                const originalUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=es&client=tw-ob`;
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`La respuesta de la red no fue válida: ${response.statusText}`);
                const audioBlob = await response.blob();
                try {
                    const writeTransaction = db.transaction('audios', 'readwrite');
                    const store = writeTransaction.objectStore('audios');
                    await promisifyRequest(store.put(audioBlob, texto));
                } catch (err) {
                    console.error(`Error al guardar en IndexedDB:`, err);
                }
                const url = URL.createObjectURL(audioBlob);
                audioPlayer = new Audio(url);
                await audioPlayer.play();
                audioPlayer.onended = () => URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error(`Error al procesar el audio para "${texto}":`, error);
            const synth = window.speechSynthesis;
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            synth.speak(utterance);
        }
    }

    // --- LÓGICA PARA LA TIRA DE FRASES ---
    function agregarAPipa(pictograma) {
        fraseActual.push(pictograma);
        renderizarTiraFrase();
    }

    async function renderizarTiraFrase() {
        const tiraFraseDiv = document.getElementById('tira-frase');
        if (!tiraFraseDiv) return;
        tiraFraseDiv.innerHTML = '';
        for (const pictograma of fraseActual) {
            const pictogramaDiv = document.createElement('div');
            pictogramaDiv.className = 'pictograma-frase';
            const img = document.createElement('img');
            img.src = await obtenerYCachearPictograma(pictograma.texto);
            const span = document.createElement('span');
            span.textContent = pictograma.texto;
            pictogramaDiv.appendChild(img);
            pictogramaDiv.appendChild(span);
            tiraFraseDiv.appendChild(pictogramaDiv);
        }
        tiraFraseDiv.scrollLeft = tiraFraseDiv.scrollWidth; // Auto-scroll al final
    }

    // --- FUNCIONES DE LA INTERFAZ ---
    async function cargarDatos() {
        try {
            const response = await fetch('datos.json');
            if (!response.ok) throw new Error('No se pudo cargar datos.json');
            const data = await response.json();
            if (!data || !Array.isArray(data.categorias)) {
                throw new Error('El archivo datos.json no tiene el formato esperado.');
            }
            const categoriasGrid = document.getElementById('categorias-grid');
            if (!categoriasGrid) return;

            categoriasGrid.innerHTML = '';
            for (const categoria of data.categorias) {
                const categoriaButton = document.createElement('button');
                categoriaButton.className = 'categoria-button';
                const imagen = document.createElement('img');
                imagen.src = await obtenerYCachearPictograma(categoria.nombre);
                imagen.alt = categoria.nombre;
                categoriaButton.appendChild(imagen);
                categoriaButton.addEventListener('click', () => {
                    mostrarImagenes(categoria.imagenes);
                    document.getElementById('categorias-grid').style.display = 'none';
                    document.getElementById('imagenes-grid').style.display = 'grid';
                    document.getElementById('back-button').classList.remove('hidden');
                    const footer = document.querySelector('footer');
                    if (footer) footer.style.display = 'none';
                });
                categoriasGrid.appendChild(categoriaButton);
            }
        } catch (error) {
            console.error("Error al cargar o procesar datos.json:", error);
            const categoriasGrid = document.getElementById('categorias-grid');
            if (categoriasGrid) categoriasGrid.innerHTML = `<p class="error-mensaje">No se pudieron cargar las categorías.</p>`;
        }
    }

    async function mostrarImagenes(imagenes) {
        const imagenesGrid = document.getElementById('imagenes-grid');
        if (!imagenesGrid) return;
        imagenesGrid.innerHTML = '';
        for (const imagen of imagenes) {
            if (imagen.separador) {
                const separador = document.createElement('hr');
                separador.className = 'separador';
                imagenesGrid.appendChild(separador);
            } else {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'imagen-container';
                const imgElement = document.createElement('img');
                imgElement.src = await obtenerYCachearPictograma(imagen.texto);
                imgElement.alt = imagen.texto;
                imgElement.addEventListener('click', () => agregarAPipa(imagen));
                imgContainer.appendChild(imgElement);
                imagenesGrid.appendChild(imgContainer);
            }
        }
    }

    // --- ROUTER Y EVENT LISTENERS ---
    // Código para index.html
    if (document.getElementById('categorias-grid')) {
        cargarDatos();
        const hablarFraseBtn = document.getElementById('hablar-frase-btn');
        const borrarFraseBtn = document.getElementById('borrar-frase-btn');
        const backButton = document.getElementById('back-button');

        if (hablarFraseBtn) {
            hablarFraseBtn.addEventListener('click', () => {
                if (fraseActual.length > 0) {
                    const textoCompleto = fraseActual.map(p => p.hablar || p.texto).join(' ');
                    hablarTexto(textoCompleto);
                }
            });
        }
        if (borrarFraseBtn) {
            borrarFraseBtn.addEventListener('click', () => {
                fraseActual = [];
                renderizarTiraFrase();
            });
        }
        if (backButton) {
            backButton.addEventListener('click', () => {
                document.getElementById('categorias-grid').style.display = 'grid';
                document.getElementById('imagenes-grid').style.display = 'none';
                const footer = document.querySelector('footer');
                if (footer) footer.style.display = 'flex';
                backButton.classList.add('hidden');
            });
        }
    }

    // Código para escribir.html
    if (document.getElementById('texto-escribir')) {
        const leerTextoBtn = document.getElementById('leer-texto');
        const textoEscribirArea = document.getElementById('texto-escribir');
        const historialLista = document.getElementById('historial-lista');

        function cargarHistorialEscribir() {
            if (!historialLista) return;
            historialLista.innerHTML = '';
            const historial = JSON.parse(localStorage.getItem('historial')) || [];
            historial.reverse().forEach(texto => {
                const li = document.createElement('li');
                li.textContent = texto;
                li.addEventListener('click', () => hablarTexto(texto));
                historialLista.appendChild(li);
            });
        }

        function agregarAlHistorialEscribir(texto) {
            if (texto.trim() === "") return;
            let historial = JSON.parse(localStorage.getItem('historial')) || [];
            if (historial[historial.length - 1] !== texto) {
                historial.push(texto);
                localStorage.setItem('historial', JSON.stringify(historial));
            }
            cargarHistorialEscribir();
        }
        if(leerTextoBtn){
            leerTextoBtn.addEventListener('click', () => {
                const texto = textoEscribirArea.value;
                hablarTexto(texto);
                agregarAlHistorialEscribir(texto);
            });
        }
        cargarHistorialEscribir();
    }

    // Código para escuchar.html
    if (document.getElementById('empezar-escuchar')) {
        const empezarEscucharBtn = document.getElementById('empezar-escuchar');
        const historialListaEscuchar = document.getElementById('historial-lista-escuchar');
        const textoEscuchadoElem = document.getElementById('texto-escuchado');

        function cargarHistorialEscuchar() {
            if (!historialListaEscuchar) return;
            historialListaEscuchar.innerHTML = '';
            const historialEscuchar = JSON.parse(localStorage.getItem('historialEscuchar')) || [];
            historialEscuchar.reverse().forEach(texto => {
                const li = document.createElement('li');
                li.textContent = texto;
                li.addEventListener('click', () => hablarTexto(texto));
                historialListaEscuchar.appendChild(li);
            });
        }

        function agregarAlHistorialEscuchar(texto) {
            if (texto.trim() === "") return;
            let historialEscuchar = JSON.parse(localStorage.getItem('historialEscuchar')) || [];
            if (historialEscuchar[historialEscuchar.length - 1] !== texto) {
                historialEscuchar.push(texto);
                localStorage.setItem('historialEscuchar', JSON.stringify(historialEscuchar));
            }
            cargarHistorialEscuchar();
        }

        function empezarEscuchar() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('Tu navegador no soporta la API de reconocimiento de voz.');
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            empezarEscucharBtn.classList.add('pulsing');
            if(textoEscuchadoElem) textoEscuchadoElem.textContent = 'Escuchando...';
            recognition.start();
            recognition.onresult = (event) => {
                const texto = event.results[0][0].transcript;
                if(textoEscuchadoElem) textoEscuchadoElem.textContent = `"${texto}"`;
                agregarAlHistorialEscuchar(texto);
                hablarTexto(texto);
            };
            recognition.onspeechend = () => {
                recognition.stop();
                empezarEscucharBtn.classList.remove('pulsing');
            };
            recognition.onerror = (event) => {
                console.error('Error en el reconocimiento de voz: ', event.error);
                if(textoEscuchadoElem) textoEscuchadoElem.textContent = `Error: ${event.error}`;
                empezarEscucharBtn.classList.remove('pulsing');
            };
        }
        if(empezarEscucharBtn) empezarEscucharBtn.addEventListener('click', empezarEscuchar);
        cargarHistorialEscuchar();
    }
});

// --- REGISTRO DEL SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registrado.', reg))
            .catch(err => console.error('Error en registro de Service Worker:', err));
    });
}