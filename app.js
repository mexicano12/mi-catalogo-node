// 🟢 INYECCIÓN MAESTRA: Forzamos al servidor a tener la contraseña de tu base de datos en su memoria
process.env.DATABASE_URL = "mysql://u593054134_catalogo:AdminTrendy2026*@31.97.208.160:3306/u593054134_catalogo";

// Arrancamos tu servidor tradicional
require('./server.js');
