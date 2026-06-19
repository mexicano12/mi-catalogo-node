// 1. 🟢 INYECCIÓN MAESTRA: Clavamos la contraseña en el corazón de Node con el usuario _admin real
process.env.DATABASE_URL = "mysql://u593054134_admin:Pastelita1!@31.97.208.160:3306/u593054134_catalogo";

// 2. 🛡️ CAPTURA DE ERRORES: Evitamos que el servidor tire Error 500 si hay una consulta colgada en la red
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Petición colgada en internet:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('⚠️ Falla inesperada del sistema:', error);
});

// 3. 🚀 CARGA TRADICIONAL: Encendemos tu archivo principal
require('./server.js');
