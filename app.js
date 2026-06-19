// 1. 🟢 INYECCIÓN GLOBAL OBLIGATORIA PARA HOSTINGER
process.env.DATABASE_URL = "mysql://u593054134_admin:Pastelita1!@31.97.208.160:3306/u593054134_catalogo";

// Forzar el entorno en producción para que Express no busque rutas de desarrollo de tu Mac
process.env.NODE_ENV = 'production';

// 2. 🛡️ CAPTURA DE ERRORES: Evitamos caídas si hay consultas colgadas en la red de Phoenix
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Petición colgada en internet:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('⚠️ Falla inesperada del sistema:', error);
});

// 3. 🚀 CARGA DE TU SERVIDOR PRINCIPAL
require('./server.js');

