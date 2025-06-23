document.addEventListener('DOMContentLoaded', () => {
    // --- INICIO: CÓDIGO PARA LA BASE DE DATOS ---
    let db;

    async function initDB() {
        if (!('indexedDB' in window)) {
            console.error('Este navegador no soporta IndexedDB.');
            return;
        }
        db = await idb.openDB('audios-db', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('audios')) {
                    db.createObjectStore('audios');
                }
            },
        });
    }

    // --- FIN: CÓDIGO PARA LA BASE DE DATOS ---

    let sintesisEnCurso = false;

    // --- FUNCIÓN 'hablarTexto' MODIFICADA PARA GUARDAR AUDIOS ---
    async function hablarTexto(texto) {
        if (!texto || texto.trim() === '') return;

        if (sintesisEnCurso) {
            window.speechSynthesis.cancel();
        }
        sintesisEnCurso = true;

        try {
            const audioGuardado = await db.get('audios', texto);

            if (audioGuardado) {
                const url = URL.createObjectURL(audioGuardado);
                const audio = new Audio(url);
                audio.onended = () => {
                    sintesisEnCurso = false;
                };
                audio.play();
            } else {
                const synth = window.speechSynthesis;
                const utterance = new SpeechSynthesisUtterance(texto);
                utterance.lang = 'es-ES';
                utterance.rate = parseFloat(localStorage.getItem('speechRate') || 1);
                utterance.pitch = parseFloat(localStorage.getItem('speechPitch') || 1);

                utterance.onend = () => {
                    sintesisEnCurso = false;
                };
                
                // Simulación de grabación para compatibilidad
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const destination = audioContext.createMediaStreamDestination();
                const mediaRecorder = new MediaRecorder(destination.stream);
                const chunks = [];
                
                mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
                
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
                    await db.put('audios', blob, texto);
                    audioContext.close(); // Liberar recursos
                };
                
                const source = audioContext.createBufferSource(); // Fuente vacía
                source.connect(destination);

                synth.speak(utterance);
                
                // Iniciar y detener la grabación casi instantáneamente después de hablar
                setTimeout(() => mediaRecorder.start(), 0);
                utterance.addEventListener('end', () => {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                });
            }
        } catch (error) {
            console.error("Error al procesar el audio:", error);
            sintesisEnCurso = false;
        }
    }

    // --- FUNCIONES ORIGINALES DEL PROYECTO ---

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
                        dropdownContent.style.display = 'none';
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
        recognition.maxAlternatives = 1;
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

    // --- EVENT LISTENERS PARA CADA PÁGINA ---

    // Página Principal (index.html)
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            document.querySelector('.categorias-grid').style.display = 'grid';
            document.querySelector('.imagenes-grid').style.display = 'none';
            const footer = document.querySelector('footer');
            if(footer) footer.style.display = 'flex';
            backButton.classList.add('hidden');
        });
        cargarDatos();
    }

    // Página de Escribir (escribir.html)
    const backButtonEscribir = document.getElementById('back-button-escribir');
    if (backButtonEscribir) {
        backButtonEscribir.addEventListener('click', () => window.history.back());
        document.getElementById('leer-texto').addEventListener('click', () => {
            const texto = document.getElementById('texto-escribir').value;
            hablarTexto(texto);
            agregarAlHistorial(texto);
        });
        cargarHistorial();
    }

    // Página de Escuchar (escuchar.html)
    const backButtonEscuchar = document.getElementById('back-button-escuchar');
    if (backButtonEscuchar) {
        backButtonEscuchar.addEventListener('click', () => window.history.back());
        document.getElementById('empezar-escuchar').addEventListener('click', empezarEscuchar);
        cargarHistorial();
    }
    
    // Inicializar la base de datos al cargar el script
    initDB();
});