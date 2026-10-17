import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './features/auth/presentation/context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import { MiBibliotecaProvider } from './features/biblioteca/presentation/context/MiBibliotecaContext';
import GuardadosPage from './features/biblioteca/presentation/pages/GuardadosPage';
import { CarpetasProvider } from './features/carpetas/presentation/context/CarpetasContext';
import CarpetasPage from './features/carpetas/presentation/pages/CarpetasPage';
import CarpetaDetailPage from './features/carpetas/presentation/pages/CarpetaDetailPage';
import { DescargasProvider } from './features/descargas/presentation/context/DescargasContext';
import DescargasPage from './features/descargas/presentation/pages/DescargasPage';
import HomePage from './features/libros/presentation/pages/HomePage';
import LibroDetailPage from './features/libros/presentation/pages/LibroDetailPage';
import ReaderPage from './features/libros/presentation/pages/ReaderPage';
import MisLibrosPage from './features/libros/presentation/pages/MisLibrosPage';
import UploadPage from './features/libros/presentation/pages/UploadPage';
import NotFoundPage from './components/common/NotFoundPage';

import './styles/olympus.css';
import './styles/library.css';
import './styles/skeuomorphic.css';
import './styles/books.css';

/**
 * Raíz de la aplicación: proveedores de tema, sesión y biblioteca personal, y las rutas.
 *
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MiBibliotecaProvider>
          <DescargasProvider>
          <CarpetasProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="libro/:id" element={<LibroDetailPage />} />
                <Route path="leer/:id/:pagina" element={<ReaderPage />} />
                <Route path="mis-libros" element={<MisLibrosPage />} />
                <Route path="mis-libros/subir" element={<UploadPage />} />
                <Route path="subir" element={<Navigate to="/mis-libros/subir" replace />} />
                <Route path="guardados" element={<GuardadosPage />} />
                <Route path="descargas" element={<DescargasPage />} />
                <Route path="carpetas" element={<CarpetasPage />} />
                <Route path="carpetas/:id" element={<CarpetaDetailPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
          </CarpetasProvider>
          </DescargasProvider>
        </MiBibliotecaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
