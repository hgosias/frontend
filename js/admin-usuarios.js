const API_HOST = "https://v0-production-3459.up.railway.app"

// 1. Proteger la ruta y comprobar que es Admin
const usuarioActivoString = localStorage.getItem('usuarioActivo');
if (!usuarioActivoString) window.location.href = 'index.html';

const usuario = JSON.parse(usuarioActivoString);

if (usuario.rol !== 'Administrador') {
    window.location.href = 'dashboard.html';
}

document.getElementById('userNameDisplay').textContent = usuario.nombre;

// 2. Menú Hamburguesa
const menuToggleBtn = document.getElementById('menuToggleBtn');
const sidebar = document.querySelector('.sidebar');
if (menuToggleBtn && sidebar) {
    menuToggleBtn.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('activo-movil');
        } else {
            sidebar.classList.toggle('oculto-pc');
        }
    });
}

let usuariosCacheados = [];

// 3. Cargar TODOS los usuarios de la base de datos
function cargarTodosLosUsuarios() {
    fetch(API_HOST+'/api/usuarios')
    .then(response => {
        if(response.ok) return response.json();
        throw new Error('Error al obtener datos');
    })
    .then(usuarios => {
        usuariosCacheados = usuarios;
        const tbody = document.getElementById('listaPendientes');
        tbody.innerHTML = '';

        if (usuarios.length === 0) {
            // Nota: 7 columnas porque ahora tenemos la columna "Estado"
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay usuarios en la base de datos.</td></tr>';
            return;
        }

        usuarios.forEach(user => {
            const claseRol = user.rol === 'Empresa' ? 'badge-empresa' : 'badge-transportista';

            // Lógica de clases CSS para el estado
            let claseEstado = 'badge-pendiente';
            if(user.estadoVerificacion === 'Verificado') claseEstado = 'badge-verificado';
            if(user.estadoVerificacion === 'Rechazado') claseEstado = 'badge-rechazado';

            // Lógica para mostrar/ocultar botones de aprobación/rechazo
            const btnAprobar = user.estadoVerificacion !== 'Verificado'
                ? `<button class="btn-icon btn-aprobar" onclick="verificarUsuario(${user.idUsuario}, 'Verificado')" title="Aprobar"><i class="fas fa-check"></i></button>`
                : '';

            const btnRechazar = user.estadoVerificacion !== 'Rechazado'
                ? `<button class="btn-icon btn-rechazar" onclick="verificarUsuario(${user.idUsuario}, 'Rechazado')" title="Rechazar"><i class="fas fa-times"></i></button>`
                : '';

            tbody.innerHTML += `
                <tr>
                    <td>#${user.idUsuario}</td>
                    <td><strong>${user.nombre}</strong></td>
                    <td>${user.email}</td>
                    <td><span class="role-badge ${claseRol}">${user.rol}</span></td>
                    <td><span class="badge-estado ${claseEstado}">${user.estadoVerificacion}</span></td>
                    <td><i class="fas fa-id-card"></i> ${user.cifDni}</td>
                    <td class="acciones-flex">
                        <button onclick="verDocumento(${user.idUsuario})" class="btn-icon btn-ver" title="Ver Documento"><i class="fas fa-eye"></i></button>
                        ${btnAprobar}
                        ${btnRechazar}
                        <button onclick="eliminarUsuario(${user.idUsuario})" class="btn-icon btn-eliminar" title="Eliminar Permanentemente"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    })
    .catch(error => {
        document.getElementById('listaPendientes').innerHTML = '<tr><td colspan="7" class="text-center text-error">Error de conexión con el servidor.</td></tr>';
    });
}

// Mostrar documento en modal
function verDocumento(idUsuario) {
    const user = usuariosCacheados.find(u => u.idUsuario === idUsuario);
    const visor = document.getElementById('visorDocumento');

    // Limpiamos los estilos incrustados que tenías en el HTML original asignando la clase base
    visor.className = 'visor-container';

    if (!user || !user.documentoBase64) {
        visor.innerHTML = '<p class="text-error"><i class="fas fa-exclamation-triangle"></i> Este usuario no adjuntó ningún documento válido.</p>';
    } else {
        const base64 = user.documentoBase64;
        if (base64.startsWith('data:application/pdf')) {
            visor.innerHTML = `<embed src="${base64}" type="application/pdf" class="doc-pdf" />`;
        } else if (base64.startsWith('data:image/')) {
            visor.innerHTML = `<img src="${base64}" alt="Documento Oficial" class="doc-img" />`;
        } else {
            visor.innerHTML = '<p class="text-error">Formato de documento no soportado.</p>';
        }
    }
    document.getElementById('modalDocumento').style.display = 'flex';
}

// Modificar estado del usuario
function verificarUsuario(id, nuevoEstado) {
    const accionTexto = nuevoEstado === 'Verificado' ? 'aprobar' : 'rechazar';

    if(confirm(`¿Estás seguro de ${accionTexto} a este usuario?`)) {
        fetch(API_HOST+'/api/usuarios/${id}/verificar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        })
        .then(response => {
            if(response.ok) {
                cargarTodosLosUsuarios(); // Recarga toda la tabla para ver los cambios
            } else {
                alert('Error al actualizar el usuario.');
            }
        })
        .catch(error => alert('Error de conexión con el servidor.'));
    }
}

// Eliminar usuario
function eliminarUsuario(idUsuario) {
    if(confirm("¿Estás totalmente seguro de que deseas eliminar a este usuario de forma permanente? Esta acción no se puede deshacer y borrará toda su información.")) {

        fetch(API_HOST+'/api/usuarios/${idUsuario}', {
            method: 'DELETE'
        })
        .then(response => {
            if(response.ok) {
                cargarTodosLosUsuarios();
            } else {
                alert('Hubo un problema al intentar eliminar la cuenta.');
            }
        })
        .catch(error => alert('Error de conexión con el servidor.'));
    }
}

// Cierre de sesión
function cerrarSesion() {
    localStorage.removeItem('usuarioActivo');
    window.location.href = 'index.html';
}

// Iniciar carga de la tabla
cargarTodosLosUsuarios();