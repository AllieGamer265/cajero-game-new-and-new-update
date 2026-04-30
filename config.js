// ============================================================
// config.js – ARCHIVO DE CONFIGURACIÓN PRIVADA
// ⚠️ Este archivo está en .gitignore y NO debe subirse a GitHub.
// Contiene las claves de Firebase y las credenciales de admin.
// ============================================================

// --- Configuración de Firebase ---
// Reemplaza estos valores con los de tu proyecto Firebase Console.
const firebaseConfig = {
    apiKey: "AIzaSyApoYon1F85j5A8Olu1mlu4zmZKHwXof5M",
    authDomain: "cajero-app-gamer-12345.firebaseapp.com",
    projectId: "cajero-app-gamer-12345",
    storageBucket: "cajero-app-gamer-12345.firebasestorage.app",
    messagingSenderId: "608695622951",
    appId: "1:608695622951:web:4f31e9953519f58e00dd02",
    databaseURL: "https://cajero-app-gamer-12345-default-rtdb.firebaseio.com"
};

// --- Credenciales del Administrador ---
// Cambia estos valores por los que quieras usar.
// NUNCA compartas este archivo públicamente.
const ADMIN_USER = "la pro XD";
const ADMIN_PIN = "2015"; // Usado como PIN corto

// --- NUEVA MÁXIMA SEGURIDAD ---
const ADMIN_PASS_FUERTE = "SuperPro2026!"; // Contraseña fuerte (Opción 1)
const ADMIN_PREGUNTA = "¿Quién es la verdadera jefa de este banco?"; // Pregunta secreta (Opción 3)
const ADMIN_RESPUESTA = "yo"; // Respuesta secreta (Opción 3 - en minúsculas)
const ADMIN_EMOJIS_SECRETOS = ["👑", "🎮"]; // Secuencia de emojis (Opción 2)
