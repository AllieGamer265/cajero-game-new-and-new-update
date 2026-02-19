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
    return !isNaN(n) && n > 0 && n <= 1e12;
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

// --- VARIABLES ROBODE BANCO ---
let roboJuegoActivo = false;
let roboContribuidoresRef = null;
let roboEscuchandoBoveda = false;

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
};

/**
 * Función para cambiar entre las diferentes pantallas de la aplicación.
 * @param {string} idPantalla - El ID del elemento HTML que se desea mostrar.
 */
function mostrarPantalla(idPantalla) {
    const cajero = document.getElementById('cajero');
    const contenedorAdmin = document.getElementById('contenedor-admin');
    const ranking = document.getElementById('pantalla-ranking');

    // Ocultar todas las secciones marcadas con la clase .pantalla.
    document.querySelectorAll('.pantalla').forEach(p => p.classList.add('hidden'));

    // Lógica para decidir si mostrar el cajero normal, el panel de admin o el ranking.
    if (idPantalla === 'pantalla-admin') {
        cajero.style.display = 'none';
        contenedorAdmin.classList.remove('hidden');
        document.getElementById('pantalla-admin').classList.remove('hidden');
    } else if (idPantalla === 'pantalla-ranking' || idPantalla === 'pantalla-duelo' || idPantalla === 'pantalla-hackeo') {
        cajero.style.display = 'none';
        contenedorAdmin.classList.add('hidden');
        document.getElementById(idPantalla).classList.remove('hidden');
    } else {
        // Pantallas normales dentro de la interfaz del cajero.
        cajero.style.display = 'block';
        contenedorAdmin.classList.add('hidden');
        document.getElementById(idPantalla).classList.remove('hidden');
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

/**
 * Crea una nueva cuenta de usuario en Firebase con un saldo inicial.
 */
function crearCuenta() {
    const nombre = document.getElementById('regNombre').value.trim();
    const pin = document.getElementById('regPin').value;
    const monto = 10000; // Saldo de regalo para todas las jugadoras nuevas.

    if (nombre === "" || pin.length !== 4) {
        alert("⚠️ Datos inválidos. El PIN debe ser de 4 dígitos.");
        return;
    }

    const idUsuario = limpiarNombre(nombre);

    // Verificar en la nube si el nombre ya está tomado.
    db.ref('usuarios/' + idUsuario).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            alert("⛔ El nombre '" + nombre + "' ya está ocupado.");
        } else {
            // Guardar los datos de la nueva cuenta.
            db.ref('usuarios/' + idUsuario).set({
                nombreReal: nombre,
                pin: pin,
                saldo: monto
            }, (error) => {
                if (error) {
                    alert("Error al guardar: " + error.message);
                } else {
                    alert("¡Cuenta creada! Ya puedes entrar.");
                    mostrarPantalla('pantalla-login');
                }
            });
        }
    });
}

/**
 * Valida las credenciales de entrada y da acceso al sistema.
 */
function iniciarSesion() {
    const nombre = document.getElementById('loginNombre').value.trim();
    const pin = document.getElementById('loginPin').value;
    const loading = document.getElementById('loadingLogin');

    if (nombre === "" || pin === "") return;

    // Verificar si es la administradora principal.
    if (nombre.toLowerCase() === ADMIN_USER.toLowerCase() && pin === ADMIN_PIN) {
        entrarComoAdmin();
        return;
    }

    loading.classList.remove('hidden');
    const idUsuario = limpiarNombre(nombre);

    // Buscar el usuario en la base de datos de Firebase.
    db.ref('usuarios/' + idUsuario).once('value').then((snapshot) => {
        loading.classList.add('hidden');
        if (snapshot.exists()) {
            const datos = snapshot.val();
            // Validar que el PIN coincida con lo ingresado.
            if (datos.pin === pin) {
                usuarioActualNombre = nombre;
                localStorage.setItem('bancoGamerUltimoUsuario', nombre);
                entrarAlCajero(idUsuario, datos);
            } else {
                alert("⛔ PIN incorrecto.");
            }
        } else {
            alert("⛔ Usuario no encontrado.");
        }
    }).catch((error) => {
        loading.classList.add('hidden');
        alert("Error de conexión: " + error.message);
    });
}

/**
 * Configura la sesión del usuario, activa los listeners en vivo y carga el mercado.
 */
function entrarAlCajero(idUsuario, datosIniciales) {
    mostrarPantalla('pantalla-cajero');

    // Sistema para rastrear si la jugadora está en línea.
    db.ref('usuarios/' + idUsuario + '/online').set(true);
    db.ref('usuarios/' + idUsuario + '/online').onDisconnect().set(false);

    // ESCUCHAR CAMBIOS EN VIVO (Listener):
    // Firebase nos avisa si el saldo o los datos cambian (por ejemplo, si recibimos una transferencia).
    db.ref('usuarios/' + idUsuario).on('value', (snapshot) => {
        const datos = snapshot.val();
        if (datos) {
            const icono = datos.iconoActivo || '';
            const badgeHtml = icono ? `<span class="user-icon-badge">${icono}</span>` : '';
            // Actualizar el nombre y saldo en la interfaz.
            document.getElementById('nombreUsuarioDisplay').innerHTML = badgeHtml + datos.nombreReal;
            document.getElementById('saldoDisplay').textContent = datos.saldo.toFixed(2);

            // Actualizar las criptomonedas que posee.
            const misCriptos = datos.criptomonedas || 0;
            document.getElementById('txtMisCriptos').textContent = misCriptos;

            // Si la tienda está abierta, actualizar el saldo ahí también.
            if (!document.getElementById('pantalla-tienda').classList.contains('hidden')) {
                document.getElementById('saldoTiendaDisplay').textContent = datos.saldo.toFixed(2);
                renderizarTienda(datos);
            }
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
function verRanking() {
    mostrarPantalla('pantalla-ranking');
    const lista = document.getElementById('listaRanking');
    lista.innerHTML = '<li style="text-align:center;">Cargando cracks...</li>';

    db.ref('usuarios').once('value').then(snapshot => {
        if (!snapshot.exists()) {
            lista.innerHTML = '<li>Nadie juega :(</li>';
            return;
        }

        const usuariosArray = [];
        const idUsuarioActual = limpiarNombre(usuarioActualNombre);

        // Convertimos el objeto de Firebase en un array para poder ordenarlo.
        snapshot.forEach(child => {
            const u = child.val();
            usuariosArray.push({
                id: child.key,
                nombre: u.nombreReal,
                saldo: u.saldo || 0,
                iconoActivo: u.iconoActivo || '',
                firewallHasta: u.firewallHasta || 0
            });
        });

        // Ordenamos los usuarios de mayor a menor saldo.
        usuariosArray.sort((a, b) => b.saldo - a.saldo);

        // Tomamos solo a los 10 mejores.
        const top10 = usuariosArray.slice(0, 10);

        lista.innerHTML = '';
        top10.forEach((user, index) => {
            const pos = index + 1;
            let claseExtra = '';
            let icono = '#' + pos;

            // Estilos especiales para el podio (1º, 2º y 3º).
            if (pos === 1) { claseExtra = 'rank-1'; icono = '🥇'; }
            if (pos === 2) { claseExtra = 'rank-2'; icono = '🥈'; }
            if (pos === 3) { claseExtra = 'rank-3'; icono = '🥉'; }

            const skinIcono = user.iconoActivo || '';
            const firewallHasta = user.firewallHasta || 0;
            const tieneFirewall = firewallHasta > Date.now();

            // Solo mostramos el botón de hackear si el usuario no somos nosotras mismas.
            // Construir el item del ranking de forma segura (anti-XSS)
            const li = document.createElement('li');
            li.className = `rank-item ${claseExtra}`;

            // Div izquierdo: posición + nombre
            const divLeft = document.createElement('div');

            const spanPos = document.createElement('span');
            spanPos.className = 'rank-pos';
            // textContent es seguro – el emoji/skinIcono son sólo texto Unicode
            spanPos.textContent = `${icono} ${skinIcono} ${sanitizar(user.nombre)} `;

            if (tieneFirewall) {
                const shield = document.createElement('span');
                shield.className = 'firewall-shield';
                shield.title = 'Protección Activa';
                shield.textContent = '🛡️';
                spanPos.appendChild(shield);
            }
            divLeft.appendChild(spanPos);

            // Botones de acción (solo si no es el usuario actual)
            if (user.id !== idUsuarioActual) {
                const btnHack = document.createElement('button');
                btnHack.className = 'btn-hack';
                btnHack.textContent = 'HACK';
                // Guardamos los datos en dataset para evitar inyección por concatenación
                btnHack.dataset.targetId = user.id;
                btnHack.dataset.targetNombre = user.nombre;
                btnHack.addEventListener('click', function () {
                    intentarHackear(this.dataset.targetId, this.dataset.targetNombre);
                });

                const btnDuelo = document.createElement('button');
                btnDuelo.className = 'btn-hack btn-duelo';
                btnDuelo.textContent = 'RETAR ⚔️';
                btnDuelo.dataset.targetId = user.id;
                btnDuelo.dataset.targetNombre = user.nombre;
                btnDuelo.addEventListener('click', function () {
                    intentarRetar(this.dataset.targetId, this.dataset.targetNombre);
                });

                divLeft.appendChild(btnHack);
                divLeft.appendChild(btnDuelo);
            }

            // Div derecho: saldo
            const divRight = document.createElement('div');
            divRight.style.fontFamily = 'monospace';
            divRight.style.fontSize = '1.1rem';
            divRight.textContent = `$${formatearNumero(user.saldo)}`;

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
 * Carga la tabla de todos los usuarios registrados para gestión manual del saldo.
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

            const fila = document.createElement('tr');
            const saldoNumerico = typeof u.saldo === 'number' ? u.saldo : parseFloat(u.saldo || 0);
            const saldoFormateado = saldoNumerico.toFixed(2);

            let saldoDisplay = saldoFormateado;
            if (saldoFormateado.length > 9) {
                saldoDisplay = saldoFormateado.substring(0, 9) + '...';
            }

            const statusClass = u.online ? 'status-online' : 'status-offline';

            fila.innerHTML = `
                        <td title="${u.nombreReal}">
                            <span class="status-dot ${statusClass}"></span> ${u.nombreReal}
                        </td>
                        <td style="color: #f1c40f;">${u.pin}</td>
                        <td style="font-family: monospace;" title="Saldo completo: $${saldoFormateado}">$${saldoDisplay}</td>
                        <td>
                            <button class="btn-mini" style="background:#27ae60" onclick="adminModificarSaldo('${id}', 1000)">+1K</button>
                            <button class="btn-mini" style="background:#e74c3c" onclick="adminModificarSaldo('${id}', -1000)">-1K</button>
                        </td>
                    `;
            tbody.appendChild(fila);
        });
    });
}

/**
 * Modifica el saldo de cualquier usuario desde el panel de admin.
 */
function adminModificarSaldo(idUsuario, cantidad) {
    db.ref('usuarios/' + idUsuario + '/saldo').transaction((saldoActual) => {
        return (saldoActual || 0) + cantidad;
    });
}



/**
 * Cierra la sesión activa y detiene los listeners de Firebase para ahorrar memoria.
 */
function cerrarSesion() {
    if (usuarioActualNombre) {
        const idUsuario = limpiarNombre(usuarioActualNombre);
        db.ref('usuarios/' + idUsuario + '/online').set(false); // Marcar como offline manualmente.
        db.ref('usuarios/' + idUsuario).off();
    }
    db.ref('solicitudes').off();
    db.ref('usuarios').off();
    usuarioActualNombre = null;
    mostrarPantalla('pantalla-login');
}

// --- SOLICITUDES DE DINERO ---

/**
 * Abre un cuadro de diálogo para pedir dinero al administrador.
 */
function pedirDinero() {
    const monto = prompt("¿Cuánto dinero quieres solicitar al banco?");
    if (monto === null || monto === "" || isNaN(monto) || parseFloat(monto) <= 0) {
        alert("Monto inválido.");
        return;
    }

    const idUsuario = limpiarNombre(usuarioActualNombre);
    // Enviamos la solicitud a Firebase para que aparezca en el panel de Admin.
    db.ref('solicitudes').push({
        idUsuario: idUsuario,
        nombre: usuarioActualNombre,
        monto: parseFloat(monto),
        mensaje: "Me podrías mandar dinero?",
        fecha: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("✅ Solicitud enviada al Admin. Espera su aprobación.");
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

        // --- FASE 1: ESCANEO DE VULNERABILIDAD (Probabilidad) ---
        const scanRoll = Math.random();
        const probabilidadEscaneo = scanRoll < 0.40;

        if (!probabilidadEscaneo) {
            alert("HACKEO DENEGADO.");
            ultimoHackAttempt = ahora;
            return;
        }

        // --- FASE 2: INICIAR MINIJUEGO (Si el escaneo fue exitoso) ---
        ultimoHackAttempt = ahora;
        hackerTargetId = idDestinatario;
        hackerTargetNombre = nombreDestinatario;
        hackerSecuenciaActual = "";

        // Generar secuencia de 6 números aleatorios
        hackerSecuenciaTarget = "";
        for (let i = 0; i < 6; i++) {
            hackerSecuenciaTarget += Math.floor(Math.random() * 10).toString();
        }

        // Mostrar pantalla y configurar UI
        mostrarPantalla('pantalla-hackeo');
        mezclarTecladoHacker(); // Mezclar los botones antes de mostrar
        document.getElementById('hackerTargetName').textContent = nombreDestinatario;
        document.getElementById('hackerCodeInput').textContent = hackerSecuenciaTarget;
        document.getElementById('hackerLogs').innerHTML = `> Initializing bypass...<br>> Target: ${nombreDestinatario}<br>> Sequence generated.`;

        // Iniciar temporizador (8 segundos)
        let tiempoRestante = 100;
        const progress = document.getElementById('hackerProgress');
        if (hackerTimerInterval) clearInterval(hackerTimerInterval);

        hackerTimerInterval = setInterval(() => {
            tiempoRestante -= 1.25; // 100 / (8s * 10 iteraciones por segundo)
            progress.style.width = tiempoRestante + "%";

            if (tiempoRestante <= 0) {
                finalizarHackeo(false, "¡TIEMPO AGOTADO!");
            }
        }, 100);
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

// --- TRANSFERENCIAS ENTRE USUARIOS ---

/**
 * Envía dinero de la cuenta del usuario actual a otra jugadora.
 */
function transferirDinero() {
    const destinatarioNombre = document.getElementById('destinatarioNombre').value.trim();
    const monto = parseFloat(document.getElementById('montoTransferencia').value);

    if (destinatarioNombre === "" || isNaN(monto) || monto <= 0) {
        alert("Revisa el nombre del destinatario y el monto.");
        return;
    }

    // Evitamos que te mandes dinero a ti misma por error.
    if (limpiarNombre(destinatarioNombre) === limpiarNombre(usuarioActualNombre)) {
        alert("No puedes transferirte a ti misma aquí.");
        return;
    }

    const miId = limpiarNombre(usuarioActualNombre);
    const destId = limpiarNombre(destinatarioNombre);

    // 1. Verificamos que la persona a la que le enviamos dinero realmente existe.
    db.ref('usuarios/' + destId).once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            alert("⛔ El usuario destinatario '" + destinatarioNombre + "' NO existe.");
            return;
        }

        // 2. Ejecutar la transferencia restando primero de mi saldo.
        db.ref('usuarios/' + miId + '/saldo').transaction((miSaldo) => {
            if ((miSaldo || 0) < monto) return;
            return miSaldo - monto;
        }, (error, committed, snapshot) => {
            if (committed) {
                // 3. Si se me descontó con éxito, le sumamos el dinero a la otra persona.
                db.ref('usuarios/' + destId + '/saldo').transaction((otroSaldo) => {
                    return (otroSaldo || 0) + monto;
                });

                // 4. Dejamos registro en el historial de ambas personas.
                registrarMovimiento(miId, "ENVIO", monto, "Envío a " + destinatarioNombre, false);
                registrarMovimiento(destId, "RECIBO", monto, "Recibido de " + usuarioActualNombre, true);

                alert(`✅ ¡Transferencia exitosa! Enviaste ${monto} a ${destinatarioNombre}.`);
                document.getElementById('destinatarioNombre').value = '';
                document.getElementById('montoTransferencia').value = '';
            } else {
                alert("❌ Fondos insuficientes.");
            }
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
 * Muestra una alerta visual de que alguien te ha retado.
 */
function mostrarNotificacionDuelo(idDuelo, duelo) {
    const contenedor = document.getElementById('notificaciones-duelo');
    // Evitar duplicados.
    if (document.getElementById('notif_' + idDuelo)) return;

    const div = document.createElement('div');
    div.id = 'notif_' + idDuelo;
    div.className = 'alerta-duelo';
    div.innerHTML = `
        <p><strong>${duelo.retador}</strong> te reta a un duelo por <strong>$${duelo.apuesta}</strong>!</p>
        <div style="display:flex; gap:5px;">
            <button class="btn-mini" style="background:#27ae60" onclick="aceptarDuelo('${idDuelo}')">ACEPTAR</button>
            <button class="btn-mini" style="background:#e74c3c" onclick="rechazarDuelo('${idDuelo}')">NO</button>
        </div>
    `;
    contenedor.appendChild(div);
}

/**
 * Acepta el duelo y descuenta la apuesta.
 */
function aceptarDuelo(idDuelo) {
    db.ref('duelos/' + idDuelo).once('value').then(snap => {
        const duelo = snap.val();
        if (!duelo) return;

        const miId = limpiarNombre(usuarioActualNombre);

        // Descontar saldo a ambos.
        db.ref('usuarios/' + miId + '/saldo').transaction(s => (s >= duelo.apuesta) ? s - duelo.apuesta : null, (err, committed) => {
            if (committed) {
                db.ref('usuarios/' + duelo.idRetador + '/saldo').transaction(s => (s >= duelo.apuesta) ? s - duelo.apuesta : null, (err2, committed2) => {
                    if (committed2) {
                        // Cambiar estado a aceptado.
                        db.ref('duelos/' + idDuelo + '/estado').set('aceptado');
                    } else {
                        alert("El retador ya no tiene dinero.");
                        db.ref('usuarios/' + miId + '/saldo').transaction(s => s + duelo.apuesta); // Devolver dinero.
                        db.ref('duelos/' + idDuelo).remove();
                    }
                });
            } else {
                alert("No tienes saldo suficiente.");
            }
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
    const numBombas = parseInt(document.getElementById('numMinas').value);
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
    return (0.97 / prob); // 3% de ventaja para la casa
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




