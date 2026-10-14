import React from 'react';
import { ArrowLeft, ArrowUpRight, Bookmark, Heart } from 'lucide-react';
import ChapterList from '../components/ChapterList';
import CommentsSection from '../components/CommentsSection';

/**
 * Detalle de una serie: portada y acciones arriba; descripción, capítulos,
 * comentarios y datos de la obra en una hoja debajo.
 *
 * @param {Object} props
 * @param {Object|null} props.series Serie a mostrar.
 * @param {Array} props.comments Comentarios de la serie.
 * @param {boolean} props.isLiked Si el usuario marcó "me gusta".
 * @param {boolean} props.isFollowing Si el usuario sigue la serie.
 * @param {Function} props.onToggleLike Alterna "me gusta".
 * @param {Function} props.onToggleFollow Alterna seguir.
 * @param {Function} props.onOpenChapter Abre el lector en un capítulo.
 * @param {Function} props.onAddComment Publica un comentario.
 * @param {Function} props.onBack Vuelve al inicio.
 * @returns {JSX.Element} La página de detalle.
 */
export default function SeriesDetailPage({
  series,
  comments,
  isLiked,
  isFollowing,
  onToggleLike,
  onToggleFollow,
  onOpenChapter,
  onAddComment,
  onBack,
}) {
  if (!series) {
    return <p style={{ color: 'var(--brand-text-muted)' }}>Cargando serie...</p>;
  }

  const tagline = (series.synopsis || '').split(/(?<=[.!?])\s/)[0];
  const latestChapter = series.chapters?.[0];

  return (
    <article className="detail">
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={15} />
        <span>Biblioteca</span>
      </button>

      <div className="detail-top">
        <div className="detail-cover">
          <img src={series.cover} alt={`Portada de ${series.title}`} />
        </div>

        <div className="detail-info">
          <h1 className="detail-title">{series.title}</h1>
          <p className="detail-sub">{series.totalChapters} capítulos</p>
          {tagline && <p className="detail-tagline">{tagline}</p>}

          <div className="detail-actions">
            <button type="button" className="detail-read" onClick={() => onOpenChapter(1)}>
              <span>Comenzar a leer</span>
              <ArrowUpRight size={16} />
            </button>

            <button
              type="button"
              className="detail-icon-btn"
              onClick={onToggleFollow}
              aria-pressed={isFollowing}
              aria-label={isFollowing ? 'Dejar de seguir' : 'Seguir serie'}
              title={isFollowing ? 'Siguiendo' : 'Seguir'}
            >
              <Bookmark size={18} fill={isFollowing ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              className="detail-icon-btn"
              onClick={onToggleLike}
              aria-pressed={isLiked}
              aria-label={isLiked ? 'Quitar me gusta' : 'Me gusta'}
              title="Me gusta"
            >
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      <div className="detail-sheet">
        <div className="detail-main">
          <section>
            <h2 className="detail-heading">Descripción</h2>
            <p className="detail-text">{series.synopsis}</p>
          </section>

          <section>
            <h2 className="detail-heading">Capítulos</h2>
            <div className="detail-chapters">
              <ChapterList chapters={series.chapters} onSelectChapter={onOpenChapter} />
            </div>
          </section>

          <section className="detail-comments">
            <CommentsSection comments={comments} onAddComment={onAddComment} />
          </section>
        </div>

        <aside className="detail-meta" aria-label="Datos de la obra">
          <dl>
            <div>
              <dt>Capítulos</dt>
              <dd>{series.totalChapters}</dd>
            </div>
            {latestChapter && (
              <div>
                <dt>Último capítulo</dt>
                <dd>
                  Cap. {latestChapter.num} · {latestChapter.timeAgo}
                </dd>
              </div>
            )}
            <div>
              <dt>Vistas</dt>
              <dd>{series.views}</dd>
            </div>
            <div>
              <dt>Me gusta</dt>
              <dd>{series.likes}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </article>
  );
}
