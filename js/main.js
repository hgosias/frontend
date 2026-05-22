const API_HOST = "http://v0-production-3459.up.railway.app"
// =========================================================
// 1. Lógica para alternar entre Login y Registro (Pestañas)
// =========================================================
function switchTab(tab) {
    // Quitar la clase 'active' de todos los botones y formularios
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active-form'));

    // Añadir la clase 'active' al botón y formulario seleccionados
    if(tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('loginForm').classList.add('active-form');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('registroForm').classList.add('active-form');
    }
}

// =========================================================
// 2. Lógica de REGISTRO (Crear un nuevo usuario con Documento)
// =========================================================
document.getElementById('registroForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Evita que la página se recargue

    const msgDiv = document.getElementById('registroMensaje');

    // --- NUEVA VALIDACIÓN DE CONTRASEÑA ---
    const passwordInput = document.getElementById('password').value;
    if (passwordInput.length < 5) {
        msgDiv.style.color = '#e74c3c';
        msgDiv.innerHTML = "La contraseña debe tener al menos 5 caracteres.";
        return; // Detiene la ejecución aquí para que no registre al usuario
    }
    // --------------------------------------

    msgDiv.style.color = 'var(--dark-blue)';
    msgDiv.innerHTML = "Procesando documento y registro...";

    // 1. Capturamos el archivo subido
    const fileInput = document.getElementById('documento');
    const file = fileInput.files[0];

    // 2. Usamos FileReader para convertir el archivo a Base64
    const reader = new FileReader();

    reader.onloadend = function() {
        const base64String = reader.result; // Aquí está el archivo convertido a texto

        // 3. Montamos el objeto usuario incluyendo el documento
        const usuario = {
            nombre: document.getElementById('nombre').value,
            email: document.getElementById('email').value,
            contrasena: passwordInput, // Usamos la variable ya capturada arriba
            cifDni: document.getElementById('cif_dni').value,
            rol: document.getElementById('rol').value,
            documentoBase64: base64String // <--- NUEVO DATO PARA EL BACKEND
        };

        // 4. Enviar datos al backend
        fetch(API_HOST+'/api/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usuario)
        })
        .then(response => {
            if(response.ok) {
                return response.json();
            }
            throw new Error('El correo electrónico o el CIF/DNI ya están registrados');
        })
        .then(data => {
            msgDiv.style.color = 'var(--primary-green)';
            msgDiv.innerHTML = "¡Cuenta creada con éxito! Redirigiendo al Login...";
            document.getElementById('registroForm').reset();

            setTimeout(() => {
                switchTab('login');
                msgDiv.innerHTML = "";
                document.getElementById('loginEmail').value = usuario.email;
            }, 2000);
        })
        .catch(error => {
            msgDiv.style.color = '#e74c3c';
            msgDiv.innerHTML = error.message;
        });
    };

    // Esto activa la conversión del archivo que desemboca en el onloadend de arriba
    if (file) {
        reader.readAsDataURL(file);
    } else {
        msgDiv.style.color = '#e74c3c';
        msgDiv.innerHTML = "Por favor, adjunta un documento válido.";
    }
});

// =========================================================
// 3. Lógica de LOGIN (Conexión real con Spring Boot)
// =========================================================
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Recoger el email y la contraseña del formulario
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const msgDiv = document.getElementById('loginMensaje');
    
    msgDiv.style.color = 'var(--dark-blue)';
    msgDiv.innerHTML = "Comprobando credenciales...";
    
    // Llamada REAL al backend
    fetch('http://localhost:8080/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            email: email, 
            contrasena: password 
        })
    })
    .then(async response => {
        if(response.ok) {
            return response.json(); // Si el código es 200 (OK), extraemos los datos
        } else {
            // Si el código es 401 (Error), extraemos el mensaje de tu Spring Boot
            const textError = await response.text();
            throw new Error(textError);
        }
    })
    .then(usuarioLogueado => {
        // ÉXITO: Guardamos al usuario y redirigimos
        localStorage.setItem('usuarioActivo', JSON.stringify(usuarioLogueado));

        msgDiv.style.color = 'var(--primary-green)';
        msgDiv.innerHTML = `¡Bienvenido/a, ${usuarioLogueado.nombre}! Entrando...`;
        
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1500);
    })
    .catch(error => {
        // ERROR: Mostramos el mensaje en rojo y evitamos que entre
        msgDiv.style.color = '#e74c3c';
        
        // Comprobación por si el backend de Java está apagado
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            msgDiv.innerHTML = "Error de conexión: ¿Está encendido el servidor de Spring Boot?";
        } else {
            msgDiv.innerHTML = error.message; // Mostrará "Correo o contraseña incorrectos"
        }
    });
});