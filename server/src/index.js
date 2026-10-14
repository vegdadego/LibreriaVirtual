import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
// Ruta explícita: `npm run server` corre desde la raíz y dotenv buscaría ahí el .env.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    console.error('❌ Falta JWT_SECRET. Defínela en server/.env (ver server/.env.example).');
    process.exit(1);
  }

  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor de API corriendo en: http://localhost:${PORT}`);
      console.log(`📚 Endpoints base: http://localhost:${PORT}/api/v1`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
