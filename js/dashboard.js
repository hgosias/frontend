// 1. Proteger la ruta: Comprobar si el usuario está logueado
const usuarioActivoString = localStorage.getItem('usuarioActivo');

if (!usuarioActivoString) {
    window.location.href = 'index.html';
}

const usuario = JSON.parse(usuarioActivoString);

// 2. Pintar los datos básicos en la Navbar
document.getElementById('userNameDisplay').textContent = usuario.nombre;
document.getElementById('userRoleBadge').textContent = usuario.rol;
document.getElementById('welcomeMessage').textContent = `¡Hola, ${usuario.nombre}!`;

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

// =========================================================================
// 2.5 ARREGLO DE ENLACES ESTÁTICOS (Para no tener que editar el HTML a mano)
// =========================================================================
const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
sidebarLinks.forEach(link => {
    if (link.textContent.includes('Inicio')) {
        link.href = 'dashboard.html';
    } else if (link.textContent.includes('Buscar Ofertas')) {
        link.href = 'buscar.html';
    }
    // Dejamos preparado el de Mis Acuerdos para la próxima página
    // else if (link.textContent.includes('Mis Acuerdos')) {
    //     link.href = 'acuerdos.html';
    // }
});

// 3. Adaptar la interfaz dependiendo del ROL
const menuPublicar = document.getElementById('menuPublicar');
const statsContainer = document.getElementById('statsContainer');
const actionTitle = document.getElementById('actionTitle');
const actionDesc = document.getElementById('actionDesc');
const actionBtn = document.getElementById('actionBtn');

if (usuario.rol === 'Transportista') {
    // --- VISTA PARA TRANSPORTISTA ---
    menuPublicar.innerHTML = `<a href="rutas.html"><i class="fas fa-truck"></i> Mis Rutas</a>`;
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3 id="countRutas">...</h3>
            <p>Rutas Publicadas</p>
        </div>
        <div class="stat-card">
            <h3 id="countOfertas">0</h3>
            <p>Ofertas Recibidas</p>
        </div>
    `;

    actionTitle.textContent = "¿Tienes espacio libre en tu camión?";
    actionDesc.textContent = "Publica tu próxima ruta y recibe ofertas de empresas para no viajar de vacío.";
    actionBtn.innerHTML = '<i class="fas fa-plus"></i> Publicar Nueva Ruta';
    actionBtn.onclick = () => window.location.href = "rutas.html";
    
    cargarEstadisticasTransportista();

} else if (usuario.rol === 'Empresa') {
    // --- VISTA PARA EMPRESA ---
    menuPublicar.innerHTML = `<a href="cargas.html"><i class="fas fa-box"></i> Mis Cargas</a>`;
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3 id="countCargas">...</h3>
            <p>Cargas Publicadas</p>
        </div>
        <div class="stat-card">
            <h3 id="countAcuerdos">0</h3>
            <p>Acuerdos Cerrados</p>
        </div>
    `;

    actionTitle.textContent = "¿Necesitas transportar mercancía?";
    actionDesc.textContent = "Publica tu carga y encuentra transportistas que pasen por tu destino.";
    actionBtn.innerHTML = '<i class="fas fa-plus"></i> Publicar Nueva Carga';
    actionBtn.onclick = () => window.location.href = "cargas.html";

    cargarEstadisticasEmpresa();
    
} else {
    // --- VISTA PARA ADMINISTRADOR ---
    
    // 1. Reescribimos TODO el menú lateral para que solo tenga las 3 páginas exactas
    const sidebarMenu = document.querySelector('.sidebar-menu');
    sidebarMenu.innerHTML = `
        <li><a href="dashboard.html" class="active"><i class="fas fa-home"></i> Inicio</a></li>
        <li><a href="admin-usuarios.html"><i class="fas fa-users-cog"></i> Administración de Usuarios</a></li>
        <li><a href="admin-rutas.html"><i class="fas fa-route"></i> Administración de Rutas</a></li>
    `;

    // 2. Ajustamos los textos del panel principal
    const actionTitle = document.getElementById('actionTitle');
    const actionDesc = document.getElementById('actionDesc');
    const actionBtn = document.getElementById('actionBtn');
    const statsContainer = document.getElementById('statsContainer');

    actionTitle.textContent = "Panel Central de Administración";
    actionDesc.textContent = "Gestiona las cuentas de la plataforma y supervisa todas las rutas operativas.";
    actionBtn.innerHTML = '<i class="fas fa-users-cog"></i> Ver Usuarios Pendientes';
    actionBtn.onclick = () => window.location.href = "admin-usuarios.html";
    
    // Vaciamos las estadísticas de Cargas/Rutas porque el admin no publica
    statsContainer.innerHTML = '';
}

// 4. FUNCIONES DE ESTADÍSTICAS
function cargarEstadisticasTransportista() {
    fetch(API_HOST+'/api/rutas/usuario/${usuario.idUsuario}')
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('Error al cargar datos');
    })
    .then(rutas => {
        document.getElementById('countRutas').textContent = rutas.length;
    })
    .catch(error => {
        document.getElementById('countRutas').textContent = "Error";
    });
}

function cargarEstadisticasEmpresa() {
    fetch(API_HOST+'/api/cargas/usuario/${usuario.idUsuario}')
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('Error al cargar datos');
    })
    .then(cargas => {
        document.getElementById('countCargas').textContent = cargas.length;
    })
    .catch(error => {
        document.getElementById('countCargas').textContent = "Error";
    });
}

// 5. Función para Cerrar Sesión
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