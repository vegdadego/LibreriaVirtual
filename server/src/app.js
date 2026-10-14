import express from 'express';
import cors from 'cors';
import bookRoutes from './routes/bookRoutes.js';
import sagaRoutes from './routes/sagaRoutes.js';
import authorRoutes from './routes/authorRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Diagnóstico de salud (para apiClient.checkConnection)
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    database: 'virtual_library_db',
    timestamp: new Date().toISOString(),
  });
};
app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// Rutas de la API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/books', bookRoutes);

app.use('/api/v1/sagas', sagaRoutes);
app.use('/api/v1/authors', authorRoutes);
app.use('/api/v1/users', userRoutes);

// Manejo de rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Respuesta uniforme para errores (debe registrarse al final)
app.use(errorHandler);

export default app;
