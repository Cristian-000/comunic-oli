document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const operacionSelector = document.getElementById('operacion-selector');
    const problemaContainer = document.getElementById('problema-container');
    const opcionesContainer = document.getElementById('opciones-container');
    const feedbackContainer = document.getElementById('feedback-container');
    const nuevoProblemaBtn = document.getElementById('nuevo-problema-btn');
    const audioCorrecto = document.getElementById('audio-correcto');
    const audioIncorrecto = document.getElementById('audio-incorrecto');
    
    // --- ESTADO DEL JUEGO ---
    let operacionActual = 'suma'; // Inicia en 'suma' por defecto
    let respuestaCorrecta = 0;
    let problemaActivo = true;
    const ITEMS_PARA_CONTAR = ["manzana", "pelota", "coche", "gato", "perro", "flor", "casa", "árbol", "sol", "estrella"];

    // --- FUNCIONES DE GENERACIÓN DE PROBLEMAS ---

    // Genera un problema de SUMA
    function generarSuma() {
        const num1 = Math.floor(Math.random() * 5) + 1;
        const num2 = Math.floor(Math.random() * 5) + 1;
        return { num1, num2, respuesta: num1 + num2 };
    }

    // Genera un problema de RESTA (asegurando que el resultado no sea negativo)
    function generarResta() {
        const num2 = Math.floor(Math.random() * 5) + 1;
        const num1 = num2 + Math.floor(Math.random() * 5) + 1; // num1 siempre es mayor que num2
        return { num1, num2, respuesta: num1 - num2 };
    }

    // Genera un problema de MULTIPLICACIÓN
    function generarMultiplicacion() {
        const num1 = Math.floor(Math.random() * 4) + 2; // Números del 2 al 5
        const num2 = Math.floor(Math.random() * 3) + 2; // Números del 2 al 4
        return { num1, num2, respuesta: num1 * num2 };
    }

    // Genera un problema de DIVISIÓN (asegurando que el resultado sea un número entero)
    function generarDivision() {
        const respuesta = Math.floor(Math.random() * 4) + 2; // Resultado del 2 al 5
        const num2 = Math.floor(Math.random() * 3) + 2;      // Divisor del 2 al 4
        const num1 = respuesta * num2; // El dividendo se calcula para que no haya resto
        return { num1, num2, respuesta };
    }

    // Función principal que genera un nuevo problema según la operación seleccionada
    async function generarNuevoProblema() {
        problemaActivo = true;
        problemaContainer.innerHTML = 'Cargando problema...';
        opcionesContainer.innerHTML = '';
        feedbackContainer.textContent = '';
        feedbackContainer.className = '';

        const itemAleatorio = ITEMS_PARA_CONTAR[Math.floor(Math.random() * ITEMS_PARA_CONTAR.length)];
        const urlPictograma = await obtenerUrlPictograma(itemAleatorio);
        problemaContainer.innerHTML = ''; 

        let problema;
        let simbolo;
        
        // Elige qué función de problema llamar
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
    }
    
    // --- FUNCIONES AUXILIARES Y DE RENDERIZADO ---

    // Muestra el problema con pictogramas en la pantalla
    function mostrarProblemaVisual(num1, num2, simbolo, urlPictograma, itemAleatorio) {
        for (let i = 0; i < num1; i++) problemaContainer.appendChild(crearPictograma(urlPictograma, itemAleatorio));
        problemaContainer.appendChild(crearSimbolo(simbolo));
        for (let i = 0; i < num2; i++) problemaContainer.appendChild(crearPictograma(urlPictograma, itemAleatorio));
        problemaContainer.appendChild(crearSimbolo('='));
        problemaContainer.appendChild(crearSimbolo('?'));
    }

    // Genera los botones con las posibles respuestas
    function generarOpciones(respuesta) {
        let opciones = [respuesta];
        const maxRespuesta = (operacionActual === 'multiplicacion') ? 25 : 12;
        while (opciones.length < 3) {
            let opcionIncorrecta = Math.floor(Math.random() * maxRespuesta) + 1;
            if (opcionIncorrecta > 0 && !opciones.includes(opcionIncorrecta)) {
                opciones.push(opcionIncorrecta);
            }
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

    // Verifica la respuesta del usuario
    function verificarRespuesta(evento) {
        const botonSeleccionado = evento.target.closest('.opcion-btn');
        if (!botonSeleccionado || !problemaActivo) return;

        problemaActivo = false;
        const respuestaUsuario = parseInt(botonSeleccionado.dataset.valor);

        if (respuestaUsuario === respuestaCorrecta) {
            botonSeleccionado.classList.add('correcto');
            feedbackContainer.textContent = '¡Muy Bien!';
            feedbackContainer.className = 'correcto';
            if(audioCorrecto) audioCorrecto.play();
            setTimeout(generarNuevoProblema, 2000);
        } else {
            botonSeleccionado.classList.add('incorrecto');
            feedbackContainer.textContent = 'Inténtalo otra vez';
            feedbackContainer.className = 'incorrecto';
            if(audioIncorrecto) audioIncorrecto.play();
            setTimeout(() => {
                problemaActivo = true;
                botonSeleccionado.classList.remove('incorrecto');
                feedbackContainer.textContent = '';
                feedbackContainer.className = '';
            }, 1500);
        }
    }

    async function obtenerUrlPictograma(texto) {
        try {
            const urlBusqueda = `https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(texto)}`;
            const response = await fetch(urlBusqueda);
            if (!response.ok) throw new Error('Error en búsqueda ARASAAC');
            const resultados = await response.json();
            if (resultados.length === 0) return 'imagenes/placeholder.png'; 
            const pictogramaId = resultados[0]._id;
            return `https://api.arasaac.org/api/pictograms/${pictogramaId}?download=false`;
        } catch (error) {
            console.error(`Error obteniendo pictograma para "${texto}":`, error);
            return 'imagenes/placeholder.png';
        }
    }

    function crearPictograma(url, alt) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = alt;
        img.className = 'problema-pictograma';
        return img;
    }

    function crearSimbolo(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        div.className = 'problema-simbolo';
        return div;
    }

    // --- EVENT LISTENERS ---
    
    // Listener para los botones de selección de operación
    operacionSelector.addEventListener('click', (e) => {
        const botonSeleccionado = e.target.closest('.op-btn');
        if (!botonSeleccionado || botonSeleccionado.classList.contains('active')) return;

        operacionActual = botonSeleccionado.dataset.op;
        document.querySelector('.op-btn.active').classList.remove('active');
        botonSeleccionado.classList.add('active');
        
        generarNuevoProblema();
    });

    nuevoProblemaBtn.addEventListener('click', generarNuevoProblema);
    opcionesContainer.addEventListener('click', verificarRespuesta);

    // --- INICIAR EL JUEGO ---
    generarNuevoProblema();
});