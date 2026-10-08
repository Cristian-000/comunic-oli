document.addEventListener('DOMContentLoaded', () => {
    const btnEscuchar = document.getElementById('empezar-escuchar');
    const estadoEscucha = document.getElementById('estado-escucha');
    const textoEscuchado = document.getElementById('texto-escuchado');
    const listaHistorial = document.getElementById('historial-lista-escuchar');
    const btnBorrarHistorial = document.getElementById('borrar-historial-escuchar-btn');

    let historial = JSON.parse(localStorage.getItem('comunicador_historial_escuchar')) || [];
    let reconociendo = false;
    let reconocimiento;

    // Verificar si el navegador soporta el reconocimiento de voz
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        estadoEscucha.textContent = "Tu navegador no soporta el micrófono.";
        estadoEscucha.style.color = "red";
        btnEscuchar.disabled = true;
        btnEscuchar.style.opacity = "0.5";
    } else {
        reconocimiento = new SpeechRecognition();
        reconocimiento.lang = 'es-ES'; // Idioma español
        reconocimiento.continuous = true; // Sigue escuchando aunque hagas pausas
        reconocimiento.interimResults = true; // Muestra lo que vas diciendo en tiempo real

        reconocimiento.onstart = () => {
            reconociendo = true;
            btnEscuchar.classList.add('escuchando');
            estadoEscucha.textContent = "Escuchando... (Toca para detener)";
            textoEscuchado.textContent = "";
        };

        reconocimiento.onresult = (event) => {
            let textoIntermedio = '';
            let textoFinal = '';

            // Clasificar los resultados entre finales y los que aún se están procesando
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    textoFinal += event.results[i][0].transcript;
                } else {
                    textoIntermedio += event.results[i][0].transcript;
                }
            }

            // Mostrar el texto en pantalla gigante
            textoEscuchado.textContent = textoFinal + textoIntermedio;

            // Si es una frase finalizada, agregarla al historial
            if (textoFinal.trim() !== '') {
                agregarAlHistorial(textoFinal.trim());
            }
        };

        reconocimiento.onerror = (event) => {
            console.error("Error de micrófono:", event.error);
            if (event.error === 'not-allowed') {
                estadoEscucha.textContent = "Permiso de micrófono denegado.";
            } else {
                estadoEscucha.textContent = "Error al escuchar. Intenta de nuevo.";
            }
            detenerReconocimiento();
        };

        reconocimiento.onend = () => {
            // Si se detiene por silencio, reiniciar el botón
            reconociendo = false;
            btnEscuchar.classList.remove('escuchando');
            if (estadoEscucha.textContent.includes("Escuchando")) {
                estadoEscucha.textContent = "Toca el micrófono para hablar";
            }
        };
    }

    function detenerReconocimiento() {
        if (reconocimiento && reconociendo) {
            reconocimiento.stop();
            reconociendo = false;
            btnEscuchar.classList.remove('escuchando');
            estadoEscucha.textContent = "Toca el micrófono para hablar";
        }
    }

    btnEscuchar.addEventListener('click', () => {
        if (reconociendo) {
            detenerReconocimiento();
        } else {
            try {
                reconocimiento.start();
            } catch (error) {
                console.error("Error al iniciar:", error);
            }
        }
    });

    // --- LÓGICA DEL HISTORIAL (Igual que en escribir.js) ---
    function agregarAlHistorial(texto) {
        // Evitar duplicados seguidos
        if (historial[0] !== texto) {
            historial.unshift(texto);
            if (historial.length > 20) historial.pop();
            guardarHistorial();
            renderizarHistorial();
        }
    }

    function guardarHistorial() {
        localStorage.setItem('comunicador_historial_escuchar', JSON.stringify(historial));
    }

    function renderizarHistorial() {
        listaHistorial.innerHTML = '';
        
        if (historial.length === 0) {
            listaHistorial.innerHTML = '<p style="color: #666; text-align: center;">Aún no hay frases registradas.</p>';
            btnBorrarHistorial.classList.add('hidden');
            return;
        }

        btnBorrarHistorial.classList.remove('hidden');

        historial.forEach((texto, index) => {
            const li = document.createElement('li');
            li.className = 'historial-item';

            const spanTexto = document.createElement('span');
            spanTexto.className = 'historial-texto';
            spanTexto.textContent = texto;

            const btnBorrar = document.createElement('button');
            btnBorrar.className = 'btn-borrar-item';
            btnBorrar.innerHTML = '<i class="fas fa-times"></i>';
            btnBorrar.onclick = () => {
                historial.splice(index, 1);
                guardarHistorial();
                renderizarHistorial();
            };

            li.appendChild(spanTexto);
            li.appendChild(btnBorrar);
            listaHistorial.appendChild(li);
        });
    }

    btnBorrarHistorial.addEventListener('click', () => {
        if(confirm('¿Seguro que deseas vaciar el historial de escuchas?')) {
            historial = [];
            guardarHistorial();
            renderizarHistorial();
            textoEscuchado.textContent = ""; // Limpiar pantalla grande también
        }
    });

    // Cargar historial al iniciar
    renderizarHistorial();
});
