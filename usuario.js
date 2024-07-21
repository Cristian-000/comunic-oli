// Event listener para el botón de regresar en escribir.html
//const backButtonUsuario = document.getElementById('back-button-usuario');
//if (backButtonUsuario) {
//    backButtonUsuario.addEventListener('click', () => {
//        window.history.back();
//    });
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const nombreUsuario = document.getElementById('nombre-usuario');
    const apellidoUsuario = document.getElementById('apellido-usuario');
    const institutoUsuario = document.getElementById('instituto-usuario');
    const adultosACargo = document.getElementById('adultos-a-cargo');
    const fotoUsuario = document.getElementById('foto-usuario');

    const nombreInput = document.getElementById('nombre');
    const apellidoInput = document.getElementById('apellido');
    const institutoInput = document.getElementById('instituto');
    const cantAdultosInput = document.getElementById('cant-adultos');
    const adultosContainer = document.getElementById('adultos-container');
    const fotoInput = document.getElementById('foto');

    // Cargar datos del localStorage
    function cargarDatosUsuario() {
        const datosUsuario = JSON.parse(localStorage.getItem('datosUsuario'));
        if (datosUsuario) {
            nombreUsuario.textContent = datosUsuario.nombre || 'Nombre';
            apellidoUsuario.textContent = datosUsuario.apellido || 'Apellido';
            institutoUsuario.textContent = datosUsuario.instituto || 'Instituto';
            fotoUsuario.src = datosUsuario.foto || '';

            nombreInput.value = datosUsuario.nombre || '';
            apellidoInput.value = datosUsuario.apellido || '';
            institutoInput.value = datosUsuario.instituto || '';
            cantAdultosInput.value = datosUsuario.cantAdultos || 1;

            adultosContainer.innerHTML = '';
            if (datosUsuario.adultos) {
                datosUsuario.adultos.forEach(adulto => {
                    agregarAdulto(adulto.nombre, adulto.apellido, adulto.numero, adulto.direccion);
                });
            }
        }
    }

    // Guardar datos en el localStorage
    function guardarDatosUsuario() {
        const adultos = [];
        document.querySelectorAll('.adulto').forEach(adulto => {
            adultos.push({
                nombre: adulto.querySelector('.nombre-adulto').value,
                apellido: adulto.querySelector('.apellido-adulto').value,
                numero: adulto.querySelector('.numero-adulto').value,
                direccion: adulto.querySelector('.direccion-adulto').value
            });
        });

        const datosUsuario = {
            nombre: nombreInput.value,
            apellido: apellidoInput.value,
            instituto: institutoInput.value,
            foto: fotoUsuario.src,
            cantAdultos: cantAdultosInput.value,
            adultos: adultos
        };

        localStorage.setItem('datosUsuario', JSON.stringify(datosUsuario));
        cargarDatosUsuario();
    }

    // Agregar campo de adulto
    function agregarAdulto(nombre = '', apellido = '', numero = '', direccion = '') {
        const div = document.createElement('div');
        div.classList.add('adulto');
        div.innerHTML = `
            <label>Nombre</label>
            <input type="text" class="nombre-adulto" value="${nombre}">
            <br>
            <label>Apellido</label>
            <input type="text" class="apellido-adulto" value="${apellido}">
            <br>
            <label>Número de contacto</label>
            <input type="text" class="numero-adulto" value="${numero}">
            <br>
            <label>Dirección</label>
            <input type="text" class="direccion-adulto" value="${direccion}">
            <br>
        `;
        adultosContainer.appendChild(div);
    }

    // Manejar cambios en el rango de adultos a cargo
    cantAdultosInput.addEventListener('input', function() {
        const cantidad = parseInt(cantAdultosInput.value);
        adultosContainer.innerHTML = '';
        for (let i = 0; i < cantidad; i++) {
            agregarAdulto();
        }
    });

    // Manejar carga de foto
    fotoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            fotoUsuario.src = e.target.result;
        }
        reader.readAsDataURL(file);
    });

    // Manejar clic en el botón de guardar
    document.getElementById('guardar').addEventListener('click', guardarDatosUsuario);

    // Cargar datos iniciales
    cargarDatosUsuario();
});
