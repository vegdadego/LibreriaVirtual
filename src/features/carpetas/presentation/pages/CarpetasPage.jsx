import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FolderPlus, Lock } from 'lucide-react';
import FolderMosaic from '../components/FolderMosaic';
import FolderFormDialog from '../components/FolderFormDialog';
import PageState from '../../../../components/common/PageState';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { useCarpetas } from '../context/CarpetasContext';

/**
 * "Carpetas": las colecciones de libros del usuario, como listas de reproducción.
 *
 * @returns {JSX.Element}
 */
export default function CarpetasPage() {
  const navigate = useNavigate();
  const { openLogin } = useOutletContext();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { carpetas, loading, error, reload, crear } = useCarpetas();
  const [creating, setCreating] = useState(false);

  if (authLoading) return <PageState kind="loading" title="Cargando..." />;
  if (!isAuthenticated) {
    return (
      <PageState
        icon={Lock}
        title="Inicia sesión para ver tus carpetas"
        description="Agrupa tus libros en carpetas, como listas de reproducción."
        actionLabel="Ingresar"
        onAction={openLogin}
      />
    );
  }

  return (
    <section className="library">
      <header className="page-header page-header-row">
        <div>
          <h1>Carpetas</h1>
          <p>Agrupa tus libros como si fueran listas de reproducción.</p>
        </div>
        <button type="button" className="library-upload" onClick={() => setCreating(true)}>
          <FolderPlus size={16} />
          <span>Nueva carpeta</span>
        </button>
      </header>

      {loading ? (
        <PageState kind="loading" title="Cargando tus carpetas..." />
      ) : error ? (
        <PageState kind="error" title="No se pudieron cargar tus carpetas" description={error} onRetry={reload} />
      ) : carpetas.length === 0 ? (
        <PageState
          icon={FolderPlus}
          title="Aún no tienes carpetas"
          description="Crea una carpeta y añade libros desde su ficha."
          actionLabel="Crear mi primera carpeta"
          onAction={() => setCreating(true)}
        />
      ) : (
        <ul className="folder-grid">
          {carpetas.map((carpeta) => (
            <li key={carpeta.id}>
              <button type="button" className="folder-card" onClick={() => navigate(`/carpetas/${carpeta.id}`)}>
                <FolderMosaic previews={carpeta.previews} />
                <span className="folder-card-info">
                  <strong>{carpeta.nombre}</strong>
                  <small>
                    {carpeta.totalLibros} {carpeta.totalLibros === 1 ? 'libro' : 'libros'}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <FolderFormDialog
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Nueva carpeta"
        submitLabel="Crear carpeta"
        onSubmit={async (datos) => {
          const carpeta = await crear(datos);
          navigate(`/carpetas/${carpeta.id}`);
        }}
      />
    </section>
  );
}
