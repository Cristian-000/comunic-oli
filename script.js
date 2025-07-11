document.addEventListener('DOMContentLoaded', async () => {
    // --- VARIABLES GLOBALES ---
    let db;
    let fraseActual = [];
    let audioPlayer;
    let sortableInstance = null; // Para la instancia de SortableJS

    // --- VOCABULARIO NÚCLEO ---
    const vocabularioNucleo = [
        { texto: "Yo", tipo: "pronombre", hablar: "Yo" },
        { texto: "Quiero", tipo: "verbo", hablar: "Quiero" },
        { texto: "Ser", tipo: "verbo", hablar: "Ser" },
        { texto: "Ir", tipo: "verbo", hablar: "Ir" },
        { texto: "Gusta", tipo: "verbo", hablar: "Me gusta" },
        { texto: "No", tipo: "adverbio", hablar: "No" },
    ];

    // --- INICIALIZACIÓN DE LA BASE DE DATOS (IndexedDB) ---
    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('comunicador-db-v4', 1);
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
        if (!db) {
            try {
                const textoBusqueda = encodeURIComponent(texto);
                const urlBusqueda = `https://api.arasaac.org/api/pictograms/es/search/${textoBusqueda}`;
                const response = await fetch(urlBusqueda);
                if (!response.ok) return 'imagenes/placeholder.png';
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
            const pictogramaGuardado = await promisifyRequest(transaccionLectura.objectStore('pictogramas').get(texto));
            if (pictogramaGuardado) return URL.createObjectURL(pictogramaGuardado);

            const textoBusqueda = encodeURIComponent(texto);
            const urlBusqueda = `https://api.arasaac.org/api/pictograms/es/search/${textoBusqueda}`;
            let response = await fetch(urlBusqueda);
            if (!response.ok) throw new Error('Error en búsqueda ARASAAC');
            const resultados = await response.json();
            if (resultados.length === 0) {
                console.warn(`No se encontró pictograma para "${texto}"`);
                return 'imagenes/placeholder.png';
            }

            const pictogramaId = resultados[0]._id;
            const urlImagen = `https://api.arasaac.org/api/pictograms/${pictogramaId}?download=false`;
            response = await fetch(urlImagen);
            if (!response.ok) throw new Error('Error al descargar imagen');
            const imagenBlob = await response.blob();
            const transaccionEscritura = db.transaction('pictogramas', 'readwrite');
            await promisifyRequest(transaccionEscritura.objectStore('pictogramas').put(imagenBlob, texto));
            return URL.createObjectURL(imagenBlob);
        } catch (error) {
            console.error('Error procesando pictograma:', error);
            return 'imagenes/placeholder.png';
        }
    }

    async function hablarTexto(texto) {
        if (!texto || texto.trim() === '') return;
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        if (audioPlayer && !audioPlayer.paused) audioPlayer.pause();
        try {
            if (!db) throw new Error("DB no disponible, usando fallback de navegador.");
            const audioGuardado = await promisifyRequest(db.transaction('audios', 'readonly').objectStore('audios').get(texto));
            if (audioGuardado) {
                const url = URL.createObjectURL(audioGuardado);
                audioPlayer = new Audio(url);
                await audioPlayer.play();
                audioPlayer.onended = () => URL.revokeObjectURL(url);
            } else {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=es&client=tw-ob`)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Respuesta de red no válida desde proxy`);
                const audioBlob = await response.blob();
                try {
                    await promisifyRequest(db.transaction('audios', 'readwrite').objectStore('audios').put(audioBlob, texto));
                } catch (err) {
                    console.error(`Error al guardar audio en IndexedDB:`, err);
                }
                const url = URL.createObjectURL(audioBlob);
                audioPlayer = new Audio(url);
                await audioPlayer.play();
                audioPlayer.onended = () => URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error(`Error al procesar audio para "${texto}". Usando SpeechSynthesis.`, error);
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            window.speechSynthesis.speak(utterance);
        }
    }

    // --- LÓGICA PARA LA TIRA DE FRASES ---
    function agregarAPipa(pictograma) {
        fraseActual.push(pictograma);
        renderizarTiraFrase();
        hablarTexto(pictograma.hablar || pictograma.texto);
    }

    async function renderizarTiraFrase() {
        const tiraFraseDiv = document.getElementById('tira-frase');
        if (!tiraFraseDiv) return;
        tiraFraseDiv.innerHTML = '';

        fraseActual.forEach((pictograma, index) => {
            const pictogramaContenedor = document.createElement('div');
            pictogramaContenedor.className = 'pictograma-frase';
            
            const pictogramaContenido = document.createElement('div');
            pictogramaContenido.className = 'pictograma-frase-contenido';

            const img = document.createElement('img');
            obtenerYCachearPictograma(pictograma.texto).then(src => img.src = src);

            const btnBorrar = document.createElement('button');
            btnBorrar.className = 'btn-borrar-pictograma';
            btnBorrar.innerHTML = '&times;';
            btnBorrar.setAttribute('aria-label', `Borrar ${pictograma.texto}`);
            btnBorrar.onclick = (e) => {
                e.stopPropagation();
                fraseActual.splice(index, 1);
                renderizarTiraFrase();
            };

            pictogramaContenido.appendChild(img);
            pictogramaContenedor.appendChild(pictogramaContenido);
            pictogramaContenedor.appendChild(btnBorrar);
            tiraFraseDiv.appendChild(pictogramaContenedor);
        });

        tiraFraseDiv.scrollLeft = tiraFraseDiv.scrollWidth;
    }

    // --- LÓGICA DE DRAG & DROP (MÓVIL Y ESCRITORIO) ---
    function inicializarDragAndDrop() {
        const tiraFraseDiv = document.getElementById('tira-frase');
        if (!tiraFraseDiv) return;
        
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        
        sortableInstance = new Sortable(tiraFraseDiv, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function (evt) {
                const [movedItem] = fraseActual.splice(evt.oldIndex, 1);
                fraseActual.splice(evt.newIndex, 0, movedItem);
            },
        });
    }

    // --- FUNCIONES DE LA INTERFAZ ---
    async function crearBotonPictograma(item) {
        const pictoButton = document.createElement('button');
        pictoButton.className = 'pictograma-button';

        const img = document.createElement('img');
        img.src = await obtenerYCachearPictograma(item.texto || item.nombre);
        
        const span = document.createElement('span');
        span.textContent = item.texto || item.nombre;
        
        pictoButton.appendChild(img);
        pictoButton.appendChild(span);
        return pictoButton;
    }

    async function cargarNucleo() {
        const nucleoGrid = document.getElementById('nucleo-grid');
        if (!nucleoGrid) return;
        nucleoGrid.innerHTML = '';
        for (const palabra of vocabularioNucleo) {
            const pictoButton = await crearBotonPictograma(palabra);
            pictoButton.classList.add('nucleo');
            pictoButton.addEventListener('click', () => agregarAPipa(palabra));
            nucleoGrid.appendChild(pictoButton);
        }
    }

    async function cargarCategoriasPerifericas() {
        try {
            const response = await fetch('datos.json');
            const data = await response.json();
            const categoriasGrid = document.getElementById('categorias-grid');
            if (!categoriasGrid) return;
            categoriasGrid.innerHTML = '';
            
            for (const categoria of data.categorias) {
                const categoriaButton = await crearBotonPictograma(categoria);
                categoriaButton.addEventListener('click', () => mostrarImagenes(categoria));
                categoriasGrid.appendChild(categoriaButton);
            }
        } catch (error) {
            console.error("Error al cargar categorías:", error);
        }
    }

    async function mostrarImagenes(categoria) {
        const imagenesGrid = document.getElementById('imagenes-grid');
        const categoriasGrid = document.getElementById('categorias-grid');
        const nucleoGrid = document.getElementById('nucleo-grid');
        const tituloCategoria = document.getElementById('titulo-categoria');
        const backButton = document.getElementById('back-button');

        if (!imagenesGrid || !categoriasGrid || !nucleoGrid || !tituloCategoria || !backButton) return;

        imagenesGrid.innerHTML = '';
        for (const imagen of categoria.imagenes) {
            if (imagen.separador) {
                const separador = document.createElement('hr');
                separador.className = 'separador';
                imagenesGrid.appendChild(separador);
            } else {
                const imgButton = await crearBotonPictograma(imagen);
                imgButton.addEventListener('click', () => agregarAPipa(imagen));
                imagenesGrid.appendChild(imgButton);
            }
        }
        
        categoriasGrid.classList.add('hidden');
        nucleoGrid.classList.add('hidden');
        imagenesGrid.classList.remove('hidden');
        
        tituloCategoria.textContent = categoria.nombre;
        backButton.classList.remove('hidden');
    }

    // --- INICIALIZACIÓN Y EVENTOS PRINCIPALES (ROUTER) ---

    // Lógica para la página principal (index.html)
    if (document.getElementById('nucleo-grid')) {
        cargarNucleo();
        cargarCategoriasPerifericas();
        inicializarDragAndDrop();

        document.getElementById('hablar-frase-btn')?.addEventListener('click', () => {
            if (fraseActual.length > 0) {
                const textoCompleto = fraseActual.map(p => p.hablar || p.texto).join(' ');
                hablarTexto(textoCompleto.charAt(0).toUpperCase() + textoCompleto.slice(1));
            }
        });
        
        document.getElementById('borrar-frase-btn')?.addEventListener('click', () => {
            fraseActual = [];
            renderizarTiraFrase();
        });

        document.getElementById('back-button')?.addEventListener('click', () => {
            document.getElementById('categorias-grid').classList.remove('hidden');
            document.getElementById('nucleo-grid').classList.remove('hidden');
            document.getElementById('imagenes-grid').classList.add('hidden');
            document.getElementById('back-button').classList.add('hidden');
            document.getElementById('titulo-categoria').textContent = 'Categorías';
        });
    }

    // Lógica para la página de escritura (escribir.html)
    if (document.getElementById('texto-escribir')) {
        const leerTextoBtn = document.getElementById('leer-texto');
        const textoEscribirArea = document.getElementById('texto-escribir');
        const historialLista = document.getElementById('historial-lista');

        function cargarHistorialEscribir() {
            if (!historialLista) return;
            historialLista.innerHTML = '';
            const historial = JSON.parse(localStorage.getItem('historialEscribir')) || [];
            historial.reverse().forEach(texto => {
                const li = document.createElement('li');
                li.textContent = texto;
                li.addEventListener('click', () => hablarTexto(texto));
                historialLista.appendChild(li);
            });
        }

        function agregarAlHistorialEscribir(texto) {
            if (texto.trim() === "") return;
            let historial = JSON.parse(localStorage.getItem('historialEscribir')) || [];
            if (historial[historial.length - 1] !== texto) {
                historial.push(texto);
                localStorage.setItem('historialEscribir', JSON.stringify(historial));
            }
            cargarHistorialEscribir();
        }

        if (leerTextoBtn) {
            leerTextoBtn.addEventListener('click', () => {
                const texto = textoEscribirArea.value;
                hablarTexto(texto);
                agregarAlHistorialEscribir(texto);
            });
        }
        cargarHistorialEscribir();
    }

    // Lógica para la página de escucha (escuchar.html)
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
            if (textoEscuchadoElem) textoEscuchadoElem.textContent = 'Escuchando...';
            recognition.start();

            recognition.onresult = (event) => {
                const texto = event.results[0][0].transcript;
                if (textoEscuchadoElem) textoEscuchadoElem.textContent = `"${texto}"`;
                agregarAlHistorialEscuchar(texto);
                hablarTexto(texto);
            };
            recognition.onspeechend = () => {
                recognition.stop();
                empezarEscucharBtn.classList.remove('pulsing');
            };
            recognition.onerror = (event) => {
                console.error('Error en el reconocimiento de voz: ', event.error);
                if (textoEscuchadoElem) textoEscuchadoElem.textContent = `Error: ${event.error}`;
                empezarEscucharBtn.classList.remove('pulsing');
            };
        }
        if (empezarEscucharBtn) empezarEscucharBtn.addEventListener('click', empezarEscuchar);
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