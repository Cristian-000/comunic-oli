document.addEventListener('DOMContentLoaded', function() {
    const nombreUsuario = document.getElementById('nombre-usuario');
    const apellidoUsuario = document.getElementById('apellido-usuario');
    const institucionUsuario = document.getElementById('institucion-usuario');
    const adultosContainer = document.getElementById('adultos-container');
    const cantAdultosInput = document.getElementById('cant-adultos');
    const formulario = document.getElementById('formulario');
    const checkAcceso = document.getElementById('check-acceso');
    const submitButton = document.getElementById('guardar-datos');

    let adultos = JSON.parse(localStorage.getItem('adultos')) || [];
    let usuario = JSON.parse(localStorage.getItem('usuario')) || {};

    // Cargar datos del usuario
    if (usuario.nombre) {
        nombreUsuario.textContent = usuario.nombre;
        formulario.nombre.value = usuario.nombre;
    }
    if (usuario.apellido) {
        apellidoUsuario.textContent = usuario.apellido;
        formulario.apellido.value = usuario.apellido;
    }
    if (usuario.institucion) {
        institucionUsuario.textContent = usuario.institucion;
        formulario.instituto.value = usuario.institucion;
    }

    // Mostrar adultos guardados
    adultos.forEach((adulto, index) => {
        agregarAdultoForm(index, adulto);
        mostrarAdulto(index, adulto);
    });

    cantAdultosInput.value = adultos.length;
    ajustarSeccionAdultos(adultos.length);

    cantAdultosInput.addEventListener('input', function() {
        const cantidad = parseInt(this.value);
        ajustarSeccionAdultos(cantidad);
    });

    // Ajustar la sección de adultos
    function ajustarSeccionAdultos(cantidad) {
        const seccionAdultos = document.getElementById('seccion-adultos');
        seccionAdultos.innerHTML = '';

        for (let i = 0; i < cantidad; i++) {
            agregarAdultoForm(i, adultos[i] || {});
        }
    }

    // Agregar formulario de adulto
    function agregarAdultoForm(index, adulto) {
        const seccionAdultos = document.getElementById('seccion-adultos');
        const div = document.createElement('div');
        div.classList.add('adulto-form');
        div.innerHTML = `
            <h4>Adulto ${index + 1}</h4>
            <div class="mb-3">
                <label for="nombre-adulto-${index}" class="form-label">Nombre</label>
                <input type="text" class="form-control" id="nombre-adulto-${index}" value="${adulto?.nombre || ''}">
            </div>
            <div class="mb-3">
                <label for="apellido-adulto-${index}" class="form-label">Apellido</label>
                <input type="text" class="form-control" id="apellido-adulto-${index}" value="${adulto?.apellido || ''}">
            </div>
            <div class="mb-3">
                <label for="numero-adulto-${index}" class="form-label">Número de contacto</label>
                <input type="text" class="form-control" id="numero-adulto-${index}" value="${adulto?.numero || ''}">
            </div>
            <div class="mb-3">
                <label for="direccion-adulto-${index}" class="form-label">Dirección</label>
                <input type="text" class="form-control" id="direccion-adulto-${index}" value="${adulto?.direccion || ''}">
            </div>
        `;
        seccionAdultos.appendChild(div);
    }

    // Mostrar adulto en la sección principal
    function mostrarAdulto(index, adulto) {
        const div = document.createElement('div');
        div.classList.add('adulto-info');
        div.innerHTML = `
            <h4>Adulto ${index + 1}</h4>
            <p>Nombre: ${adulto.nombre}</p>
            <p>Apellido: ${adulto.apellido}</p>
            <p>Número de contacto: ${adulto.numero}</p>
            <p>Dirección: ${adulto.direccion}</p>
        `;
        adultosContainer.appendChild(div);
    }

    // Guardar datos en localStorage
    submitButton.addEventListener('click', function(event) {
        event.preventDefault();
        if (!checkAcceso.checked) {
            alert('Se requiere la supervisión de un adulto para guardar los datos.');
            return;
        }

        usuario = {
            nombre: formulario.nombre.value,
            apellido: formulario.apellido.value,
            institucion: formulario.instituto.value,
            foto: fotoUsuarioImg.src
        };
        localStorage.setItem('usuario', JSON.stringify(usuario));

        adultos = [];
        for (let i = 0; i < cantAdultosInput.value; i++) {
            const adulto = {
                nombre: document.getElementById(`nombre-adulto-${i}`).value,
                apellido: document.getElementById(`apellido-adulto-${i}`).value,
                numero: document.getElementById(`numero-adulto-${i}`).value,
                direccion: document.getElementById(`direccion-adulto-${i}`).value
            };
            adultos.push(adulto);
        }
        localStorage.setItem('adultos', JSON.stringify(adultos));
        alert('Datos guardados correctamente.');
        location.reload();
    });

    // Mostrar imagen del usuario
    const fotoUsuarioInput = document.getElementById('foto-usuario');
    const fotoUsuarioImg = document.getElementById('foto-usuario-img');

    fotoUsuarioInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            const imgBase64 = e.target.result;
            fotoUsuarioImg.src = imgBase64;
            localStorage.setItem('fotoUsuario', imgBase64);
        };

        reader.readAsDataURL(file);
    });

    const fotoGuardada = localStorage.getItem('fotoUsuario');
    if (fotoGuardada) {
        fotoUsuarioImg.src = fotoGuardada;
    }
});
