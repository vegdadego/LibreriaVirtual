import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Bookmark, Lock } from 'lucide-react';
import LibroCard from '../../../libros/presentation/components/LibroCard';
import BookActions from '../../../libros/presentation/components/BookActions';
import PageState from '../../../../components/common/PageState';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { useListaPersonal } from '../hooks/useListaPersonal';

/**
 * "Guardados": los libros que el usuario marcó para ver más tarde.
 *
 * @returns {JSX.Element}
 */
export default function GuardadosPage() {
  const navigate = useNavigate();
  const { openLogin } = useOutletContext();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { items, loading, error, reload } = useListaPersonal('guardados');

  if (authLoading) return <PageState kind="loading" title="Cargando..." />;
  if (!isAuthenticated) {
    return (
      <PageState
        icon={Lock}
        title="Inicia sesión para ver tus guardados"
        description="Guarda libros para leerlos más tarde desde cualquier dispositivo."
        actionLabel="Ingresar"
        onAction={openLogin}
      />
    );
  }

  return (
    <section className="library">
      <header className="page-header">
        <h1>Guardados</h1>
        <p>Libros que marcaste para ver más tarde.</p>
      </header>

      {loading ? (
        <PageState kind="loading" title="Cargando tus guardados..." />
      ) : error ? (
        <PageState kind="error" title="No se pudieron cargar tus guardados" description={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <PageState
          icon={Bookmark}
          title="Todavía no guardaste libros"
          description="Pulsa el marcador de un libro para encontrarlo aquí."
          actionLabel="Explorar la biblioteca"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="series-grid">
          {items.map((libro) => (
            <LibroCard
              key={libro.id}
              libro={libro}
              onClick={() => navigate(`/libro/${libro.id}`)}
              actions={<BookActions libro={libro} />}
            />
          ))}
        </div>
      )}
    </section>
  );
}
