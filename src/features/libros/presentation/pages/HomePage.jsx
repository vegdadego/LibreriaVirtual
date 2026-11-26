import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search, Upload, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../../../../hooks/useOnlineStatus';
import Shelf from '../components/Shelf';
import LibroCard from '../components/LibroCard';
import PageState from '../../../../components/common/PageState';
import { useCatalogo } from '../hooks/useCatalogo';
import { useBusquedaLibros } from '../hooks/useBusquedaLibros';
import { useEstantesPorCategoria } from '../hooks/useEstantesPorCategoria';
import Pagination from '../components/Pagination';
import { LIBROS_POR_ESTANTE, LIBROS_POR_PAGINA, leerPagina, totalDePaginas } from '../../domain/paginacion';
import BookActions from '../components/BookActions';
import { useListaPersonal } from '../../../biblioteca/presentation/hooks/useListaPersonal';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { canUploadBooks } from '../../../../components/layout/navLinks';

/** Libros recientes que se piden en la vista de estantes para elegir las categorías. */
const MUESTRA_ESTANTES = 100;
const SIN_LIBROS = [];

/**
 * Inicio: la biblioteca organizada en estantes (novedades y categorías) o en cuadrícula,
 * con un contador de todos los libros del catálogo. La cuadrícula y la búsqueda van por
 * páginas; la vista, la categoría y la página quedan en la URL
 * (`?vista=todos&categoria=Humor&pagina=2`).
 *
 * @returns {JSX.Element}
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get('vista') === 'todos' ? 'all' : 'shelves';
  const page = view === 'all' ? leerPagina(params.get('pagina')) : 1;
  const categoria = view === 'all' ? params.get('categoria') || null : null;
  const [query, setQuery] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const busqueda = useBusquedaLibros(query, { page: searchPage, limit: LIBROS_POR_PAGINA });
  const { libros, total, loading, error, reload } = useCatalogo({
    page,
    categoria,
    limit: view === 'all' ? LIBROS_POR_PAGINA : MUESTRA_ESTANTES,
  });
  const { items: enCurso } = useListaPersonal('progreso');
  const { items: guardados } = useListaPersonal('guardados');
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
  const categoryShelves = useEstantesPorCategoria(view === 'shelves' && !loading ? libros : SIN_LIBROS);
  const openLibro = (id) => navigate(`/libro/${id}`);

  const showShelves = () => setParams({});
  const showPage = (numero, { categoria: elegida = categoria, ...options } = {}) =>
    setParams({ vista: 'todos', ...(elegida && { categoria: elegida }), pagina: String(numero) }, options);
  const changePage = (numero) => {
    showPage(numero);
    window.scrollTo({ top: 0 });
  };
  /** Abre desde la primera página la cuadrícula de una categoría o, con `null`, la de todos los libros. */
  const showAll = (elegida) => {
    showPage(1, { categoria: elegida });
    window.scrollTo({ top: 0 });
  };
  const changeSearchPage = (numero) => {
    setSearchPage(numero);
    window.scrollTo({ top: 0 });
  };
  const changeQuery = (texto) => {
    setQuery(texto);
    setSearchPage(1);
  };

  // Una página que ya no existe (URL escrita a mano o libros eliminados) lleva a la última.
  const lastPage = totalDePaginas(total, LIBROS_POR_PAGINA);
  const outOfRange = view === 'all' && !loading && !error && total > 0 && page > lastPage;
  useEffect(() => {
    if (outOfRange) showPage(lastPage, { replace: true });
  });

  return (
    <div className="library">
      <div className="library-toolbar">
        <div className="library-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'shelves'}
            className={`pill-tab ${view === 'shelves' ? 'active' : ''}`}
            onClick={showShelves}
          >
            Estantes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'all'}
            className={`pill-tab ${view === 'all' ? 'active' : ''}`}
            onClick={() => (view !== 'all' || categoria) && showAll(null)}
          >
            Todos
          </button>
        </div>

        <div className="library-search" role="search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && changeQuery('')}
            placeholder="Buscar por título, autor o editorial..."
            aria-label="Buscar en la biblioteca"
          />
          {query && (
            <button type="button" className="library-search-clear" onClick={() => changeQuery('')} aria-label="Borrar búsqueda">
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

      {!busqueda.activa && categoria && (
        <header className="category-head">
          <button type="button" className="shelf-more" onClick={showShelves}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Estantes</span>
          </button>
          <h1>{categoria}</h1>
        </header>
      )}

      {!busqueda.activa && !loading && !error && (
        <p className="search-status" role="status">
          {total} {total === 1 ? 'libro' : 'libros'} {categoria ? 'en esta categoría' : 'en la biblioteca'}
        </p>
      )}

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
            onAction={() => changeQuery('')}
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
            <Pagination
              page={searchPage}
              pageSize={LIBROS_POR_PAGINA}
              total={busqueda.total}
              onChange={changeSearchPage}
            />
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
      ) : total === 0 && categoria ? (
        <PageState
          icon={BookOpen}
          title="No hay libros en esta categoría"
          actionLabel="Volver a los estantes"
          onAction={showShelves}
        />
      ) : total === 0 ? (
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
          {guardados.length > 0 && (
            <Shelf
              title="Guardados para más tarde"
              books={guardados.slice(0, LIBROS_POR_ESTANTE)}
              onSelect={openLibro}
              onMore={() => navigate('/guardados')}
            />
          )}
          <Shelf
            title="Novedades"
            books={libros.slice(0, LIBROS_POR_ESTANTE)}
            onSelect={openLibro}
            onMore={() => showAll(null)}
          />
          {categoryShelves.map(({ categoria: nombre, libros: items }) => (
            <Shelf key={nombre} title={nombre} books={items} onSelect={openLibro} onMore={() => showAll(nombre)} />
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

      {/* Fuera de los estados de carga para que la barra no desaparezca al cambiar de página. */}
      {!busqueda.activa && view === 'all' && !error && (
        <Pagination page={page} pageSize={LIBROS_POR_PAGINA} total={total} onChange={changePage} />
      )}
    </div>
  );
}
