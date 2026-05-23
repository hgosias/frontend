const API_HOST = "https://v0-production-3459.up.railway.app"

// 1. Proteger la ruta y cargar datos
const usuarioActivoString = localStorage.getItem('usuarioActivo');
if (!usuarioActivoString) window.location.href = 'index.html';

const usuario = JSON.parse(usuarioActivoString);

// Llenar datos de la navbar
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
        .ruta-card .main-btn, .btn-ofertar { display: none !important; }
        
        /* Oculta los botones de aceptar/rechazar en mis acuerdos */
        .acuerdo-acciones { display: none !important; }
    `;
    document.head.appendChild(style);
}

// Ajustar el menú lateral dependiendo de quién seamos
const menuDinamico = document.getElementById('menuDinamico');
if (usuario.rol === 'Transportista') {
    menuDinamico.innerHTML = `<a href="rutas.html"><i class="fas fa-truck"></i> Mis Rutas</a>`;
} else if (usuario.rol === 'Empresa') {
    menuDinamico.innerHTML = `<a href="cargas.html"><i class="fas fa-box"></i> Mis Cargas</a>`;
}

// Variables globales
let todosLosResultados = []; 

// 2. Configurar la vista según el rol
const titulo = document.getElementById('tituloBuscador');
const subtitulo = document.getElementById('subtituloBuscador');
let urlFetch = '';

if (usuario.rol === 'Transportista') {
    titulo.textContent = 'Buscador de Cargas (Mercancía)';
    subtitulo.textContent = 'Encuentra empresas que necesiten transportar mercancía en tus rutas habituales.';
    urlFetch = (API_HOST+'/api/cargas');
} else if (usuario.rol === 'Empresa') {
    titulo.textContent = 'Buscador de Rutas (Transportistas)';
    subtitulo.textContent = 'Encuentra transportistas con espacio disponible en la ruta que necesitas.';
    urlFetch = (API_HOST+'/api/rutas');
}

// 3. Obtener los datos de Spring Boot
function cargarDatosGlobales() {
    console.log("Haciendo petición a: ", urlFetch); // Para depurar

    fetch(urlFetch)
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('Error al cargar la base de datos');
    })
    .then(data => {
        console.log("Datos recibidos del servidor: ", data); // Vemos qué llega exactamente

        // Filtro 1: No mostrar nuestras propias publicaciones
        todosLosResultados = data.filter(item => item.usuario && item.usuario.idUsuario !== usuario.idUsuario);
        
        // Filtro 2: Mostrar solo las que estén publicadas (Lo pasamos a mayúsculas para evitar errores de texto)
        todosLosResultados = todosLosResultados.filter(item => item.estado && item.estado.toUpperCase() === 'PUBLICADA');

        console.log("Datos después de filtrar: ", todosLosResultados);

        pintarResultados(todosLosResultados);
    })
    .catch(error => {
        console.error(error);
        document.getElementById('resultadosContainer').innerHTML = '<p style="color: #e74c3c;">Error de conexión con el servidor.</p>';
    });
}

// 4. Dibujar las tarjetas
function pintarResultados(lista) {
    const contenedor = document.getElementById('resultadosContainer');
    contenedor.innerHTML = ''; 

    if (lista.length === 0) {
        contenedor.innerHTML = '<p style="color: #666; grid-column: 1/-1; text-align: center; padding: 2rem;">No hay publicaciones disponibles en este momento.</p>';
        return;
    }

    lista.forEach(item => {
        let detalleClave = '';
        let infoExtra = '';

        if (usuario.rol === 'Transportista') {
            // Diseño de CARGA (Lo que ve el Transportista)
            detalleClave = `<i class="fas fa-weight-hanging"></i> ${item.pesoVolumen || 0} kg/m³`;
            infoExtra = `"${item.descripcion || 'Sin descripción'}"`;
        } else {
            // Diseño de RUTA (Lo que ve la Empresa)
            // Verificamos que la fecha exista para que no rompa el código
            let fechaTexto = "Fecha no especificada";
            if(item.fechaSalida) {
                fechaTexto = new Date(item.fechaSalida).toLocaleDateString('es-ES');
            }
            detalleClave = `<i class="fas fa-calendar-alt"></i> Salida: ${fechaTexto}`;
            infoExtra = `<i class="fas fa-weight-hanging"></i> Espacio libre: ${item.capacidadLibre || 0} kg`;
        }

        contenedor.innerHTML += `
            <div class="card-result">
                <div class="card-cities">
                    ${item.origen} <i class="fas fa-arrow-right" style="color: #ccc; font-size: 0.9rem;"></i> ${item.destino}
                </div>
                <div class="card-publisher">
                    <i class="fas fa-user-circle"></i> Publicado por: <strong>${item.usuario.nombre}</strong>
                </div>
                <div class="card-details">
                    <p>${detalleClave}</p>
                    <p style="margin-top: 5px;">${infoExtra}</p>
                </div>
                <button class="btn-ofertar" onclick="abrirModalOferta(${item.idCarga || item.idRuta})">
                    <i class="fas fa-paper-plane"></i> Enviar Oferta
                </button>
            </div>
        `;
    });
}

// 5. Filtros locales
function aplicarFiltros() {
    const origenBuscado = document.getElementById('filtroOrigen').value.toLowerCase();
    const destinoBuscado = document.getElementById('filtroDestino').value.toLowerCase();

    const resultadosFiltrados = todosLosResultados.filter(item => {
        const origenMatch = item.origen.toLowerCase().includes(origenBuscado);
        const destinoMatch = item.destino.toLowerCase().includes(destinoBuscado);
        return origenMatch && destinoMatch;
    });

    pintarResultados(resultadosFiltrados);
}

function limpiarFiltros() {
    document.getElementById('filtroOrigen').value = '';
    document.getElementById('filtroDestino').value = '';
    pintarResultados(todosLosResultados);
}

// --- LÓGICA DEL MODAL DE CONTACTO ---
const modalOferta = document.getElementById('modalOferta');
let idElementoSeleccionado = null; 

function abrirModalOferta(idItem) {
    idElementoSeleccionado = idItem;
    document.getElementById('formOferta').reset();
    document.getElementById('mensajeOferta').innerHTML = '';
    
    // Rellenamos automáticamente el email con el del usuario actual
    document.getElementById('emailContacto').value = usuario.email;
    
    modalOferta.style.display = 'flex';
}

function cerrarModalOferta() {
    modalOferta.style.display = 'none';
}

document.getElementById('formOferta').addEventListener('submit', function(e) {
    e.preventDefault();

    const emailInsertado = document.getElementById('emailContacto').value;
    const msgDiv = document.getElementById('mensajeOferta');
    
    msgDiv.style.color = 'var(--dark-blue)';
    msgDiv.innerHTML = "Enviando datos de contacto...";

    const datosOferta = {
        idUsuarioEmisor: usuario.idUsuario,
        emailContacto: emailInsertado
    };

    if (usuario.rol === 'Empresa') {
        datosOferta.idRuta = idElementoSeleccionado; 
    } else if (usuario.rol === 'Transportista') {
        datosOferta.idCarga = idElementoSeleccionado; 
    }

    fetch(API_HOST+'/api/ofertas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosOferta)
    })
    .then(async response => {
        if (!response.ok) {
            // Leemos el mensaje de error exacto que envía Spring Boot
            const errorData = await response.json();
            // Lanzamos el error para que lo capture el .catch de abajo
            throw new Error(errorData.error || 'Hubo un problema al enviar la petición.');
        }
        return response.json();
    })
    .then(() => {
        msgDiv.style.color = 'var(--primary-green)';
        msgDiv.innerHTML = "¡Petición enviada con éxito!";
        setTimeout(() => { cerrarModalOferta(); }, 1500);
    })
    .catch(error => {
        msgDiv.style.color = '#e74c3c';
        // Aquí mostramos el mensaje exacto devuelto por Spring Boot
        msgDiv.innerHTML = error.message; 
    });
});

function cerrarSesion() {
    localStorage.removeItem('usuarioActivo');
    window.location.href = 'index.html';
}

// ARREGLO DE ENLACES ESTÁTICOS
const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
sidebarLinks.forEach(link => {
    if (link.textContent.includes('Inicio')) link.href = 'dashboard.html';
    else if (link.textContent.includes('Buscar Ofertas')) link.href = 'buscar.html';
});

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

cargarDatosGlobales();