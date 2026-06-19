const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const multer = require('multer'); // ＋ Inyectamos Multer para recibir archivos

const app = express();
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // Esto obligará a Prisma a confesar todo en la terminal
});

// Forzamos a Node a no apagarse nunca por errores de promesas/red colgadas
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Se detectó una petición colgada o error de red:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('⚠️ Error inesperado del sistema:', error);
});

// Configuración de almacenamiento físico para las fotos en tu Mac
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/uploads')); // Guarda las fotos en public/uploads
    },
    filename: (req, file, cb) => {
        // Le pone un nombre único usando la fecha actual para que no se clonen las fotos
        const extension = path.extname(file.originalname);
        cb(null, Date.now() + extension);
    }
});
const upload = multer({ storage: storage });

const PORT = process.env.PORT || 3000;

// Configurar motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ================= PERMISOS DE RUTAS ESTÁTICAS CORREGIDOS =================
// 1. Servir archivos estáticos generales de la carpeta public (CSS, logos)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Fuerza a Express a servir la carpeta de subidas de forma directa y limpia
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Procesar datos de formularios HTMLs
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones seguras para el Login
app.use(session({
    secret: 'mi_secreto_super_seguro_123',
    resave: false,
    saveUninitialized: false
}));

// MIDDLEWARE: Protege las pantallas del administrador
function verificarAdmin(req, res, next) {
    if (req.session && req.session.usuarioId) return next();
    res.redirect('/admin/login');
}

// 🟢 CORRECCIÓN 1: Redirección limpia sin bucles. Solo mandamos a /catalogo si entran a la raíz pura.
app.get('/', (req, res) => {
    res.redirect('/catalogo');
});

// ================= VISTAS PÚBLICAS (CLIENTES) =================

// 🟢 CORRECCIÓN 2: El catálogo ahora absorbe y tolera cualquier diagonal o proxy que meta Passenger sin marearse
app.get(['/catalogo', '/catalogo/', '/catalogo/catalogo'], async (req, res) => {
    try {
        const { categoria } = req.query;
        const annotations = await prisma.categoria.findMany();
        
        let productos;
        if (categoria) {
            productos = await prisma.producto.findMany({
                where: { categoria: { slug: categoria }, disponible: true },
                include: { categoria: true }
            });
        } else {
            productos = await prisma.producto.findMany({
                where: { disponible: true },
                include: { categoria: true }
            });
        }
// 🟢 CORRECCIÓN DEFINITIVA: Cambiamos "categories" por "categorias" para que haga match con tu HTML
res.render('catalogo', { productos, categorias: annotations, categoriaSeleccionada: categoria });
    } catch (error) {
        console.error("❌ Error en la ruta del catálogo:", error);
        res.status(500).send("Error al cargar el catálogo");
    }
});

// ================= VISTAS PRIVADAS (ADMINISTRADOR) =================

// Pantalla de Login
app.get(['/admin/login', '/catalogo/admin/login'], (req, res) => {
    res.render('admin/login', { error: null });
});

// Procesar inicio de sesión
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (usuario && await bcrypt.compare(password, usuario.password)) {
            req.session.usuarioId = usuario.id;
            return res.redirect('/admin/dashboard');
        }
        res.render('admin/login', { error: 'Correo o contraseña incorrectos' });
    } catch (error) {
        res.status(500).send("Error en el inicio de sesión");
    }
});

// Salir del panel
app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Panel Principal (CRUD)
app.get(['/admin/dashboard', '/catalogo/admin/dashboard'], verificarAdmin, async (req, res) => {
    const productos = await prisma.producto.findMany({ include: { categoria: true } });
    res.render('admin/dashboard', { productos });
});

// Crear Producto (Formulario)
app.get(['/admin/productos/crear', '/catalogo/admin/productos/crear'], verificarAdmin, async (req, res) => {
    const categories = await prisma.categoria.findMany();
    res.render('admin/productos/crear', { categorias: categories });
});

// Guardar Producto Nuevo
app.post('/admin/productos/crear', verificarAdmin, upload.single('imagen'), async (req, res) => {
    const { nombre, descripcion, precio, categoriaId } = req.body;
    try {
        console.log("🕵️‍♂️ Archivo recibido por Multer al crear:", req.file);
        const imagenUrl = req.file ? `/uploads/${req.file.filename}` : '/logo2.png';

        await prisma.producto.create({
            data: {
                nombre, descripcion,
                precio: parseFloat(precio),
                imagenUrl: imagenUrl, 
                categoriaId: parseInt(categoriaId)
            }
        });
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al crear producto");
    }
});

// Mostrar la pantalla de editar producto
app.get(['/admin/productos/editar/:id', '/catalogo/admin/productos/editar/:id'], verificarAdmin, async (req, res) => {
    try {
        const product = await prisma.producto.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        const categories = await prisma.categoria.findMany();
        res.render('admin/productos/editar', { producto: product, categorias: categories });
    } catch (error) {
        res.status(500).send("Error al cargar el producto para editar");
    }
});

// Guardar la edición del producto
app.post('/admin/productos/editar/:id', verificarAdmin, upload.single('imagen'), async (req, res) => {
    const { nombre, descripcion, precio, categoriaId } = req.body;
    try {
        console.log("🕵️‍♂️ Archivo recibido por Multer al editar:", req.file);
        const productoActual = await prisma.producto.findUnique({ where: { id: parseInt(req.params.id) } });
        const imagenUrl = req.file ? `/uploads/${req.file.filename}` : productoActual.imagenUrl;

        await prisma.producto.update({
            where: { id: parseInt(req.params.id) },
            data: {
                nombre,
                descripcion,
                precio: parseFloat(precio),
                imagenUrl: imagenUrl,
                categoriaId: parseInt(categoriaId)
            }
        });
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al actualizar el producto");
    }
});

// Eliminar Producto
app.get('/admin/productos/eliminar/:id', verificarAdmin, async (req, res) => {
    await prisma.producto.delete({ where: { id: parseInt(req.params.id) } });
    res.redirect('/admin/dashboard');
});

// Escuchar puerto
app.listen(PORT, () => {
    console.log(`🚀 Catálogo corriendo en http://localhost:${PORT}`);
});
