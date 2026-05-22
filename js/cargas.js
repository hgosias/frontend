const usuarioActivoString = localStorage.getItem('usuarioActivo');
if (!usuarioActivoString) window.location.href = 'index.html';

const usuario = JSON.parse(usuarioActivoString);

if (usuario.rol !== 'Empresa' && usuario.rol !== 'Administrador') {
    alert('Acceso denegado. Solo empresas pueden publicar cargas.');
    window.location.href = 'dashboard.html';
}

document.getElementById('userNameDisplay').textContent = usuario.nombre;
document.getElementById('userRoleBadge').textContent = usuario.rol;

// --- SISTEMA DE ESTADO VISUAL Y RESTRICCIONES ---
const estado = usuario.estadoVerificacion || 'Pendiente';
const roleBadge = document.getElementById('userRoleBadge');

// 1. Crear y mostrar la etiqueta de estado a la izquierda del rol en la Navbar
if (roleBadge && !document.getElementById('badgeEstadoVisual')) {
    const badgeEstado = document.createElement('span');
    badgeEstado.id = 'badgeEstadoVisual';
    badgeEstado.style.padding = '5px 10px';
    badgeEstado.style.borderRadius = '15px';
    badgeEstado.style.fontSize = '0.8rem';
    badgeEstado.style.fontWeight = 'bold';
    badgeEstado.style.marginRight = '10px';
    badgeEstado.style.color = 'white';
    badgeEstado.textContent = estado;

    // Asignar colores según el estado
    if (estado === 'Verificado') {
        badgeEstado.style.backgroundColor = 'var(--primary-green)';
    } else if (estado === 'Rechazado') {
        badgeEstado.style.backgroundColor = '#e74c3c'; // Rojo
    } else {
        badgeEstado.style.backgroundColor = '#f39c12'; // Naranja (Pendiente)
    }
    
    // Insertar justo antes de la etiqueta de Transportista/Empresa
    roleBadge.parentNode.insertBefore(badgeEstado, roleBadge);
}

// 2. Bloquear funciones básicas si la cuenta está RECHAZADA
if (estado === 'Rechazado') {
    const mainContent = document.querySelector('.main-content');
    
    // A. Mostrar cartel de advertencia al inicio de la página
    if (mainContent && !document.getElementById('alertaRechazo')) {
        const alerta = document.createElement('div');
        alerta.id = 'alertaRechazo';
        alerta.style.backgroundColor = '#fdedec';
        alerta.style.color = '#e74c3c';
        alerta.style.padding = '15px';
        alerta.style.borderRadius = '8px';
        alerta.style.borderLeft = '4px solid #e74c3c';
        alerta.style.marginBottom = '20px';
        alerta.innerHTML = '<strong><i class="fas fa-ban"></i> Cuenta Rechazada:</strong> Tu documentación no ha sido validada. Las funciones de publicación y contacto están bloqueadas. Ve a "Mi Perfil" para revisar y actualizar tus datos.';
        
        mainContent.insertBefore(alerta, mainContent.firstChild);
    }

    // B. Ocultar los formularios para crear rutas o cargas
    const formRuta = document.getElementById('formRuta');
    if (formRuta) formRuta.style.display = 'none';

    const formCarga = document.getElementById('formCarga');
    if (formCarga) formCarga.style.display = 'none';
    
    // C. Ocultar botones de enviar ofertas o aceptar acuerdos mediante CSS inyectado
    const style = document.createElement('style');
    style.innerHTML = `
        /* Oculta los botones de contactar en el buscador */
        .ruta-card .main-btn { display: none !important; }
        
        /* Oculta los botones de aceptar/rechazar en mis acuerdos */
        .acuerdo-acciones { display: none !important; }
    `;
    document.head.appendChild(style);
}

let idCargaEditando = null;
const modal = document.getElementById('modalCarga');
const formCarga = document.getElementById('formNuevaCarga');
const tituloModal = document.querySelector('#modalCarga h2');

function abrirModal() {
    idCargaEditando = null;
    tituloModal.textContent = "Publicar Nueva Carga";
    formCarga.reset();
    document.getElementById('mensajeModal').innerHTML = '';
    modal.style.display = 'flex';
}

function cerrarModal() { modal.style.display = 'none'; }

formCarga.addEventListener('submit', function(e) {
    e.preventDefault();
    const datosCarga = {
        idUsuario: usuario.idUsuario,
        origen: document.getElementById('origen').value,
        destino: document.getElementById('destino').value,
        pesoVolumen: document.getElementById('pesoVolumen').value,
        descripcion: document.getElementById('descripcion').value,
        estado: 'Publicada'
    };

    const msgDiv = document.getElementById('mensajeModal');
    let url = 'http://localhost:8080/api/cargas';
    let metodo = 'POST';

    if (idCargaEditando !== null) {
        url = `http://localhost:8080/api/cargas/${idCargaEditando}`;
        metodo = 'PUT';
        msgDiv.innerHTML = "Actualizando carga...";
    } else {
        msgDiv.innerHTML = "Guardando carga...";
    }

    fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosCarga)
    })
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('Error al procesar la carga');
    })
    .then(() => {
        msgDiv.style.color = 'var(--primary-green)';
        msgDiv.innerHTML = idCargaEditando ? "¡Carga actualizada!" : "¡Carga publicada!";
        setTimeout(() => { cerrarModal(); cargarMisCargas(); }, 1500);
    })
    .catch(error => {
        msgDiv.style.color = '#e74c3c';
        msgDiv.innerHTML = "Error: Comprueba el servidor.";
    });
});

function cargarMisCargas() {
    const contenedor = document.getElementById('cargasContainer');
    fetch(`http://localhost:8080/api/cargas/usuario/${usuario.idUsuario}`)
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('No se pudieron cargar las cargas');
    })
    .then(cargas => {
        contenedor.innerHTML = ''; 
        if (cargas.length === 0) {
            contenedor.innerHTML = '<p style="color: #666; grid-column: 1/-1;">Aún no has publicado ninguna carga.</p>';
            return;
        }

        cargas.forEach(carga => {
            let botones = ``;

            if (usuario.rol === 'Administrador' || usuario.idUsuario === carga.usuario.idUsuario) {
                const cargaJson = encodeURIComponent(JSON.stringify(carga));
                botones += `
                    <button onclick="abrirModalEdicion('${cargaJson}')" class="main-btn" style="background: #f1c40f; color: white; border: none; padding: 5px 10px; font-size: 0.9rem; margin-left: 5px;" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarCarga(${carga.idCarga})" class="main-btn" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; font-size: 0.9rem; margin-left: 5px;" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }

            contenedor.innerHTML += `
                <div class="carga-card">
                    <div class="carga-status">${carga.estado}</div>
                    <div class="carga-cities">
                        ${carga.origen} <i class="fas fa-arrow-right" style="color: #ccc; font-size: 0.9rem;"></i> ${carga.destino}
                    </div>
                    <div class="carga-details">
                        <p><i class="fas fa-weight-hanging"></i> Peso/Volumen: ${carga.pesoVolumen} kg/m³</p>
                    </div>
                    <div class="carga-desc">"${carga.descripcion}"</div>
                    <div style="display: flex; justify-content: flex-start; margin-top: 15px;">
                        ${botones}
                    </div>
                </div>
            `;
        });
    })
    .catch(error => { contenedor.innerHTML = '<p style="color: #e74c3c;">Error al cargar las cargas.</p>'; });
}

function abrirModalEdicion(cargaEncoded) {
    const carga = JSON.parse(decodeURIComponent(cargaEncoded));
    idCargaEditando = carga.idCarga;
    tituloModal.textContent = "Editar Carga";
    document.getElementById('mensajeModal').innerHTML = '';
    document.getElementById('origen').value = carga.origen;
    document.getElementById('destino').value = carga.destino;
    document.getElementById('pesoVolumen').value = carga.pesoVolumen;
    document.getElementById('descripcion').value = carga.descripcion;
    modal.style.display = 'flex';
}

function eliminarCarga(idCarga) {
    if(confirm("¿Seguro que deseas eliminar esta carga?")) {
        fetch(`http://localhost:8080/api/cargas/${idCarga}`, { method: 'DELETE' })
        .then(response => { if(response.ok) cargarMisCargas(); else alert("Error al eliminar."); })
        .catch(error => alert("Error de conexión."));
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuarioActivo');
    window.location.href = 'index.html';
}

// --- LÓGICA DEL MENÚ HAMBURGUESA MEJORADA ---
const menuToggleBtn = document.getElementById('menuToggleBtn');
const sidebar = document.querySelector('.sidebar');

if (menuToggleBtn && sidebar) {
    menuToggleBtn.addEventListener('click', function() {
        // Comprobamos el tamaño de la pantalla
        if (window.innerWidth <= 768) {
            // Modo Móvil: El menú aparece flotando por encima
            sidebar.classList.toggle('activo-movil');
        } else {
            // Modo Ordenador: El menú se esconde y el contenido se expande al 100%
            sidebar.classList.toggle('oculto-pc');
        }
    });
}

cargarMisCargas();
