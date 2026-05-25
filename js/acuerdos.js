const API_HOST = "https://v0-production-3459.up.railway.app";

// 1. Proteger ruta
const usuarioActivoString = localStorage.getItem('usuarioActivo');
if (!usuarioActivoString) window.location.href = 'index.html';

const usuario = JSON.parse(usuarioActivoString);

// 2. Navbar y Menú Dinámico
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

const menuDinamico = document.getElementById('menuDinamico');
if (usuario.rol === 'Transportista') {
    menuDinamico.innerHTML = `<a href="rutas.html"><i class="fas fa-truck"></i> Mis Rutas</a>`;
} else if (usuario.rol === 'Empresa') {
    menuDinamico.innerHTML = `<a href="cargas.html"><i class="fas fa-box"></i> Mis Cargas</a>`;
}

// 3. Cargar Acuerdos
function cargarAcuerdos() {
    // CORREGIDO: Usando concatenación con +
    fetch(API_HOST + '/api/ofertas/usuario/' + usuario.idUsuario)
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('Error al cargar acuerdos');
    })
    .then(ofertas => {
        const recibidasContainer = document.getElementById('recibidasContainer');
        const enviadasContainer = document.getElementById('enviadasContainer');

        recibidasContainer.innerHTML = '';
        enviadasContainer.innerHTML = '';

        let contRecibidas = 0;
        let contEnviadas = 0;

        ofertas.forEach(oferta => {
            const estado = oferta.estado;
            // Eres el emisor si tu ID coincide con el que envió la petición
            const esEmisor = oferta.usuarioEmisor.idUsuario === usuario.idUsuario;

            let origen = "", destino = "", tipoServicio = "", nombreAnunciante = "";

            // Extraer datos dependiendo de si es ruta o carga
            if (oferta.ruta) {
                origen = oferta.ruta.origen;
                destino = oferta.ruta.destino;
                tipoServicio = "Tu Ruta publicada";
                nombreAnunciante = oferta.ruta.usuario.nombre;
            } else if (oferta.carga) {
                origen = oferta.carga.origen;
                destino = oferta.carga.destino;
                tipoServicio = "Tu Carga publicada";
                nombreAnunciante = oferta.carga.usuario.nombre;
            }

            let cardHtml = `
                <div class="acuerdo-card">
                    <div class="estado-badge estado-${estado}">${estado}</div>
                    <div class="acuerdo-ruta">${origen} <i class="fas fa-arrow-right"></i> ${destino}</div>
            `;

            if (esEmisor) {
                // --- VISTA DE PETICIÓN ENVIADA ---
                contEnviadas++;
                cardHtml += `
                    <p style="font-size: 0.9rem; color: #667;">Petición enviada a: <strong>${nombreAnunciante}</strong></p>
                    <div class="acuerdo-contacto">
                        <p><i class="fas fa-envelope"></i> Contacto enviado: ${oferta.emailContacto}</p>
                    </div>
                    <p style="font-size: 0.8rem; color: #888;">Esperando respuesta del anunciante...</p>
                </div>`;
                enviadasContainer.innerHTML += cardHtml;

            } else {
                // --- VISTA DE PETICIÓN RECIBIDA ---
                contRecibidas++;
                cardHtml += `
                    <p style="font-size: 0.9rem; color: #667;">Sobre: ${tipoServicio}</p>
                    <div class="acuerdo-contacto">
                        <p><i class="fas fa-user"></i> De: ${oferta.usuarioEmisor.nombre}</p>
                        <p><i class="fas fa-envelope"></i> Email: <strong>${oferta.emailContacto}</strong></p>
                    </div>
                `;

                if (estado === 'Pendiente') {
                    cardHtml += `
                        <div class="acuerdo-acciones">
                            <button class="btn-aceptar" onclick="cambiarEstado(${oferta.idOferta}, 'Aceptada')"><i class="fas fa-check"></i> Aceptar</button>
                            <button class="btn-rechazar" onclick="cambiarEstado(${oferta.idOferta}, 'Rechazada')"><i class="fas fa-times"></i> Rechazar</button>
                        </div>
                    `;
                } else {
                    cardHtml += `<p style="font-size: 0.85rem; color: #667; font-style: italic;">Has marcado esta petición como ${estado}.</p>`;
                }

                cardHtml += `</div>`;
                recibidasContainer.innerHTML += cardHtml;
            }
        });

        if (contRecibidas === 0) recibidasContainer.innerHTML = '<p style="color: #667;">No has recibido peticiones de contacto.</p>';
        if (contEnviadas === 0) enviadasContainer.innerHTML = '<p style="color: #667;">No has enviado ninguna petición.</p>';
    })
    .catch(error => {
        document.getElementById('recibidasContainer').innerHTML = '<p style="color: #e74c3c;">Error al conectar con el servidor.</p>';
        document.getElementById('enviadasContainer').innerHTML = '';
    });
}

// 4. Cambiar el estado
function cambiarEstado(idOferta, nuevoEstado) {
    if(confirm(`¿Estás seguro de marcar esta petición como ${nuevoEstado}?`)) {
        // CORREGIDO: Usando concatenación con +
        fetch(API_HOST + '/api/ofertas/' + idOferta + '/estado', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        })
        .then(response => {
            if(response.ok) cargarAcuerdos(); 
            else alert("Error al actualizar.");
        })
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

cargarAcuerdos();