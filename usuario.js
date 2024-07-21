document.addEventListener('DOMContentLoaded', () => {
    // Función para cargar los datos del usuario desde localStorage
    function cargarDatosUsuario() {
        const nombre = localStorage.getItem('nombre') || '';
        const apellido = localStorage.getItem('apellido') || '';
        const instituto = localStorage.getItem('instituto') || '';
        const adultos = JSON.parse(localStorage.getItem('adultos')) || [];

        document.getElementById('nombre-usuario').textContent = nombre;
        document.getElementById('apellido-usuario').textContent = apellido;
        document.getElementById('instituto-usuario').textContent = instituto;

        const adultosContainer = document.getElementById('adultos-a-cargo');
        adultosContainer.innerHTML = '';
        adultos.forEach(adulto => {
            const adultoDiv = document.createElement('div');
            adultoDiv.innerHTML = `
                <h3>Adulto:</h3>
                <p>Nombre: ${adulto.nombre}</p>
                <p>Apellido: ${adulto.apellido}</p>
                <p>Número de contacto: ${adulto.numero}</p>
                <p>Dirección: ${adulto.direccion}</p>
            `;
            adultosContainer.appendChild(adultoDiv);
        });
    }

    // Función para guardar los datos del formulario en localStorage
    function guardarDatosUsuario() {
        const nombre = document.getElementById('nombre').value;
        const apellido = document.getElementById('apellido').value;
        const instituto = document.getElementById('instituto').value;
        const cantidadAdultos = document.getElementById('cant-adultos').value;

        const adultos = [];
        for (let i = 1; i <= cantidadAdultos; i++) {
            const adulto = {
                nombre: document.getElementById(`nombre-adulto-${i}`).value,
                apellido: document.getElementById(`apellido-adulto-${i}`).value,
                numero: document.getElementById(`numero-adulto-${i}`).value,
                direccion: document.getElementById(`direccion-adulto-${i}`).value
            };
            adultos.push(adulto);
        }

        localStorage.setItem('nombre', nombre);
        localStorage.setItem('apellido', apellido);
        localStorage.setItem('instituto', instituto);
        localStorage.setItem('adultos', JSON.stringify(adultos));

        cargarDatosUsuario();
    }

    // Manejar el envío del formulario
    const formulario = document.getElementById('formulario');
    formulario.addEventListener('submit', (event) => {
        event.preventDefault();
        guardarDatosUsuario();
    });

    // Manejar el cambio de la cantidad de adultos
    const cantAdultosInput = document.getElementById('cant-adultos');
    cantAdultosInput.addEventListener('input', () => {
        const cantidadAdultos = cantAdultosInput.value;
        const adultosContainer = document.querySelector('.añadir-adulto');
        adultosContainer.innerHTML = '';

        for (let i = 1; i <= cantidadAdultos; i++) {
            const adultoDiv = document.createElement('div');
            adultoDiv.classList.add('form-group', 'mb-3');
            adultoDiv.innerHTML = `
                <label for="nombre-adulto-${i}">Nombre</label>
                <input type="text" class="form-control" id="nombre-adulto-${i}">
                <label for="apellido-adulto-${i}">Apellido</label>
                <input type="text" class="form-control" id="apellido-adulto-${i}">
                <label for="numero-adulto-${i}">Número de contacto</label>
                <input type="text" class="form-control" id="numero-adulto-${i}">
                <label for="direccion-adulto-${i}">Dirección</label>
                <input type="text" class="form-control" id="direccion-adulto-${i}">
            `;
            adultosContainer.appendChild(adultoDiv);
        }
    });

    // Cargar los datos del usuario al iniciar
    cargarDatosUsuario();
});
