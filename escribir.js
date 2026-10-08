document.addEventListener('DOMContentLoaded', () => {
        // --- CONTROL DEL BOTÓN ATRÁS DEL MÓVIL ---
    // Añadimos un estado "falso" a la memoria del celular
    window.history.pushState({ pagina: "minijuego" }, "", "");

    // Cuando el usuario presiona el botón físico de "Atrás"
    window.addEventListener('popstate', function(event) {
        // En lugar de ir a donde el celular quiere, lo forzamos a ir al inicio
        window.location.replace('index.html');
    });
    // ------------------------------------------

    const textarea = document.getElementById('texto-escribir');
    const btnLeer = document.getElementById('leer-texto');
    const listaHistorial = document.getElementById('historial-lista');
    const btnBorrarHistorial = document.getElementById('borrar-historial-btn');

    // Cargar historial guardado (máximo 20 frases)
    let historial = JSON.parse(localStorage.getItem('comunicador_historial_escribir')) || [];

    // Función principal para leer en voz alta
    function leerTexto(texto, guardar = true) {
        if (!texto || texto.trim() === '') return;

        // Reproducir voz nativa offline
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Detener audios anteriores
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            utterance.rate = 0.9; // Velocidad amigable para CAA
            window.speechSynthesis.speak(utterance);
        }

        if (guardar) {
            // Guardar solo si no es exactamente igual a la última frase
            if (historial[0] !== texto.trim()) {
                historial.unshift(texto.trim()); // Agregar al inicio
                if (historial.length > 20) historial.pop(); // Mantener solo las últimas 20
                guardarHistorial();
                renderizarHistorial();
            }
        }
    }

    function guardarHistorial() {
        localStorage.setItem('comunicador_historial_escribir', JSON.stringify(historial));
    }

    function renderizarHistorial() {
        listaHistorial.innerHTML = '';
        
        if (historial.length === 0) {
            listaHistorial.innerHTML = '<p style="color: #666; text-align: center;">Aún no hay frases guardadas.</p>';
            btnBorrarHistorial.classList.add('hidden');
            return;
        }

        btnBorrarHistorial.classList.remove('hidden');

        historial.forEach((texto, index) => {
            const li = document.createElement('li');
            li.className = 'historial-item';

            // Al hacer clic en el texto, se lee y se copia al área de escritura
            const spanTexto = document.createElement('span');
            spanTexto.className = 'historial-texto';
            spanTexto.textContent = texto;
            spanTexto.onclick = () => {
                textarea.value = texto;
                leerTexto(texto, false); // false para no volver a guardarlo en el historial
            };

            // Botón individual para borrar una frase del historial
            const btnBorrar = document.createElement('button');
            btnBorrar.className = 'btn-borrar-item';
            btnBorrar.innerHTML = '<i class="fas fa-times"></i>';
            btnBorrar.onclick = (e) => {
                e.stopPropagation(); // Evita que se dispare el click del texto
                historial.splice(index, 1);
                guardarHistorial();
                renderizarHistorial();
            };

            li.appendChild(spanTexto);
            li.appendChild(btnBorrar);
            listaHistorial.appendChild(li);
        });
    }

    // Eventos de los botones
    btnLeer.addEventListener('click', () => {
        leerTexto(textarea.value);
    });

    btnBorrarHistorial.addEventListener('click', () => {
        if(confirm('¿Seguro que deseas vaciar todo el historial?')) {
            historial = [];
            guardarHistorial();
            renderizarHistorial();
        }
    });

    // Permitir leer el texto al presionar la tecla "Enter" (si no está apretando Shift)
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Evita el salto de línea
            leerTexto(textarea.value);
        }
    });

    // Carga inicial
    renderizarHistorial();
});
