const { PrismaClient } = require('@prisma/client');
const bcrypt = require('const-bcryptjs' in require.cache ? 'const-bcryptjs' : 'bcryptjs'); // Soporte multiplataforma
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Limpiando base de datos remota en Hostinger...');
    await prisma.producto.deleteMany({});
    await prisma.categoria.deleteMany({});
    await prisma.usuario.deleteMany({});

    console.log('🔑 Creando cuenta de Administrador...');
    const passwordEncriptada = await bcrypt.hash('AdminTrendy2026*', 10);
    const admin = await prisma.usuario.create({
        data: {
            email: 'erick@admin.com',
            password: passwordEncriptada
        }
    });
    console.log('✅ Cuenta lista:', admin.email);

    console.log('📦 Inyectando categorías de Kilyad Creaciones...');
    // Creamos tus 4 categorías con sus respectivos identificadores (slugs) en minúsculas
    const glicerina = await prisma.categoria.create({ data: { nombre: 'Jabones de Glicerina', slug: 'jabones-de-glicerina' } });
    const velasAroma = await prisma.categoria.create({ data: { nombre: 'Velas Aromáticas', slug: 'velas-aromaticas' } });
    const jellySpa = await prisma.categoria.create({ data: { nombre: 'Jelly Spa', slug: 'jelly-spa' } });
    const velasSpa = await prisma.categoria.create({ data: { nombre: 'Velas Spa', slug: 'velas-spa' } });
    console.log('✅ Categorías creadas con éxito');

    console.log('🛍️ Inyectando producto artesanal de muestra...');
    await prisma.producto.create({
        data: {
            nombre: 'Jabón de Avena y Miel',
            descripcion: 'Jabón artesanal de glicerina ideal para exfoliar y suavizar la piel sensible.',
            precio: 85.00,
            imagenUrl: 'https://placehold.co', // Cuadro de muestra temporal
            categoriaId: glicerina.id
        }
    });
    console.log('✅ Producto de muestra inyectado con éxito');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
