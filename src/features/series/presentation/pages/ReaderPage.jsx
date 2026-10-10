import React, { useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Sliders, ChevronDown } from 'lucide-react';

export default function ReaderPage({
  series,
  chapterNum,
  onSelectChapter,
  onBackToSeries,
  onPrevChapter,
  onNextChapter,
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [chapterNum, series]);

  if (!series) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '-1rem' }}>
      {/* Barra de Control Sticky del Lector */}
      <div
        style={{
          position: 'sticky',
          top: '70px',
          zIndex: 40,
          backgroundColor: 'var(--brand-cardBg)',
          borderBottom: '1px solid var(--brand-border)',
          padding: '0.75rem 1rem',
          borderRadius: '0 0 1rem 1rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Volver a detalle */}
        <button
          type="button"
          onClick={onBackToSeries}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--brand-text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fbbf24')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--brand-text-muted)')}
        >
          <ArrowLeft size={16} />
          <span>Volver a la Serie</span>
        </button>

        {/* Título & Selector de Capítulo (< X >) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--brand-text-subtle)',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {series.title}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <button
              type="button"
              onClick={onPrevChapter}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-text)',
                cursor: 'pointer',
                padding: '2px',
              }}
              title="Capítulo Anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <select
              value={chapterNum}
              onChange={(e) => onSelectChapter(Number(e.target.value))}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--brand-border)',
                color: 'var(--brand-text)',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '0.5rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {series.chapters.map((c) => (
                <option key={c.num} value={c.num} style={{ backgroundColor: '#111827', color: '#f3f4f6' }}>
                  Capítulo {c.num}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onNextChapter}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-text)',
                cursor: 'pointer',
                padding: '2px',
              }}
              title="Siguiente Capítulo"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Ajustes de Lectura */}
        <button
          type="button"
          onClick={() => alert('Panel de lectura: Modo Cascada Webtoon activo')}
          style={{
            padding: '0.4rem 0.85rem',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--brand-border)',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--brand-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Sliders size={14} />
          <span>Cascada</span>
        </button>
      </div>

      {/* Contenedor Webtoon Stream */}
      <div className="reader-stream">
        {/* Banner de Créditos */}
        <div
          style={{
            background: 'linear-gradient(to right, var(--reader-banner-from), var(--reader-banner-to))',
            borderBottom: '1px solid rgba(217, 119, 6, 0.3)',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              padding: '0.2rem 0.65rem',
              backgroundColor: 'rgba(217, 119, 6, 0.2)',
              border: '1px solid rgba(217, 119, 6, 0.4)',
              borderRadius: '0.35rem',
              color: '#fbbf24',
              fontWeight: 900,
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
            }}
          >

          </div>

          <h2
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '0.05em',
            }}
          >
            CAPÍTULO {chapterNum}
          </h2>

          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24' }}>
            {series.title.toUpperCase()}
          </h3>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '1.25rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#9ca3af',
              marginTop: '0.5rem',
            }}
          >
            <span>EDITOR: <strong style={{ color: '#ffffff' }}>/LENNETH</strong></span>
            <span>CLEANER: <strong style={{ color: '#ffffff' }}>/LENNETH</strong></span>
            <span>TRADUCTOR: <strong style={{ color: '#ffffff' }}>/EIVANS</strong></span>
          </div>
        </div>

        {/* Imágenes Apiladas del Capítulo */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {series.pages.map((imgUrl, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img
                src={imgUrl}
                alt={`Página ${i + 1}`}
                loading="lazy"
                style={{ width: '100%', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  color: '#9ca3af',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Pág. {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navegación Inferior */}
      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          margin: '1.5rem auto 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--brand-cardBg)',
          border: '1px solid var(--brand-border)',
          borderRadius: '1rem',
        }}
      >
        <button
          type="button"
          onClick={onPrevChapter}
          style={{
            padding: '0.65rem 1.25rem',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--brand-border)',
            color: 'var(--brand-text)',
            borderRadius: '0.75rem',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ChevronLeft size={16} />
          <span>Capítulo Anterior</span>
        </button>

        <button
          type="button"
          onClick={onNextChapter}
          className="gold-gradient"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '0.75rem',
            fontWeight: 800,
            fontSize: '0.85rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
          }}
        >
          <span>Siguiente Capítulo</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
