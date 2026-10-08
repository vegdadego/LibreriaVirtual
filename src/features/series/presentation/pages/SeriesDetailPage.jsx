import React, { useState } from 'react';
import { Eye, Heart, Plus, Check, ArrowRight } from 'lucide-react';
import ChapterList from '../components/ChapterList';
import CommentsSection from '../components/CommentsSection';

export default function SeriesDetailPage({
  series,
  comments,
  isLiked,
  isFollowing,
  onToggleLike,
  onToggleFollow,
  onOpenChapter,
  onAddComment,
}) {
  const [activeTab, setActiveTab] = useState('chapters'); // 'chapters' | 'synopsis' | 'comments'

  if (!series) {
    return <p style={{ color: 'var(--brand-text-muted)' }}>Cargando serie...</p>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
      }}
    >
      {/* Columna Izquierda: Sidebar de la Serie */}
      <div style={{ maxWidth: '380px', width: '100%', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: 'var(--brand-cardBg)',
            border: '1px solid var(--brand-border)',
            borderRadius: '1rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Portada */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '260px',
              aspectRatio: '3/4',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              marginBottom: '1.25rem',
              border: '1px solid var(--brand-border)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            <img
              src={series.cover}
              alt={series.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.4s ease',
              }}
            />
          </div>

          {/* Título & Estadísticas */}
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--brand-text)',
              marginBottom: '0.75rem',
              lineHeight: 1.3,
            }}
          >
            {series.title}
          </h2>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              fontSize: '0.875rem',
              color: 'var(--brand-text-muted)',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Eye size={15} style={{ color: 'var(--brand-text-subtle)' }} />
              <span>{series.formattedViews}</span>
            </span>

            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Heart size={15} style={{ color: '#d97706', fill: '#d97706' }} />
              <span>{series.formattedLikes}</span>
            </span>
          </div>

          {/* Botones de Acción */}
          <div style={{ width: '100%', display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <button
              type="button"
              onClick={onToggleLike}
              style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: isLiked ? '1px solid rgba(217, 119, 6, 0.5)' : '1px solid var(--brand-border)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                color: isLiked ? '#f59e0b' : 'var(--brand-text-muted)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Me gusta"
            >
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              onClick={onToggleFollow}
              style={{
                flexGrow: 1,
                padding: '0.75rem 1rem',
                backgroundColor: isFollowing ? 'rgba(217, 119, 6, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                border: isFollowing ? '1px solid rgba(217, 119, 6, 0.4)' : '1px solid var(--brand-border)',
                color: isFollowing ? '#fbbf24' : 'var(--brand-text)',
                borderRadius: '0.75rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
              }}
            >
              {isFollowing ? <Check size={16} /> : <Plus size={16} style={{ color: '#fbbf24' }} />}
              <span>{isFollowing ? 'Siguiendo' : 'Seguir'}</span>
            </button>
          </div>

          {/* Botón Primer Capítulo */}
          <button
            type="button"
            onClick={() => onOpenChapter(1)}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(120, 53, 15, 0.25)',
              border: '1px solid rgba(217, 119, 6, 0.4)',
              borderRadius: '0.75rem',
              fontWeight: 700,
              color: '#fbbf24',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Primer capítulo</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Columna Derecha: Tabs y Contenido */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Pestañas de Estilo Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            borderBottom: '1px solid var(--brand-border)',
            paddingBottom: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className={`pill-tab ${activeTab === 'chapters' ? 'active' : ''}`}
            onClick={() => setActiveTab('chapters')}
          >
            Capítulos
          </button>
          <button
            type="button"
            className={`pill-tab ${activeTab === 'synopsis' ? 'active' : ''}`}
            onClick={() => setActiveTab('synopsis')}
          >
            Sinópsis
          </button>
          <button
            type="button"
            className={`pill-tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            Comentarios
          </button>
        </div>

        {/* TAB 1: CAPÍTULOS */}
        {activeTab === 'chapters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-text)' }}>
              {series.totalChapters} capítulos en total
            </div>
            <ChapterList chapters={series.chapters} onSelectChapter={onOpenChapter} />
          </div>
        )}

        {/* TAB 2: SINÓPSIS */}
        {activeTab === 'synopsis' && (
          <div
            style={{
              backgroundColor: 'var(--brand-cardBg)',
              border: '1px solid var(--brand-border)',
              borderRadius: '1rem',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-text)' }}>
              Resumen de la Obra
            </h3>
            <p style={{ color: 'var(--brand-text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {series.synopsis}
            </p>
          </div>
        )}

        {/* TAB 3: COMENTARIOS */}
        {activeTab === 'comments' && (
          <CommentsSection comments={comments} onAddComment={onAddComment} />
        )}
      </div>
    </div>
  );
}
