
let sintesisEnCurso = false;

// Event listener para las imágenes (reproducir audio al hacer clic)
const imagenes = document.querySelectorAll('.imagenes img');
imagenes.forEach((imagen, index) => {
    imagen.addEventListener('click', () => {
        hablarTexto('Texto de la imagen en voz'); // Reemplaza con el texto de la imagen
    });
});

// Función para hablar texto en voz
function hablarTexto(texto) {
    // Si ya hay una síntesis de voz en curso, cáncelala
    if (sintesisEnCurso) {
        window.speechSynthesis.cancel();
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(texto);

    // Configurar opciones de síntesis de voz según sea necesario (velocidad, tono, idioma, etc.)
    utterance.rate = 0.6; // Velocidad normal
    utterance.pitch = 1.1; // Tono normal
  // utterance.lang = 'es-UY'; // Establece el idioma, por ejemplo, español

    // Manejar el evento 'end' para indicar que la síntesis ha terminado
    utterance.onend = () => {
        sintesisEnCurso = false;
    };

    // Iniciar la síntesis de voz
    synth.speak(utterance);

    sintesisEnCurso = true;
}

// Función para cargar los datos desde el archivo JSON
function cargarDatos() {
    fetch('datos.json')
        .then(response => response.json())
        .then(data => {
            // Iterar a través de las categorías y mostrar botones
            data.categorias.forEach(categoria => {
                
                const categoriaButton = document.createElement('button');
                categoriaButton.classList.add('categoria-button');
               // categoriaButton.textContent = categoria.nombre;
                const imagen = document.createElement('img');
                imagen.src = categoria.src;
                categoriaButton.appendChild(imagen);
                categoriaButton.addEventListener('click', () => {
                    mostrarImagenes(categoria.imagenes);
                });
                document.querySelector('.categorias').appendChild(categoriaButton);
            });
        })
        .catch(error => {
            console.error(error);
        });
}

// Función para mostrar imágenes y texto asociado en la categoría seleccionada

function mostrarImagenes(imagenes) {
    const imagenesGrid = document.querySelector('.imagenes-grid');
    imagenesGrid.innerHTML = ''; // Limpiamos el grid antes de agregar nuevas imágenes

    imagenes.forEach(imagen => {
        if (imagen.separador) {
            // Agregar un elemento separador (por ejemplo, <hr>) al grid
            const separador = document.createElement('hr');
            separador.classList.add('separador');
            imagenesGrid.appendChild(separador);
        } else {
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('imagen-container');

            const imgElement = document.createElement('img');
            imgElement.src = `imagenes/${imagen.src}`; // Ruta relativa a la carpeta "imagenes"
            imgElement.alt = imagen.texto; // Agregamos el texto como atributo "alt"

            imgElement.addEventListener('click', () => {
                hablarTexto(imagen.texto);
            });

            imgContainer.appendChild(imgElement);
            imagenesGrid.appendChild(imgContainer);
        }
    });
}


// Cargar los datos cuando la página se cargue
window.addEventListener('load', cargarDatos, mostrarImagenes);

