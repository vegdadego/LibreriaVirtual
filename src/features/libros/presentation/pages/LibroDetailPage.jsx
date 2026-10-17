import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookX, SkipForward } from 'lucide-react';
import BookCover from '../components/BookCover';
import PageState from '../../../../components/common/PageState';
import AddToFolderButton from '../../../carpetas/presentation/components/AddToFolderButton';
import DownloadButton from '../../../descargas/presentation/components/DownloadButton';
import BookmarkButton from '../../../biblioteca/presentation/components/BookmarkButton';
import { useMiBiblioteca } from '../../../biblioteca/presentation/context/MiBibliotecaContext';
import { useLibro } from '../hooks/useLibro';
import { nombreIdioma } from '../../domain/idiomas';

/**
 * Formatea una fecha ISO como "mayo de 2020"; `null` si no es válida.
 *
 * @param {string|null} iso
 * @returns {string|null}
 */
function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

/**
 * Detalle de un libro: portada, datos y acciones arriba; descripción y ficha debajo.
 *
 * @returns {JSX.Element}
 */
export default function LibroDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { libro, loading, error, notFound, reload } = useLibro(id);
  const { paginaActual } = useMiBiblioteca();

  if (loading) return <PageState kind="loading" title="Cargando libro..." />;
  if (notFound) {
    return (
      <PageState
        icon={BookX}
        title="Libro no encontrado"
        description="Puede que se haya eliminado."
        actionLabel="Volver a la biblioteca"
        onAction={() => navigate('/')}
      />
    );
  }
  if (error) return <PageState kind="error" title="No se pudo cargar el libro" description={error} onRetry={reload} />;

  const tagline = (libro.sinopsis || '').split(/(?<=[.!?])\s/)[0];
  const fecha = formatDate(libro.fechaPublicacion);
  const canRead = libro.totalPaginas > 0;
  const resumeAt = Math.min(paginaActual(libro.id), libro.totalPaginas);
  // Atajo al contenido (detectado automáticamente) mientras no se haya leído hasta ahí.
  const saltarAlContenido = canRead && Boolean(libro.inicioContenido) && resumeAt < libro.inicioContenido;

  return (
    <article className="detail">
      <button type="button" className="detail-back" onClick={() => navigate('/')}>
        <ArrowLeft size={15} />
        <span>Biblioteca</span>
      </button>

      <div className="detail-top">
        <div className="detail-cover">
          <BookCover titulo={libro.titulo} src={libro.portadaUrl} />
        </div>

        <div className="detail-info">
          <h1 className="detail-title">{libro.titulo}</h1>
          {libro.autores.length > 0 && <p className="detail-sub">{libro.autoresTexto}</p>}
          <p className="detail-pages">{libro.totalPaginas} páginas</p>
          {tagline && <p className="detail-tagline">{tagline}</p>}

          <div className="detail-actions">
            <button
              type="button"
              className="detail-read"
              disabled={!canRead}
              onClick={() => navigate(`/leer/${libro.id}/${resumeAt > 0 ? resumeAt : 1}`)}
            >
              <span>
                {!canRead ? 'Sin contenido' : resumeAt > 0 ? `Continuar en la página ${resumeAt}` : 'Comenzar a leer'}
              </span>
              <ArrowUpRight size={16} />
            </button>

            {saltarAlContenido && (
              <button
                type="button"
                className="detail-skip"
                onClick={() => navigate(`/leer/${libro.id}/${libro.inicioContenido}`)}
                title="Salta la portada, el índice y las páginas previas"
              >
                <SkipForward size={16} aria-hidden="true" />
                <span>Ir al contenido (pág. {libro.inicioContenido})</span>
              </button>
            )}

            <BookmarkButton libroId={libro.id} titulo={libro.titulo} variant="detail" />
            <AddToFolderButton libro={libro} variant="detail" />
            <DownloadButton libro={libro} />
          </div>
        </div>
      </div>

      <div className="detail-sheet">
        <div className="detail-main">
          <section>
            <h2 className="detail-heading">Descripción</h2>
            <p className="detail-text">{libro.sinopsis || 'Este libro no tiene descripción.'}</p>
          </section>

          {libro.categorias.length > 0 && (
            <section>
              <h2 className="detail-heading">Categorías</h2>
              <ul className="tag-list">
                {libro.categorias.map((categoria) => (
                  <li key={categoria}>{categoria}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="detail-meta" aria-label="Datos del libro">
          <dl>
            <div>
              <dt>Páginas</dt>
              <dd>{libro.totalPaginas}</dd>
            </div>
            <div>
              <dt>Idioma</dt>
              <dd>{nombreIdioma(libro.idioma)}</dd>
            </div>
            {libro.editorial && (
              <div>
                <dt>Editorial</dt>
                <dd>
                  {libro.editorial} · edición {libro.numeroEdicion}
                </dd>
              </div>
            )}
            {fecha && (
              <div>
                <dt>Publicación</dt>
                <dd>{fecha}</dd>
              </div>
            )}
            {libro.saga && (
              <div>
                <dt>Saga</dt>
                <dd>
                  {libro.saga.nombre} · n.º {libro.saga.numero}
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </article>
  );
}
