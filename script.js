let sintesisEnCurso = false;

// Función para hablar texto en voz
function hablarTexto(texto) {
    if (sintesisEnCurso) {
        window.speechSynthesis.cancel();
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.rate = 0.6;
    utterance.pitch = 1.1;

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
                    document.querySelector('.categorias-grid').style.display = 'none';
                    document.querySelector('.imagenes-grid').style.display = 'grid';
                    document.querySelector('#back-button').classList.remove('hidden');
                });
                categoriasGrid.appendChild(categoriaButton);

                const dropdownButton = document.createElement('button');
                dropdownButton.textContent = categoria.nombre;
                dropdownButton.addEventListener('click', () => {
                    mostrarImagenes(categoria.imagenes);
                    document.querySelector('.categorias-grid').style.display = 'none';
                    document.querySelector('.imagenes-grid').style.display = 'grid';
                    document.querySelector('#back-button').classList.remove('hidden');
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

// Función para agregar texto al historial y guardarlo en localStorage
function agregarAlHistorial(texto) {
    const historial = JSON.parse(localStorage.getItem('historial')) || [];
    historial.push(texto);
    localStorage.setItem('historial', JSON.stringify(historial));
    cargarHistorial();
}

// Event listener para el botón de regresar en index.html
const backButton = document.getElementById('back-button');
if (backButton) {
    backButton.addEventListener('click', () => {
        document.querySelector('.categorias-grid').style.display = 'grid';
        document.querySelector('.imagenes-grid').style.display = 'none';
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

// Cargar los datos cuando la página se cargue
window.addEventListener('load', cargarDatos);
