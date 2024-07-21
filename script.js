let sintesisEnCurso = false;

// Función para hablar texto en voz
function hablarTexto(texto) {
    if (sintesisEnCurso) {
        window.speechSynthesis.cancel();
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(texto);

    // Cargar valores de configuración desde localStorage
    const rate = localStorage.getItem('speechRate') || 1;
    const pitch = localStorage.getItem('speechPitch') || 1;

    utterance.rate = parseFloat(rate);
    utterance.pitch = parseFloat(pitch);

    utterance.onend = () => {
        sintesisEnCurso = false;
    };

    synth.speak(utterance);
    sintesisEnCurso = true;
}

// Función para cargar los datos desde el archivo JSON
function cargarDatos() {
    fetch('datos.json')
        .then(response => response.json())
        .then(data => {
            const categoriasGrid = document.querySelector('.categorias-grid');
            const dropdownContent = document.querySelector('.dropdown-content');
            data.categorias.forEach(categoria => {
                const categoriaButton = document.createElement('button');
                categoriaButton.classList.add('categoria-button');
                const imagen = document.createElement('img');
                imagen.src = categoria.src;
                categoriaButton.appendChild(imagen);
                categoriaButton.addEventListener('click', () => {
                    mostrarImagenes(categoria.imagenes);
                     hablarTexto(categoria.nombre);
                    document.querySelector('.categorias-grid').style.display = 'none';
                    document.querySelector('.imagenes-grid').style.display = 'grid';
                    document.querySelector('#back-button').classList.remove('hidden');
                    document.querySelector('footer').style.display = 'none';
                });
                categoriasGrid.appendChild(categoriaButton);

                const dropdownButton = document.createElement('button');

              //  dropdownButton.classList.add("dropcatbtn");
                dropdownButton.textContent = categoria.nombre;
                dropdownButton.addEventListener('click', () => {
                    mostrarImagenes(categoria.imagenes);
                     hablarTexto(categoria.nombre);
                    document.querySelector('.categorias-grid').style.display = 'none';
                    document.querySelector('.imagenes-grid').style.display = 'grid';
                    document.querySelector('#back-button').classList.remove('hidden');
                   // document.querySelector('.dropcatbtn').style.display = 'none';
                    document.querySelector('footer').style.display = 'none';
                });
                dropdownContent.appendChild(dropdownButton);
            });
        })
        .catch(error => {
            console.error(error);
        });
}

// Función para mostrar imágenes y texto asociado en la categoría seleccionada
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

            imgElement.addEventListener('click', () => {
                hablarTexto(imagen.texto);
            });

            imgContainer.appendChild(imgElement);
            imagenesGrid.appendChild(imgContainer);
        }
    });
}

// Función para cargar y mostrar el historial de textos
function cargarHistorial() {
    const historialLista = document.getElementById('historial-lista');
    if (historialLista) {
        historialLista.innerHTML = '';
        const historial = JSON.parse(localStorage.getItem('historial')) || [];
        historial.reverse().forEach(texto => {
            const li = document.createElement('li');
            li.textContent = texto;
            li.addEventListener('click', () => {
                hablarTexto(texto);
            });
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
            li.addEventListener('click', () => {
                hablarTexto(texto);
            });
            historialListaEscuchar.appendChild(li);
        });
    }
}

// Función para agregar texto al historial y guardarlo en localStorage
function agregarAlHistorial(texto) {
    if (texto.trim() === "") return; // Verificación de texto vacío

    const historial = JSON.parse(localStorage.getItem('historial')) || [];
    historial.push(texto);
    localStorage.setItem('historial', JSON.stringify(historial));
    cargarHistorial();
}

// Función para agregar texto al historial de escuchar y guardarlo en localStorage
function agregarAlHistorialEscuchar(texto) {
    if (texto.trim() === "") return; // Verificación de texto vacío

    const historialEscuchar = JSON.parse(localStorage.getItem('historialEscuchar')) || [];
    historialEscuchar.push(texto);
    localStorage.setItem('historialEscuchar', JSON.stringify(historialEscuchar));
    cargarHistorial();
}

// Función para manejar el reconocimiento de voz
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
    escucharButton.classList.add('pulsing'); // Añadir la clase para la animación

    recognition.start();

    recognition.onresult = (event) => {
        const texto = event.results[0][0].transcript;
        document.getElementById('texto-escuchado').textContent = texto;
        agregarAlHistorialEscuchar(texto);
    };

    recognition.onspeechend = () => {
        recognition.stop();
        escucharButton.classList.remove('pulsing'); // Quitar la clase cuando se detiene el reconocimiento
    };

    recognition.onerror = (event) => {
        console.error('Error en el reconocimiento de voz: ', event.error);
        escucharButton.classList.remove('pulsing'); // Quitar la clase en caso de error
    };
}

// Event listener para el botón de regresar en index.html
const backButton = document.getElementById('back-button');
if (backButton) {
    backButton.addEventListener('click', () => {
        document.querySelector('.categorias-grid').style.display = 'grid';
        document.querySelector('.imagenes-grid').style.display = 'none';
        document.querySelector('footer').style.display = 'flex';
        backButton.classList.add('hidden');
  
    });
}

// Event listener para el botón de regresar en escribir.html
const backButtonEscribir = document.getElementById('back-button-escribir');
if (backButtonEscribir) {
    backButtonEscribir.addEventListener('click', () => {
        window.history.back();
    });

    document.getElementById('leer-texto').addEventListener('click', () => {
        const texto = document.getElementById('texto-escribir').value;
        hablarTexto(texto);
        agregarAlHistorial(texto);
    });

    // Cargar el historial al cargar la página
    window.addEventListener('load', cargarHistorial);
}

// Event listener para el botón de regresar en escuchar.html
const backButtonEscuchar = document.getElementById('back-button-escuchar');
if (backButtonEscuchar) {
    backButtonEscuchar.addEventListener('click', () => {
        window.history.back();
    });

    document.getElementById('empezar-escuchar').addEventListener('click', empezarEscuchar);

    // Cargar el historial al cargar la página
    window.addEventListener('load', cargarHistorial);
}


// Cargar los datos cuando la página se cargue
window.addEventListener('load', cargarDatos);
