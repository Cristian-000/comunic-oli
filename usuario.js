document.addEventListener('DOMContentLoaded', function() {
    const nombreUsuario = document.getElementById('nombre-usuario');
    const apellidoUsuario = document.getElementById('apellido-usuario');
    const institucionUsuario = document.getElementById('institucion-usuario');
    const direccionUsuario = document.getElementById('direccion-usuario');
    const adultosContainer = document.getElementById('adultos-container');
    const cantAdultosInput = document.getElementById('cant-adultos');
    const formulario = document.getElementById('formulario');
    const checkAcceso = document.getElementById('check-acceso');
    const modalSaveButton = document.getElementById('modal-save-button');
    const formToggle = document.getElementById('form-toggle');
    const backButton = document.getElementById('back-button-usuario');
    const fotoUsuarioInput = document.getElementById('foto-usuario');
    const fotoUsuarioImg = document.getElementById('foto-usuario-img');
    const fichaContainer = document.getElementById('ficha-container');

    let adultos = JSON.parse(localStorage.getItem('adultos')) || [];
    let usuario = JSON.parse(localStorage.getItem('usuario')) || {};

    // Mostrar mensaje si no hay datos guardados
    if (!usuario.nombre && !usuario.apellido && !usuario.institucion && !usuario.direccion) {
        fichaContainer.innerHTML = `<p>Aún no se han añadido datos de usuario</p><button id="form-toggle" class="btn btn-primary mt-3">Ajustar Ficha00</button>`;
    } else {
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
        if (usuario.direccion) {
            direccionUsuario.textContent = usuario.direccion;
            formulario.direccion.value = usuario.direccion;
        }
    }

    // Mostrar adultos guardados
    adultos.forEach((adulto, index) => {
        agregarAdultoForm(index, adulto);
        mostrarAdulto(index, adulto);
    });

    cantAdultosInput.value = adultos.length;
    ajustarSeccionAdultos(adultos.length);

    cantAdultosInput.addEventListener('change', function() {
        const cantidad = parseInt(this.value);
        ajustarSeccionAdultos(cantidad);
    });

    function ajustarSeccionAdultos(cantidad) {
        const seccionAdultos = document.getElementById('seccion-adultos');
        seccionAdultos.innerHTML = '';

        for (let i = 0; i < cantidad; i++) {
            agregarAdultoForm(i, adultos[i] || {});
        }
    }

    function agregarAdultoForm(index, adulto) {
        const seccionAdultos = document.getElementById('seccion-adultos');
        const div = document.createElement('div');
        div.classList.add('adulto-form', 'card', 'mb-3');
        div.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">Adulto ${index + 1}</h5>
                <div class="form-group">
                    <label for="nombre-adulto-${index}" class="form-label">Nombre</label>
                    <input type="text" class="form-control" id="nombre-adulto-${index}" value="${adulto?.nombre || ''}">
                </div>
                <div class="form-group">
                    <label for="apellido-adulto-${index}" class="form-label">Apellido</label>
                    <input type="text" class="form-control" id="apellido-adulto-${index}" value="${adulto?.apellido || ''}">
                </div>
                <div class="form-group">
                    <label for="numero-adulto-${index}" class="form-label">Número de contacto</label>
                    <input type="text" class="form-control" id="numero-adulto-${index}" value="${adulto?.numero || ''}">
                </div>
                <div class="form-group">
                    <label for="direccion-adulto-${index}" class="form-label">Dirección</label>
                    <input type="text" class="form-control" id="direccion-adulto-${index}" value="${adulto?.direccion || ''}">
                </div>
            </div>
        `;
        seccionAdultos.appendChild(div);
    }

    function mostrarAdulto(index, adulto) {
        const div = document.createElement('div');
        div.classList.add('adulto-card', 'card');
        div.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">Adulto ${index + 1}</h5>
                <p class="card-text">Nombre: ${adulto.nombre}</p>
                <p class="card-text">Apellido: ${adulto.apellido}</p>
                <p class="card-text">Número de contacto: ${adulto.numero}</p>
                <p class="card-text">Dirección: ${adulto.direccion}</p>
            </div>
        `;
        adultosContainer.appendChild(div);
    }

    modalSaveButton.addEventListener('click', function(event) {
        if (!checkAcceso.checked) {
            alert('Se requiere la supervisión de un adulto para guardar los datos.');
            return;
        }

        usuario = {
            nombre: formulario.nombre.value,
            apellido: formulario.apellido.value,
            institucion: formulario.instituto.value,
            direccion: formulario.direccion.value,
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

    function addFormToggleListener() {
        const formToggle = document.getElementById('form-toggle');
        formToggle.addEventListener('click', function() {
            formulario.classList.toggle('d-none');
        });
    }

    // Add event listener for the form toggle button
    addFormToggleListener();

    backButton.addEventListener('click', function() {
        window.location.href = 'index.html';
    });
});
