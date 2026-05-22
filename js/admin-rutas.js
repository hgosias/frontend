// 1. Proteger la ruta y validar el rol de Administrador
const usuarioActivoString = localStorage.getItem('usuarioActivo');
if (!usuarioActivoString) window.location.href = 'index.html';

const usuario = JSON.parse(usuarioActivoString);

if (usuario.role !== 'Administrador' && usuario.rol !== 'Administrador') {
    window.location.href = 'dashboard.html';
}

document.getElementById('userNameDisplay').textContent = usuario.nombre;

// 2. Control del Menú Hamburguesa
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

// 3. Cargar el listado global de rutas
function cargarRutasGlobales() {
    fetch('http://localhost:8080/api/rutas')
    .then(response => {
        if (response.ok) return response.json();
        throw new Error('Error al conectar con la base de datos de rutas.');
    })
    .then(rutas => {
        const tbody = document.getElementById('listaRutasGlobales');
        tbody.innerHTML = '';

        if (rutas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">No hay rutas publicadas actualmente en la plataforma.</td></tr>';
            return;
        }

        rutas.forEach(ruta => {
            // Formatear la fecha para que sea legible en formato local
            let fechaFormateada = "No definida";
            if (ruta.fechaSalida) {
                fechaFormateada = new Date(ruta.fechaSalida).toLocaleDateString('es-ES');
            }

            // Extraer el nombre del transportista si la relación está cargada
            const nombreTransportista = ruta.usuario ? ruta.usuario.nombre : "Desconocido";

            tbody.innerHTML += `
                <tr>
                    <td>#${ruta.idRuta}</td>
                    <td><strong>${nombreTransportista}</strong></td>
                    <td>${ruta.origen}</td>
                    <td>${ruta.destino}</td>
                    <td><i class="fas fa-weight-hanging"></i> ${ruta.capacidadLibre || 0} kg</td>
                    <td><i class="fas fa-calendar-alt"></i> ${fechaFormateada}</td>
                    <td>
                        <button class="btn-eliminar" onclick="eliminarRutaInapropiada(${ruta.idRuta})">
                            <i class="fas fa-trash-alt"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });
    })
    .catch(error => {
        document.getElementById('listaRutasGlobales').innerHTML = '<tr><td colspan="7" style="text-align: center; color: #e74c3c;">Error al sincronizar con el servidor.</td></tr>';
    });
}

// 4. Lógica de eliminación forzada por el Admin
function eliminarRutaInapropiada(idRuta) {
    if (confirm(`¿Estás completamente seguro de que deseas eliminar la ruta #${idRuta}? Esta acción cancelará las publicaciones del transportista.`)) {
        fetch(`http://localhost:8080/api/rutas/${idRuta}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                cargarRutasGlobales(); // Refrescamos el listado instantáneamente
            } else {
                alert('No se pudo eliminar la ruta seleccionada.');
            }
        })
        .catch(error => alert('Error en la comunicación con el servidor.'));
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuarioActivo');
    window.location.href = 'index.html';
}

// Inicializar la tabla global
cargarRutasGlobales();