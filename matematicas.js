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

    // --- ELEMENTOS DEL DOM ---
    const operacionSelector = document.getElementById('operacion-selector');
    const problemaContainer = document.getElementById('problema-container');
    const opcionesContainer = document.getElementById('opciones-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const nuevoProblemaBtn = document.getElementById('nuevo-problema-btn');
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');
    
    // --- ESTADO DEL JUEGO ---
    let operacionActual = 'suma'; 
    let respuestaCorrecta = 0;
    let problemaActivo = true;

    // Lista de ítems con sus IDs fijos de ARASAAC para carga INSTANTÁNEA (cero demoras)
    const ITEMS_PARA_CONTAR = [
        { nombre: "manzanas", id: 2337 },
        { nombre: "pelotas", id: 2884 },
        { nombre: "coches", id: 2420 },
        { nombre: "gatos", id: 2414 },
        { nombre: "perros", id: 2415 },
        { nombre: "flores", id: 2623 },
        { nombre: "casas", id: 2277 },
        { nombre: "soles", id: 2772 },
        { nombre: "estrellas", id: 2816 }
    ];

    // --- MOTOR NATIVO DE VOZ ---
    function hablarTexto(texto) {
        if (!texto || texto.trim() === '') return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            utterance.rate = 0.85; // Velocidad amigable
            window.speechSynthesis.speak(utterance);
        }
    }

    // --- FUNCIONES DE GENERACIÓN DE PROBLEMAS ---
    function generarSuma() {
        const num1 = Math.floor(Math.random() * 5) + 1;
        const num2 = Math.floor(Math.random() * 5) + 1;
        return { num1, num2, respuesta: num1 + num2, textoOp: "más" };
    }

    function generarResta() {
        const num2 = Math.floor(Math.random() * 5) + 1;
        const num1 = num2 + Math.floor(Math.random() * 5) + 1; 
        return { num1, num2, respuesta: num1 - num2, textoOp: "menos" };
    }

    function generarMultiplicacion() {
        const num1 = Math.floor(Math.random() * 4) + 2; 
        const num2 = Math.floor(Math.random() * 3) + 2; 
        return { num1, num2, respuesta: num1 * num2, textoOp: "por" };
    }

    function generarDivision() {
        const respuesta = Math.floor(Math.random() * 4) + 2; 
        const num2 = Math.floor(Math.random() * 3) + 2;      
        const num1 = respuesta * num2; 
        return { num1, num2, respuesta, textoOp: "dividido" };
    }

    function generarNuevoProblema() {
        problemaActivo = true;
        opcionesContainer.innerHTML = '';
        feedbackContainer.textContent = '';
        feedbackContainer.className = '';
        problemaContainer.innerHTML = ''; 

        // Elegir un ítem aleatorio de nuestra lista predefinida
        const itemAleatorio = ITEMS_PARA_CONTAR[Math.floor(Math.random() * ITEMS_PARA_CONTAR.length)];
        const urlPictograma = `https://api.arasaac.org/api/pictograms/${itemAleatorio.id}?download=false`;

        let problema;
        let simbolo;
        
        switch (operacionActual) {
            case 'resta':
                problema = generarResta();
                simbolo = '-';
                break;
            case 'multiplicacion':
                problema = generarMultiplicacion();
                simbolo = '×';
                break;
            case 'division':
                problema = generarDivision();
                simbolo = '÷';
                break;
            case 'suma':
            default:
                problema = generarSuma();
                simbolo = '+';
                break;
        }
        
        respuestaCorrecta = problema.respuesta;
        
        // Renderizar el problema en pantalla
        mostrarProblemaVisual(problema.num1, problema.num2, simbolo, urlPictograma, itemAleatorio.nombre);
        generarOpciones(respuestaCorrecta);

        // Leer el problema en voz alta
        hablarTexto(`¿Cuánto es ${problema.num1} ${problema.textoOp} ${problema.num2}?`);
    }
    
    // --- FUNCIONES DE RENDERIZADO VISUAL ---

    // Crea un grupo que contiene las imágenes Y el número debajo
    function crearGrupoVisual(cantidad, urlImg, nombre) {
        const grupo = document.createElement('div');
        grupo.className = 'grupo-pictograma-container';

        const imgsContainer = document.createElement('div');
        imgsContainer.className = 'imagenes-grid-mini';
        
        // Ajustamos el tamaño de las imágenes si son muchas para que no desborde
        const tamañoImg = cantidad > 10 ? '30px' : '45px';

        for (let i = 0; i < cantidad; i++) {
            const img = document.createElement('img');
            img.src = urlImg;
            img.alt = nombre;
            img.style.width = tamañoImg;
            img.style.height = tamañoImg;
            imgsContainer.appendChild(img);
        }

        const numeroLabel = document.createElement('div');
        numeroLabel.className = 'numero-apoyo';
        numeroLabel.textContent = cantidad;

        grupo.appendChild(imgsContainer);
        grupo.appendChild(numeroLabel);
        return grupo;
    }

    function crearSimbolo(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        div.className = 'problema-simbolo';
        return div;
    }

    function mostrarProblemaVisual(num1, num2, simbolo, urlPictograma, nombre) {
        problemaContainer.appendChild(crearGrupoVisual(num1, urlPictograma, nombre));
        problemaContainer.appendChild(crearSimbolo(simbolo));
        problemaContainer.appendChild(crearGrupoVisual(num2, urlPictograma, nombre));
        problemaContainer.appendChild(crearSimbolo('='));
        problemaContainer.appendChild(crearSimbolo('?'));
    }

    function generarOpciones(respuesta) {
        let opciones = [respuesta];
        const maxRespuesta = (operacionActual === 'multiplicacion') ? 25 : (operacionActual === 'suma' ? 12 : 10);
        
        while (opciones.length < 3) {
            let opcionIncorrecta = Math.floor(Math.random() * maxRespuesta);
            if (opciones.includes(opcionIncorrecta)) continue;
            
            // Si es resta, no queremos opciones negativas y evitamos respuestas absurdas
            if (operacionActual === 'resta' && opcionIncorrecta > num1) continue; 
            
            opciones.push(opcionIncorrecta);
        }
        
        opciones.sort(() => Math.random() - 0.5);

        opciones.forEach(opcion => {
            const btn = document.createElement('button');
            btn.textContent = opcion;
            btn.className = 'opcion-btn';
            btn.dataset.valor = opcion;
            opcionesContainer.appendChild(btn);
        });
    }

    // --- LÓGICA DE RESPUESTA ---
    function verificarRespuesta(evento) {
        const botonSeleccionado = evento.target.closest('.opcion-btn');
        if (!botonSeleccionado || !problemaActivo) return;

        const respuestaUsuario = parseInt(botonSeleccionado.dataset.valor);
        
        // Leer el número que el niño tocó
        hablarTexto(respuestaUsuario.toString());

        if (respuestaUsuario === respuestaCorrecta) {
            problemaActivo = false;
            botonSeleccionado.classList.add('correcto');
            feedbackContainer.textContent = '¡Muy Bien!';
            feedbackContainer.className = 'correcto';
            
            if(audioCorrecto) audioCorrecto.play();
            
            // Lanzar confeti!
            if (typeof confetti === 'function') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }

            // Cambiar la interrogante por el número correcto
            const simbolos = problemaContainer.querySelectorAll('.problema-simbolo');
            if(simbolos.length > 0) simbolos[simbolos.length - 1].textContent = respuestaCorrecta;

            setTimeout(generarNuevoProblema, 3000);
        } else {
            botonSeleccionado.classList.add('incorrecto');
            feedbackContainer.textContent = 'Inténtalo otra vez';
            feedbackContainer.className = 'incorrecto';
            if(audioIncorrecto) audioIncorrecto.play();
            
            setTimeout(() => {
                botonSeleccionado.classList.remove('incorrecto');
                feedbackContainer.textContent = '';
                feedbackContainer.className = '';
            }, 1000);
        }
    }

    // --- EVENT LISTENERS ---
    operacionSelector.addEventListener('click', (e) => {
        const botonSeleccionado = e.target.closest('.op-btn');
        if (!botonSeleccionado || botonSeleccionado.classList.contains('active')) return;

        // Leer la operación seleccionada
        hablarTexto(botonSeleccionado.dataset.hablar);

        operacionActual = botonSeleccionado.dataset.op;
        document.querySelector('.op-btn.active').classList.remove('active');
        botonSeleccionado.classList.add('active');
        
        generarNuevoProblema();
    });

    nuevoProblemaBtn.addEventListener('click', () => {
        hablarTexto("Nuevo problema");
        generarNuevoProblema();
    });
    
    opcionesContainer.addEventListener('click', verificarRespuesta);

    // --- INICIAR EL JUEGO ---
    generarNuevoProblema();
});
