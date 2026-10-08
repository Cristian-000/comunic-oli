document.addEventListener('DOMContentLoaded', function() {
    
    // --- CONTROL DEL BOTÓN ATRÁS DEL MÓVIL ---
    // Añadimos un estado "falso" a la memoria del celular
    window.history.pushState({ pagina: "minijuego" }, "", "");

    // Cuando el usuario presiona el botón físico de "Atrás"
    window.addEventListener('popstate', function(event) {
        // En lugar de ir a donde el celular quiere, lo forzamos a ir al inicio
        window.location.replace('index.html');
    });
    // ------------------------------------------

    // --- CONTROL DE TAMAÑO DE GRILLA (NUEVO) ---
    const btnPequeno = document.getElementById('grid-pequeno');
    const btnMediano = document.getElementById('grid-mediano');
    const btnGrande = document.getElementById('grid-grande');

    // Tamaños en píxeles
    const tamanos = {
        'pequeno': '80px',   
        'mediano': '110px',  
        'grande': '160px'    
    };

    function aplicarTamanoGrilla(tamanoId) {
        // Aplica al instante
        document.documentElement.style.setProperty('--tamano-grilla', tamanos[tamanoId]);
        
        // Guarda en memoria
        localStorage.setItem('comunicador_tamano_grilla', tamanoId);
        
        // Resetea estilos de todos los botones
        [btnPequeno, btnMediano, btnGrande].forEach(btn => {
            if (btn) {
                btn.style.backgroundColor = 'var(--color-fondo)';
                btn.style.borderColor = 'var(--color-borde)';
                btn.style.color = 'var(--color-texto)';
            }
        });

        // Pinta el botón activo
        const btnActivo = document.getElementById(`grid-${tamanoId}`);
        if(btnActivo) {
            btnActivo.style.backgroundColor = 'var(--color-primario)';
            btnActivo.style.borderColor = 'var(--color-primario)';
            btnActivo.style.color = 'white';
        }
    }

    // Carga el tamaño guardado (o mediano por defecto)
    const tamanoGuardado = localStorage.getItem('comunicador_tamano_grilla') || 'mediano';
    aplicarTamanoGrilla(tamanoGuardado);

    // Eventos de la grilla
    if(btnPequeno) btnPequeno.addEventListener('click', () => aplicarTamanoGrilla('pequeno'));
    if(btnMediano) btnMediano.addEventListener('click', () => aplicarTamanoGrilla('mediano'));
    if(btnGrande) btnGrande.addEventListener('click', () => aplicarTamanoGrilla('grande'));
    // ------------------------------------------

    // --- Selección de Elementos del DOM (Ficha Usuario) ---
    const fichaContainer = document.getElementById('ficha-container');
    const formulario = document.getElementById('formulario');
    const formToggleBtn = document.getElementById('form-toggle');
    const deleteBtn = document.getElementById('delete-button');
    const saveBtn = document.getElementById('modal-save-button');
    const cancelEditBtn = document.getElementById('cancel-edit-button'); 
    
    // Elementos de la Ficha (Vista)
    const fotoUsuarioImg = document.getElementById('foto-usuario-img');
    const nombreCompletoUsuario = document.getElementById('nombre-completo-usuario');
    const institucionUsuario = document.getElementById('institucion-usuario');
    const direccionUsuario = document.getElementById('direccion-usuario');
    // Elementos Médicos (Vista)
    const diagnosticoUsuario = document.getElementById('diagnostico-usuario');
    const alergiasUsuario = document.getElementById('alergias-usuario');
    const sangreUsuario = document.getElementById('sangre-usuario');
    const adultosContainer = document.getElementById('adultos-container');

    // Campos del Formulario (Edición)
    const nombreInput = document.getElementById('nombre');
    const apellidoInput = document.getElementById('apellido');
    const institutoInput = document.getElementById('instituto');
    const direccionInput = document.getElementById('direccion');
    // Campos Médicos (Edición)
    const diagnosticoInput = document.getElementById('diagnostico');
    const alergiasInput = document.getElementById('alergias');
    const sangreInput = document.getElementById('sangre');
    const fotoUsuarioInput = document.getElementById('foto-usuario');
    const cantAdultosInput = document.getElementById('cant-adultos');
    const seccionAdultos = document.getElementById('seccion-adultos');

    let tempFotoBase64 = null;

    // --- Control Parental ---
    function controlParental() {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const respuesta = prompt(`Control parental. Solo adultos pueden editar.\n¿Cuánto es ${num1} + ${num2}?`);
        
        if (respuesta && parseInt(respuesta, 10) === (num1 + num2)) {
            return true;
        } else {
            alert('Respuesta incorrecta. Edición bloqueada.');
            return false;
        }
    }

    // --- Funciones Principales ---
    function cargarDatosGuardados() {
        const usuario = JSON.parse(localStorage.getItem('comunicador_usuario')) || {};
        const adultos = JSON.parse(localStorage.getItem('comunicador_adultos')) || [];

        if (Object.keys(usuario).length === 0) {
            fichaContainer.classList.add('d-none');
            formulario.classList.remove('d-none');
            if (cancelEditBtn) cancelEditBtn.classList.add('d-none'); // No puede cancelar si no hay datos
        } else {
            fichaContainer.classList.remove('d-none');
            formulario.classList.add('d-none');
            if (cancelEditBtn) cancelEditBtn.classList.remove('d-none');
            mostrarFicha(usuario, adultos);
            rellenarFormulario(usuario, adultos);
        }
    }

    function mostrarFicha(usuario, adultos) {
        fotoUsuarioImg.src = usuario.foto || 'imagenes/placeholder.png';
        nombreCompletoUsuario.textContent = `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
        institucionUsuario.textContent = usuario.institucion || 'No especificada';
        direccionUsuario.textContent = usuario.direccion || 'No especificada';
        
        // Médicos
        diagnosticoUsuario.textContent = usuario.diagnostico || 'No especificado';
        alergiasUsuario.textContent = usuario.alergias || 'Ninguna';
        sangreUsuario.textContent = usuario.sangre || 'No especificado';

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

    function rellenarFormulario(usuario, adultos) {
        nombreInput.value = usuario.nombre || '';
        apellidoInput.value = usuario.apellido || '';
        institutoInput.value = usuario.institucion || '';
        direccionInput.value = usuario.direccion || '';
        
        diagnosticoInput.value = usuario.diagnostico || '';
        alergiasInput.value = usuario.alergias || '';
        sangreInput.value = usuario.sangre || '';

        cantAdultosInput.value = adultos.length;
        generarCamposAdultos(adultos.length, adultos);
    }

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
                    <label>Relación:</label>
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

    function guardarDatos() {
        const usuario = {
            nombre: nombreInput.value.trim(),
            apellido: apellidoInput.value.trim(),
            institucion: institutoInput.value.trim(),
            direccion: direccionInput.value.trim(),
            diagnostico: diagnosticoInput.value.trim(),
            alergias: alergiasInput.value.trim(),
            sangre: sangreInput.value,
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

    function borrarDatos() {
        if (controlParental()) {
            if (confirm('¿Estás seguro de que deseas borrar toda la información del usuario? Esta acción no se puede deshacer.')) {
                localStorage.removeItem('comunicador_usuario');
                localStorage.removeItem('comunicador_adultos');
                alert('Ficha borrada correctamente.');
                location.reload();
            }
        }
    }

    // --- Event Listeners ---
    if (formToggleBtn) {
        formToggleBtn.addEventListener('click', () => {
            if (controlParental()) {
                fichaContainer.classList.add('d-none');
                formulario.classList.remove('d-none');
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            fichaContainer.classList.remove('d-none');
            formulario.classList.add('d-none');
        });
    }

    if (cantAdultosInput) {
        cantAdultosInput.addEventListener('change', () => {
            const cantidad = parseInt(cantAdultosInput.value, 10) || 0;
            generarCamposAdultos(cantidad);
        });
    }

    if (fotoUsuarioInput) {
        fotoUsuarioInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                tempFotoBase64 = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (saveBtn) saveBtn.addEventListener('click', guardarDatos);
    if (deleteBtn) deleteBtn.addEventListener('click', borrarDatos);

    // --- Carga Inicial ---
    cargarDatosGuardados();
});
