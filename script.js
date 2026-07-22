document.addEventListener('DOMContentLoaded', async () => {
    // --- VARIABLES GLOBALES ---
    let db;
    let fraseActual = [];
    let audioPlayer;
    let sortableInstance = null;
    let isPlayingSequence = false;
    let datosGlobales = null;

    // --- VOCABULARIO NÚCLEO ---
    const vocabularioNucleo = [
        { texto: "Hola", tipo: "interjeccion", hablar: "Hola" },
        { texto: "Si", tipo: "adverbio", hablar: "Si" },
        { texto: "No", tipo: "adverbio", hablar: "No" },
        { texto: "Yo", tipo: "pronombre", hablar: "Yo" },
        { texto: "Quiero", tipo: "verbo", hablar: "Quiero" },
        { texto: "Ser", tipo: "verbo", hablar: "Ser" },
        { texto: "Ir", tipo: "verbo", hablar: "Ir" },
        { texto: "Gusta", tipo: "verbo", hablar: "Me gusta" },
        { texto: "Gracias", tipo: "interjeccion", hablar: "Gracias" },
    ];

    // --- INICIALIZACIÓN DE LA BASE DE DATOS ---
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
    } catch (error) {
        console.error("No se pudo inicializar la base de datos.", error);
        db = null;
    }

    async function cargarDatosGlobales() {
        if (!datosGlobales) {
            try {
                const response = await fetch('datos.json');
                datosGlobales = await response.json();
            } catch (error) {
                console.error("Error al cargar datos.json:", error);
            }
        }
        return datosGlobales;
    }

    // --- FUNCIONES DE API ARASAAC Y CACHÉ ---
    async function obtenerYCachearPictograma(texto) {
        if (!texto || texto.trim() === '') return 'imagenes/placeholder.png';
        if (!db) return 'imagenes/placeholder.png';

        try {
            const transaccionLectura = db.transaction('pictogramas', 'readonly');
            const pictogramaGuardado = await promisifyRequest(transaccionLectura.objectStore('pictogramas').get(texto));
            if (pictogramaGuardado) return URL.createObjectURL(pictogramaGuardado);

            const textoBusqueda = encodeURIComponent(texto);
            const urlBusquedaOriginal = `https://api.arasaac.org/api/pictograms/es/search/${textoBusqueda}`;

            let response = await fetch(urlBusquedaOriginal);
            if (!response.ok) throw new Error('Error en búsqueda ARASAAC');

            const resultados = await response.json();
            if (resultados.length === 0) return 'imagenes/placeholder.png';

            const pictogramaId = resultados[0]._id;
            const urlImagen = `https://api.arasaac.org/api/pictograms/${pictogramaId}?download=false`;
            response = await fetch(urlImagen); 
            if (!response.ok) throw new Error('Error al descargar imagen');

            const imagenBlob = await response.blob();
            const transaccionEscritura = db.transaction('pictogramas', 'readwrite');
            await promisifyRequest(transaccionEscritura.objectStore('pictogramas').put(imagenBlob, texto));

            return URL.createObjectURL(imagenBlob);
        } catch (error) {
            console.error(`Error procesando pictograma para "${texto}":`, error);
            return 'imagenes/placeholder.png';
        }
    }

    // --- FUNCIONES DE AUDIO ---
    async function obtenerAudio(texto) {
        if (!texto || texto.trim() === '') return null;
        try {
            if (!db) throw new Error("DB no disponible");
            const audioGuardado = await promisifyRequest(db.transaction('audios', 'readonly').objectStore('audios').get(texto));
            if (audioGuardado) return audioGuardado;

            const urlOriginal = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=es&client=tw-ob`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(urlOriginal)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Respuesta de red no válida`);
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
            if (isPlayingSequence) { 
                if (audioPlayer && !audioPlayer.paused) audioPlayer.pause();
            }
            if (!blob) return reject("Blob de audio nulo.");
            const url = URL.createObjectURL(blob);
            audioPlayer = new Audio(url);
            audioPlayer.onended = () => { URL.revokeObjectURL(url); resolve(); };
            audioPlayer.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            audioPlayer.play();
        });
    }

    async function hablarTextoIndividual(texto) {
        if (isPlayingSequence) return;
        if (!texto || texto.trim() === '') return;
        
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
            return;
        }

        try {
            const audioBlob = await obtenerAudio(texto);
            if (audioBlob) await reproducirAudio(audioBlob);
        } catch (error) {
            console.error("Error en reproducción:", error);
        }
    }

    async function hablarFraseSecuencial() {
        if (isPlayingSequence || fraseActual.length === 0) return;
        isPlayingSequence = true;
        const btnHablar = document.getElementById('hablar-frase-btn');
        if (btnHablar) btnHablar.classList.add('pulsing');

        const fraseCompleta = fraseActual.map(p => p.hablar || p.texto).join(', ');

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(fraseCompleta);
            utterance.lang = 'es-ES';
            utterance.rate = 0.85;
            utterance.onend = () => {
                isPlayingSequence = false;
                if (btnHablar) btnHablar.classList.remove('pulsing');
            };
            window.speechSynthesis.speak(utterance);
            return;
        }

        for (const pictograma of fraseActual) {
            const textoParaHablar = pictograma.hablar || pictograma.texto;
            try {
                const audioBlob = await obtenerAudio(textoParaHablar);
                if (audioBlob) await reproducirAudio(audioBlob);
            } catch (error) {}
        }
        isPlayingSequence = false;
        if (btnHablar) btnHablar.classList.remove('pulsing');
    }

    // --- MOTOR PREDICTIVO INTELIGENTE ---
    async function actualizarSugerenciasPredictivas() {
        const categoriasGrid = document.getElementById('categorias-grid');
        const nucleoGrid = document.getElementById('nucleo-grid');
        const imagenesGrid = document.getElementById('imagenes-grid');
        const tituloCategoria = document.getElementById('titulo-categoria');
        const backButton = document.getElementById('back-button');

        if (imagenesGrid) imagenesGrid.classList.add('hidden');
        if (nucleoGrid) nucleoGrid.classList.remove('hidden');
        if (categoriasGrid) categoriasGrid.classList.remove('hidden');
        if (backButton) backButton.classList.add('hidden');

        if (fraseActual.length === 0) {
            tituloCategoria.textContent = 'Categorías';
            cargarCategoriasPerifericas();
            return;
        }

        const ultimoPicto = fraseActual[fraseActual.length - 1];
        tituloCategoria.textContent = 'Sugerencias para ti';

        let categoriasSugeridas = [];

        if (ultimoPicto.tipo === 'pronombre') {
            categoriasSugeridas = ['Acciones', 'Quiero', 'Me siento', 'Preguntas'];
        } else if (['Quiero', 'Comer', 'Beber'].includes(ultimoPicto.texto) || ultimoPicto.tipo === 'verbo') {
            categoriasSugeridas = ['Comida', 'Bebidas', 'Juguetes y Pasatiempos', 'Lugares', 'Acciones'];
        } else if (ultimoPicto.texto.toLowerCase() === 'me siento' || ultimoPicto.nombre === 'Me siento' || ultimoPicto.tipo === 'adjetivo') {
            categoriasSugeridas = ['Me siento', 'Cuerpo', 'Me duele'];
        } else if (ultimoPicto.tipo === 'interjeccion' || ultimoPicto.tipo === 'frase') {
            categoriasSugeridas = ['Social', 'Personas'];
        } else if (ultimoPicto.texto === 'Ayuda') {
            categoriasSugeridas = ['Acciones', 'Me duele', 'Cuerpo', 'Personas'];
        } else {
            tituloCategoria.textContent = 'Categorías';
            cargarCategoriasPerifericas();
            return;
        }

        const data = await cargarDatosGlobales();
        if (data && data.categorias && categoriasGrid) {
            categoriasGrid.innerHTML = '';
            const categoriasFiltradas = data.categorias.filter(c => categoriasSugeridas.includes(c.nombre));
            
            if (categoriasFiltradas.length === 0) {
                cargarCategoriasPerifericas();
                return;
            }

            // CARGA EN PARALELO OPTIMIZADA
            const promesasBotones = categoriasFiltradas.map(async (categoria) => {
                const btn = await crearBotonPictograma(categoria);
                btn.addEventListener('click', () => mostrarImagenes(categoria));
                return btn;
            });
            const botones = await Promise.all(promesasBotones);
            botones.forEach(btn => categoriasGrid.appendChild(btn));
        }
    }

    // --- LÓGICA DE LA TIRA ---
    function agregarAPipa(pictograma) {
        fraseActual.push(pictograma);
        renderizarTiraFrase();
        hablarTextoIndividual(pictograma.hablar || pictograma.texto);
        actualizarSugerenciasPredictivas(); 
    }

    async function renderizarTiraFrase() {
        const tiraFraseContainer = document.getElementById('tira-frase-container');
        const tiraFraseTextoContainer = document.getElementById('tira-frase-container-text');
        const tiraFraseControles = document.getElementById('tira-frase-controles');
        const tiraFraseDiv = document.getElementById('tira-frase');
        const tiraFraseTexto = document.getElementById('tira-frase-texto');

        if (!tiraFraseDiv || !tiraFraseTexto || !tiraFraseContainer || !tiraFraseTextoContainer || !tiraFraseControles) return;

        tiraFraseDiv.innerHTML = '';

        fraseActual.forEach((pictograma, index) => {
            const pictogramaContenedor = document.createElement('div');
            pictogramaContenedor.className = 'pictograma-frase';

            const pictogramaContenido = document.createElement('div');
            pictogramaContenido.className = 'pictograma-frase-contenido';
            if (pictograma.tipo) pictogramaContenido.classList.add(pictograma.tipo);

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
                actualizarSugerenciasPredictivas();
            };

            pictogramaContenido.appendChild(img);
            pictogramaContenedor.appendChild(pictogramaContenido);
            pictogramaContenedor.appendChild(btnBorrar);
            tiraFraseDiv.appendChild(pictogramaContenedor);
        });

        const fraseComoTexto = fraseActual.map(p => p.hablar || p.texto).join(' ');
        tiraFraseTexto.textContent = fraseComoTexto;
        tiraFraseDiv.scrollLeft = tiraFraseDiv.scrollWidth;

        if (fraseActual.length === 0) {
            tiraFraseContainer.classList.add('hidden');
            tiraFraseTextoContainer.classList.add('hidden');
            tiraFraseControles.classList.add('hidden');
        } else {
            tiraFraseContainer.classList.remove('hidden');
            tiraFraseTextoContainer.classList.remove('hidden');
            tiraFraseControles.classList.remove('hidden');
        }
    }

    function inicializarDragAndDrop() {
        const tiraFraseDiv = document.getElementById('tira-frase');
        if (!tiraFraseDiv) return;
        if (sortableInstance) sortableInstance.destroy();
        
        sortableInstance = new Sortable(tiraFraseDiv, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function (evt) {
                const [movedItem] = fraseActual.splice(evt.oldIndex, 1);
                fraseActual.splice(evt.newIndex, 0, movedItem);
                renderizarTiraFrase(); 
            },
        });
    }

    async function crearBotonPictograma(item) {
        const pictoButton = document.createElement('button');
        pictoButton.className = 'pictograma-button';
        if (item.tipo) pictoButton.classList.add(item.tipo);

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
        
        // CARGA EN PARALELO OPTIMIZADA
        const promesasBotones = vocabularioNucleo.map(async (palabra) => {
            const btn = await crearBotonPictograma(palabra);
            btn.classList.add('nucleo');
            btn.addEventListener('click', () => agregarAPipa(palabra));
            return btn;
        });
        
        const botones = await Promise.all(promesasBotones);
        botones.forEach(btn => nucleoGrid.appendChild(btn));
    }

    async function cargarCategoriasPerifericas() {
        try {
            const data = await cargarDatosGlobales();
            const categoriasGrid = document.getElementById('categorias-grid');
            if (!categoriasGrid || !data) return;
            categoriasGrid.innerHTML = '';
            
            // CARGA EN PARALELO OPTIMIZADA
            const promesasBotones = data.categorias.map(async (categoria) => {
                const btn = await crearBotonPictograma(categoria);
                btn.addEventListener('click', () => mostrarImagenes(categoria));
                return btn;
            });

            const botones = await Promise.all(promesasBotones);
            botones.forEach(btn => categoriasGrid.appendChild(btn));
        } catch (error) {
            console.error("Error al cargar categorías:", error);
        }
    }

    // --- FUNCIÓN DE CARGA DE IMÁGENES CON SPINNER Y PROMISE.ALL ---
    async function mostrarImagenes(categoria) {
        const loadingOverlay = document.getElementById('loading-overlay');
        const imagenesGrid = document.getElementById('imagenes-grid');
        const categoriasGrid = document.getElementById('categorias-grid');
        const nucleoGrid = document.getElementById('nucleo-grid');
        const tituloCategoria = document.getElementById('titulo-categoria');
        const backButton = document.getElementById('back-button');

        if (!imagenesGrid || !categoriasGrid || !nucleoGrid || !tituloCategoria || !backButton) return;

        // 1. Mostrar el Spinner
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        
        // Pequeña pausa para asegurar que el navegador dibuje el spinner en pantalla
        await new Promise(resolve => setTimeout(resolve, 30));

        imagenesGrid.innerHTML = '';

        // 2. Procesar TODO el array en paralelo (Extremadamente rápido)
        const promesasElementos = categoria.imagenes.map(async (imagen) => {
            if (imagen.separador) {
                const separador = document.createElement('hr');
                separador.className = 'separador';
                return separador;
            } else {
                const imgButton = await crearBotonPictograma(imagen);
                imgButton.addEventListener('click', () => agregarAPipa(imagen));
                return imgButton;
            }
        });

        const elementos = await Promise.all(promesasElementos);
        elementos.forEach(el => imagenesGrid.appendChild(el));

        categoriasGrid.classList.add('hidden');
        nucleoGrid.classList.add('hidden');
        imagenesGrid.classList.remove('hidden');
        tituloCategoria.textContent = categoria.nombre;
        backButton.classList.remove('hidden');

        // 3. Ocultar el Spinner al finalizar
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    // --- INICIALIZACIÓN (ROUTER) ---
    if (document.getElementById('nucleo-grid')) {
        await cargarDatosGlobales(); 
        cargarNucleo();
        cargarCategoriasPerifericas();
        inicializarDragAndDrop();
        renderizarTiraFrase();
        
        document.getElementById('hablar-frase-btn')?.addEventListener('click', hablarFraseSecuencial);
        
        document.getElementById('borrar-frase-btn')?.addEventListener('click', () => {
            fraseActual = [];
            renderizarTiraFrase();
            actualizarSugerenciasPredictivas();
        });

        const btnBorrarUltimo = document.getElementById('borrar-ultimo-btn');
        if (btnBorrarUltimo) {
            btnBorrarUltimo.addEventListener('click', (e) => {
                e.preventDefault();
                if (fraseActual.length > 0) {
                    fraseActual.pop();
                    renderizarTiraFrase();
                    actualizarSugerenciasPredictivas();
                }
            });
        }

        document.getElementById('back-button')?.addEventListener('click', () => {
            actualizarSugerenciasPredictivas(); 
        });

        const shareFraseBtn = document.getElementById('share-frase-btn');
        if (navigator.share && shareFraseBtn) {
            shareFraseBtn.addEventListener('click', async () => {
                if (fraseActual.length === 0) return;
                const textoCompleto = fraseActual.map(p => p.hablar || p.texto).join(' ');
                const textoFinal = textoCompleto.charAt(0).toUpperCase() + textoCompleto.slice(1);
                try {
                    await navigator.share({ title: 'Frase desde Mi Comunicador', text: textoFinal });
                } catch (error) {
                    console.error('Error al compartir:', error);
                }
            });
        } else if (shareFraseBtn) {
            shareFraseBtn.style.display = 'none';
        }
    }

    // --- PÁGINA ESCRIBIR ---
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
                li.addEventListener('click', () => hablarTextoIndividual(texto));
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
                hablarTextoIndividual(texto);
                agregarAlHistorialEscribir(texto);
            });
        }
        cargarHistorialEscribir();
    }

    // --- PÁGINA ESCUCHAR ---
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
                li.addEventListener('click', () => hablarTextoIndividual(texto));
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
                hablarTextoIndividual(texto);
            };
            recognition.onspeechend = () => {
                recognition.stop();
                empezarEscucharBtn.classList.remove('pulsing');
            };
            recognition.onerror = (event) => {
                console.error('Error en reconocimiento: ', event.error);
                if (textoEscuchadoElem) textoEscuchadoElem.textContent = `Error: ${event.error}`;
                empezarEscucharBtn.classList.remove('pulsing');
            };
        }
        if (empezarEscucharBtn) empezarEscucharBtn.addEventListener('click', empezarEscuchar);
        cargarHistorialEscuchar();
    }
});

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .catch(err => console.error('Error en SW:', err));
    });
}
