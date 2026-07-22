document.addEventListener('DOMContentLoaded', async () => {
    // --- VARIABLES GLOBALES ---
    let db;
    let fraseActual = [];
    let audioPlayer;
    let sortableInstance = null;
    let isPlayingSequence = false;
    let datosGlobales = null;

    // --- VOCABULARIO NÚCLEO (Las 10 más importantes para CAA infantil) ---
    const vocabularioNucleo = [
        { texto: "Yo", tipo: "pronombre", hablar: "Yo" },
        { texto: "Quiero", tipo: "verbo", hablar: "Quiero" },
        { texto: "Ayuda", tipo: "sustantivo", hablar: "Ayuda" },
        { texto: "Más", tipo: "adverbio", hablar: "Más" },
        { texto: "Si", tipo: "adverbio", hablar: "Si" },
        { texto: "No", tipo: "adverbio", hablar: "No" },
        { texto: "Hola", tipo: "interjeccion", hablar: "Hola" },
        { texto: "Terminar", tipo: "verbo", hablar: "Terminar" },
        { texto: "Jugar", tipo: "verbo", hablar: "Jugar" },
        { texto: "Gusta", tipo: "verbo", hablar: "Me gusta" }
    ];

    // --- INICIALIZACIÓN DE LA BASE DE DATOS ---
    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('comunicador-db-v4', 1);
            request.onerror = e => reject(e.target.error);
            request.onsuccess = e => resolve(e.target.result);
            request.onupgradeneeded = e => {
                const dbInstance = e.target.result;
                if (!dbInstance.objectStoreNames.contains('audios')) dbInstance.createObjectStore('audios');
                if (!dbInstance.objectStoreNames.contains('pictogramas')) dbInstance.createObjectStore('pictogramas');
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
            return null;
        }
    }

    function reproducirAudio(blob) {
        return new Promise((resolve, reject) => {
            if (isPlayingSequence) { if (audioPlayer && !audioPlayer.paused) audioPlayer.pause(); }
            if (!blob) return reject("Blob de audio nulo.");
            const url = URL.createObjectURL(blob);
            audioPlayer = new Audio(url);
            audioPlayer.onended = () => { URL.revokeObjectURL(url); resolve(); };
            audioPlayer.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            audioPlayer.play();
        });
    }

    async function hablarTextoIndividual(texto) {
        if (isPlayingSequence || !texto || texto.trim() === '') return;
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
        } catch (error) {}
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

    // --- NUEVO MOTOR PREDICTIVO (SOLO ILUMINA, NO OCULTA) ---
    async function actualizarSugerenciasPredictivas() {
        const categoriasGrid = document.getElementById('categorias-grid');
        if (!categoriasGrid) return;

        // Si no hay frase, limpiamos todas las sugerencias luminosas
        if (fraseActual.length === 0) {
            Array.from(categoriasGrid.children).forEach(btn => btn.classList.remove('highlight-sugerencia'));
            return;
        }

        const ultimoPicto = fraseActual[fraseActual.length - 1];
        let categoriasSugeridas = [];

        // Reglas Lógicas
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
        }

        // Iteramos sobre las categorías existentes y encendemos solo las sugeridas
        Array.from(categoriasGrid.children).forEach(btn => {
            const spanText = btn.querySelector('span')?.textContent;
            if (spanText && categoriasSugeridas.includes(spanText)) {
                btn.classList.add('highlight-sugerencia');
            } else {
                btn.classList.remove('highlight-sugerencia');
            }
        });
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

        if (!tiraFraseDiv || !tiraFraseTexto || !tiraFraseContainer) return;

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
        
        const promesasBotones = vocabularioNucleo.map(async (palabra) => {
            const btn = await crearBotonPictograma(palabra);
            btn.addEventListener('click', () => agregarAPipa(palabra));
            return btn;
        });
        
        const botones = await Promise.all(promesasBotones);
        botones.forEach(btn => nucleoGrid.appendChild(btn));
    }

    async function cargarCategoriasPerifericas() {
        const data = await cargarDatosGlobales();
        const categoriasGrid = document.getElementById('categorias-grid');
        if (!categoriasGrid || !data) return;
        categoriasGrid.innerHTML = '';
        
        const promesasBotones = data.categorias.map(async (categoria) => {
            const btn = await crearBotonPictograma(categoria);
            btn.addEventListener('click', () => mostrarImagenes(categoria));
            return btn;
        });

        const botones = await Promise.all(promesasBotones);
        botones.forEach(btn => categoriasGrid.appendChild(btn));
    }

    // --- FUNCIÓN DE CARGA DE IMÁGENES (AL ENTRAR A UNA CATEGORÍA) ---
    async function mostrarImagenes(categoria) {
        const loadingOverlay = document.getElementById('loading-overlay');
        const imagenesGrid = document.getElementById('imagenes-grid');
        const categoriasGrid = document.getElementById('categorias-grid');
        const seccionNucleo = document.getElementById('seccion-nucleo');
        const tituloCategoria = document.getElementById('titulo-categoria');
        const backButton = document.getElementById('back-button');

        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        await new Promise(resolve => setTimeout(resolve, 30)); // Pausa para render del spinner

        imagenesGrid.innerHTML = '';

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

        // Ocultamos núcleo y categorías, mostramos imágenes y botón volver
        categoriasGrid.classList.add('hidden');
        seccionNucleo.classList.add('hidden');
        imagenesGrid.classList.remove('hidden');
        tituloCategoria.innerHTML = `<i class="fas fa-folder-open" style="color: #3B82F6;"></i> ${categoria.nombre}`;
        backButton.classList.remove('hidden');

        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    // --- INICIALIZACIÓN PRINCIPAL ---
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

        // LÓGICA DEL BOTÓN VOLVER
        document.getElementById('back-button')?.addEventListener('click', () => {
            document.getElementById('seccion-nucleo').classList.remove('hidden');
            document.getElementById('categorias-grid').classList.remove('hidden');
            document.getElementById('imagenes-grid').classList.add('hidden');
            document.getElementById('back-button').classList.add('hidden');
            document.getElementById('titulo-categoria').innerHTML = '<i class="fas fa-folder-open" style="color: #3B82F6;"></i> Categorías';
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
                } catch (error) {}
            });
        } else if (shareFraseBtn) {
            shareFraseBtn.style.display = 'none';
        }
    }
});

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(err => console.error('Error en SW:', err));
    });
}
