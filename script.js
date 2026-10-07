document.addEventListener('DOMContentLoaded', async () => {
    let db;
    let fraseActual = [];
    let sortableInstance = null;
    let isPlayingSequence = false;
    let datosGlobales = null;

    // Vocabulario núcleo (Restaurado al original sin IDs malos)
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

    async function initDB() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open('comunicador-db-v5', 1);
            request.onerror = e => reject(e.target.error);
            request.onsuccess = e => resolve(e.target.result);
            request.onupgradeneeded = e => {
                const dbInstance = e.target.result;
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
        console.warn("IndexedDB no disponible", error);
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

    async function obtenerYCachearPictograma(item) {
        const textoBusqueda = item.texto || item.nombre;
        if (!textoBusqueda || textoBusqueda.trim() === '') return 'imagenes/placeholder.png';
        if (!db) return 'imagenes/placeholder.png';

        const keyAlmacenamiento = item.id_arasaac ? `id_${item.id_arasaac}` : textoBusqueda;

        try {
            const transaccionLectura = db.transaction('pictogramas', 'readonly');
            const pictogramaGuardado = await promisifyRequest(transaccionLectura.objectStore('pictogramas').get(keyAlmacenamiento));
            if (pictogramaGuardado) return URL.createObjectURL(pictogramaGuardado);

            let urlImagen = "";

            if (item.id_arasaac) {
                urlImagen = `https://api.arasaac.org/api/pictograms/${item.id_arasaac}?download=false`;
            } else {
                // Búsqueda dinámica original
                const textoCodificado = encodeURIComponent(textoBusqueda);
                const urlBusqueda = `https://api.arasaac.org/api/pictograms/es/search/${textoCodificado}`;
                const responseBusqueda = await fetch(urlBusqueda);
                if (!responseBusqueda.ok) throw new Error('Error en búsqueda ARASAAC');
                const resultados = await responseBusqueda.json();
                if (resultados.length === 0) return 'imagenes/placeholder.png';
                urlImagen = `https://api.arasaac.org/api/pictograms/${resultados[0]._id}?download=false`;
            }

            const response = await fetch(urlImagen); 
            if (!response.ok) throw new Error('Error al descargar imagen');

            const imagenBlob = await response.blob();
            const transaccionEscritura = db.transaction('pictogramas', 'readwrite');
            await promisifyRequest(transaccionEscritura.objectStore('pictogramas').put(imagenBlob, keyAlmacenamiento));

            return URL.createObjectURL(imagenBlob);
        } catch (error) {
            return 'imagenes/placeholder.png';
        }
    }

    // Motor nativo de Voz
    function hablarTextoIndividual(texto) {
        if (isPlayingSequence || !texto || texto.trim() === '') return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }

    // Leer frase con resaltado visual
    function hablarFraseSecuencial() {
        if (isPlayingSequence || fraseActual.length === 0) return;
        if (!('speechSynthesis' in window)) return;

        isPlayingSequence = true;
        const btnHablar = document.getElementById('hablar-frase-btn');
        if (btnHablar) btnHablar.classList.add('pulsing');

        window.speechSynthesis.cancel();

        let index = 0;
        const pictogramaDivs = document.querySelectorAll('#tira-frase .pictograma-frase-contenido');

        function leerSiguiente() {
            if (index >= fraseActual.length) {
                isPlayingSequence = false;
                if (btnHablar) btnHablar.classList.remove('pulsing');
                pictogramaDivs.forEach(div => div.classList.remove('leyendo-activo'));
                return;
            }

            const picto = fraseActual[index];
            const textoParaHablar = picto.hablar || picto.texto;
            const utterance = new SpeechSynthesisUtterance(textoParaHablar);
            utterance.lang = 'es-ES';
            utterance.rate = 0.85;

            pictogramaDivs.forEach(div => div.classList.remove('leyendo-activo'));
            if (pictogramaDivs[index]) {
                pictogramaDivs[index].classList.add('leyendo-activo');
            }

            utterance.onend = () => {
                index++;
                leerSiguiente();
            };

            utterance.onerror = () => {
                index++;
                leerSiguiente();
            };

            window.speechSynthesis.speak(utterance);
        }

        leerSiguiente();
    }

    function actualizarSugerenciasPredictivas() {
        const categoriasGrid = document.getElementById('categorias-grid');
        if (!categoriasGrid) return;

        if (fraseActual.length === 0) {
            Array.from(categoriasGrid.children).forEach(btn => btn.classList.remove('highlight-sugerencia'));
            return;
        }

        const ultimoPicto = fraseActual[fraseActual.length - 1];
        let categoriasSugeridas = [];

        if (ultimoPicto.tipo === 'pronombre') {
            categoriasSugeridas = ['Acciones', 'Quiero', 'Me siento', 'Preguntas'];
        } else if (['Quiero', 'Comer', 'Beber'].includes(ultimoPicto.texto) || ultimoPicto.tipo === 'verbo') {
            categoriasSugeridas = ['Comida', 'Bebidas', 'Juguetes y Pasatiempos', 'Lugares', 'Acciones'];
        } else if (ultimoPicto.texto?.toLowerCase() === 'me siento' || ultimoPicto.nombre === 'Me siento' || ultimoPicto.tipo === 'adjetivo') {
            categoriasSugeridas = ['Me siento', 'Cuerpo', 'Me duele'];
        } else if (ultimoPicto.tipo === 'interjeccion' || ultimoPicto.tipo === 'frase') {
            categoriasSugeridas = ['Social', 'Personas'];
        } else if (ultimoPicto.texto === 'Ayuda') {
            categoriasSugeridas = ['Acciones', 'Me duele', 'Cuerpo', 'Personas'];
        }

        Array.from(categoriasGrid.children).forEach(btn => {
            const spanText = btn.querySelector('span')?.textContent;
            if (spanText && categoriasSugeridas.includes(spanText)) {
                btn.classList.add('highlight-sugerencia');
            } else {
                btn.classList.remove('highlight-sugerencia');
            }
        });
    }

    function agregarAPipa(pictograma) {
        fraseActual.push(pictograma);
        renderizarTiraFrase();
        hablarTextoIndividual(pictograma.hablar || pictograma.texto || pictograma.nombre);
        actualizarSugerenciasPredictivas(); 
    }

    function obtenerClaseFitzgerald(tipo) {
        if (!tipo) return 'fitz-default';
        const t = tipo.toLowerCase();
        if (t === 'pronombre' || t === 'persona') return 'fitz-pronombre';
        if (t === 'verbo' || t === 'accion') return 'fitz-verbo';
        if (t === 'sustantivo') return 'fitz-sustantivo';
        if (t === 'adjetivo') return 'fitz-adjetivo';
        if (t === 'adverbio') return 'fitz-adverbio';
        if (t === 'interjeccion' || t === 'frase' || t === 'social') return 'fitz-social';
        return 'fitz-default';
    }

    async function renderizarTiraFrase() {
        const tiraFraseContainer = document.getElementById('tira-frase-container');
        const tiraFraseContainerText = document.getElementById('tira-frase-container-text');
        const tiraFraseControles = document.getElementById('tira-frase-controles');
        const tiraFraseDiv = document.getElementById('tira-frase');
        const tiraFraseTexto = document.getElementById('tira-frase-texto');

        if (!tiraFraseDiv || !tiraFraseTexto || !tiraFraseContainer) return;

        tiraFraseDiv.innerHTML = '';

        fraseActual.forEach((pictograma, index) => {
            const pictogramaContenedor = document.createElement('div');
            pictogramaContenedor.className = 'pictograma-frase';

            const pictogramaContenido = document.createElement('div');
            pictogramaContenido.className = `pictograma-frase-contenido ${obtenerClaseFitzgerald(pictograma.tipo)}`;

            const img = document.createElement('img');
            obtenerYCachearPictograma(pictograma).then(src => img.src = src);

            const btnBorrar = document.createElement('button');
            btnBorrar.className = 'btn-borrar-pictograma';
            btnBorrar.innerHTML = '&times;';
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

        const fraseComoTexto = fraseActual.map(p => p.hablar || p.texto || p.nombre).join(' ');
        tiraFraseTexto.textContent = fraseComoTexto;
        tiraFraseDiv.scrollLeft = tiraFraseDiv.scrollWidth;

        if (fraseActual.length === 0) {
            tiraFraseContainer.classList.add('hidden');
            tiraFraseContainerText.classList.add('hidden');
            tiraFraseControles.classList.add('hidden');
        } else {
            tiraFraseContainer.classList.remove('hidden');
            tiraFraseContainerText.classList.remove('hidden');
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
        const claseFitzgerald = obtenerClaseFitzgerald(item.tipo || item.categoria_tipo);
        pictoButton.className = `pictograma-button ${claseFitzgerald}`;

        const img = document.createElement('img');
        img.src = await obtenerYCachearPictograma(item);
        
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
            categoria.categoria_tipo = 'sustantivo'; 
            const btn = await crearBotonPictograma
