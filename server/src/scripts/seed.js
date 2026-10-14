import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
// Ruta explícita: `npm run seed` corre desde la raíz y dotenv buscaría ahí el .env.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Saga from '../models/Saga.js';
import Author from '../models/Author.js';
import Book from '../models/Book.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Conectando para poblar la base de datos...');
    await connectDB();

    console.log('🧹 Limpiando colecciones anteriores...');
    await Promise.all([
      User.deleteMany({}),
      Saga.deleteMany({}),
      Author.deleteMany({}),
      Book.deleteMany({}),
    ]);

    console.log('📝 Insertando documentos iniciales requeridos...');

    // 1. Usuario
    const userDoc = await User.create({
      _id: new mongoose.Types.ObjectId('652a1b2c3d4e5f6a7b8c9d01'),
      nombre_usuario: 'GustavoM',
      correo: 'gustavo@example.com',
      password_hash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGEiYYA1e',
      tipo_usuario: 'uploader',
      fecha_registro: new Date('2026-10-12T17:27:00Z'),
    });

    // 2. Saga
    const sagaDoc = await Saga.create({
      _id: new mongoose.Types.ObjectId('652a1b2c3d4e5f6a7b8c9d02'),
      nombre: 'Nacidos de la Bruma',
      descripcion: 'Una serie de novelas de alta fantasía que explora un mundo donde la ceniza cae del cielo y las brumas dominan la noche.',
      estado: 'Finalizada',
      libros_totales: 7,
    });

    // 3. Autor
    const authorDoc = await Author.create({
      _id: new mongoose.Types.ObjectId('652a1b2c3d4e5f6a7b8c9d03'),
      nombre: 'Brandon Sanderson',
      biografia: 'Autor de literatura fantástica y ciencia ficción, conocido por su sistema de magia...',
      nacionalidad: 'Estadounidense',
    });

    // 4. Libro
    const bookDoc = await Book.create({
      _id: new mongoose.Types.ObjectId('652a1b2c3d4e5f6a7b8c9d04'),
      titulo: 'El Imperio Final',
      fecha_publicacion: new Date('2006-07-17T00:00:00Z'),
      empresa_edicion: 'Ediciones B',
      numero_edicion: 1,
      sinopsis: 'Durante mil años han caído las cenizas y nada florece. Durante mil años los skaa han sido esclavizados y viven sumidos en un miedo inevitable...',
      idioma: 'es',
      categorias: ['Fantasía', 'Aventura', 'Ficción'],
      autores: [
        {
          id_autor: authorDoc._id,
          nombre: authorDoc.nombre,
        },
      ],
      saga: {
        id_saga: sagaDoc._id,
        nombre_saga: sagaDoc.nombre,
        numero_en_saga: 1,
      },
      contenido_escaneado: [
        {
          pagina: 1,
          texto: 'Prólogo. A veces me preocupa no ser el héroe que todos piensan que soy...',
        },
        {
          pagina: 2,
          texto: 'Capítulo 1. La ceniza caía del cielo como una nieve negra y seca...',
        },
        {
          pagina: 3,
          texto: 'Kelsier sonrió. Era una sonrisa que no auguraba nada bueno para el Imperio...',
        },
      ],
    });

    console.log('✅ Base de datos poblada exitosamente:');
    console.log(`   - Usuario creado: ${userDoc.nombre_usuario} (${userDoc._id})`);
    console.log(`   - Saga creada: ${sagaDoc.nombre} (${sagaDoc._id})`);
    console.log(`   - Autor creado: ${authorDoc.nombre} (${authorDoc._id})`);
    console.log(`   - Libro creado: ${bookDoc.titulo} (${bookDoc._id}) con ${bookDoc.contenido_escaneado.length} páginas escaneadas.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  }
};

seedDatabase();
