document.addEventListener('DOMContentLoaded', async () => {
    let db;

    // --- FUNCIÓN initDB REESCRITA CON API NATIVA ---
    async function initDB() {
        return new Promise((resolve, reject) => {
            // Solicitud para abrir la base de datos.
            const request = window.indexedDB.open('audios-db', 1);

            // Se ejecuta si hay un error en la apertura.
            request.onerror = (event) => {
                console.error("Error de IndexedDB:", event.target.error);
                reject(event.target.error);
            };

            // Se ejecuta si la base de datos se abre con éxito.
            request.onsuccess = (event) => {
                console.log("Base de datos inicializada correctamente.");
                resolve(event.target.result);
            };

            // Se ejecuta si se necesita crear o actualizar la estructura de la base de datos.
            request.onupgradeneeded = (event) => {
                console.log("Actualizando la estructura de la base de datos...");
                const dbInstance = event.target.result;
                if (!dbInstance.objectStoreNames.contains('audios')) {
                    dbInstance.createObjectStore('audios');
                }
            };
        });
    }
    
    // --- FUNCIÓN PARA "PROMESIFICAR" LAS PETICIONES DE INDEXEDDB ---
    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    try {
        db = await initDB();
    } catch (error) {
        console.error("No se pudo inicializar la base de datos, la app funcionará sin guardar audios.", error);
        db = null;
    }

    // --- LÓGICA DE LA APLICACIÓN ---
    let sintesisEnCurso = false;

    // --- FUNCIÓN hablarTexto ADAPTADA A LA API NATIVA ---
    async function hablarTexto(texto) {
        if (!texto || texto.trim() === '') return;
        if (sintesisEnCurso) {
            window.speechSynthesis.cancel();
        }
        sintesisEnCurso = true;

        if (!db) {
            console.warn("Base de datos no disponible. Reproduciendo sin guardar.");
            const synth = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            utterance.rate = parseFloat(localStorage.getItem('speechRate') || 1);
            utterance.pitch = parseFloat(localStorage.getItem('speechPitch') || 1);
            utterance.onend = () => { sintesisEnCurso = false; };
            synth.speak(utterance);
            return;
        }

        try {
            const readTransaction = db.transaction('audios', 'readonly');
            const audioStore = readTransaction.objectStore('audios');
            const audioGuardado = await promisifyRequest(audioStore.get(texto));

            if (audioGuardado) {
                console.log(`Reproduciendo audio cacheado para: "${texto}"`);
                const url = URL.createObjectURL(audioGuardado);
                const audio = new Audio(url);
                audio.onended = () => { sintesisEnCurso = false; };
                audio.play();
            } else {
                console.log(`Generando y guardando audio para: "${texto}"`);
                const synth = window.speechSynthesis;
                const utterance = new SpeechSynthesisUtterance(texto);
                utterance.lang = 'es-ES';
                utterance.rate = parseFloat(localStorage.getItem('speechRate') || 1);
                utterance.pitch = parseFloat(localStorage.getItem('speechPitch') || 1);

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const destination = audioContext.createMediaStreamDestination();
                const mediaRecorder = new MediaRecorder(destination.stream);
                const chunks = [];
                
                const source = audioContext.createBufferSource();
                source.connect(destination);
                
                mediaRecorder.ondataavailable = e => chunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                    const writeTransaction = db.transaction('audios', 'readwrite');
                    const audioStoreWrite = writeTransaction.objectStore('audios');
                    await promisifyRequest(audioStoreWrite.put(blob, texto));
                    console.log(`Audio para "${texto}" guardado.`);
                    audioContext.close();
                };

                utterance.onstart = () => mediaRecorder.start();
                utterance.onend = () => {
                    if (mediaRecorder.state === 'recording') mediaRecorder.stop();
                    sintesisEnCurso = false;
                };
                
                synth.speak(utterance);
            }
        } catch (error) {
            console.error(`Error al procesar el audio para "${texto}":`, error);
            sintesisEnCurso = false;
        }
    }
    
    // --- EL RESTO DE TU CÓDIGO PERMANECE IGUAL ---

    function cargarDatos() {
        fetch('datos.json')
            .then(response => response.json())
            .then(data => {
                const categoriasGrid = document.querySelector('.categorias-grid');
                const dropdownContent = document.querySelector('.dropdown-content');
                if (!categoriasGrid || !dropdownContent) return;

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
                        if(footer) footer.style.display = 'none';
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
                        if(footer) footer.style.display = 'none';
                        const dropdown = document.querySelector('.dropdown-content');
                        if(dropdown) dropdown.style.display = 'none';
                    });
                    dropdownContent.appendChild(dropdownButton);
                });
            })
            .catch(error => console.error("Error al cargar datos.json:", error));
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

    // --- CONFIGURACIÓN DE EVENT LISTENERS ---

    if (document.querySelector('.categorias-grid')) {
        const backButton = document.getElementById('back-button');
        backButton.addEventListener('click', () => {
            document.querySelector('.categorias-grid').style.display = 'grid';
            document.querySelector('.imagenes-grid').style.display = 'none';
            const footer = document.querySelector('footer');
            if (footer) footer.style.display = 'flex';
            backButton.classList.add('hidden');
        });
        cargarDatos();
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