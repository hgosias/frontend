// 1. Proteger la ruta y cargar datos
const usuarioActivoString = localStorage.getItem('usuarioActivo');
if (!usuarioActivoString) window.location.href = 'index.html';

const usuario = JSON.parse(usuarioActivoString);

// Llenar datos de la navbar
document.getElementById('userNameDisplay').textContent = usuario.nombre;
document.getElementById('userRoleBadge').textContent = usuario.rol;

// Ajustar el menú lateral dependiendo de quién seamos
const menuDinamico = document.getElementById('menuDinamico');
if (usuario.rol === 'Transportista') {
    menuDinamico.innerHTML = `<a href="rutas.html"><i class="fas fa-truck"></i> Mis Rutas</a>`;
} else if (usuario.rol === 'Empresa') {
    menuDinamico.innerHTML = `<a href="cargas.html"><i class="fas fa-box"></i> Mis Cargas</a>`;
}

// 2. Rellenar los datos actuales en el HTML
document.getElementById('cardNombre').textContent = usuario.nombre;
document.getElementById('cardRol').textContent = usuario.rol;

document.getElementById('perfilNombre').value = usuario.nombre;
document.getElementById('perfilEmail').value = usuario.email;
document.getElementById('perfilCifDni').value = usuario.cifDni;

// 3. Configurar la insignia (Badge) de Verificación
const cardEstado = document.getElementById('cardEstado');
const textoVerificacion = document.getElementById('textoVerificacion');
// Si la base de datos no nos devuelve estadoVerificacion, asumimos "Pendiente"
const estadoReal = usuario.estadoVerificacion || 'Pendiente';

if (estadoReal === 'Verificado') {
    cardEstado.className = 'estado-badge estado-verificado';
    cardEstado.innerHTML = '<i class="fas fa-check-circle"></i> Verificado';
    textoVerificacion.textContent = 'Tu documentación ha sido aprobada por la administración.';
} else if (estadoReal === 'Rechazado') {
    cardEstado.className = 'estado-badge estado-rechazado';
    cardEstado.innerHTML = '<i class="fas fa-times-circle"></i> Rechazado';
    textoVerificacion.textContent = 'Hubo un problema con tu documentación. Contacta con soporte.';
}

// 4. Enviar los datos actualizados al Backend
document.getElementById('formPerfil').addEventListener('submit', function(e) {
    e.preventDefault();

    const msgDiv = document.getElementById('mensajePerfil');
    msgDiv.style.color = 'var(--dark-blue)';
    msgDiv.innerHTML = "Guardando cambios...";

    // Recogemos los valores del formulario
    const datosActualizados = {
        nombre: document.getElementById('perfilNombre').value,
        email: document.getElementById('perfilEmail').value,
        cifDni: document.getElementById('perfilCifDni').value,
        contrasena: document.getElementById('perfilPassword').value 
    };

    fetch(`http://localhost:8080/api/usuarios/${usuario.idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosActualizados)
    })
    .then(async response => {
        if(response.ok) return response.json();
        throw new Error('Error al actualizar el perfil');
    })
    .then(usuarioActualizado => {
        msgDiv.style.color = 'var(--primary-green)';
        msgDiv.innerHTML = "¡Perfil actualizado con éxito!";
        
        // ¡IMPORTANTE! Actualizamos el localStorage para que el resto de páginas
        // sepan que nuestro nombre o correo ha cambiado.
        localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActualizado));
        
        // Actualizamos los textos visuales en esta misma página
        document.getElementById('userNameDisplay').textContent = usuarioActualizado.nombre;
        document.getElementById('cardNombre').textContent = usuarioActualizado.nombre;
        document.getElementById('perfilPassword').value = ''; 
        
        setTimeout(() => { msgDiv.innerHTML = ""; }, 3000);
    })
    .catch(error => {
        msgDiv.style.color = '#e74c3c';
        msgDiv.innerHTML = "Hubo un error al guardar los cambios.";
    });
});

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