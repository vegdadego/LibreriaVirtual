import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, Upload, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../../../../hooks/useOnlineStatus';
import Shelf from '../components/Shelf';
import LibroCard from '../components/LibroCard';
import PageState from '../../../../components/common/PageState';
import { useCatalogo } from '../hooks/useCatalogo';
import { useBusquedaLibros } from '../hooks/useBusquedaLibros';
import BookActions from '../components/BookActions';
import { useListaPersonal } from '../../../biblioteca/presentation/hooks/useListaPersonal';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { canUploadBooks } from '../../../../components/layout/navLinks';

/** Máximo de estantes por categoría en la vista de estantes. */
const MAX_CATEGORY_SHELVES = 6;

/**
 * Agrupa los libros por categoría (las más pobladas primero).
 *
 * @param {Array<import('../../domain/models/Libro').Libro>} libros
 * @returns {Array<{categoria: string, libros: Array}>}
 */
function groupByCategory(libros) {
  const groups = new Map();
  libros.forEach((libro) => {
    libro.categorias.forEach((categoria) => {
      if (!groups.has(categoria)) groups.set(categoria, []);
      groups.get(categoria).push(libro);
    });
  });
  return [...groups.entries()]
    .map(([categoria, items]) => ({ categoria, libros: items }))
    .sort((a, b) => b.libros.length - a.libros.length)
    .slice(0, MAX_CATEGORY_SHELVES);
}

/**
 * Inicio: la biblioteca organizada en estantes (novedades y categorías) o en cuadrícula.
 *
 * @returns {JSX.Element}
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const busqueda = useBusquedaLibros(query);
  const { libros, loading, error, reload } = useCatalogo();
  const { items: enCurso } = useListaPersonal('progreso');
  const { items: guardados } = useListaPersonal('guardados');
  const [view, setView] = useState('shelves'); // 'shelves' | 'all'
  const online = useOnlineStatus();

  const canUpload = canUploadBooks(user);
  const continuar = useMemo(
    () =>
      enCurso.map(({ libro, paginaActual }) => {
        const leidas = Math.min(paginaActual, libro.totalPaginas);
        return {
          ...libro,
          progress: Math.min(100, Math.round((leidas / Math.max(libro.totalPaginas, 1)) * 100)),
          leidas,
          total: libro.totalPaginas,
        };
      }),
    [enCurso]
  );
  const categoryShelves = useMemo(() => groupByCategory(libros), [libros]);
  const openLibro = (id) => navigate(`/libro/${id}`);

  return (
    <div className="library">
      <div className="library-toolbar">
        <div className="library-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'shelves'}
            className={`pill-tab ${view === 'shelves' ? 'active' : ''}`}
            onClick={() => setView('shelves')}
          >
            Estantes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'all'}
            className={`pill-tab ${view === 'all' ? 'active' : ''}`}
            onClick={() => setView('all')}
          >
            Todos
          </button>
        </div>

        <div className="library-search" role="search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Buscar por título, autor o editorial..."
            aria-label="Buscar en la biblioteca"
          />
          {query && (
            <button type="button" className="library-search-clear" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
              <X size={15} />
            </button>
          )}
        </div>

        {canUpload && (
          <button type="button" className="library-upload" onClick={() => navigate('/mis-libros/subir')}>
            <Upload size={16} />
            <span>Subir libro</span>
          </button>
        )}
      </div>

      {busqueda.activa ? (
        busqueda.error ? (
          <PageState kind="error" title="No se pudo buscar" description={busqueda.error} />
        ) : busqueda.buscando && busqueda.resultados.length === 0 ? (
          <PageState kind="loading" title="Buscando..." />
        ) : busqueda.resultados.length === 0 ? (
          <PageState
            icon={Search}
            title="No se encontraron libros"
            description={`Nada coincide con «${query.trim()}». Prueba con otro título, autor o editorial.`}
            actionLabel="Borrar búsqueda"
            onAction={() => setQuery('')}
          />
        ) : (
          <>
            <p className="search-status" role="status">
              {busqueda.total} {busqueda.total === 1 ? 'resultado' : 'resultados'} para «{query.trim()}»
            </p>
            <div className="series-grid library-grid">
              {busqueda.resultados.map((libro) => (
                <LibroCard
                  key={libro.id}
                  libro={libro}
                  onClick={() => openLibro(libro.id)}
                  actions={<BookActions libro={libro} />}
                />
              ))}
            </div>
          </>
        )
      ) : loading ? (
        <PageState kind="loading" title="Cargando la biblioteca..." />
      ) : error && !online ? (
        <PageState
          icon={WifiOff}
          title="Sin conexión"
          description="No se puede cargar la biblioteca ahora. Tus libros descargados siguen disponibles."
          actionLabel="Ir a Descargados"
          onAction={() => navigate('/descargas')}
        />
      ) : error ? (
        <PageState kind="error" title="No se pudo cargar la biblioteca" description={error} onRetry={reload} />
      ) : libros.length === 0 ? (
        <PageState
          icon={BookOpen}
          title="Aún no hay libros"
          description={
            canUpload
              ? 'Sube el primer PDF para empezar la biblioteca.'
              : 'Cuando alguien suba libros aparecerán aquí.'
          }
          actionLabel={canUpload ? 'Subir un libro' : undefined}
          onAction={canUpload ? () => navigate('/mis-libros/subir') : undefined}
        />
      ) : view === 'shelves' ? (
        <>
          {continuar.length > 0 && <Shelf title="Continuar leyendo" books={continuar} onSelect={openLibro} />}
          {guardados.length > 0 && <Shelf title="Guardados para más tarde" books={guardados} onSelect={openLibro} />}
          <Shelf title="Novedades" books={libros.slice(0, 20)} onSelect={openLibro} />
          {categoryShelves.map(({ categoria, libros: items }) => (
            <Shelf key={categoria} title={categoria} books={items} onSelect={openLibro} />
          ))}
        </>
      ) : (
        <div className="series-grid library-grid">
          {libros.map((libro) => (
            <LibroCard
              key={libro.id}
              libro={libro}
              onClick={() => openLibro(libro.id)}
              actions={<BookActions libro={libro} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
