document.addEventListener('DOMContentLoaded', function() {
    // --- Selección de Elementos del DOM ---
    const fichaContainer = document.getElementById('ficha-container');
    const formulario = document.getElementById('formulario');
    const formToggleBtn = document.getElementById('form-toggle');
    const deleteBtn = document.getElementById('delete-button');
    const saveBtn = document.getElementById('modal-save-button');
    
    // Elementos de la Ficha (Vista)
    const fotoUsuarioImg = document.getElementById('foto-usuario-img');
    const nombreCompletoUsuario = document.getElementById('nombre-completo-usuario');
    const institucionUsuario = document.getElementById('institucion-usuario');
    const direccionUsuario = document.getElementById('direccion-usuario');
    const adultosContainer = document.getElementById('adultos-container');

    // Campos del Formulario (Edición)
    const nombreInput = document.getElementById('nombre');
    const apellidoInput = document.getElementById('apellido');
    const institutoInput = document.getElementById('instituto');
    const direccionInput = document.getElementById('direccion');
    const fotoUsuarioInput = document.getElementById('foto-usuario');
    const cantAdultosInput = document.getElementById('cant-adultos');
    const seccionAdultos = document.getElementById('seccion-adultos');

    let tempFotoBase64 = null;

    // --- Funciones Principales ---

    /**
     * Carga los datos desde localStorage y actualiza la UI.
     */
    function cargarDatosGuardados() {
        const usuario = JSON.parse(localStorage.getItem('comunicador_usuario')) || {};
        const adultos = JSON.parse(localStorage.getItem('comunicador_adultos')) || [];

        if (Object.keys(usuario).length === 0) {
            fichaContainer.classList.add('d-none');
            formulario.classList.remove('d-none');
        } else {
            fichaContainer.classList.remove('d-none');
            formulario.classList.add('d-none');
            mostrarFicha(usuario, adultos);
            rellenarFormulario(usuario, adultos);
        }
    }

    /**
     * Muestra los datos del usuario y adultos en la ficha de visualización.
     */
    function mostrarFicha(usuario, adultos) {
        fotoUsuarioImg.src = usuario.foto || 'imagenes/placeholder.png';
        nombreCompletoUsuario.textContent = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
        institucionUsuario.textContent = usuario.institucion || 'No especificada';
        direccionUsuario.textContent = usuario.direccion || 'No especificada';

        adultosContainer.innerHTML = '<h4>Adultos Responsables</h4>';
        if (adultos.length > 0) {
            adultos.forEach((adulto) => {
                const div = document.createElement('div');
                div.className = 'adulto-card card mt-2';
                div.innerHTML = `
                    <div class="card-body text-left">
                        <h5 class="card-title">${adulto.nombre || ''} ${adulto.apellido || ''}</h5>
                        <p class="card-text mb-1"><strong>Relación:</strong> ${adulto.relacion || 'No especificada'}</p>
                        <p class="card-text mb-1"><strong>Contacto:</strong> ${adulto.numero || 'N/A'}</p>
                        <p class="card-text mb-0"><strong>Dirección:</strong> ${adulto.direccion || 'N/A'}</p>
                    </div>
                `;
                adultosContainer.appendChild(div);
            });
        } else {
            adultosContainer.innerHTML += '<p>No hay adultos registrados.</p>';
        }
    }

    /**
     * Rellena el formulario de edición con los datos guardados.
     */
    function rellenarFormulario(usuario, adultos) {
        nombreInput.value = usuario.nombre || '';
        apellidoInput.value = usuario.apellido || '';
        institutoInput.value = usuario.institucion || '';
        direccionInput.value = usuario.direccion || '';
        cantAdultosInput.value = adultos.length;
        generarCamposAdultos(adultos.length, adultos);
    }

    /**
     * Genera dinámicamente los campos para los adultos responsables en el formulario.
     */
    function generarCamposAdultos(cantidad, adultosData = []) {
        seccionAdultos.innerHTML = '';
        for (let i = 0; i < cantidad; i++) {
            const adulto = adultosData[i] || {};
            const div = document.createElement('div');
            div.className = 'adulto-form border p-3 mb-3';
            div.innerHTML = `
                <h5>Adulto ${i + 1}</h5>
                <div class="form-group">
                    <label>Nombre:</label>
                    <input type="text" class="form-control nombre-adulto" value="${adulto.nombre || ''}">
                </div>
                <div class="form-group">
                    <label>Apellido:</label>
                    <input type="text" class="form-control apellido-adulto" value="${adulto.apellido || ''}">
                </div>
                <div class="form-group">
                    <label>Relación con el usuario:</label>
                    <select class="form-control relacion-adulto">
                        <option value="Padre/Madre" ${adulto.relacion === 'Padre/Madre' ? 'selected' : ''}>Padre/Madre</option>
                        <option value="Tutor/a Legal" ${adulto.relacion === 'Tutor/a Legal' ? 'selected' : ''}>Tutor/a Legal</option>
                        <option value="Abuelo/a" ${adulto.relacion === 'Abuelo/a' ? 'selected' : ''}>Abuelo/a</option>
                        <option value="Tío/a" ${adulto.relacion === 'Tío/a' ? 'selected' : ''}>Tío/a</option>
                        <option value="Hermano/a" ${adulto.relacion === 'Hermano/a' ? 'selected' : ''}>Hermano/a</option>
                        <option value="Terapeuta" ${adulto.relacion === 'Terapeuta' ? 'selected' : ''}>Terapeuta</option>
                        <option value="Otro" ${adulto.relacion === 'Otro' ? 'selected' : ''}>Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Número de contacto:</label>
                    <input type="text" class="form-control numero-adulto" value="${adulto.numero || ''}">
                </div>
                <div class="form-group">
                    <label>Dirección:</label>
                    <input type="text" class="form-control direccion-adulto" value="${adulto.direccion || ''}">
                </div>
            `;
            seccionAdultos.appendChild(div);
        }
    }

    /**
     * Guarda todos los datos del formulario en localStorage.
     */
    function guardarDatos() {
        const usuario = {
            nombre: nombreInput.value.trim(),
            apellido: apellidoInput.value.trim(),
            institucion: institutoInput.value.trim(),
            direccion: direccionInput.value.trim(),
            foto: tempFotoBase64 || JSON.parse(localStorage.getItem('comunicador_usuario'))?.foto || null
        };

        const adultos = [];
        const cantidad = parseInt(cantAdultosInput.value, 10);
        for (let i = 0; i < cantidad; i++) {
            adultos.push({
                nombre: document.querySelectorAll('.nombre-adulto')[i].value.trim(),
                apellido: document.querySelectorAll('.apellido-adulto')[i].value.trim(),
                relacion: document.querySelectorAll('.relacion-adulto')[i].value,
                numero: document.querySelectorAll('.numero-adulto')[i].value.trim(),
                direccion: document.querySelectorAll('.direccion-adulto')[i].value.trim(),
            });
        }

        localStorage.setItem('comunicador_usuario', JSON.stringify(usuario));
        localStorage.setItem('comunicador_adultos', JSON.stringify(adultos));
        
        alert('Datos guardados correctamente.');
        location.reload();
    }

    /**
     * Borra todos los datos del usuario y adultos.
     */
    function borrarDatos() {
        if (confirm('¿Estás seguro de que deseas borrar toda la información del usuario? Esta acción no se puede deshacer.')) {
            localStorage.removeItem('comunicador_usuario');
            localStorage.removeItem('comunicador_adultos');
            alert('Ficha borrada correctamente.');
            location.reload();
        }
    }

    // --- Event Listeners ---

    formToggleBtn.addEventListener('click', () => {
        fichaContainer.classList.add('d-none');
        formulario.classList.remove('d-none');
    });

    cantAdultosInput.addEventListener('change', () => {
        const cantidad = parseInt(cantAdultosInput.value, 10) || 0;
        generarCamposAdultos(cantidad);
    });

    fotoUsuarioInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            tempFotoBase64 = e.target.result;
            document.getElementById('foto-usuario-img').src = tempFotoBase64;
        };
        reader.readAsDataURL(file);
    });

    saveBtn.addEventListener('click', guardarDatos);
    deleteBtn.addEventListener('click', borrarDatos);

    // --- Carga Inicial ---
    cargarDatosGuardados();
});