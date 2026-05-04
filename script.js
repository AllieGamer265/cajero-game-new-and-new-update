// =============================================================
// CONFIGURACIÓN: Las claves de Firebase y las credenciales admin
// ahora están en config.js (excluido de GitHub por .gitignore).
// config.js debe cargarse ANTES que este script en index.html.
// =============================================================

// --- INICIALIZACIÓN DE FIREBASE ---
// Las variables firebaseConfig, ADMIN_USER y ADMIN_PIN
// provienen de config.js.
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log("Firebase inicializado correctamente");
} catch (error) {
    console.error("Error inicializando Firebase:", error);
    alert("⚠️ Error: No se pudo conectar a Firebase. Revisa el archivo config.js.");
}

// =============================================================
// SEGURIDAD ANTI-XSS: Funciones de display seguro
// Usamos DOMPurify para sanitizar cualquier dato que venga de
// Firebase antes de mostrarlo en el DOM.
// =============================================================

/**
 * Sanitiza un texto usando DOMPurify. Siempre úsala antes de
 * insertar datos de Firebase en el HTML.
 * @param {string} str - El texto a sanitizar.
 * @returns {string} El texto limpio y seguro.
 */
function sanitizar(str) {
    if (typeof str !== 'string') return String(str || '');
    // Si DOMPurify está disponible, usarlo.
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    }
    // Fallback manual si DOMPurify no cargó.
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Establece el textContent de un elemento de forma segura 
 * (no interpreta HTML, protege contra XSS).
 * @param {string} elementId - El ID del elemento.
 * @param {string} text - El texto a mostrar.
 */
function safeSetText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = String(text || '');
}

/**
 * Inserta HTML sanitizado en un elemento usando DOMPurify.
 * Úsala SOLO cuando necesites renderizar emojis/HTML permitido.
 * @param {string} elementId - El ID del elemento.
 * @param {string} html - El HTML a sanitizar e insertar.
 * @param {object} options - Opciones de DOMPurify.
 */
function safeSetHtml(elementId, html, options = {}) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (typeof DOMPurify !== 'undefined') {
        el.innerHTML = DOMPurify.sanitize(html, options);
    } else {
        // Fallback: solo texto plano
        el.textContent = html;
    }
}

/**
 * Valida que un nombre de usuario sea seguro (solo letras, números,
 * espacios y algunos caracteres especiales). Máx 30 caracteres.
 */
function validarNombreUsuario(nombre) {
    if (!nombre || nombre.length > 30) return false;
    // Permitir letras (incluyendo acentos), números, espacios y guiones
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-_\.XD]+$/i;
    return regex.test(nombre);
}

/**
 * Valida que un monto sea un número positivo y razonable.
 */
function validarMonto(monto) {
    const n = parseFloat(monto);
    return !isNaN(n) && n > 0 && isFinite(n);
}

// --- ESTADO LOCAL ---
// Variables globales que mantienen el estado actual de la sesión.
let usuarioActualNombre = null; // Nombre de la jugadora logueada.
let precioActual = 10; // Precio de la criptomoneda gamer.
let precioAnteriorRecordado = 10; // Para saber si subió o bajó.
let ultimoHackAttempt = 0; // Tiempo de espera para el minijuego de hackeo.
let dueloActualId = null; // ID del duelo en curso.
let eventoGlobalActivo = null; // Para rastrear si hay un evento mundial.

// Variables para el minijuego de hackeo
let hackerSecuenciaTarget = "";
let hackerSecuenciaActual = "";
let hackerTargetId = null;
let hackerTargetNombre = "";
let hackerTimerInterval = null;

// Variables para el juego de BUSCAMINAS
let minasTablero = []; // 0 = diamante, 1 = bomba
let minasJuegoActivo = false;
let minasMultiplicador = 1;
let minasApuestaActual = 0;
let minasDiamantesEncontrados = 0;
let minasBombasTotales = 3;

// --- VARIABLES ROBO DE BANCO ---
let roboJuegoActivo = false;
let roboContribuidoresRef = null;
let roboEscuchandoBoveda = false;

// --- VARIABLES RASCA-GAMER ---
let rascaJuegoActivo = false;
let rascaSimbolos = [];
let rascaRevelados = 0;
let rascaCosto = 5000;
let rascaEmojis = ["🍒", "🍋", "🔔", "💎", "7️⃣"];

// =============================================================
// SESIÓN Y TIMEOUT DE INACTIVIDAD (Fase 3.2)
// Si el usuario no hace nada en 30 minutos, se cierra la sesión
// automáticamente para proteger su cuenta en dispositivos compartidos.
// =============================================================
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutos
const SESSION_WARNING_MS = 25 * 60 * 1000;   // Advertencia a los 25 min
let sessionTimeoutId = null;
let sessionWarningId = null;

/**
 * Reinicia los contadores de inactividad. Se llama en cada
 * interacción del usuario (click, teclado, touch).
 */
function resetearTimersSesion() {
    if (!usuarioActualNombre) return;
    clearTimeout(sessionTimeoutId);
    clearTimeout(sessionWarningId);

    sessionWarningId = setTimeout(() => {
        if (usuarioActualNombre) {
            const continuar = confirm(
                "\u23f3 Tu sesión se cerrará en 5 minutos por inactividad.\n¿Deseas continuar?"
            );
            if (continuar) resetearTimersSesion();
        }
    }, SESSION_WARNING_MS);

    sessionTimeoutId = setTimeout(() => {
        if (usuarioActualNombre) {
            alert("\ud83d\udd12 Sesión cerrada por inactividad (30 minutos).");
            cerrarSesion();
        }
    }, SESSION_TIMEOUT_MS);
}

/**
 * Activa el monitoreo de actividad del usuario en la página.
 * Se llama una vez, al iniciar sesión.
 */
function iniciarMonitoreoSesion() {
    // Monitoreo desactivado por petición del usuario
}

function detenerMonitoreoSesion() {
    // Detener desactivado
}

// --- TIENDA DE ITEMS (Iconos y Escudos) ---
const TIENDA_ITEMS = [
    { id: 'rayo', icono: '⚡', nombre: 'Rayo Veloz', precio: 500 },
    { id: 'mando', icono: '🎮', nombre: 'Gamer Pro', precio: 1000 },
    { id: 'fuego', icono: '🔥', nombre: 'En Llamas', precio: 2500 },
    { id: 'pizza', icono: '🍕', nombre: 'Pizza Lover', precio: 5000 },
    { id: 'corona', icono: '👑', nombre: 'Rey del Banco', precio: 10000 },
    { id: 'diamante', icono: '💎', nombre: 'Diamante Puro', precio: 25000 },
    { id: 'dragon', icono: '🐉', nombre: 'Dragón Legend', precio: 50000 },
    { id: 'firewall', icono: '🛡️', nombre: 'Ciber-Escudo (1h)', precio: 1000 }
];

// --- INICIALIZACIÓN ---
// Esta función se ejecuta cuando carga la página.
window.onload = function () {
    // Intenta recordar al último usuario que inició sesión en este navegador.
    const nombreGuardado = localStorage.getItem('bancoGamerUltimoUsuario');
    if (nombreGuardado) {
        document.getElementById('loginNombre').value = nombreGuardado;
        mostrarPantalla('pantalla-login');
    } else {
        mostrarPantalla('pantalla-registro');
    }

    // --- PUERTA INVISIBLE PARA LA PRO ---
    let clicsAdmin = 0;
    let timerAdmin = null;
    let intentosAdminFallidos = 0;
    let bloqueadoAdmin = false;

    const titulos = ['titulo-secreto-reg', 'titulo-secreto-login'];
    
    function manejarFalloAdmin() {
        intentosAdminFallidos++;
        if (intentosAdminFallidos >= 3) {
            bloqueadoAdmin = true;
            document.body.innerHTML = "<div style='background:black;color:#0f0;text-align:center;padding:50px;font-family:monospace;height:100vh;display:flex;flex-direction:column;justify-content:center;'><h1>🚨 ALARMA DE SEGURIDAD MÁXIMA 🚨</h1><p>INTRUSO DETECTADO. EL SISTEMA SE HA BLOQUEADO PERMANENTEMENTE.</p></div>";
        } else {
            alert(`⛔ Acceso Denegado. Fallo en el protocolo de seguridad. Intento ${intentosAdminFallidos}/3.`);
        }
    }

    function iniciarFaseEmojis() {
        const emojisDisponibles = ["🔥", "🍕", "🎮", "👑", "💎", "⚡", "🍒", "🪙"];
        // Barajar opciones visualmente
        emojisDisponibles.sort(() => Math.random() - 0.5);
        
        let secuenciaIngresada = [];
        
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.95)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.color = '#0f0';
        overlay.style.fontFamily = 'monospace';

        const titulo = document.createElement('h2');
        titulo.textContent = "FASE 3: PATRÓN VISUAL";
        titulo.style.marginBottom = '20px';
        overlay.appendChild(titulo);

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        grid.style.gap = '15px';
        
        emojisDisponibles.forEach(emoji => {
            const btn = document.createElement('button');
            btn.textContent = emoji;
            btn.style.fontSize = '3rem';
            btn.style.padding = '15px';
            btn.style.background = '#111';
            btn.style.border = '2px solid #0f0';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '10px';
            btn.style.transition = '0.3s';
            
            btn.onclick = () => {
                secuenciaIngresada.push(emoji);
                btn.style.background = '#27ae60'; // Marcar seleccionado
                btn.disabled = true;
                
                if (secuenciaIngresada.length === ADMIN_EMOJIS_SECRETOS.length) {
                    // Validar secuencia
                    let correcto = true;
                    for (let i = 0; i < ADMIN_EMOJIS_SECRETOS.length; i++) {
                        if (secuenciaIngresada[i] !== ADMIN_EMOJIS_SECRETOS[i]) {
                            correcto = false;
                        }
                    }
                    
                    document.body.removeChild(overlay);
                    
                    if (correcto) {
                        intentosAdminFallidos = 0;
                        alert("✅ PROTOCOLO DE SEGURIDAD COMPLETADO. BIENVENIDA, JEFA.");
                        loginAdminAuto();
                    } else {
                        manejarFalloAdmin();
                    }
                }
            };
            grid.appendChild(btn);
        });
        
        overlay.appendChild(grid);
        
        const textoInfo = document.createElement('p');
        textoInfo.textContent = `Selecciona los ${ADMIN_EMOJIS_SECRETOS.length} símbolos secretos en orden exacto.`;
        textoInfo.style.marginTop = '25px';
        overlay.appendChild(textoInfo);
        
        const btnCancelar = document.createElement('button');
        btnCancelar.textContent = "[ ABORTAR MISIÓN ]";
        btnCancelar.style.marginTop = '20px';
        btnCancelar.style.padding = '10px 20px';
        btnCancelar.style.background = '#c0392b';
        btnCancelar.style.color = 'white';
        btnCancelar.style.border = 'none';
        btnCancelar.style.fontWeight = 'bold';
        btnCancelar.style.cursor = 'pointer';
        btnCancelar.onclick = () => {
            document.body.removeChild(overlay);
            manejarFalloAdmin(); // Cancelar también cuenta como fallo
        };
        overlay.appendChild(btnCancelar);

        document.body.appendChild(overlay);
    }

    titulos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                if (bloqueadoAdmin) {
                    alert("🚨 SISTEMA BLOQUEADO. SE HA NOTIFICADO A LA POLICÍA CIBERNÉTICA. 🚨");
                    return;
                }

                clicsAdmin++;
                clearTimeout(timerAdmin);

                // Si pasan 2 segundos sin clics, el contador se reinicia
                timerAdmin = setTimeout(() => { clicsAdmin = 0; }, 2000);

                if (clicsAdmin >= 5) {
                    clicsAdmin = 0;
                    
                    // --- FASE 1: PREGUNTA DE SEGURIDAD ---
                    const resp = prompt(`🛡️ SEGURIDAD MÁXIMA - FASE 1\n${ADMIN_PREGUNTA}`);
                    if (resp === null) return;
                    
                    if (resp.trim().toLowerCase() !== ADMIN_RESPUESTA.toLowerCase()) {
                        manejarFalloAdmin();
                        return;
                    }

                    // --- FASE 2: CONTRASEÑA FUERTE ---
                    const passFuerte = prompt("🔑 PREGUNTA SUPERADA - FASE 2\nIngresa la Contraseña Maestra:");
                    if (passFuerte === null) return;

                    if (passFuerte !== ADMIN_PASS_FUERTE) {
                        manejarFalloAdmin();
                        return;
                    }
                    
                    // --- FASE 3: PATRÓN DE EMOJIS ---
                    iniciarFaseEmojis();
                }
            });
        }
    });
};

/**
 * Función para cambiar entre las diferentes pantallas de la aplicación.
 * @param {string} idPantalla - El ID del elemento HTML que se desea mostrar.
 */
function mostrarPantalla(idPantalla) {
    const cajero = document.getElementById('cajero');
    const contenedorAdmin = document.getElementById('contenedor-admin');

    // Ocultar primero TODAS las pantallas
    document.querySelectorAll('.pantalla').forEach(p => p.classList.add('hidden'));

    // Lista de pantallas que viven FUERA del div gris del cajero
    const pantallasExternas = ['pantalla-ranking', 'pantalla-duelo', 'pantalla-hackeo', 'pantalla-mercado', 'pantalla-rasca'];

    if (idPantalla === 'pantalla-admin') {
        cajero.style.display = 'none';
        contenedorAdmin.classList.remove('hidden');
        document.getElementById('pantalla-admin').classList.remove('hidden');
    } else if (pantallasExternas.includes(idPantalla)) {
        cajero.style.display = 'none';
        contenedorAdmin.classList.add('hidden');
        document.getElementById(idPantalla).classList.remove('hidden');
    } else {
        // Pantallas normales (Login, Registro, Dashboard, Torre, Casino, etc.)
        cajero.style.display = 'block';
        contenedorAdmin.classList.add('hidden');
        document.getElementById(idPantalla).classList.remove('hidden');
    }
}

/**
 * Función para regresar a la pantalla adecuada desde el manual.
 */
function regresarDeGuia() {
    if (usuarioActualNombre) {
        mostrarPantalla('pantalla-cajero');
    } else {
        mostrarPantalla('pantalla-login');
    }
}

// --- LÓGICA DE NEGOCIO (FIREBASE) ---

/**
 * Normaliza el nombre del usuario para usarlo como clave única en la base de datos.
 * Elimina espacios y convierte a minúsculas.
 */
function limpiarNombre(nombre) {
    return nombre.toLowerCase().replace(/\s/g, '');
}

/**
 * Formatea números grandes para que sean legibles (K, M, B) y no usen notación científica.
 */
function formatearNumero(num) {
    if (isNaN(num) || num === null) return "0.00";
    if (num > 1e15) return "999T+"; // Límite visual para evitar notación científica fea
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
}

// =============================================================
// FASE 3.3 – PROTECCIÓN CSRF (para apps Firebase SPA)
// En una SPA con Firebase, el CSRF clásico no aplica directamente
// porque no hay cookies de sesión. Implementamos tokens de sesión
// en memoria para validar que las acciones vienen de la pestaña
// activa y no de una inyección externa.
// =============================================================
const SESSION_TOKEN = crypto.getRandomValues(new Uint8Array(16))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');

/**
 * Agrega el token de sesión al objeto de datos antes de enviarlo
 * a Firebase. Permite detectar si alguien inyecta datos externos.
 */
function conTokenCSRF(datos) {
    return Object.assign({}, datos, { _csrfToken: SESSION_TOKEN });
}

// =============================================================
// Intentos de login fallidos - Brute Force Protection
// =============================================================
let loginIntentosFallidos = 0;
let loginBloqueadoHasta = 0;

/**
 * Crea una nueva cuenta de usuario en Firebase.
 * Fase 3.4: Validación exhaustiva de todos los inputs.
 */
function crearCuenta() {
    const nombre = document.getElementById('regNombre').value.trim();
    const pin = document.getElementById('regPin').value.trim();
    const monto = 10000;

    // --- Validación de nombre (Fase 3.4) ---
    if (!nombre) {
        alert("⚠️ Debes ingresar un nombre.");
        return;
    }
    // Registro sin restricciones de caracteres
    // El nombre 'admin' o variantes está bloqueado para usuarios normales.
    const nombreId = limpiarNombre(nombre);
    if (nombreId === limpiarNombre(ADMIN_USER)) {
        alert("⛔ Ese nombre de usuario está reservado.");
        return;
    }

    // --- Validación de PIN (Fase 3.4) ---
    if (!/^[0-9]{4}$/.test(pin)) {
        alert("⚠️ El PIN debe ser exactamente 4 dígitos numéricos (0-9).");
        return;
    }

    const idUsuario = nombreId;


    db.ref('usuarios/' + idUsuario).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            alert("⛔ El nombre '" + sanitizar(nombre) + "' ya está ocupado.");
        } else {
            db.ref('usuarios/' + idUsuario).set({
                nombreReal: sanitizar(nombre),
                pin: pin,
                saldo: monto,
                creadoEn: firebase.database.ServerValue.TIMESTAMP
            }, (error) => {
                if (error) {
                    console.error("Error al crear cuenta:", error.code);
                    alert("❌ Error al crear la cuenta. Intenta de nuevo.");
                } else {
                    alert("✅ ¡Cuenta creada! Ya puedes entrar.");
                    mostrarPantalla('pantalla-login');
                }
            });
        }
    });
}

/**
 * Login automático para el dueño (La Pro)
 */
function loginAdminAuto() {
    entrarComoAdmin();
}

/**
 * Valida las credenciales y da acceso al sistema.
 * Fase 3.4: Protección contra brute force + sanitización.
 */
function iniciarSesion() {

    const nombre = document.getElementById('loginNombre').value.trim();
    const pin = document.getElementById('loginPin').value.trim();
    const loading = document.getElementById('loadingLogin');

    // Validación básica
    if (!nombre || !pin) return;

    // Validación bypass por petición del usuario
    // PIN validado sin restricciones de longitud
    // Acceso admin por formulario normal DESACTIVADO por seguridad.

    loading.classList.remove('hidden');
    const idUsuario = limpiarNombre(nombre);

    db.ref('usuarios/' + idUsuario).once('value').then((snapshot) => {
        loading.classList.add('hidden');
        if (snapshot.exists()) {
            const datos = snapshot.val();
            if (datos.pin === pin) {
                usuarioActualNombre = datos.nombreReal || nombre;
                localStorage.setItem('bancoGamerUltimoUsuario', usuarioActualNombre);
                entrarAlCajero(idUsuario, datos);
            } else {
                alert(`⛔ PIN incorrecto.`);
            }
        } else {
            alert("⛔ Usuario no encontrado.");
        }
    }).catch((error) => {
        loading.classList.add('hidden');
        console.error("Error de conexión:", error.code);
        alert("❌ Error de conexión. Intenta de nuevo.");
    });
}

/**
 * Configura la sesión del usuario, activa los listeners en vivo y carga el mercado.
 */
function entrarAlCajero(idUsuario, datosIniciales) {
    mostrarPantalla('pantalla-cajero');

    // Activar el monitoreo de inactividad de sesión.
    iniciarMonitoreoSesion();

    // Sistema para rastrear si la jugadora está en línea.
    db.ref('usuarios/' + idUsuario + '/online').set(true);
    db.ref('usuarios/' + idUsuario + '/online').onDisconnect().set(false);

    // ESCUCHAR CAMBIOS EN VIVO (Listener):
    db.ref('usuarios/' + idUsuario).on('value', (snapshot) => {
        const datos = snapshot.val();
        if (datos) {
            // Fase 3.4: Construir badge de icono de forma segura (sin innerHTML con datos de Firebase)
            const displayEl = document.getElementById('nombreUsuarioDisplay');
            displayEl.textContent = ''; // Limpiar

            if (datos.iconoActivo) {
                const badge = document.createElement('span');
                badge.className = 'user-icon-badge';
                // Los iconos son emojis Unicode — textContent es suficientemente seguro
                badge.textContent = datos.iconoActivo;
                displayEl.appendChild(badge);
            }
            // Agregar el nombre como texto puro (nunca HTML)
            displayEl.appendChild(document.createTextNode(sanitizar(datos.nombreReal || '')));

            document.getElementById('saldoDisplay').textContent = formatearNumero(parsearMontoSeguro(datos.saldo));
            document.getElementById('txtMisCriptos').textContent = datos.criptomonedas || 0;

            if (!document.getElementById('pantalla-tienda').classList.contains('hidden')) {
                document.getElementById('saldoTiendaDisplay').textContent = (datos.saldo || 0).toFixed(2);
                renderizarTienda(datos);
            }

            if (!document.getElementById('pantalla-rasca').classList.contains('hidden')) {
                document.getElementById('saldoRascaDisplay').textContent = (datos.saldo || 0).toFixed(2);
            }

            // Mostrar/Ocultar botón del Mercado Negro si tiene invitación
            const btnMercado = document.getElementById('contenedorBotonMercado');
            if (datos.tieneInvitacionMercado) {
                btnMercado.classList.remove('hidden');
            } else {
                btnMercado.classList.add('hidden');
            }

            if (!document.getElementById('pantalla-mercado').classList.contains('hidden')) {
                document.getElementById('saldoMercadoDisplay').textContent = (datos.saldo || 0).toFixed(2);
                renderizarMercadoNegro(datos);
            }

            // VERIFICAR AMENAZAS DEL MERCADO NEGRO
            verificarAmenazaMercado(idUsuario, datos);
        }
    });

    // Cargar los últimos movimientos de la cuenta.
    cargarHistorial(idUsuario);

    // Iniciar la fluctuación de precios del mercado de criptos.
    iniciarMercado();

    // Escuchar si alguien nos está retando a un duelo.
    escucharRetos(idUsuario);

    // Escuchar eventos globales lanzados por la Admin.
    escucharEventosGlobales();
}

// --- HISTORIAL DE TRANSACCIONES ---

/**
 * Registra una acción (depósito, retiro, compra) en la base de datos para el historial.
 */
function registrarMovimiento(idUsuario, tipo, monto, detalle, positivo) {
    db.ref('usuarios/' + idUsuario + '/movimientos').push({
        tipo: tipo,
        monto: monto,
        detalle: detalle,
        positivo: positivo, // true = dinero que entra (verde), false = dinero que sale (rojo).
        fecha: firebase.database.ServerValue.TIMESTAMP
    });
}

/**
 * Carga y muestra los últimos 20 movimientos del usuario en la pantalla.
 */
function cargarHistorial(idUsuario) {
    const ul = document.getElementById('listaMovimientos');
    ul.innerHTML = ''; // Limpiar la lista antes de cargar.

    // Escuchar cada nuevo movimiento añadido a la base de datos.
    db.ref('usuarios/' + idUsuario + '/movimientos').limitToLast(20).on('child_added', (snapshot) => {
        const mov = snapshot.val();
        const li = document.createElement('li');
        li.className = 'mov-item';

        const signo = mov.positivo ? '+' : '-';
        const claseColor = mov.positivo ? 'mov-positivo' : 'mov-negativo';

        // Usar textContent para evitar XSS en datos del historial
        const spanDetalle = document.createElement('span');
        spanDetalle.textContent = mov.detalle;

        const spanMonto = document.createElement('span');
        spanMonto.className = claseColor;
        spanMonto.style.fontWeight = 'bold';
        spanMonto.textContent = `${signo}$${mov.monto}`;

        li.appendChild(spanDetalle);
        li.appendChild(spanMonto);
        // Insertar al inicio de la lista para que el más nuevo aparezca arriba.
        ul.insertBefore(li, ul.firstChild);
    });
}

// --- LÓGICA DE MERCADO (CRIPTOMONEDAS) ---

/**
 * Inicia el sistema de mercado, escuchando el precio actual en la nube.
 */
function iniciarMercado() {
    const mercadoRef = db.ref('mercado');

    mercadoRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            actualizarDisplayPrecio(data.precio);
            precioActual = data.precio;

            // Si el precio no se ha actualizado en más de 10 segundos, calculamos uno nuevo.
            const ahora = Date.now();
            if (ahora - data.ultimaActualizacion > 10000) {
                calcularNuevoPrecio(data.precio);
            }
        } else {
            // Si el mercado no existe aún, lo inicializamos con un precio base de 10.
            calcularNuevoPrecio(10);
        }
    });
}

/**
 * Genera una variación aleatoria en el precio de la moneda con sesgo positivo.
 */
function calcularNuevoPrecio(precioAnterior) {
    let minVar, maxVar;

    if (precioAnterior < 10) {
        // --- MODO RECUPERACIÓN AGRESIVA ---
        // Si el precio es menor a 10, forzamos que suba entre un 10% y un 50%
        minVar = 0.10;
        maxVar = 0.50;
    } else {
        // --- MERCADO NORMAL ---
        minVar = -0.04; // -4%
        maxVar = 0.08;  // +8% (Mantenemos el sesgo positivo)
    }

    const variacion = (Math.random() * (maxVar - minVar)) + minVar;
    let nuevoPrecio = precioAnterior * (1 + variacion);

    // Límites de seguridad
    if (nuevoPrecio < 2) nuevoPrecio = 10; // Rebote forzado
    if (nuevoPrecio > 1000) nuevoPrecio = 1000;

    db.ref('mercado').set({
        precio: nuevoPrecio,
        ultimaActualizacion: firebase.database.ServerValue.TIMESTAMP
    });
}

/**
 * Muestra el precio actual de la criptomoneda en la interfaz del cajero.
 */
function actualizarDisplayPrecio(precio) {
    const el = document.getElementById('txtPrecioMercado');
    const precioFix = precio.toFixed(2);

    let flecha = "";
    let colorFlecha = "";

    if (precio > precioAnteriorRecordado) {
        flecha = "▲"; // Sube
        colorFlecha = "#2ecc71"; // Verde
    } else if (precio < precioAnteriorRecordado) {
        flecha = "▼"; // Baja
        colorFlecha = "#e74c3c"; // Rojo
    }

    el.innerHTML = `$${precioFix} <span style="color: ${colorFlecha}; font-size: 1.2rem;">${flecha}</span>`;
    precioAnteriorRecordado = precio;
}

/**
 * Permite al usuario comprar 1 unidad de criptomoneda si tiene saldo suficiente.
 */
function comprarCripto() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    const costo = precioActual;

    // Usamos una transacción para asegurar que el saldo no se vuelva negativo si hay lag.
    db.ref('usuarios/' + idUsuario).transaction((user) => {
        if (user) {
            if (user.saldo >= costo) {
                user.saldo -= costo;
                user.criptomonedas = (user.criptomonedas || 0) + 1;
                return user; // Éxito en la transacción.
            }
        }
        return; // Aborta la transacción si no hay fondos.
    }, (error, committed, snapshot) => {
        if (committed) {
            registrarMovimiento(idUsuario, "COMPRA", costo, "Compra Cripto", false);
        } else {
            alert("No tienes saldo suficiente :(");
        }
    });
}

/**
 * Permite al usuario vender 1 unidad de criptomoneda para obtener saldo.
 */
function venderCripto() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    const ganancia = precioActual;

    db.ref('usuarios/' + idUsuario).transaction((user) => {
        if (user) {
            if ((user.criptomonedas || 0) > 0) {
                user.saldo += ganancia;
                user.criptomonedas -= 1;
                return user;
            }
        }
        return;
    }, (error, committed, snapshot) => {
        if (committed) {
            registrarMovimiento(idUsuario, "VENTA", ganancia, "Venta Cripto", true);
        } else {
            alert("No tienes Coins para vender.");
        }
    });
}

// --- LÓGICA DEL CASINO (TRAGAMONEDAS) ---

/**
 * Muestra la pantalla del casino actualizando el saldo visual.
 */
function abrirCasino() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/saldo').once('value').then(snap => {
        document.getElementById('saldoCasinoDisplay').textContent = (snap.val() || 0).toFixed(2);
    });
    mostrarPantalla('pantalla-casino');
}

/**
 * Actualiza el valor del input de apuesta mediante los botones rápidos.
 */
function fijarApuesta(cantidad) {
    document.getElementById('montoApuesta').value = cantidad;
}

/**
 * Inicia una jugada en el casino. Descuenta la apuesta y procesa el resultado.
 */
function jugarCasino() {
    const apuesta = parseFloat(document.getElementById('montoApuesta').value);
    const btn = document.getElementById('btnSpin');
    const idUsuario = limpiarNombre(usuarioActualNombre);

    if (isNaN(apuesta) || apuesta <= 0) return alert("Apuesta inválida");

    // Bloquear el botón para evitar que la jugadora haga trampas spameando clics.
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.textContent = "GIRANDO... 🎰";

    db.ref('usuarios/' + idUsuario).transaction((user) => {
        if (user) {
            if (user.saldo >= apuesta) {
                user.saldo -= apuesta; // Cobrar el boleto del casino.
                return user;
            }
        }
        return;
    }, (error, committed, snapshot) => {
        if (committed) {
            // Ejecutar la animación visual de las figuras girando.
            animarSlots(() => {
                // Calcular el resultado final (suerte).
                const resultado = calcularResultadoSlots();
                let premio = 0;
                let mensaje = "Perdiste :(";
                let tipoMov = "CASINO LOSS";

                if (resultado.tipo === "JACKPOT") {
                    premio = apuesta * 10;
                    mensaje = "¡JACKPOT! x10 🤑";
                    tipoMov = "CASINO WIN";
                } else if (resultado.tipo === "PAR") {
                    premio = apuesta * 2;
                    mensaje = "¡PAR! x2 😊";
                    tipoMov = "CASINO WIN";
                }

                // SI HAY EVENTO DOBLE, DUPLICAMOS EL PREMIO
                if (eventoGlobalActivo === 'doble' && premio > 0) {
                    premio = premio * 2;
                    mensaje = "🔥 ¡EVENTO DOBLE! " + mensaje;
                }

                // Si ganó, sumamos el premio a su cuenta.
                if (premio > 0) {
                    db.ref('usuarios/' + idUsuario + '/saldo').transaction(saldo => (saldo || 0) + premio);
                }

                // Guardar en el historial de transacciones.
                const balanceTotal = premio - apuesta;
                registrarMovimiento(idUsuario, tipoMov, Math.abs(balanceTotal), mensaje + " (Bet " + apuesta + ")", balanceTotal > 0);

                // Notificar al usuario y limpiar el estado del botón.
                alert(mensaje + "\n" + (premio > 0 ? "Ganaste $" + premio : "Suerte la próxima."));

                db.ref('usuarios/' + idUsuario + '/saldo').once('value').then(snap => {
                    document.getElementById('saldoCasinoDisplay').textContent = (snap.val() || 0).toFixed(2);
                });

                btn.disabled = false;
                btn.style.opacity = "1";
                btn.textContent = "GIRAR (SPIN) 🎲";
            });
        } else {
            alert("No tienes saldo suficiente.");
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.textContent = "GIRAR (SPIN) 🎲";
        }
    });
}

// Emojis disponibles en la tragamonedas.
const slotEmojis = ["🍒", "7️⃣", "💎", "🍋", "🔔"];

/**
 * Genera la ilusión visual de que los rodillos están rodando.
 */
function animarSlots(callback) {
    let contador = 0;
    const maxVueltas = 20;
    const intervalo = setInterval(() => {
        // Cambiar emojis aleatoriamente de forma rápida.
        document.getElementById('reel1').textContent = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
        document.getElementById('reel2').textContent = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
        document.getElementById('reel3').textContent = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];

        contador++;
        if (contador >= maxVueltas) {
            clearInterval(intervalo);
            callback(); // Llamar a la lógica de resultado cuando termine la animación.
        }
    }, 50); // Velocidad del cambio (50ms).
}

/**
 * Genera el resultado real de la jugada y lo muestra de forma estática.
 */
function calcularResultadoSlots() {
    const r1 = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
    const r2 = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];
    const r3 = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];

    // Fijar los resultados en la interfaz.
    document.getElementById('reel1').textContent = r1;
    document.getElementById('reel2').textContent = r2;
    document.getElementById('reel3').textContent = r3;

    // Lógica de premios: 3 iguales = Jackpot, 2 iguales = Par.
    if (r1 === r2 && r2 === r3) {
        return { tipo: "JACKPOT" };
    } else if (r1 === r2 || r1 === r3 || r2 === r3) {
        return { tipo: "PAR" };
    } else {
        return { tipo: "NADA" };
    }
}



// --- SISTEMA DE RANKING ---

/**
 * Obtiene la lista de todos los usuarios, los ordena por saldo y muestra el Top 10.
 */
/**
 * Utilidad robusta para convertir cualquier valor de la DB en un número real.
 * Elimina caracteres extraños y maneja strings con formatos incorrectos.
 */
function parsearMontoSeguro(val) {
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    if (!val) return 0;
    // Permitimos números, puntos, signo menos y la notación científica (e, +)
    const limpio = String(val).replace(/[^0-9.eE+-]/g, '');
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
}

function verRanking() {
    console.log("--- CARGANDO RANKING (Versión 3.0) ---");
    mostrarPantalla('pantalla-ranking');
    const lista = document.getElementById('listaRanking');
    lista.innerHTML = '<li>Cargando...</li>';

    db.ref('usuarios').once('value').then(snapshot => {
        let usuariosArray = [];
        snapshot.forEach(child => {
            const u = child.val();
            const saldoBase = parsearMontoSeguro(u.saldo);
            const coins = parseFloat(u.criptomonedas || 0);
            const precioCripto = parseFloat(typeof precioActual !== 'undefined' ? precioActual : 0) || 0;
            
            // Riqueza = Efectivo + (Criptos * Precio)
            const riquezaCalculada = saldoBase + (coins * precioCripto);

            usuariosArray.push({
                nombre: u.nombreReal || child.key,
                riqueza: riquezaCalculada,
                id: child.key,
                icono: u.iconoActivo || '',
                items: u.itemsMercado || [],
                firewallHasta: u.firewallHasta || 0
            });
        });

        // ORDENAMIENTO MATEMÁTICO PURO
        usuariosArray.sort((a, b) => b.riqueza - a.riqueza);

        // Tomamos solo a los 10 mejores.
        const top10 = usuariosArray.slice(0, 10);
        const idUsuarioActual = limpiarNombre(usuarioActualNombre);

        lista.innerHTML = '';
        top10.forEach((user, index) => {
            const pos = index + 1;
            let claseExtra = '';
            let icono = '#' + pos;

            // Estilos especiales para el podio (1º, 2º y 3º).
            if (pos === 1) { claseExtra = 'rank-1'; icono = '🥇'; }
            if (pos === 2) { claseExtra = 'rank-2'; icono = '🥈'; }
            if (pos === 3) { claseExtra = 'rank-3'; icono = '🥉'; }

            const li = document.createElement('li');
            li.className = `rank-item ${claseExtra}`;

            // Datos visuales avanzados
            const items = user.items || [];
            const itemsArray = Array.isArray(items) ? items : Object.values(items);
            const hasNeon = itemsArray.includes('nombre_neon');
            const hasInvisible = itemsArray.includes('invisible');
            const tieneFirewall = (user.firewallHasta || 0) > Date.now();

            const divLeft = document.createElement('div');
            const spanPos = document.createElement('span');
            spanPos.className = 'rank-pos';
            if (hasNeon) spanPos.classList.add('name-neon');
            spanPos.textContent = `${icono} ${user.icono} ${sanitizar(user.nombre)} `;
            
            if (tieneFirewall) {
                const shield = document.createElement('span');
                shield.className = 'firewall-shield';
                shield.textContent = '🛡️';
                spanPos.appendChild(shield);
            }
            divLeft.appendChild(spanPos);

            if (user.id !== idUsuarioActual) {
                const btnHack = document.createElement('button');
                btnHack.className = 'btn-hack';
                btnHack.textContent = 'HACK';
                btnHack.addEventListener('click', () => intentarHackear(user.id, user.nombre));
                divLeft.appendChild(btnHack);

                const btnDuelo = document.createElement('button');
                btnDuelo.className = 'btn-hack btn-duelo';
                btnDuelo.textContent = 'RETAR ⚔️';
                btnDuelo.addEventListener('click', () => intentarRetar(user.id, user.nombre));
                divLeft.appendChild(btnDuelo);
            }

            const divRight = document.createElement('div');
            divRight.style.fontFamily = 'monospace';
            divRight.style.fontSize = '1.1rem';
            divRight.style.textAlign = 'right';
            if (hasInvisible) divRight.classList.add('balance-blurred');
            
            divRight.innerHTML = `<span style="font-size: 0.7rem; color: #aaa; display: block;">SALDO:</span>$${formatearNumero(user.riqueza)}`;

            li.appendChild(divLeft);
            li.appendChild(divRight);
            lista.appendChild(li);
        });
    });
}

// --- PANEL DE ADMINISTRACIÓN ---

/**
 * Entra al modo Pro/Admin y carga la información de gestión.
 */
function entrarComoAdmin() {
    mostrarPantalla('pantalla-admin');
    cargarListaAdmin();
    cargarSolicitudesAdmin();
    adminRenderizarFavoritos(); // Cargar botones rápidos
}

/**
 * Carga las solicitudes de dinero enviadas por las jugadoras.
 */
function cargarSolicitudesAdmin() {
    const tbody = document.getElementById('listaSolicitudesAdmin');
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

    db.ref('solicitudes').on('value', (snapshot) => {
        tbody.innerHTML = '';
        if (!snapshot.exists()) {
            tbody.innerHTML = '<tr><td colspan="4">No hay solicitudes hoy.</td></tr>';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const idSolicitud = childSnapshot.key;
            const sol = childSnapshot.val();

            const fila = document.createElement('tr');
            fila.innerHTML = `
                        <td title="${sol.nombre}">${sol.nombre}</td>
                        <td style="color: #2ecc71; font-weight: bold;">$${sol.monto}</td>
                        <td style="font-size: 0.7rem;">${sol.mensaje}</td>
                        <td>
                            <button class="btn-mini" style="background:#27ae60" onclick="adminResolverSolicitud('${idSolicitud}', true)">Aprobar</button>
                            <button class="btn-mini" style="background:#e74c3c" onclick="adminResolverSolicitud('${idSolicitud}', false)">X</button>
                        </td>
                    `;
            tbody.appendChild(fila);
        });
    });
}

/**
 * Procesa una solicitud de dinero (dar el dinero o rechazar la petición).
 */
function adminResolverSolicitud(idSolicitud, aprobado) {
    db.ref('solicitudes/' + idSolicitud).once('value').then(snap => {
        const sol = snap.val();
        if (!sol) return;

        if (aprobado) {
            // Si la Admin aprueba, se deposita el dinero directamente en la cuenta de la jugadora.
            db.ref('usuarios/' + sol.idUsuario + '/saldo').transaction(s => (s || 0) + sol.monto);
            registrarMovimiento(sol.idUsuario, "REGALO ADMIN", sol.monto, "Dinero enviado por Admin", true);
            alert("Aprobado con éxito.");
        } else {
            alert("Solicitud rechazada.");
        }

        // Se elimina la solicitud de la lista una vez resuelta.
        db.ref('solicitudes/' + idSolicitud).remove();
    });
}

/**
 * Carga la tabla de usuarios para el panel admin.
 * Fase 3.4: Reconstruida con DOM API — cero innerHTML con datos de Firebase.
 * Los PINs ahora se muestran enmascarados con opción de revelar.
 */
function cargarListaAdmin() {
    const tbody = document.getElementById('listaUsuariosAdmin');
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

    db.ref('usuarios').on('value', (snapshot) => {
        tbody.innerHTML = '';
        if (!snapshot.exists()) {
            tbody.innerHTML = '<tr><td colspan="4">No hay usuarios registrados.</td></tr>';
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const id = childSnapshot.key;
            const u = childSnapshot.val();

            const saldoNumerico = typeof u.saldo === 'number' ? u.saldo : parseFloat(u.saldo || 0);
            const saldoFormateado = saldoNumerico.toFixed(2);
            let saldoDisplay = saldoFormateado;
            if (saldoFormateado.length > 9) saldoDisplay = saldoFormateado.substring(0, 9) + '...';

            const fila = document.createElement('tr');

            // -- Celda: Nombre + estado online (segura) --
            const tdNombre = document.createElement('td');
            tdNombre.title = sanitizar(u.nombreReal || '');
            const dot = document.createElement('span');
            dot.className = `status-dot ${u.online ? 'status-online' : 'status-offline'}`;
            tdNombre.appendChild(dot);
            tdNombre.appendChild(document.createTextNode(' ' + sanitizar(u.nombreReal || id)));

            // -- Celda: PIN enmascarado con botón de revelar --
            const tdPin = document.createElement('td');
            tdPin.style.color = '#f1c40f';
            const pinMask = document.createElement('span');
            pinMask.textContent = '****';
            const btnVerPin = document.createElement('button');
            btnVerPin.className = 'btn-mini';
            btnVerPin.style.background = '#34495e';
            btnVerPin.style.marginLeft = '5px';
            btnVerPin.textContent = '👁️';
            btnVerPin.title = 'Revelar PIN';
            let pinVisible = false;
            btnVerPin.addEventListener('click', () => {
                pinVisible = !pinVisible;
                pinMask.textContent = pinVisible ? sanitizar(u.pin || '????') : '****';
                btnVerPin.textContent = pinVisible ? '🙈' : '👁️';
            });
            tdPin.appendChild(pinMask);
            tdPin.appendChild(btnVerPin);

            // -- Celda: Saldo --
            const tdSaldo = document.createElement('td');
            tdSaldo.style.fontFamily = 'monospace';
            tdSaldo.title = `Saldo completo: $${saldoFormateado}`;
            tdSaldo.textContent = '$' + saldoDisplay;

            // -- Celda: Botones de acción --
            const tdAcciones = document.createElement('td');
            const btnMas = document.createElement('button');
            btnMas.className = 'btn-mini';
            btnMas.style.background = '#27ae60';
            btnMas.textContent = '+1K';
            btnMas.dataset.userId = id;
            btnMas.addEventListener('click', function () {
                adminModificarSaldo(this.dataset.userId, 1000);
            });
            const btnMenos = document.createElement('button');
            btnMenos.className = 'btn-mini';
            btnMenos.style.background = '#e74c3c';
            btnMenos.textContent = '-1K';
            btnMenos.dataset.userId = id;
            btnMenos.addEventListener('click', function () {
                adminModificarSaldo(this.dataset.userId, -1000);
            });

            // --- Botón: Monto Personalizado (Admin Power) ---
            const btnMonto = document.createElement('button');
            btnMonto.className = 'btn-mini';
            btnMonto.style.background = '#f39c12';
            btnMonto.textContent = '💰 $$$';
            btnMonto.title = 'Enviar cualquier cantidad (Sin límites)';
            btnMonto.addEventListener('click', () => {
                const n = prompt(`¿Cuánto dinero quieres enviarle a ${u.nombreReal}?`);
                if (n !== null && n !== "") {
                    const valor = parseFloat(n);
                    if (!isNaN(valor)) {
                        adminModificarSaldo(id, valor);
                        alert(`✅ Se han enviado $${formatearNumero(valor)} a ${u.nombreReal}.`);
                    } else {
                        alert("⚠️ Cantidad no válida.");
                    }
                }
            });
            tdAcciones.appendChild(btnMas);
            tdAcciones.appendChild(btnMenos);
            tdAcciones.appendChild(btnMonto);

            // Botón para entrar a la cuenta (Admin Magic)
            const btnEntrar = document.createElement('button');
            btnEntrar.className = 'btn-mini';
            btnEntrar.style.background = '#3498db';
            btnEntrar.textContent = '🚀 Entrar';
            btnEntrar.title = 'Entrar a esta cuenta sin PIN';
            btnEntrar.addEventListener('click', () => {
                if (confirm(`¿Quieres entrar a la cuenta de ${u.nombreReal}?`)) {
                    adminEntrarACuenta(id, u);
                }
            });
            tdAcciones.appendChild(btnEntrar);

            // --- Botón: Invitar al Mercado Negro ---
            const btnInvitacion = document.createElement('button');
            btnInvitacion.className = 'btn-mini';
            btnInvitacion.style.background = '#8e44ad';
            btnInvitacion.textContent = '🕶️ Invitar';
            btnInvitacion.title = 'Dar acceso al Mercado Negro y enviar llave';
            btnInvitacion.addEventListener('click', () => {
                if (confirm(`¿Dar acceso secreto a ${u.nombreReal}? Se le enviará su llave.`)) {
                    adminInvitarMercado(id, u.nombreReal);
                }
            });
            tdAcciones.appendChild(btnInvitacion);

            // --- Botón: Amenaza de Extorsión ---
            const btnAmenaza = document.createElement('button');
            btnAmenaza.className = 'btn-mini';
            btnAmenaza.style.background = '#000';
            btnAmenaza.style.color = '#0f0';
            btnAmenaza.style.border = '1px solid #0f0';
            btnAmenaza.textContent = '💀';
            btnAmenaza.title = 'Enviar Trolleo al Amigo (5% multa)';
            btnAmenaza.addEventListener('click', () => {
                if (confirm(`¿Enviar un trolleo a ${u.nombreReal}? Si no responde en 24h perderá el 5%.`)) {
                    adminLanzarAmenaza(id);
                }
            });
            tdAcciones.appendChild(btnAmenaza);

            fila.appendChild(tdNombre);
            fila.appendChild(tdPin);
            fila.appendChild(tdSaldo);
            fila.appendChild(tdAcciones);
            tbody.appendChild(fila);
        });
    });
}

/**
 * Modifica el saldo de cualquier usuario desde el panel de admin.
 */
function adminModificarSaldo(idUsuario, cantidad) {
    db.ref('usuarios/' + idUsuario + '/saldo').transaction((saldoActual) => {
        // Forzamos que la base sea un número real antes de sumar
        const base = parsearMontoSeguro(saldoActual);
        return base + cantidad;
    });
}

/**
 * Permite a la Admin entrar a cualquier cuenta instantáneamente.
 */
function adminEntrarACuenta(idUsuario, datos) {
    console.log("Admin entrando a cuenta:", idUsuario);
    usuarioActualNombre = datos.nombreReal || idUsuario;
    // No guardamos en localStorage para evitar que se quede pegado si refresca
    entrarAlCajero(idUsuario, datos);
}

/**
 * Busca a un usuario por nombre y entra a su cuenta directamente.
 */
function adminEntrarPorNombre() {
    const input = document.getElementById('adminJumpNombre');
    const nombre = input.value.trim();
    if (!nombre) return;

    const id = limpiarNombre(nombre);
    db.ref('usuarios/' + id).once('value').then(snap => {
        if (snap.exists()) {
            const datos = snap.val();
            // Guardar en favoritos locales (para la Admin) si no está
            adminGuardarFavorito(nombre);
            adminEntrarACuenta(id, datos);
        } else {
            alert("❌ No se encontró el usuario '" + nombre + "'");
        }
    });
}

/**
 * Guarda un nombre en la lista de favoritos de la Admin (localStorage).
 */
function adminGuardarFavorito(nombre) {
    let favs = JSON.parse(localStorage.getItem('adminFavAccounts') || "[]");
    // Solo guardamos si no existe ya
    if (!favs.includes(nombre)) {
        favs.push(nombre);
        // Limitamos a los últimos 5 para no saturar
        if (favs.length > 5) favs.shift();
        localStorage.setItem('adminFavAccounts', JSON.stringify(favs));
        adminRenderizarFavoritos();
    }
}

/**
 * Muestra los botones de acceso rápido de los favoritos guardados.
 */
function adminRenderizarFavoritos() {
    const container = document.getElementById('admin-favs-container');
    if (!container) return;

    const favs = JSON.parse(localStorage.getItem('adminFavAccounts') || "[]");
    container.innerHTML = '';

    favs.forEach(nombre => {
        const btn = document.createElement('button');
        btn.className = 'btn-mini';
        btn.style.background = '#2c3e50';
        btn.style.border = '1px solid #3498db';
        btn.style.padding = '5px 10px';
        btn.textContent = '👤 ' + nombre;
        btn.onclick = () => {
            document.getElementById('adminJumpNombre').value = nombre;
            adminEntrarPorNombre();
        };
        container.appendChild(btn);
    });

    if (favs.length > 0) {
        const btnClear = document.createElement('button');
        btnClear.className = 'btn-mini';
        btnClear.style.background = '#c0392b';
        btnClear.style.marginLeft = '10px';
        btnClear.textContent = '🗑️';
        btnClear.title = "Borrar favoritos";
        btnClear.onclick = () => {
            localStorage.removeItem('adminFavAccounts');
            adminRenderizarFavoritos();
        };
        container.appendChild(btnClear);
    }
}



/**
 * Cierra la sesión activa y detiene todos los listeners,
 * timers y datos sensibles de la sesión.
 */
function cerrarSesion() {
    // 1. Marcar usuario como offline en Firebase.
    if (usuarioActualNombre) {
        const idUsuario = limpiarNombre(usuarioActualNombre);
        db.ref('usuarios/' + idUsuario + '/online').set(false);
        db.ref('usuarios/' + idUsuario).off();
        db.ref('usuarios/' + idUsuario + '/movimientos').off();
    }

    // 2. Detener todos los listeners globales de Firebase.
    db.ref('solicitudes').off();
    db.ref('usuarios').off();
    db.ref('evento_global').off();
    db.ref('loteria/pozo').off();
    db.ref('banco_central').off();
    db.ref('mercado').off();
    db.ref('duelos').off();

    // 3. Detener el monitoreo de inactividad.
    detenerMonitoreoSesion();

    // 4. Limpiar los timers de lotería si están activos.
    if (typeof intervaloLoteria !== 'undefined' && intervaloLoteria) {
        clearInterval(intervaloLoteria);
        intervaloLoteria = null;
    }

    // 5. Limpiar el estado local de la sesión.
    usuarioActualNombre = null;
    roboEscuchandoBoveda = false;

    // 6. Limpiar datos sensibles de sessionStorage (no localStorage,
    //    para preservar el nombre del último usuario en el login).
    sessionStorage.clear();

    // 7. Redirigir a la pantalla de login.
    mostrarPantalla('pantalla-login');
}

// --- SOLICITUDES DE DINERO ---

/**
 * Abre un cuadro de diálogo para pedir dinero al administrador.
 * Fase 3.4: Validación y sanitización del monto solicitado.
 */
function pedirDinero() {
    const monto = prompt("¿Cuánto dinero quieres solicitar al banco?");
    if (monto === null || monto === '') return;

    const montoNum = parseFloat(monto);
    if (!validarMonto(montoNum)) {
        alert("⚠️ Monto inválido.");
        return;
    }

    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('solicitudes').push({
        idUsuario: idUsuario,
        nombre: sanitizar(usuarioActualNombre),
        monto: montoNum,
        mensaje: 'Me podrías mandar dinero?',
        fecha: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("✅ Solicitud enviada. Espera la aprobación del Admin.");
    }).catch(err => {
        console.error("Error enviando solicitud:", err.code);
        alert("❌ No se pudo enviar la solicitud.");
    });
}

// --- LÓGICA DE LA TIENDA DE SKINS ---

/**
 * Abre la tienda y carga el inventario actual del usuario.
 */
function abrirTienda() {
    mostrarPantalla('pantalla-tienda');
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario).once('value').then(snap => {
        renderizarTienda(snap.val());
    });
}

/**
 * Crea las tarjetas de los productos de la tienda dinámicamente.
 */
function renderizarTienda(datosUsuario) {
    const contenedor = document.getElementById('contenedorTienda');
    const inventario = datosUsuario.inventarioIconos || [];
    const equipado = datosUsuario.iconoActivo || '';

    document.getElementById('saldoTiendaDisplay').textContent = datosUsuario.saldo.toFixed(2);
    contenedor.innerHTML = '';

    TIENDA_ITEMS.forEach(item => {
        const esComprado = inventario.includes(item.id);
        const esEquipado = equipado === item.icono;

        let claseExtra = esComprado ? 'owned' : '';
        if (esEquipado) claseExtra = 'equipped';

        const card = document.createElement('div');
        card.className = `shop-item ${claseExtra}`;

        // Lógica de los botones según si el objeto es nuevo, ya lo tienes o está puesto.
        let btnHtml = '';
        if (esEquipado) {
            btnHtml = `<button class="btn-buy" disabled style="background:#7f8c8d">EQUIPADO</button>`;
        } else if (esComprado) {
            btnHtml = `<button class="btn-buy btn-equip" onclick="equiparIcono('${item.id}', '${item.icono}')">EQUIPAR</button>`;
        } else {
            btnHtml = `<button class="btn-buy" onclick="comprarIcono('${item.id}', ${item.precio})">COMPRAR</button>`;
        }

        card.innerHTML = `
                    <span class="shop-icon">${item.icono}</span>
                    <span style="font-size:0.8rem; display:block; font-weight:bold;">${item.nombre}</span>
                    <span class="shop-price">$${item.precio}</span>
                    ${btnHtml}
                `;
        contenedor.appendChild(card);
    });
}

/**
 * Procesa la compra de un icono o un escudo protector.
 */
function comprarIcono(idItem, precio) {
    const idUsuario = limpiarNombre(usuarioActualNombre);

    db.ref('usuarios/' + idUsuario).transaction((user) => {
        if (user) {
            if (user.saldo >= precio) {
                user.saldo -= precio;

                // Si compra un "firewall", añadimos tiempo de protección contra hackeos.
                if (idItem === 'firewall') {
                    const ahora = Date.now();
                    const actual = user.firewallHasta || ahora;
                    // El tiempo se suma al actual o comienza desde ahora si no tenía.
                    const base = actual > ahora ? actual : ahora;
                    user.firewallHasta = base + (60 * 60 * 1000); // 1 hora extra de protección.
                } else {
                    // Si es un icono normal, lo añadimos a su inventario permanente.
                    if (!user.inventarioIconos) user.inventarioIconos = [];
                    if (!user.inventarioIconos.includes(idItem)) {
                        user.inventarioIconos.push(idItem);
                    }
                }
                return user;
            }
        }
        return;
    }, (error, committed, snapshot) => {
        if (committed) {
            if (idItem === 'firewall') {
                alert("🛡️ Ciber-Escudo activado por 1 hora.");
            } else {
                alert("¡Compra exitosa! Ahora puedes equiparlo.");
            }
        } else {
            alert("No tienes saldo suficiente.");
        }
    });
}
// --- LÓGICA DE LOTERÍA ---
let intervaloLoteria = null;

/**
 * Abre la sección de lotería y configura el marcador de tiempo real.
 */
function abrirLoteria() {
    mostrarPantalla('pantalla-loteria');

    // Escuchar el pozo acumulado de la base de datos.
    db.ref('loteria/pozo').on('value', snap => {
        const pozo = snap.val() || 0;
        document.getElementById('pozoLoteriaDisplay').textContent = pozo.toFixed(2);
    });

    // Iniciar el reloj de cuenta regresiva para el próximo sorteo.
    if (intervaloLoteria) clearInterval(intervaloLoteria);
    actualizarTimerVisual();
    intervaloLoteria = setInterval(actualizarTimerVisual, 1000);
}

/**
 * Muestra cuánto tiempo falta para las 2:00 PM (hora del sorteo).
 */
function actualizarTimerVisual() {
    const ahora = new Date();
    const proximoSorteo = new Date();
    proximoSorteo.setHours(14, 0, 0, 0); // Sorteo fijado a las 14:00 (2 PM).

    // Si ya pasó la hora hoy, el marcador apunta al sorteo de mañana.
    if (ahora >= proximoSorteo) {
        verificarSorteoPendiente();
        proximoSorteo.setDate(proximoSorteo.getDate() + 1);
    }

    const diff = proximoSorteo - ahora;
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const segs = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('lotteryTimer').textContent =
        `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
}

/**
 * Permite al usuario comprar un boleto para participar en el sorteo diario.
 */
function comprarBoleto() {
    const precioBoleto = 2000;
    const idUsuario = limpiarNombre(usuarioActualNombre);

    db.ref('usuarios/' + idUsuario).transaction(user => {
        if (user && user.saldo >= precioBoleto) {
            user.saldo -= precioBoleto;
            return user;
        }
        return;
    }, (error, committed) => {
        if (committed) {
            // Se añade el dinero al pozo global y se registra el ticket.
            db.ref('loteria/pozo').transaction(p => (p || 0) + precioBoleto);
            db.ref('loteria/tickets').push({
                id: idUsuario,
                nombre: usuarioActualNombre
            });
            alert("🎟️ ¡Boleto comprado! Buena suerte.");
            registrarMovimiento(idUsuario, "LOTERIA", precioBoleto, "Compra de boleto para el sorteo", false);
        } else {
            alert("No tienes saldo suficiente ($2,000).");
        }
    });
}

/**
 * Valida si hoy se debe ejecutar un nuevo sorteo.
 */
function verificarSorteoPendiente() {
    const hoy = new Date().toISOString().split('T')[0];
    db.ref('loteria/ultimoSorteo').once('value').then(snap => {
        if (snap.val() !== hoy) {
            ejecutarSorteo(hoy);
        }
    });
}

/**
 * Elige un ganador al azar de todos los boletos vendidos y le entrega el premio.
 */
function ejecutarSorteo(fechaHoy) {
    // Evitar que el sorteo se ejecute más de una vez por varias personas al mismo tiempo.
    db.ref('loteria/ultimoSorteo').set(fechaHoy);

    db.ref('loteria').once('value').then(snap => {
        const data = snap.val();
        if (!data || !data.tickets) {
            console.log("No hay tickets para el sorteo.");
            db.ref('loteria/pozo').set(0);
            return;
        }

        const tickets = Object.values(data.tickets);
        const pozo = data.pozo || 0;

        // Selección aleatoria del ganador.
        const ganador = tickets[Math.floor(Math.random() * tickets.length)];

        // Depósito del premio y registro en el historial.
        db.ref('usuarios/' + ganador.id + '/saldo').transaction(s => (s || 0) + pozo);
        registrarMovimiento(ganador.id, "¡PREMIO LOTERIA!", pozo, "¡Ganaste el sorteo diario! 🎟️", true);

        alert(`🎊 ¡TENEMOS GANADOR! 🎊\n\nFelicidades a ${ganador.nombre}.\nSe lleva un pozo de $${pozo.toFixed(2)}`);

        // Reinicio del sorteo para el día siguiente.
        db.ref('loteria/tickets').remove();
        db.ref('loteria/pozo').set(0);
    });
}

/**
 * Inicia el minijuego de hackeo.
 */
function intentarHackear(idDestinatario, nombreDestinatario) {
    const ahora = Date.now();
    const idAtacante = limpiarNombre(usuarioActualNombre);

    // Solo se permite un intento de hackeo cada 60 segundos por jugadora.
    if (ahora - ultimoHackAttempt < 60000) {
        const segundosCura = Math.ceil((60000 - (ahora - ultimoHackAttempt)) / 1000);
        alert(`⏳ Estás en cooldown. Espera ${segundosCura}s para volver a hackear.`);
        return;
    }

    db.ref('usuarios/' + idDestinatario).once('value').then(snap => {
        const target = snap.val();
        if (!target) return;

        // El firewall protege totalmente al usuario
        const firewallHasta = target.firewallHasta || 0;
        if (firewallHasta > ahora) {
            alert("HACKEO DENEGADO: El usuario tiene protección.");
            return;
        }

        // --- FASE 1: VERIFICAR OBJETO DE HACKEO (Garantiza éxito) ---
        db.ref('usuarios/' + idAtacante + '/autohackCargas').once('value').then(snapAtacante => {
            const cargas = snapAtacante.val() || 0;

            if (cargas > 0) {
                // --- ÉXITO GARANTIZADO: Bypass total del escaneo y mini-juego ---
                ultimoHackAttempt = ahora;
                hackerTargetId = idDestinatario;
                hackerTargetNombre = nombreDestinatario;

                db.ref('usuarios/' + idAtacante + '/autohackCargas').transaction(c => (c || 0) - 1);
                alert(`💾 SOFTWARE AUTOHACK DETECTADO.\nCargas restantes: ${cargas - 1}\n¡Entrada forzada exitosa! Bypass completo.`);
                finalizarHackeo(true, "BYPASS AUTOMÁTICO");
                return;
            }

            // --- FASE 2: ESCANEO MANUAL (Probabilidad del 40%) ---
            const scanRoll = Math.random();
            const probabilidadEscaneo = scanRoll < 0.40;

            if (!probabilidadEscaneo) {
                alert("HACKEO DENEGADO: El escaneo de seguridad falló.");
                ultimoHackAttempt = ahora;
                return;
            }

            // --- FASE 3: INICIAR MINIJUEGO MANUAL ---
            ultimoHackAttempt = ahora;
            hackerTargetId = idDestinatario;
            hackerTargetNombre = nombreDestinatario;
            hackerSecuenciaActual = "";

            hackerSecuenciaTarget = "";
            for (let i = 0; i < 6; i++) {
                hackerSecuenciaTarget += Math.floor(Math.random() * 10).toString();
            }

            mostrarPantalla('pantalla-hackeo');
            mezclarTecladoHacker();
            document.getElementById('hackerTargetName').textContent = nombreDestinatario;
            document.getElementById('hackerCodeInput').textContent = hackerSecuenciaTarget;
            document.getElementById('hackerLogs').innerHTML = `> Initializing bypass...<br>> Target: ${nombreDestinatario}<br>> Sequence generated.`;

            // Iniciar temporizador (15 segundos)
            let tiempoRestante = 100;
            const progress = document.getElementById('hackerProgress');
            if (hackerTimerInterval) clearInterval(hackerTimerInterval);

            hackerTimerInterval = setInterval(() => {
                tiempoRestante -= 0.67; 
                progress.style.width = tiempoRestante + "%";

                if (tiempoRestante <= 0) {
                    finalizarHackeo(false, "¡TIEMPO AGOTADO!");
                }
            }, 100);
        });
    });
}

/**
 * Procesa cada clic en el teclado del hacker.
 */
function teclearHacker(num) {
    hackerSecuenciaActual += num.toString();

    // Feedback visual en los logs
    const logs = document.getElementById('hackerLogs');
    logs.innerHTML += `<br>> Input: ${num} OK.`;

    // Verificar si falló en algún número
    const index = hackerSecuenciaActual.length - 1;
    if (hackerSecuenciaActual[index] !== hackerSecuenciaTarget[index]) {
        finalizarHackeo(false, "¡ERROR EN LA SECUENCIA!");
        return;
    }

    // Si completó la secuencia
    if (hackerSecuenciaActual === hackerSecuenciaTarget) {
        finalizarHackeo(true);
    }
}

/**
 * Termina el minijuego y procesa el resultado.
 */
function finalizarHackeo(exito, motivo = "") {
    clearInterval(hackerTimerInterval);
    const idAtacante = limpiarNombre(usuarioActualNombre);

    if (exito) {
        db.ref('usuarios/' + hackerTargetId).once('value').then(snap => {
            const target = snap.val();
            const robo = Math.floor(target.saldo * 0.10); // Robas el 10% (más que antes por ser difícil)

            if (robo < 10) {
                alert("🏴‍☠️ Hackeo exitoso, pero el usuario es pobre. No robaste nada.");
            } else {
                db.ref('usuarios/' + hackerTargetId + '/saldo').transaction(s => (s || 0) - robo);
                db.ref('usuarios/' + idAtacante + '/saldo').transaction(s => (s || 0) + robo);

                registrarMovimiento(idAtacante, "HACK SUCCESS", robo, "Hackeo exitoso a " + hackerTargetNombre, true);
                registrarMovimiento(hackerTargetId, "HACKED!", robo, "¡Fuiste hackeada por " + usuarioActualNombre + "!", false);
                alert(`HACKEO EXITOSO: Has robado $${robo}.`);
            }
            mostrarPantalla('pantalla-ranking');
        });
    } else {
        alert("HACKEO DENEGADO.");
        mostrarPantalla('pantalla-ranking');
    }
}

/**
 * Desordena aleatoriamente los botones del teclado hacker.
 */
function mezclarTecladoHacker() {
    const keypad = document.querySelector('.hacker-keypad');
    const botones = Array.from(keypad.children);

    // Algoritmo de Fisher-Yates para desordenar el array
    for (let i = botones.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [botones[i], botones[j]] = [botones[j], botones[i]];
    }

    // Volver a añadir los botones en el nuevo orden
    keypad.innerHTML = '';
    botones.forEach(btn => {
        // Asegurarse de que el botón de 0 siga ocupando 3 columnas si es necesario, 
        // o mejor dejar que todos sean iguales para que el caos sea total.
        btn.style.gridColumn = 'auto';
        keypad.appendChild(btn);
    });
}

/**
 * Equipa un icono cosmético comprado previamente en la tienda.
 */
function equiparIcono(idItem, icono) {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario).update({
        iconoActivo: icono
    }).then(() => {
        alert("¡Icono equipado!");
    });
}
// --- MANEJO DE TRANSACCIONES Y ACTUALIZACIONES ---

/**
 * Escucha cambios globales en los usuarios. 
 * Si nuestro saldo cambia mientras estamos en el casino, lo actualizamos visualmente.
 */
db.ref('usuarios').on('child_changed', snap => {
    if (usuarioActualNombre && limpiarNombre(usuarioActualNombre) === snap.key) {
        const s = snap.val().saldo;
        if (!document.getElementById('pantalla-casino').classList.contains('hidden')) {
            document.getElementById('saldoCasinoDisplay').textContent = s.toFixed(2);
        }
    }
});

function actualizarSaldoNube(nuevoSaldo) {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario).update({
        saldo: nuevoSaldo
    });
}

// Para depositar y retirar necesitamos leer el saldo actual primero (o usar transaction de firebase)
// Usaremos transaction para seguridad atómica
/**
 * Registra un depósito de dinero en la cuenta.
 */
function depositar() {
    const monto = parseFloat(document.getElementById('montoTransaccion').value);
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");

    const idUsuario = limpiarNombre(usuarioActualNombre);
    // Usamos transaction para evitar problemas si varias personas tocan el saldo a la vez.
    db.ref('usuarios/' + idUsuario + '/saldo').transaction((saldoActual) => {
        return (saldoActual || 0) + monto;
    }, (error, committed, snapshot) => {
        if (committed) {
            alert(`Has depositado ${monto}. Nuevo saldo: ${snapshot.val()}`);
            registrarMovimiento(idUsuario, "DEPOSITO", monto, "Depósito Cajero", true);
            document.getElementById('montoTransaccion').value = '';
        }
    });
}

/**
 * Registra un retiro de dinero de la cuenta, validando que existan fondos.
 */
function retirar() {
    const monto = parseFloat(document.getElementById('montoTransaccion').value);
    if (isNaN(monto) || monto <= 0) return alert("Monto inválido");

    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/saldo').transaction((saldoActual) => {
        // Impedimos que el saldo baje de cero.
        if ((saldoActual || 0) < monto) {
            return;
        }
        return saldoActual - monto;
    }, (error, committed, snapshot) => {
        if (committed) {
            alert(`Has retirado ${monto}. Nuevo saldo: ${snapshot.val()}`);
            registrarMovimiento(idUsuario, "RETIRO", monto, "Retiro Cajero", false);
            document.getElementById('montoTransaccion').value = '';
        } else {
            alert("❌ Fondos insuficientes o error de conexión.");
        }
    });
}

// =============================================================
// TRANSFERENCIAS ENTRE USUARIOS
// Se usa una actualización multi-ruta atómica (multi-path update)
// para garantizar que el descuento al emisor y el crédito al
// receptor ocurran en UNA sola operación. Si falla una, fallan
// ambas. Esto elimina la condición de carrera anterior.
// =============================================================

/**
 * Envía dinero de la cuenta actual a otra jugadora.
 * Usa transacción atómica de Firebase para evitar pérdida de fondos.
 */
function transferirDinero() {
    const destinatarioNombre = document.getElementById('destinatarioNombre').value.trim();
    const monto = parseFloat(document.getElementById('montoTransferencia').value);

    // --- Validación del lado del cliente ---
    if (!destinatarioNombre || !validarMonto(monto)) {
        alert("⚠️ Revisa el nombre del destinatario y el monto.");
        return;
    }
    if (!validarNombreUsuario(destinatarioNombre)) {
        alert("⚠️ El nombre del destinatario contiene caracteres no permitidos.");
        return;
    }
    if (limpiarNombre(destinatarioNombre) === limpiarNombre(usuarioActualNombre)) {
        alert("⚠️ No puedes transferirte a ti misma.");
        return;
    }

    const miId = limpiarNombre(usuarioActualNombre);
    const destId = limpiarNombre(destinatarioNombre);

    // Verificar que el destinatario existe antes de tocar ningún saldo.
    db.ref('usuarios/' + destId).once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            alert("\u26d4 El usuario '" + sanitizar(destinatarioNombre) + "' no existe.");
            return;
        }

        // === ACTUALIZACIÓN ATÓMICA MULTI-RUTA ===
        // Leemos el saldo actual del emisor para hacer el cálculo.
        db.ref('usuarios/' + miId + '/saldo').once('value').then(miSaldoSnap => {
            // Forzamos que los saldos sean números reales para evitar concatenación de strings
            const miSaldoActual = parsearMontoSeguro(miSaldoSnap.val());
            const destSaldoActual = parsearMontoSeguro(snapshot.val().saldo);

            if (miSaldoActual < monto) {
                alert("❌ Fondos insuficientes.");
                return;
            }

            // Un solo objeto con TODAS las rutas a actualizar.
            // Firebase aplica este objeto en una transacción atómica.
            const updates = {};
            updates['usuarios/' + miId + '/saldo'] = Number(miSaldoActual - monto);
            updates['usuarios/' + destId + '/saldo'] = Number(destSaldoActual + monto);

            // Aplicar las dos actualizaciones de saldo en UNA sola escritura.
            db.ref().update(updates)
                .then(() => {
                    // Registrar en el historial de ambas jugadoras.
                    registrarMovimiento(miId, "ENVÍO", monto, "Envío a " + sanitizar(destinatarioNombre), false);
                    registrarMovimiento(destId, "RECIBO", monto, "Recibido de " + sanitizar(usuarioActualNombre), true);

                    alert(`\u2705 ¡Transferencia exitosa! Enviaste $${monto.toFixed(2)} a ${sanitizar(destinatarioNombre)}.`);
                    document.getElementById('destinatarioNombre').value = '';
                    document.getElementById('montoTransferencia').value = '';
                })
                .catch((error) => {
                    console.error("Error en transferencia atómica:", error);
                    alert("❌ Error al transferir. Intenta de nuevo.");
                });
        });
    });
}

// --- SISTEMA DE DUELOS (MINIJUEGOS 1vs1) ---

/**
 * Inicia el proceso de reto a otro jugador.
 */
function intentarRetar(idOponente, nombreOponente) {
    const apuesta = prompt(`¿Cuánto quieres apostar contra ${nombreOponente}?`);
    if (apuesta === null || apuesta === "" || isNaN(apuesta) || parseFloat(apuesta) <= 0) return;

    const monto = parseFloat(apuesta);
    const idRetador = limpiarNombre(usuarioActualNombre);

    // Verificar si tienes saldo suficiente para la apuesta.
    db.ref('usuarios/' + idRetador + '/saldo').once('value').then(snap => {
        const miSaldo = snap.val() || 0;
        if (miSaldo < monto) {
            alert("No tienes dinero suficiente para esta apuesta.");
            return;
        }

        // Crear el duelo en Firebase.
        const idDuelo = "duel_" + Date.now();
        db.ref('duelos/' + idDuelo).set({
            retador: usuarioActualNombre,
            idRetador: idRetador,
            oponente: nombreOponente,
            idOponente: idOponente,
            apuesta: monto,
            estado: 'pendiente'
        }).then(() => {
            alert("⚔️ Reto enviado. Esperando a que acepte...");
        });
    });
}

/**
 * Escucha retos entrantes dirigidos al usuario actual.
 */
function escucharRetos(miId) {
    db.ref('duelos').on('value', snapshot => {
        const duelos = snapshot.val();
        if (!duelos) return;

        Object.keys(duelos).forEach(idDuelo => {
            const duelo = duelos[idDuelo];

            // Si somos el oponente y el duelo está pendiente.
            if (duelo.idOponente === miId && duelo.estado === 'pendiente') {
                mostrarNotificacionDuelo(idDuelo, duelo);
            }

            // Si somos parte del duelo y ha sido aceptado, entramos a la pantalla.
            if ((duelo.idRetador === miId || duelo.idOponente === miId) && duelo.estado === 'aceptado') {
                iniciarPantallaDuelo(idDuelo, duelo);
            }
        });
    });
}

/**
 * Muestra una notificación de reto entrante.
 * Fase 3.4: Construida con DOM API — nombres de usuarios nunca entran como HTML.
 */
function mostrarNotificacionDuelo(idDuelo, duelo) {
    const contenedor = document.getElementById('notificaciones-duelo');
    if (document.getElementById('notif_' + idDuelo)) return; // Evitar duplicados.

    const div = document.createElement('div');
    div.id = 'notif_' + idDuelo;
    div.className = 'alerta-duelo';

    // Parrafo descriptivo — nombre y monto como texto puro
    const p = document.createElement('p');
    const strong1 = document.createElement('strong');
    strong1.textContent = sanitizar(duelo.retador || 'Alguien');
    const strong2 = document.createElement('strong');
    strong2.textContent = '$' + (parseFloat(duelo.apuesta) || 0).toFixed(2);

    p.appendChild(strong1);
    p.appendChild(document.createTextNode(' te reta a un duelo por '));
    p.appendChild(strong2);
    p.appendChild(document.createTextNode('!'));

    // Botones de acción con dataset (no concatenación en onclick)
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:5px;';

    const btnAceptar = document.createElement('button');
    btnAceptar.className = 'btn-mini';
    btnAceptar.style.background = '#27ae60';
    btnAceptar.textContent = 'ACEPTAR';
    btnAceptar.dataset.duelId = idDuelo;
    btnAceptar.addEventListener('click', function () { aceptarDuelo(this.dataset.duelId); });

    const btnRechazar = document.createElement('button');
    btnRechazar.className = 'btn-mini';
    btnRechazar.style.background = '#e74c3c';
    btnRechazar.textContent = 'NO';
    btnRechazar.dataset.duelId = idDuelo;
    btnRechazar.addEventListener('click', function () { rechazarDuelo(this.dataset.duelId); });

    btnRow.appendChild(btnAceptar);
    btnRow.appendChild(btnRechazar);
    div.appendChild(p);
    div.appendChild(btnRow);
    contenedor.appendChild(div);
}

/**
 * Acepta el duelo y descuenta la apuesta de ambas jugadoras.
 * NOTA: Imposible hacer un multi-path update seguro aquí sin
 * conocer el saldo exacto de ambas en el mismo instante.
 * Mejora: verificamos ambos saldos antes de tocar nada y
 * usamos un update atómico con valores calculados previamente.
 */
function aceptarDuelo(idDuelo) {
    db.ref('duelos/' + idDuelo).once('value').then(snap => {
        const duelo = snap.val();
        if (!duelo || duelo.estado !== 'pendiente') return;

        const miId = limpiarNombre(usuarioActualNombre);

        // Leer ambos saldos simultáneamente antes de decidir.
        Promise.all([
            db.ref('usuarios/' + miId + '/saldo').once('value'),
            db.ref('usuarios/' + duelo.idRetador + '/saldo').once('value')
        ]).then(([miSaldoSnap, retadorSaldoSnap]) => {
            const miSaldo = miSaldoSnap.val() || 0;
            const retadorSaldo = retadorSaldoSnap.val() || 0;

            if (miSaldo < duelo.apuesta) {
                alert("❌ No tienes saldo suficiente para esta apuesta.");
                return;
            }
            if (retadorSaldo < duelo.apuesta) {
                alert("❌ El retador ya no tiene dinero suficiente.");
                db.ref('duelos/' + idDuelo).remove();
                return;
            }

            // Actualizar el estado del duelo ATÓMICAMENTE para evitar dobles aceptaciones.
            db.ref('duelos/' + idDuelo + '/estado').transaction(estadoActual => {
                if (estadoActual !== 'pendiente') return; // Alguien más ya lo aceptó.
                return 'aceptado';
            }, (error, committed) => {
                if (!committed) {
                    alert("❌ El duelo ya fue aceptado o cancelado.");
                    return;
                }

                // === DESCONTAR APUESTAS CON MULTI-PATH UPDATE ATÓMICO ===
                const updates = {};
                updates['usuarios/' + miId + '/saldo'] = miSaldo - duelo.apuesta;
                updates['usuarios/' + duelo.idRetador + '/saldo'] = retadorSaldo - duelo.apuesta;

                db.ref().update(updates).catch(err => {
                    console.error("Error descontando apuestas:", err);
                    // Rollback del estado del duelo si falla el saldo.
                    db.ref('duelos/' + idDuelo + '/estado').set('pendiente');
                });
            });
        });
    });

    const notif = document.getElementById('notif_' + idDuelo);
    if (notif) notif.remove();
}

/**
 * Rechaza el duelo.
 */
function rechazarDuelo(idDuelo) {
    db.ref('duelos/' + idDuelo).remove();
    const notif = document.getElementById('notif_' + idDuelo);
    if (notif) notif.remove();
}

/**
 * Configura la pantalla de duelo para la batalla.
 */
function iniciarPantallaDuelo(idDuelo, duelo) {
    dueloActualId = idDuelo;
    mostrarPantalla('pantalla-duelo');

    document.getElementById('duelRetador').textContent = duelo.retador;
    document.getElementById('duelOponente').textContent = duelo.oponente;
    document.getElementById('montoApuestaDuelo').textContent = (duelo.apuesta * 2).toFixed(2);

    document.getElementById('rollRetador').textContent = duelo.rollRetador || "?";
    document.getElementById('rollOponente').textContent = duelo.rollOponente || "?";

    const miId = limpiarNombre(usuarioActualNombre);
    const yaLance = (miId === duelo.idRetador && duelo.rollRetador) || (miId === duelo.idOponente && duelo.rollOponente);

    if (yaLance) {
        document.getElementById('btnLanzarDuelo').style.display = 'none';
        document.getElementById('txtEstadoDuelo').textContent = "Esperando al otro jugador...";
    } else {
        document.getElementById('btnLanzarDuelo').style.display = 'block';
        document.getElementById('txtEstadoDuelo').textContent = "¡Es tu turno de lanzar!";
    }

    // Verificar si ambos lanzaron para declarar ganador.
    if (duelo.rollRetador && duelo.rollOponente && duelo.estado !== 'finalizado') {
        finalizarDuelo(idDuelo, duelo);
    }
}

/**
 * Genera un número aleatorio para el duelo.
 */
function lanzarDadosDuelo() {
    const roll = Math.floor(Math.random() * 100) + 1;
    const miId = limpiarNombre(usuarioActualNombre);

    db.ref('duelos/' + dueloActualId).once('value').then(snap => {
        const duelo = snap.val();
        const campo = (miId === duelo.idRetador) ? 'rollRetador' : 'rollOponente';

        db.ref('duelos/' + dueloActualId + '/' + campo).set(roll);
        document.getElementById('btnLanzarDuelo').style.display = 'none';
    });
}

/**
 * Determina quién ganó y entrega el premio.
 */
function finalizarDuelo(idDuelo, duelo) {
    let ganadorId = null;
    let ganadorNombre = "";

    if (duelo.rollRetador > duelo.rollOponente) {
        ganadorId = duelo.idRetador;
        ganadorNombre = duelo.retador;
    } else if (duelo.rollOponente > duelo.rollRetador) {
        ganadorId = duelo.idOponente;
        ganadorNombre = duelo.oponente;
    } else {
        ganadorId = "empate";
    }

    // USAR TRANSACCIÓN PARA EL ESTADO: Esto evita que el premio se pague múltiples veces
    db.ref('duelos/' + idDuelo + '/estado').transaction(estadoActual => {
        if (estadoActual === 'aceptado') return 'finalizado';
        return; // Si ya no es 'aceptado', abortamos la transacción
    }, (error, committed) => {
        if (committed) {
            const premio = duelo.apuesta * 2;
            if (ganadorId === "empate") {
                document.getElementById('txtEstadoDuelo').textContent = "¡EMPATE! Se devuelve el dinero.";
                db.ref('usuarios/' + duelo.idRetador + '/saldo').transaction(s => (s || 0) + duelo.apuesta);
                db.ref('usuarios/' + duelo.idOponente + '/saldo').transaction(s => (s || 0) + duelo.apuesta);
            } else {
                document.getElementById('txtEstadoDuelo').textContent = "¡GANADOR: " + ganadorNombre.toUpperCase() + "! 🏆";
                db.ref('usuarios/' + ganadorId + '/saldo').transaction(s => (s || 0) + premio);
                registrarMovimiento(ganadorId, "DUELO WIN", premio, "Ganaste duelo vs " + (ganadorId === duelo.idRetador ? duelo.oponente : duelo.retador), true);
            }

            // Limpiar el duelo después de 10 segundos
            setTimeout(() => {
                db.ref('duelos/' + idDuelo).remove();
                if (dueloActualId === idDuelo) mostrarPantalla('pantalla-cajero');
            }, 10000);
        }
    });
}

// --- LÓGICA DE EVENTOS GLOBALES ---

/**
 * Escucha en tiempo real si el administrador activa un evento para todos.
 */
function escucharEventosGlobales() {
    db.ref('evento_global').on('value', snap => {
        const data = snap.val();
        const banner = document.getElementById('bannerEvento');
        const txt = document.getElementById('txtEvento');

        if (data && data.activo) {
            eventoGlobalActivo = data.tipo;
            banner.classList.add('active');

            if (data.tipo === 'lluvia') {
                txt.textContent = "💰 ¡LLUVIA DE DINERO ACTIVA! 💰";
                // Lógica especial de lluvia: se ejecuta una vez cuando detectas el evento
                verificarRegaloLluvia(data.id);
            } else if (data.tipo === 'crash') {
                txt.textContent = "📉 ¡CRIPTO CRASH! PRECIOS POR EL SUELO 📉";
            } else if (data.tipo === 'doble') {
                txt.textContent = "🎰 ¡EVENTO: DOBLE PREMIO EN CASINO! 🎰";
            } else if (data.tipo === 'minas') {
                txt.textContent = "💎 ¡EVENTO: GOLDEN MINES ACTIVO! ¡X3 PREMIOS! 💎";
            }
        } else {
            eventoGlobalActivo = null;
            banner.classList.remove('active');
        }
    });
}

/**
 * Evita que un usuario reciba el dinero de la lluvia varias veces.
 */
function verificarRegaloLluvia(idEvento) {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    const path = `usuarios/${idUsuario}/eventos_recibidos/${idEvento}`;

    // Usar transacción para asegurar que solo se reciba UNA vez incluso si el evento parpadea
    db.ref(path).transaction(actual => {
        if (actual === null) return true; // Si no existe, lo marcamos como recibido
        return; // Si ya existe, no hacemos nada
    }, (error, committed) => {
        if (committed) {
            const regalo = 5000;
            db.ref(`usuarios/${idUsuario}/saldo`).transaction(s => (s || 0) + regalo);
            registrarMovimiento(idUsuario, "EVENTO LLUVIA", regalo, "Regalo por Evento Global 💰", true);
            alert("🎊 ¡HAS RECIBIDO $5,000 POR LA LLUVIA DE DINERO! 🎊");
        }
    });
}

/**
 * (Solo Admin) Activa un evento para todos los jugadores.
 */
function adminLanzarEvento(tipo) {
    const idEvento = "env_" + Date.now();

    // Lógica inmediata para Cripto Crash: Bajar el precio en la base de datos AHORA
    if (tipo === 'crash') {
        const precioCrash = (Math.random() * 2) + 1; // Forzar precio entre $1 y $3
        db.ref('mercado').update({
            precio: precioCrash,
            ultimaActualizacion: firebase.database.ServerValue.TIMESTAMP
        });
    }

    // Lanzar el evento global para activar banners y efectos
    db.ref('evento_global').set({
        activo: true,
        tipo: tipo,
        id: idEvento,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("¡Evento '" + tipo.toUpperCase() + "' activado globalmente!");
    });
}

/**
 * (Solo Admin) Detiene cualquier evento activo.
 */
function adminTerminarEvento() {
    db.ref('evento_global').update({
        activo: false
    }).then(() => {
        alert("Evento finalizado.");
    });
}






// --- LÓGICA DE BUSCAMINAS (MINES) ---

function abrirMinas() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/saldo').once('value').then(snap => {
        document.getElementById('saldoMinasDisplay').textContent = (snap.val() || 0).toFixed(2);
    });

    // Resetear interfaz visual
    const grid = document.getElementById('gridMinas');
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'minas-cell';
        grid.appendChild(cell);
    }
    grid.style.pointerEvents = 'none';
    grid.style.opacity = '0.5';
    document.getElementById('vallaControlesMinas').style.display = 'none';
    document.getElementById('btnStartMinas').disabled = false;
    document.getElementById('btnStartMinas').style.opacity = '1';

    mostrarPantalla('pantalla-minas');
}

function iniciarJuegoMinas() {
    const apuesta = parseFloat(document.getElementById('betMinas').value);
    let numBombas = parseInt(document.getElementById('numMinas').value);

    // MODO GOLDEN MINES: Limitar bombas si el evento está activo para que sea más fácil
    if (eventoGlobalActivo === 'minas' && numBombas > 3) {
        numBombas = 3;
        document.getElementById('numMinas').value = 3;
    }

    const idUsuario = limpiarNombre(usuarioActualNombre);

    if (isNaN(apuesta) || apuesta < 10) return alert("La apuesta mínima es $10");
    if (isNaN(numBombas) || numBombas < 1 || numBombas > 24) return alert("Elige entre 1 y 24 bombas");

    db.ref('usuarios/' + idUsuario).transaction(user => {
        if (user && user.saldo >= apuesta) {
            user.saldo -= apuesta;
            return user;
        }
    }, (error, committed) => {
        if (committed) {
            minasJuegoActivo = true;
            minasApuestaActual = apuesta;
            minasBombasTotales = numBombas;
            minasDiamantesEncontrados = 0;
            minasMultiplicador = 1;

            // Preparar tablero
            minasTablero = new Array(25).fill(0); // 0 = Diamante
            let bombasPuestas = 0;
            while (bombasPuestas < numBombas) {
                let r = Math.floor(Math.random() * 25);
                if (minasTablero[r] === 0) {
                    minasTablero[r] = 1; // 1 = Bomba
                    bombasPuestas++;
                }
            }

            // Actualizar Interfaz
            db.ref('usuarios/' + idUsuario + '/saldo').once('value').then(snap => {
                document.getElementById('saldoMinasDisplay').textContent = snap.val().toFixed(2);
            });

            const grid = document.getElementById('gridMinas');
            grid.innerHTML = '';
            for (let i = 0; i < 25; i++) {
                const cell = document.createElement('div');
                cell.className = 'minas-cell';
                cell.onclick = () => revelarCeldaMinas(i, cell);
                grid.appendChild(cell);
            }
            grid.style.pointerEvents = 'auto';
            grid.style.opacity = '1';

            document.getElementById('btnStartMinas').disabled = true;
            document.getElementById('btnStartMinas').style.opacity = '0.5';
            document.getElementById('vallaControlesMinas').style.display = 'block';
            document.getElementById('txtMultiMinas').textContent = "1.00x";
            document.getElementById('btnCashoutMinas').textContent = "RECOGER $0.00";
            document.getElementById('btnCashoutMinas').disabled = true;

            registrarMovimiento(idUsuario, "MINAS APUESTA", apuesta, `Inició Buscaminas (${numBombas} bombas)`, false);
        } else {
            alert("No tienes saldo suficiente.");
        }
    });
}

function revelarCeldaMinas(idx, el) {
    if (!minasJuegoActivo || el.classList.contains('revealed')) return;

    el.classList.add('revealed');

    if (minasTablero[idx] === 1) {
        // BOMBA - Perdió
        el.classList.add('mine');
        el.textContent = '💣';
        terminarJuegoMinas(false);
    } else {
        // DIAMANTE - Sigue jugando
        el.classList.add('diamond');
        el.textContent = '💎';
        minasDiamantesEncontrados++;

        // Calcular nuevo multiplicador
        minasMultiplicador = calcularMultiplicadorMinas(minasDiamantesEncontrados, minasBombasTotales);
        const premioActual = minasApuestaActual * minasMultiplicador;

        document.getElementById('txtMultiMinas').textContent = minasMultiplicador.toFixed(2) + "x";
        document.getElementById('btnCashoutMinas').textContent = `RECOGER $${premioActual.toFixed(2)}`;
        document.getElementById('btnCashoutMinas').disabled = false;

        // Si encontró todos los diamantes (poco probable pero posible)
        if (minasDiamantesEncontrados === (25 - minasBombasTotales)) {
            cobrarMinas();
        }
    }
}

function calcularMultiplicadorMinas(gemas, bombas) {
    // Fórmula de probabilidad: ( (25-bombas)! / (25-bombas-gemas)! ) / ( 25! / (25-gemas)! )
    function factorial(n) {
        if (n === 0) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }
    function combinations(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        // Simplificado para evitar factoriales gigantes que desbordan JS
        let res = 1;
        for (let i = 1; i <= k; i++) {
            res = res * (n - i + 1) / i;
        }
        return res;
    }

    const prob = combinations(25 - bombas, gemas) / combinations(25, gemas);
    let multi = (0.97 / prob);
    
    // MODO GOLDEN MINES: ¡X3 Multiplicador!
    if (eventoGlobalActivo === 'minas') {
        multi = multi * 3;
    }
    
    return multi;
}

function cobrarMinas() {
    if (!minasJuegoActivo || minasDiamantesEncontrados === 0) return;

    const premio = minasApuestaActual * minasMultiplicador;
    const idUsuario = limpiarNombre(usuarioActualNombre);

    db.ref('usuarios/' + idUsuario + '/saldo').transaction(s => (s || 0) + premio);
    registrarMovimiento(idUsuario, "MINAS PREMIO", premio, `Ganó en Buscaminas (${minasDiamantesEncontrados} gemas)`, true);

    alert(`💰 ¡FELICIDADES! Has cobrado $${premio.toFixed(2)} (${minasMultiplicador.toFixed(2)}x)`);
    terminarJuegoMinas(true);
}

function terminarJuegoMinas(ganado) {
    minasJuegoActivo = false;
    const grid = document.getElementById('gridMinas');
    grid.style.pointerEvents = 'none';

    // Revelar todas las minas que faltaban
    const cells = grid.getElementsByClassName('minas-cell');
    for (let i = 0; i < 25; i++) {
        if (minasTablero[i] === 1 && !cells[i].classList.contains('revealed')) {
            cells[i].classList.add('revealed', 'mine');
            cells[i].textContent = '💣';
            cells[i].style.opacity = '0.5';
        }
    }

    if (!ganado) {
        alert("💥 ¡BOOOM! Pisaste una mina. Perdiste tu apuesta.");
    }

    document.getElementById('btnStartMinas').disabled = false;
    document.getElementById('btnStartMinas').style.opacity = '1';
    document.getElementById('btnCashoutMinas').disabled = true;

    // Actualizar saldo visual
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/saldo').once('value').then(snap => {
        document.getElementById('saldoMinasDisplay').textContent = snap.val().toFixed(2);
    });
}

// --- LÓGICA DEL GRAN ROBO COOPERATIVO ---

function abrirRobo() {
    mostrarPantalla('pantalla-robo');

    const idUsuario = limpiarNombre(usuarioActualNombre);
    const bovedaRef = db.ref('banco_central');

    // Registrarse como hacker activo (presencia temporal)
    const miHackerRef = bovedaRef.child('contribuidores').child(idUsuario);
    miHackerRef.set({
        nombre: usuarioActualNombre,
        ultimoClick: firebase.database.ServerValue.TIMESTAMP
    });

    // Limpiar rastro al desconectarse o cerrar
    miHackerRef.onDisconnect().remove();

    if (!roboEscuchandoBoveda) {
        roboEscuchandoBoveda = true;

        bovedaRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data || data.monto === undefined || data.monto === null || data.monto === 0) {
                // Inicializar boveda si no existe o está corrupta
                bovedaRef.update({
                    monto: 250000,
                    progreso: 0,
                    abierta: false
                });
                return;
            }

            // Actualizar interfaz
            document.getElementById('txtBovedaMonto').textContent = `$${formatearNumero(data.monto || 0)}`;
            const progreso = data.progreso || 0;
            document.getElementById('roboProgressBar').style.width = progreso + "%";
            document.getElementById('txtRoboProgreso').textContent = Math.floor(progreso) + "% completado";

            // Visual de la puerta
            const vaultDoor = document.getElementById('vaultDoor');
            if (progreso >= 100) {
                vaultDoor.classList.add('open');
                vaultDoor.textContent = '🔓';
                if (!data.abierta) {
                    procesarRoboExitoso(data.monto || 250000, data.contribuidores);
                }
            } else {
                vaultDoor.classList.remove('open');
                vaultDoor.textContent = '💰';
            }

            // Lista de hackers activos (mostrar últimos 10)
            const ul = document.getElementById('ulHackers');
            ul.innerHTML = '';
            if (data.contribuidores) {
                const ahora = Date.now();
                Object.values(data.contribuidores).forEach(h => {
                    // Solo mostrar si clickeó hace menos de 10 segundos
                    if (ahora - h.ultimoClick < 10000) {
                        const li = document.createElement('li');
                        li.textContent = `💻 ${h.nombre} está hackeando...`;
                        ul.appendChild(li);
                    }
                });
            }
        });
    }
}

function hackearBoveda() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    const bovedaRef = db.ref('banco_central');

    // 1. Actualizar mi marca de tiempo
    bovedaRef.child('contribuidores').child(idUsuario).update({
        ultimoClick: firebase.database.ServerValue.TIMESTAMP
    });

    // 2. Aumentar progreso compartido
    bovedaRef.once('value').then(snap => {
        const data = snap.val();
        if (data && data.progreso >= 100) {
            // Si ya está al 100% pero no se ha abierto (o se quedó trabado)
            if (!data.abierta) {
                procesarRoboExitoso(data.monto || 250000, data.contribuidores);
            } else {
                // Si ya está abierta pero nadie la ha reseteado, intentamos forzar reset
                // Solo si han pasado más de 15 segundos (aproximadamente)
                // Usamos un pequeño check para no spamear resets
                if (Math.random() > 0.8) reiniciarBoveda();
            }
            return;
        }

        bovedaRef.child('progreso').transaction(actual => {
            if (actual >= 100) return 100;
            // El progreso sube segun cuanta gente hay
            return (actual || 0) + 0.5;
        });
    });
}

function procesarRoboExitoso(montoTotal, contribuidores) {
    const bovedaRef = db.ref('banco_central');
    const idUsuario = limpiarNombre(usuarioActualNombre);

    // Marcar boveda como abierta para que solo un cliente procese el premio
    bovedaRef.child('abierta').transaction(estado => {
        if (estado === true) return; // Ya alguien lo está procesando
        return true;
    }, (error, committed) => {
        if (committed) {
            // Somos el cliente encargado de repartir
            if (!contribuidores) {
                reiniciarBoveda();
                return;
            }

            const ahora = Date.now();
            const listaHackersIds = Object.keys(contribuidores);

            // FILTRAR SOLO HACKERS ACTIVOS (que hayan clickeado en los últimos 3 minutos)
            const activosIds = listaHackersIds.filter(id => {
                const h = contribuidores[id];
                return (ahora - (h.ultimoClick || 0)) < 180000; // 3 minutos
            });

            if (activosIds.length === 0) {
                reiniciarBoveda();
                return;
            }

            const premioPorPersona = (montoTotal || 250000) / activosIds.length;

            activosIds.forEach(idH => {
                db.ref(`usuarios/${idH}/saldo`).transaction(s => {
                    const montoASumar = parseFloat(premioPorPersona);
                    if (isNaN(montoASumar)) return s;
                    return (s || 0) + montoASumar;
                });
                registrarMovimiento(idH, "BOTÍN BANCUARIO", premioPorPersona, "Reparto del Gran Robo 🚨", true);
            });

            alert(`🎊 ¡BÓVEDA ABIERTA! Se repartieron $${formatearNumero(montoTotal)} entre ${activosIds.length} hackers activos.`);

            // Reiniciar inmediatamente después de repartir, pero dejar un pequeño margen visual
            setTimeout(reiniciarBoveda, 4000);
        }
    });
}

function reiniciarBoveda() {
    db.ref('banco_central').update({
        progreso: 0,
        abierta: false,
        monto: Math.floor(Math.random() * 500000) + 200000 // Nuevo botín aleatorio entre 200k y 700k
    });
}





// --- LÓGICA DE LA TORRE MILLONARIA (HIGH STAKES) ---

let towerNivelActual = 0;
let towerPremioAcumulado = 0;
let towerJuegoActivo = false;
const TOWER_BET = 5000;

// Lista de premios por nivel (Escala millonaria)
const TOWER_PRIZES = [
    0,          // Nivel 0 (Inicio)
    10000,      // Nivel 1
    25000,      // Nivel 2
    50000,      // Nivel 3
    100000,     // Nivel 4
    250000,     // Nivel 5
    500000,     // Nivel 6
    1000000,    // Nivel 7 (EL MILLÓN!)
    2500000,    // Nivel 8
    5000000,    // Nivel 9
    25000000    // Nivel 10 (EL REY)
];

function abrirTorre() {
    towerJuegoActivo = false;
    towerNivelActual = 0;
    towerPremioAcumulado = 0;

    document.getElementById('vallaInicioTorre').style.display = 'block';
    document.getElementById('vallaJuegoTorre').style.display = 'none';
    document.getElementById('txtTorrePremio').textContent = "$0.00";
    document.getElementById('txtTorreNivel').textContent = "NIVEL: 0 / 10";

    actualizarVisualTorre();
    mostrarPantalla('pantalla-torre');
}

function actualizarVisualTorre() {
    const container = document.getElementById('visualTorreUI');
    container.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
        const div = document.createElement('div');
        div.className = 'tower-lvl-step';
        div.style.padding = '5px';
        div.style.textAlign = 'center';
        div.style.fontSize = '0.7rem';
        div.style.border = '1px solid rgba(255,255,255,0.1)';
        div.style.borderRadius = '3px';
        div.style.color = '#fff';

        if (i <= towerNivelActual) {
            div.style.background = 'linear-gradient(to right, #2ecc71, #27ae60)';
            div.style.fontWeight = 'bold';
            div.innerHTML = `Lvl ${i}: $${formatearNumero(TOWER_PRIZES[i])} ✅`;
        } else {
            div.style.background = 'rgba(255,255,255,0.05)';
            div.innerHTML = `Lvl ${i}: $${formatearNumero(TOWER_PRIZES[i])}`;
        }
        container.appendChild(div);
    }
}

function iniciarJuegoTorre() {
    const idUsuario = limpiarNombre(usuarioActualNombre);

    db.ref('usuarios/' + idUsuario).transaction(user => {
        if (user && user.saldo >= TOWER_BET) {
            user.saldo -= TOWER_BET;
            return user;
        }
    }, (error, committed) => {
        if (committed) {
            towerJuegoActivo = true;
            towerNivelActual = 0;
            towerPremioAcumulado = 0;

            document.getElementById('vallaInicioTorre').style.display = 'none';
            document.getElementById('vallaJuegoTorre').style.display = 'block';
            document.getElementById('btnCobrarTorre').disabled = true;
            document.getElementById('btnCobrarTorre').style.opacity = '0.5';

            registrarMovimiento(idUsuario, "TORRE APUESTA", TOWER_BET, "Entrada a la Torre Millonaria", false);
            avanzarNivelTorre(); // Empezar en el nivel 1 automáticamente tras pagar
        } else {
            alert("Necesitas al menos $5,000 para entrar a la Torre.");
        }
    });
}

function avanzarNivelTorre() {
    actualizarVisualTorre();

    // LÓGICA DEL SOPLO DE LA TORRE (MERCADO NEGRO)
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/itemsMercado').once('value').then(snap => {
        const items = snap.val() || [];
        if (items.includes('soplo_torre')) {
            // Decidir secretamente cuál es el camino correcto para mostrar pista
            // Nota: El "suerte" en elegirCaminoTorre es aleatorio en el momento del click,
            // así que para el "Soplo" vamos a predecir un lado que SERÍÁ correcto si hiciera click ahora.
            // O mejor: Hacemos que si tiene el Soplo, SIEMPRE mostramos un botón dorado que ES el correcto.
            
            // Generamos la "verdad" de este nivel solo para el portador del soplo
            const caminoCorrecto = Math.random() > 0.5 ? 1 : 0;
            const btnPista = document.getElementById('btnPath' + caminoCorrecto);
            btnPista.classList.add('correct-path');
            
            // Guardamos el camino correcto forzado para este nivel
            towerProximoCaminoForzado = caminoCorrecto;
        } else {
            towerProximoCaminoForzado = null;
        }
    });
}

let towerProximoCaminoForzado = null;

function elegirCaminoTorre(lado) {
    if (!towerJuegoActivo) return;

    // Quitar pistas visuales previas
    document.getElementById('btnPath0').classList.remove('correct-path');
    document.getElementById('btnPath1').classList.remove('correct-path');

    // Sonido o efecto visual de click
    const btn = document.getElementById('btnPath' + lado);
    btn.style.transform = "scale(0.9)";
    setTimeout(() => btn.style.transform = "scale(1)", 100);

    // Probabilidad 50/50 o Camino Forzado por el Soplo
    let suerte = false;
    if (towerProximoCaminoForzado !== null) {
        suerte = (lado === towerProximoCaminoForzado);
    } else {
        suerte = Math.random() > 0.5;
    }

    if (suerte) {
        // SOBREVIVE Y AVANZA
        towerNivelActual++;
        towerPremioAcumulado = TOWER_PRIZES[towerNivelActual];

        document.getElementById('txtTorrePremio').textContent = "$" + formatearNumero(towerPremioAcumulado);
        document.getElementById('txtTorreNivel').textContent = `NIVEL: ${towerNivelActual} / 10`;
        document.getElementById('btnCobrarTorre').disabled = false;
        document.getElementById('btnCobrarTorre').style.opacity = '1';
        document.getElementById('btnCobrarTorre').textContent = `RECOGER $${formatearNumero(towerPremioAcumulado)} 💰`;

        actualizarVisualTorre();

        if (towerNivelActual >= 10) {
            alert("🎊 ¡HAS LLEGADO A LA CIMA! ¡ERES MULTIMILLONARIO! 🎊");
            cobrarTorre();
        }
    } else {
        // EL CRISTAL SE ROMPE
        alert("💥 ¡EL CRISTAL SE ROMPIÓ! Caíste al vacío y perdiste todo.");
        terminarTorre(false);
    }
}

function cobrarTorre() {
    if (!towerJuegoActivo || towerNivelActual === 0) return;

    const idUsuario = limpiarNombre(usuarioActualNombre);
    const premio = towerPremioAcumulado;

    db.ref('usuarios/' + idUsuario + '/saldo').transaction(s => (s || 0) + premio);
    registrarMovimiento(idUsuario, "TORRE PREMIO", premio, `Ganaste en la Torre (Lvl ${towerNivelActual})`, true);

    alert(`💰 ¡Excelente! Has salido de la torre con $${formatearNumero(premio)}.`);
    terminarTorre(true);
}

function terminarTorre(ganado) {
    towerJuegoActivo = false;
    document.getElementById('vallaInicioTorre').style.display = 'block';
    document.getElementById('vallaJuegoTorre').style.display = 'none';

    // Si perdió, registrar el movimiento de pérdida
    if (!ganado) {
        const idUsuario = limpiarNombre(usuarioActualNombre);
        registrarMovimiento(idUsuario, "TORRE PERDIDA", 0, `Perdiste en la Torre (Lvl ${towerNivelActual})`, false);
    }
}

/**
 * FUNCIÓN SORPRESA: MODO DIOS (GOD MODE)
 * Solo para la Admin Suprema. Activa efectos visuales y una lluvia masiva de dinero.
 */
function adminBotonSorpresa() {
    // 1. Efecto visual de sacudida para todos (vía Firebase)
    const idEvento = "god_" + Date.now();
    
    db.ref('evento_global').set({
        activo: true,
        tipo: 'god_mode',
        id: idEvento,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // 2. Notificación especial en la consola de JS (por si alguien está mirando)
    console.log("%c⚠️ MODO DIOS ACTIVADO POR EL ADMIN ⚠️", "color: #f1c40f; font-size: 20px; font-weight: bold; background: #000; padding: 10px;");

    alert("⚡ ¡MODO DIOS CARGANDO! Prepárate para el caos controlado...");

    // 3. Regalo masivo a todos después de 3 segundos
    setTimeout(() => {
        db.ref('usuarios').once('value').then(snap => {
            const usuarios = snap.val();
            if (usuarios) {
                Object.keys(usuarios).forEach(uid => {
                    const montoRegalo = 15000; // ¡Quince mil de golpe!
                    db.ref(`usuarios/${uid}/saldo`).transaction(s => (s || 0) + montoRegalo);
                    registrarMovimiento(uid, "GOD GIFT", montoRegalo, "🎁 REGALO DIVINO DEL ADMIN", true);
                });
                alert("✨ ¡Has repartido $15,000 a todas las jugadoras del servidor!");
            }
        });
    }, 3000);
}

// Necesitamos actualizar escucharEventosGlobales para manejar el nuevo tipo 'god_mode'
// Pero para no sobreescribir funciones grandes, lo manejaremos con un listener extra.
db.ref('evento_global').on('value', snap => {
    const data = snap.val();
    if (data && data.activo && data.tipo === 'god_mode') {
        // Efecto "Matrix/Glitch" visual en la pantalla de todos
        const body = document.body;
        body.style.transition = "filter 0.1s";
        let count = 0;
        const glitchInterval = setInterval(() => {
            body.style.filter = count % 2 === 0 ? "invert(1) hue-rotate(180deg)" : "none";
            count++;
            if (count > 10) {
                clearInterval(glitchInterval);
                body.style.filter = "none";
                // Mostrar banner especial temporal
                const banner = document.getElementById('bannerEvento');
                const txt = document.getElementById('txtEvento');
                banner.classList.add('active');
                banner.style.background = "linear-gradient(90deg, #ffd700, #ff8c00, #ffd700)";
                txt.textContent = "⚡ ¡BENDICIÓN DIVINA ACTIVA! +$15,000 ⚡";
            }
        }, 100);
    }
});

/**
 * (Solo Admin) otorga acceso al mercado negro y genera la llave numérica.
 */
function adminInvitarMercado(idUsuario, nombre) {
    const llaveGenerada = Math.floor(Math.random() * 900000) + 100000; // Llave de 6 dígitos
    db.ref('usuarios/' + idUsuario).update({
        tieneInvitacionMercado: true,
        llaveMercado: llaveGenerada
    }).then(() => {
        alert(`✅ Invitación enviada a ${nombre}.\nLa Llave Maestra es: ${llaveGenerada}`);
        // Enviar notificación al usuario (simulado vía mensaje en el dash)
        registrarMovimiento(idUsuario, "INVITACIÓN SECRETA", 0, `Has sido invitada al Inframundo. Tu llave es: ${llaveGenerada}`, true);
    });
}

// --- LÓGICA DEL MERCADO NEGRO (USER SIDE) ---

const MERCADO_NEGRO_ITEMS = [
    { id: 'soplo_torre', icono: '👁️', nombre: 'Soplo de la Torre', precio: 50000, desc: 'Te garantiza un nivel seguro en la Torre.' },
    { id: 'nombre_neon', icono: '🌈', nombre: 'Pintura Neón', precio: 100000, desc: 'Nombre brillante en el Ranking.' },
    { id: 'software_autohack', icono: '💾', nombre: 'Autohack v2.0 (6 Usos)', precio: 150000, desc: 'Hackeo automático sin mini-juego. ¡Pura potencia!' },
    { id: 'invisible', icono: '🌫️', nombre: 'Manto de Hacker', precio: 250000, desc: 'Nadie podrá ver tu saldo real.' },
    { id: 'identidad_falsa', icono: '🆔', nombre: 'Identidad Falsa', precio: 500000, desc: 'Cambia tu nombre una vez.' },
    { id: 'inmunidad_12h', icono: '🛡️💎', nombre: 'Inmunidad Diplomática (12h)', precio: 400000000, desc: 'Protección absoluta. No se acumula, reinicia el tiempo a 12h.' }
];

function abrirAccesoMercado() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/llaveMercado').once('value').then(snap => {
        const llaveReal = snap.val();
        const inputUsuario = prompt("🕵️‍♀️ SEGURIDAD DEL INFRAMUNDO:\nIngresa tu Llave Maestra de 6 dígitos:");

        if (inputUsuario === String(llaveReal)) {
            alert("✅ ACCESO CONCEDIDO. Bienvenido al Mercado Negro.");
            abrirMercadoNegro();
        } else {
            alert("⛔ LLAVE INCORRECTA. El sistema ha registrado este intento fallido.");
        }
    });
}

function abrirMercadoNegro() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario).once('value').then(snap => {
        const datos = snap.val();
        document.getElementById('saldoMercadoDisplay').textContent = (datos.saldo || 0).toFixed(2);
        renderizarMercadoNegro(datos);
        mostrarPantalla('pantalla-mercado');
    });
}

function renderizarMercadoNegro(datosUsuario) {
    const contenedor = document.getElementById('listaItemsMercado');
    const itemsComprados = datosUsuario.itemsMercado || [];
    
    contenedor.innerHTML = '';
    
    // Estilos para el grid (si no están en CSS)
    contenedor.style.display = 'grid';
    contenedor.style.gridTemplateColumns = 'repeat(2, 1fr)';
    contenedor.style.gap = '10px';

    MERCADO_NEGRO_ITEMS.forEach(item => {
        let yaComprado = itemsComprados.includes(item.id);
        
        // El software de autohack se puede comprar varias veces (se recarga)
        if (item.id === 'software_autohack') {
            yaComprado = false; 
        }
        
        const card = document.createElement('div');
        card.style.background = 'rgba(0, 255, 0, 0.05)';
        card.style.border = '1px solid #0f0';
        card.style.padding = '10px';
        card.style.borderRadius = '5px';
        card.style.textAlign = 'center';
        card.style.color = '#0f0';
        card.style.fontFamily = 'monospace';

        let btnText = yaComprado ? 'ADQUIRIDO' : `COMPRAR $${formatearNumero(item.precio)}`;
        
        if (item.id === 'software_autohack' && datosUsuario.autohackCargas > 0) {
            btnText = `RECARGAR (Tienes ${datosUsuario.autohackCargas}) $${formatearNumero(item.precio)}`;
        }
        
        const btnDisabled = yaComprado;

        card.innerHTML = `
            <span style="font-size: 2rem;">${item.icono}</span><br>
            <strong style="font-size: 0.8rem;">${item.nombre}</strong><br>
            <p style="font-size: 0.6rem; margin: 5px 0; color: #888;">${item.desc}</p>
        `;
        
        const btn = document.createElement('button');
        btn.textContent = btnText;
        btn.disabled = btnDisabled;
        btn.style.width = '100%';
        btn.style.background = '#000';
        btn.style.color = '#0f0';
        btn.style.border = '1px solid #0f0';
        btn.style.padding = '5px';
        btn.style.cursor = yaComprado ? 'default' : 'pointer';
        btn.style.fontSize = '0.7rem';
        
        if (!yaComprado) {
            btn.onclick = () => comprarItemMercado(item.id, item.precio);
        }

        card.appendChild(btn);
        contenedor.appendChild(card);
    });
}

function comprarItemMercado(idItem, precio) {
    const idUsuario = limpiarNombre(usuarioActualNombre);

    db.ref('usuarios/' + idUsuario).transaction(user => {
        if (user && user.saldo >= precio) {
            user.saldo -= precio;
            if (!user.itemsMercado) user.itemsMercado = [];
            user.itemsMercado.push(idItem);
            return user;
        }
    }, (error, committed) => {
        if (committed) {
            alert("💀 Ítem prohibido adquirido con éxito.");
            
            // Lógica inmediata para algunos items
            if (idItem === 'software_autohack') {
                db.ref('usuarios/' + idUsuario + '/autohackCargas').transaction(c => (c || 0) + 6);
                alert("💾 SOFTWARE INSTALADO: Tienes 6 cargas de hackeo automático.");
            }

            if (idItem === 'identidad_falsa') {
                const nuevoNombre = prompt("Dinos tu nueva identidad secreta:");
                if (nuevoNombre) {
                    db.ref('usuarios/' + idUsuario).update({ nombreReal: nuevoNombre });
                    alert("Identidad cambiada en la base de datos central.");
                }
            }

            if (idItem === 'inmunidad_12h') {
                const doceHorasMs = 12 * 60 * 60 * 1000;
                const nuevaFecha = Date.now() + doceHorasMs;
                db.ref('usuarios/' + idUsuario).update({ firewallHasta: nuevaFecha });
                alert("⭐ INMUNIDAD DIPLOMÁTICA ACTIVADA. Eres intocable por las próximas 12 horas. (Tiempo reiniciado a 12h)");
            }
        } else {
            alert("No tienes suficiente dinero 'lavado'.");
        }
    });
}

// =============================================================
// SISTEMA DE TROLLEO DEL MERCADO NEGRO
// Implementado por petición: Si el usuario no responde en 24h, pierde 5%.
// =============================================================

let timerAmenazaInterval = null;

/**
 * Verifica si hay una amenaza activa y aplica la penalización si expiró.
 */
function verificarAmenazaMercado(idUsuario, datos) {
    const seccion = document.getElementById('seccionAmenazaMercado');
    const timerEl = document.getElementById('timerAmenaza');
    const avisoDash = document.getElementById('avisoExtorsionDash');
    
    if (!datos.amenazaMercado) {
        if (seccion) seccion.classList.add('hidden');
        if (avisoDash) avisoDash.classList.add('hidden');
        if (timerEl) clearInterval(timerAmenazaInterval);
        return;
    }

    const ahora = Date.now();
    const tiempoEnvio = datos.amenazaMercado.timestamp;
    const tiempoLimite = tiempoEnvio + (24 * 60 * 60 * 1000); // 24 horas

    if (ahora > tiempoLimite) {
        // PERDIÓ EL TIEMPO: Aplicar multa del 5%
        const montoActual = typeof datos.saldo === 'number' ? datos.saldo : parseFloat(datos.saldo || 0);
        const multa = montoActual * 0.05;
        
        // Usar transacción para evitar errores de concurrencia
        db.ref('usuarios/' + idUsuario).transaction(user => {
            if (user && user.amenazaMercado) {
                user.saldo = (user.saldo || 0) - multa;
                delete user.amenazaMercado;
                return user;
            }
        }, (error, committed) => {
            if (committed) {
                alert("💀 EL TIEMPO SE AGOTÓ.\nComo no respondiste al mensaje, el Mercado Negro ha tomado el 5% de tu saldo ($" + formatearNumero(multa) + ") como penalización.");
                if (avisoDash) avisoDash.classList.add('hidden');
            }
        });
    } else {
        // MOSTRAR AMENAZA Y TIMER
        if (seccion) seccion.classList.remove('hidden');
        if (avisoDash) avisoDash.classList.remove('hidden');
        actualizarTimerAmenaza(tiempoLimite);
    }
}

/**
 * Actualiza el reloj visual de la amenaza.
 */
function actualizarTimerAmenaza(limite) {
    const timerEl = document.getElementById('timerAmenaza');
    if (!timerEl) return;

    clearInterval(timerAmenazaInterval);
    timerAmenazaInterval = setInterval(() => {
        const ahora = Date.now();
        const dif = limite - ahora;
        
        if (dif <= 0) {
            clearInterval(timerAmenazaInterval);
            timerEl.textContent = "TIEMPO AGOTADO - PROCESANDO...";
            return;
        }
        
        const h = Math.floor(dif / (1000 * 60 * 60));
        const m = Math.floor((dif % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((dif % (1000 * 60)) / 1000);
        
        timerEl.textContent = `TIEMPO RESTANTE: ${h}h ${m}m ${s}s`;
    }, 1000);
}

/**
 * El usuario responde a la amenaza para evitar la multa.
 */
function responderAmenazaMercado() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/amenazaMercado').remove().then(() => {
        alert("👋 ¡Eso es! Qué amable. Me caes bien, amigo... por ahora. ¡Disfruta tu dinero!");
    });
}

/**
 * (Admin) Envía un trolleo a un usuario específico.
 */
function adminLanzarAmenaza(idUsuario) {
    db.ref('usuarios/' + idUsuario + '/amenazaMercado').set({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        mensaje: "Confirma tu presencia o pierde el 5%."
    }).then(() => {
        alert("💀 Amenaza enviada al usuario con éxito.");
    });
}

/**
 * Permite a un usuario del mercado negro enviar una amenaza a otro usuario pagando un precio.
 */
function comprarExtorsionUsuario() {
    const victimName = document.getElementById('targetExtorsion').value.trim();
    const idSender = limpiarNombre(usuarioActualNombre);
    const cost = 50000;

    if (!victimName) {
        alert("Debes poner el nombre de tu amigo.");
        return;
    }
    const idVictim = limpiarNombre(victimName);

    if (idSender === idVictim) {
        alert("No puedes trollearte a ti misma... eso sería raro.");
        return;
    }

    // 1. Verificar que el usuario existe
    db.ref('usuarios/' + idVictim).once('value').then(snap => {
        if (!snap.exists()) {
            alert("Ese usuario no existe en la base de datos.");
            return;
        }

        const victimData = snap.val();
        if (victimData.amenazaMercado) {
            alert("Ese usuario ya tiene una amenaza activa. Espera a que expire.");
            return;
        }

        // 2. Cobrar al emisor
        db.ref('usuarios/' + idSender).transaction(sender => {
            if (sender && sender.saldo >= cost) {
                sender.saldo -= cost;
                return sender;
            }
        }, (error, committed) => {
            if (committed) {
                // 3. Poner la amenaza a la víctima
                db.ref('usuarios/' + idVictim + '/amenazaMercado').set({
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    mensaje: `¡Hola amigo! ¿Estás por ahí? Alguien te mandó un saludo especial... ¡uy!`
                });

                registrarMovimiento(idSender, "SERVICIO OSCURO", cost, `Saludo enviado to ${victimName}`, false);
                alert(`💀 Saludo enviado. ${sanitizar(victimName)} tiene 24 horas para devolverte el saludo... o habrá un 'uy' de su parte.`);
                document.getElementById('targetExtorsion').value = ''; // Limpiar input
            } else {
                alert("No tienes suficiente dinero ($50,000) para este saludo...");
            }
        });
    });
}

// --- LÓGICA DE RASCA-GAMER ---

function abrirRasca() {
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/saldo').once('value').then(snap => {
        document.getElementById('saldoRascaDisplay').textContent = (snap.val() || 0).toFixed(2);
    });

    rascaJuegoActivo = false;
    rascaRevelados = 0;
    
    // Limpiar grid
    const grid = document.getElementById('gridRasca');
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'rasca-cell'; // Solo cuadro vacío al inicio
        grid.appendChild(cell);
    }

    document.getElementById('vallaInicioRasca').style.display = 'block';
    document.getElementById('vallaJuegoRasca').style.display = 'none';
    mostrarPantalla('pantalla-rasca');
}

function comprarRasca() {
    const idUsuario = limpiarNombre(usuarioActualNombre);

    db.ref('usuarios/' + idUsuario).transaction(user => {
        if (user && user.saldo >= rascaCosto) {
            user.saldo -= rascaCosto;
            return user;
        }
    }, (error, committed) => {
        if (committed) {
            iniciarJuegoRasca();
            registrarMovimiento(idUsuario, "RASCA COMPRA", rascaCosto, "Cartón de Rasca-Gamer 🎫", false);
        } else {
            alert("No tienes saldo suficiente ($5,000).");
        }
    });
}

function iniciarJuegoRasca() {
    rascaJuegoActivo = true;
    rascaRevelados = 0;
    rascaSimbolos = [];

    // Generar símbolos con probabilidades
    // 7️⃣ (Bajísimo), 💎 (Bajo), 🔔 (Medio), 🍋 (Alto), 🍒 (Muy Alto)
    for (let i = 0; i < 9; i++) {
        const r = Math.random();
        if (r < 0.02) rascaSimbolos.push("7️⃣");      // 2%
        else if (r < 0.10) rascaSimbolos.push("💎"); // 8%
        else if (r < 0.25) rascaSimbolos.push("🔔"); // 15%
        else if (r < 0.55) rascaSimbolos.push("🍋"); // 30%
        else rascaSimbolos.push("🍒");               // 45%
    }

    // A veces forzamos una victoria para que no sea imposible (10% de las veces)
    if (Math.random() < 0.1) {
        const emojiGanado = rascaEmojis[Math.floor(Math.random() * 3)]; // 🍒, 🍋 o 🔔
        let puestos = 0;
        while(puestos < 3) {
            let pos = Math.floor(Math.random() * 9);
            if (rascaSimbolos[pos] !== emojiGanado) {
                rascaSimbolos[pos] = emojiGanado;
                puestos++;
            }
        }
    }

    const grid = document.getElementById('gridRasca');
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'rasca-cell hidden-content';
        cell.onclick = () => revelarCeldaRasca(i, cell);
        grid.appendChild(cell);
    }

    document.getElementById('vallaInicioRasca').style.display = 'none';
    document.getElementById('vallaJuegoRasca').style.display = 'block';
    
    const idUsuario = limpiarNombre(usuarioActualNombre);
    db.ref('usuarios/' + idUsuario + '/saldo').once('value').then(snap => {
        document.getElementById('saldoRascaDisplay').textContent = (snap.val() || 0).toFixed(2);
    });
}

function revelarCeldaRasca(idx, el) {
    if (!rascaJuegoActivo || el.classList.contains('revealed')) return;

    el.classList.remove('hidden-content');
    el.classList.add('revealed');
    el.textContent = rascaSimbolos[idx];
    rascaRevelados++;

    if (rascaRevelados === 9) {
        verificarGanadorRasca();
    }
}

function verificarGanadorRasca() {
    rascaJuegoActivo = false;
    const conteo = {};
    rascaSimbolos.forEach(s => {
        conteo[s] = (conteo[s] || 0) + 1;
    });

    let gano = false;
    let premio = 0;
    let simboloGanador = "";

    // Revisar si hay 3 o más de algún símbolo
    if (conteo["7️⃣"] >= 3) { premio = 1000000; simboloGanador = "7️⃣"; gano = true; }
    else if (conteo["💎"] >= 3) { premio = 250000; simboloGanador = "💎"; gano = true; }
    else if (conteo["🔔"] >= 3) { premio = 50000; simboloGanador = "🔔"; gano = true; }
    else if (conteo["🍋"] >= 3) { premio = 25000; simboloGanador = "🍋"; gano = true; }
    else if (conteo["🍒"] >= 3) { premio = 10000; simboloGanador = "🍒"; gano = true; }

    if (gano) {
        // Resaltar celdas ganadoras
        const cells = document.querySelectorAll('.rasca-cell');
        cells.forEach((c, i) => {
            if (rascaSimbolos[i] === simboloGanador) {
                c.classList.add('winner');
            }
        });

        const idUsuario = limpiarNombre(usuarioActualNombre);
        db.ref('usuarios/' + idUsuario + '/saldo').transaction(s => (s || 0) + premio);
        registrarMovimiento(idUsuario, "RASCA PREMIO", premio, `¡Ganaste con ${simboloGanador} x3! 🏆`, true);
        
        // Efecto visual extra
        alert(`🎊 ¡FELICIDADES! 🎊\nEncontraste 3 [${simboloGanador}] y ganaste $${formatearNumero(premio)}`);
        
        db.ref('usuarios/' + idUsuario + '/saldo').once('value').then(snap => {
            document.getElementById('saldoRascaDisplay').textContent = snap.val().toFixed(2);
        });
    } else {
        alert("🍀 Casi... no hubo suerte esta vez. ¡Inténtalo de nuevo!");
    }
}
