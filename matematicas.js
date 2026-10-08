document.addEventListener('DOMContentLoaded', () => {

    // --- CONTROL DEL BOTÓN ATRÁS DEL MÓVIL ---
    window.history.pushState({ pagina: "minijuego" }, "", "");
    window.addEventListener('popstate', function(event) {
        window.location.replace('index.html');
    });
    // ------------------------------------------

    const operacionSelector = document.getElementById('operacion-selector');
    const problemaContainer = document.getElementById('problema-container');
    const opcionesContainer = document.getElementById('opciones-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const nuevoProblemaBtn = document.getElementById('nuevo-problema-btn');
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');
    
    let operacionActual = 'suma'; 
    let respuestaCorrecta = 0;
    let problemaActivo = true;
    const cacheMates = {};

    const ITEMS_PARA_CONTAR = ["manzana", "pelota", "coche", "gato", "perro", "flor", "casa", "sol", "estrella"];

    function hablarTexto(texto) {
        if (!texto || texto.trim() === '') return;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'es-ES';
            utterance.rate = 0.85; 
            window.speechSynthesis.speak(utterance);
        }
    }

    // BÚSQUEDA AUTOMÁTICA Y SEGURA
    async function obtenerUrlPictogramaSeguro(palabra) {
        if (cacheMates[palabra]) return cacheMates[palabra];
        try {
            const url = `https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(palabra)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && data.length > 0) {
                const pictoUrl = `https://api.arasaac.org/api/pictograms/${data[0]._id}?download=false`;
                cacheMates[palabra] = pictoUrl;
                return pictoUrl;
            }
            return 'imagenes/placeholder.png';
        } catch (error) {
            return 'imagenes/placeholder.png';
        }
    }

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

    async function generarNuevoProblema() {
        problemaActivo = true;
        opcionesContainer.innerHTML = '';
        feedbackContainer.textContent = '';
        feedbackContainer.className = '';
        problemaContainer.innerHTML = '<p>Cargando...</p>'; 

        const itemAleatorio = ITEMS_PARA_CONTAR[Math.floor(Math.random() * ITEMS_PARA_CONTAR.length)];
        const urlPictograma = await obtenerUrlPictogramaSeguro(itemAleatorio);

        problemaContainer.innerHTML = ''; 

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
        
        mostrarProblemaVisual(problema.num1, problema.num2, simbolo, urlPictograma, itemAleatorio);
        generarOpciones(respuestaCorrecta);

        hablarTexto(`¿Cuánto es ${problema.num1} ${problema.textoOp} ${problema.num2}?`);
    }

    function crearGrupoVisual(cantidad, urlImg, nombre) {
        const grupo = document.createElement('div');
        grupo.className = 'grupo-pictograma-container';

        const imgsContainer = document.createElement('div');
        imgsContainer.className = 'imagenes-grid-mini';
        
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
            // Evitar resultados negativos en la interfaz de resta (aunque las restas ya no los generan)
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

    function verificarRespuesta(evento) {
        const botonSeleccionado = evento.target.closest('.opcion-btn');
        if (!botonSeleccionado || !problemaActivo) return;

        const respuestaUsuario = parseInt(botonSeleccionado.dataset.valor);
        hablarTexto(respuestaUsuario.toString());

        if (respuestaUsuario === respuestaCorrecta) {
            problemaActivo = false;
            botonSeleccionado.classList.add('correcto');
            feedbackContainer.textContent = '¡Muy Bien!';
            feedbackContainer.className = 'correcto';
            
            if(audioCorrecto) audioCorrecto.play();
            
            if (typeof confetti === 'function') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }

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

    operacionSelector.addEventListener('click', (e) => {
        const botonSeleccionado = e.target.closest('.op-btn');
        if (!botonSeleccionado || botonSeleccionado.classList.contains('active')) return;

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

    generarNuevoProblema();
});
