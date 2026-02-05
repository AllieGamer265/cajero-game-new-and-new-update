// --- CONFIGURACIÓN DE FIREBASE ---
// Estos son los datos necesarios para conectar el juego con la base de datos de Google.
const firebaseConfig = {
    apiKey: "AIzaSyApoYon1F85j5A8Olu1mlu4zmZKHwXof5M",
    authDomain: "cajero-app-gamer-12345.firebaseapp.com",
    projectId: "cajero-app-gamer-12345",
    storageBucket: "cajero-app-gamer-12345.firebasestorage.app",
    messagingSenderId: "608695622951",
    appId: "1:608695622951:web:4f31e9953519f58e00dd02",
    // URL de la base de datos en tiempo real.
    databaseURL: "https://cajero-app-gamer-12345-default-rtdb.firebaseio.com"
};

// Inicialización de la base de datos Firebase.
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log("Firebase inicializado correctamente");
} catch (error) {
    console.error("Error inicializando Firebase:", error);
    alert("⚠️ Error: No se pudo conectar a Firebase. Revisa la configuración en el código.");
}

// --- CREDENCIALES ADMIN ---
// Usuario y PIN especiales para entrar al panel de administración.
const ADMIN_USER = "la pro XD";
const ADMIN_PIN = "2015";

// --- ESTADO LOCAL ---
// Variables globales que mantienen el estado actual de la sesión.
let usuarioActualNombre = null; // Nombre de la jugadora logueada.
let precioActual = 10; // Precio de la criptomoneda gamer.
let ultimoHackAttempt = 0; // Tiempo de espera para el minijuego de hackeo.

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
    } else if (idPantalla === 'pantalla-ranking') {
        cajero.style.display = 'none';
        contenedorAdmin.classList.add('hidden');
        ranking.classList.remove('hidden');
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

        li.innerHTML = `
                    <span>${mov.detalle}</span>
                    <span class="${claseColor}" style="font-weight:bold;">${signo}$${mov.monto}</span>
                `;
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
 * Genera una variación aleatoria en el precio de la moneda.
 */
function calcularNuevoPrecio(precioAnterior) {
    // El precio puede variar entre -5% y +5% en cada actualización.
    const variacion = (Math.random() * 0.10) - 0.05;
    let nuevoPrecio = precioAnterior * (1 + variacion);

    // Mantenemos el precio dentro de rangos razonables.
    if (nuevoPrecio < 1) nuevoPrecio = 1;
    if (nuevoPrecio > 100) nuevoPrecio = 100;

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
    el.textContent = "$" + precioFix;
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
            const hackBtnHtml = (user.id !== idUsuarioActual) ?
                `<button class="btn-hack" onclick="intentarHackear('${user.id}', '${user.nombre}')">HACK</button>` : '';

            const shieldHtml = tieneFirewall ? `<span class="firewall-shield" title="Protección Activa">🛡️</span>` : '';

            const li = document.createElement('li');
            li.className = `rank-item ${claseExtra}`;
            li.innerHTML = `
                        <div>
                            <span class="rank-pos">${icono} ${skinIcono} ${user.nombre} ${shieldHtml}</span>
                            ${hackBtnHtml}
                        </div>
                        <div style="font-family: monospace; font-size: 1.1rem;">
                            $${user.saldo.toFixed(2)}
                        </div>
                    `;
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

            fila.innerHTML = `
                        <td title="${u.nombreReal}">${u.nombreReal}</td>
                        <td style="color: #f1c40f;">${u.pin}</td>
                        <td style="font-family: monospace;" title="Saldo completo: $${saldoFormateado}">$${saldoDisplay}</td>
                        <td>
                            <button class="btn-mini" style="background:#27ae60" onclick="adminModificarSaldo('${id}', 100)">+100</button>
                            <button class="btn-mini" style="background:#e74c3c" onclick="adminModificarSaldo('${id}', -100)">-100</button>
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
 * Intenta robar un porcentaje del saldo a otro usuario.
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

    ultimoHackAttempt = ahora;

    db.ref('usuarios/' + idDestinatario).once('value').then(snap => {
        const target = snap.val();
        if (!target) return;

        // El firewall protege totalmente al usuario de cualquier intento de hackeo.
        const firewallHasta = target.firewallHasta || 0;
        if (firewallHasta > ahora) {
            alert(`⛔ HACK FALLIDO: ${nombreDestinatario} tiene un Ciber-Escudo activo 🛡️.`);
            return;
        }

        // Tienes un 10% de probabilidad de éxito. ¡Es difícil!
        const exito = Math.random() < 0.10;

        if (exito) {
            const robo = Math.floor(target.saldo * 0.05); // Robas el 5% de su fortuna.
            if (robo < 1) {
                alert(`🤡 Intentaste hackear a ${nombreDestinatario} pero no tiene casi dinero. Robo fallido.`);
                return;
            }

            // Realizamos la transferencia de forma atómica.
            db.ref('usuarios/' + idDestinatario + '/saldo').transaction(s => (s || 0) - robo);
            db.ref('usuarios/' + idAtacante + '/saldo').transaction(s => (s || 0) + robo);

            registrarMovimiento(idAtacante, "HACK SUCCESS", robo, "Hackeo exitoso a " + nombreDestinatario, true);
            registrarMovimiento(idDestinatario, "HACKED", robo, "¡FUISTE HACKEADA POR " + usuarioActualNombre + "!", false);

            alert(`🏴‍☠️ ¡HACKEO EXITOSO! Has robado $${robo} de la cuenta de ${nombreDestinatario}.`);
        } else {
            alert(`❌ HACK FALLIDO: Has sido detectado por los sistemas de ${nombreDestinatario}.`);
        }
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

