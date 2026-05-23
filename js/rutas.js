// 1. Proteger la ruta y cargar datos de usuario
const usuarioActivoString = localStorage.getItem('usuarioActivo');
if (!usuarioActivoString) { window.location.href = 'index.html'; }

const usuario = JSON.parse(usuarioActivoString);

if (usuario.rol !== 'Transportista' && usuario.rol !== 'Empresa' && usuario.rol !== 'Administrador') {
    alert('Acceso denegado.');
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

    // B. Ocultar botones de enviar ofertas o aceptar acuerdos mediante CSS inyectado
    const style = document.createElement('style');
    style.innerHTML = `
        /* Oculta los botones de contactar en el buscador */
        .ruta-card .main-btn { display: none !important; }

        /* Oculta los botones de aceptar/rechazar en mis acuerdos */
        .acuerdo-acciones { display: none !important; }
    `;
    document.head.appendChild(style);
}

// Variable global para saber si estamos editando o creando
let idRutaEditando = null;

// 2. Funciones para el Modal (Abrir para Crear, Abrir para Editar y Cerrar)
const modal = document.getElementById('modalRuta');
const formRuta = document.getElementById('formNuevaRuta');
const tituloModal = document.querySelector('#modalRuta h2');

function abrirModal() {
    // --- LÓGICA DE BLOQUEO VISUAL ---
    if (estado !== 'Verificado' && usuario.rol !== 'Administrador') {
        alert('🔒 No tienes permisos. Tu cuenta debe ser verificada por un administrador para poder publicar rutas.');
        return; // Corta la función para que no se abra la ventana
    }

    idRutaEditando = null; // Reseteamos, significa que es una ruta NUEVA
    tituloModal.textContent = "Publicar Nueva Ruta";
    formRuta.reset();
    document.getElementById('mensajeModal').innerHTML = '';
    modal.style.display = 'flex';
}

function cerrarModal() {
    modal.style.display = 'none';
}

// 3. Crear o Editar Ruta (Submit del formulario)
formRuta.addEventListener('submit', function(e) {
    e.preventDefault();
    const msgDiv = document.getElementById('mensajeModal');

    // --- LÓGICA DE BLOQUEO DE FORMULARIO (DOBLE SEGURIDAD) ---
    if (estado !== 'Verificado' && usuario.rol !== 'Administrador') {
        msgDiv.style.color = '#e74c3c';
        msgDiv.innerHTML = '<i class="fas fa-lock"></i> No tienes permisos. Tu cuenta debe ser verificada para publicar rutas.';
        return; // ¡Evita el fetch a Spring Boot!
    }

    const datosRuta = {
        idUsuario: usuario.idUsuario,
        origen: document.getElementById('origen').value,
        destino: document.getElementById('destino').value,
        fechaSalida: document.getElementById('fecha_salida').value,
        capacidadLibre: document.getElementById('capacidad').value,
        estado: 'Publicada'
    };

    msgDiv.style.color = 'var(--dark-blue)';
    
    // Determinamos si es POST (Crear) o PUT (Editar)
    let url = (API_HOST+'/api/rutas');
    let metodo = 'POST';

    if (idRutaEditando !== null) {
        url = (API_HOST+'/api/rutas/${idRutaEditando}');
        metodo = 'PUT';
        msgDiv.innerHTML = "Actualizando ruta...";
    } else {
        msgDiv.innerHTML = "Guardando ruta...";
    }

    fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosRuta)
    })
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('Error al procesar la ruta');
    })
    .then(() => {
        msgDiv.style.color = 'var(--primary-green)';
        msgDiv.innerHTML = idRutaEditando ? "¡Ruta actualizada!" : "¡Ruta publicada con éxito!";
        
        setTimeout(() => {
            cerrarModal();
            cargarMisRutas(); // Recargamos la lista
        }, 1500);
    })
    .catch(error => {
        msgDiv.style.color = '#e74c3c';
        msgDiv.innerHTML = "Error: Comprueba el servidor Spring Boot.";
    });
});

// 4. Cargar la lista de Rutas y poner los botones correctos
function cargarMisRutas() {
    const contenedor = document.getElementById('rutasContainer');
    
    fetch(API_HOST+'/api/rutas/usuario/${usuario.idUsuario}')
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('No se pudieron cargar las rutas');
    })
    .then(rutas => {
        contenedor.innerHTML = ''; 

        if (rutas.length === 0) {
            contenedor.innerHTML = '<p style="color: #666; grid-column: 1/-1;">Aún no has publicado ninguna ruta.</p>';
            return;
        }

        rutas.forEach(ruta => {
            const fecha = new Date(ruta.fechaSalida).toLocaleDateString('es-ES');

            // --- LÓGICA DE BOTONES Y PERMISOS ---
            let botones = ``;

            // Verificamos si el usuario actual es el creador de la ruta o es Administrador
            if (usuario.rol === 'Administrador' || usuario.idUsuario === ruta.usuario.idUsuario) {
                // Convertimos el objeto ruta a un string seguro para pasarlo a la función de editar
                const rutaJson = encodeURIComponent(JSON.stringify(ruta));
                
                botones += `
                    <button onclick="abrirModalEdicion('${rutaJson}')" class="main-btn" style="background: #f1c40f; color: white; border: none; padding: 5px 10px; font-size: 0.9rem; margin-left: 5px;" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="eliminarRuta(${ruta.idRuta})" class="main-btn" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; font-size: 0.9rem; margin-left: 5px;" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }

            contenedor.innerHTML += `
                <div class="ruta-card">
                    <div class="ruta-status">${ruta.estado}</div>
                    <div class="ruta-cities">
                        ${ruta.origen} <i class="fas fa-arrow-right" style="color: #ccc; font-size: 0.9rem;"></i> ${ruta.destino}
                    </div>
                    <div class="ruta-details">
                        <p><i class="fas fa-calendar-alt"></i> Salida: ${fecha}</p>
                        <p><i class="fas fa-weight-hanging"></i> Espacio libre: ${ruta.capacidadLibre} kg</p>
                    </div>
                    <div style="display: flex; justify-content: flex-start; margin-top: 15px;">
                        ${botones}
                    </div>
                </div>
            `;
        });
    })
    .catch(error => {
        contenedor.innerHTML = '<p style="color: #e74c3c;">Error al cargar las rutas.</p>';
    });
}

// 5. NUEVO: Función para Abrir Modal en modo Edición
function abrirModalEdicion(rutaEncoded) {
    const ruta = JSON.parse(decodeURIComponent(rutaEncoded));
    
    idRutaEditando = ruta.idRuta; // Guardamos el ID que estamos editando
    tituloModal.textContent = "Editar Ruta";
    document.getElementById('mensajeModal').innerHTML = '';
    
    // Rellenamos el formulario con los datos actuales
    document.getElementById('origen').value = ruta.origen;
    document.getElementById('destino').value = ruta.destino;
    document.getElementById('fecha_salida').value = ruta.fechaSalida;
    document.getElementById('capacidad').value = ruta.capacidadLibre;
    
    modal.style.display = 'flex';
}

// 6. NUEVO: Función para Eliminar
function eliminarRuta(idRuta) {
    // Pedimos confirmación al usuario antes de borrar
    if(confirm("¿Estás seguro de que deseas eliminar esta ruta? Esta acción no se puede deshacer.")) {
        
        fetch(API_HOST+'/api/rutas/${idRuta}', {
            method: 'DELETE'
        })
        .then(response => {
            if(response.ok) {
                cargarMisRutas(); // Recargamos la lista para que desaparezca
            } else {
                alert("Hubo un problema al eliminar la ruta.");
            }
        })
        .catch(error => {
            alert("Error de conexión con el servidor.");
        });
    }
}

// 7. Función para Cerrar Sesión
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

// Inicializar la página
cargarMisRutas();