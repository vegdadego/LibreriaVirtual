import React from 'react';

export default function SeriesCard({ series, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--brand-cardBg)',
        border: '1px solid var(--brand-border)',
        borderRadius: '1rem',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
      }}
      className="series-card-hover"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(217, 119, 6, 0.5)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--brand-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Portada Aspect Ratio 3:4 */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '3/4',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: '#1f2937',
        }}
      >
        <img
          src={series.cover}
          alt={series.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.5s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* Badge Rating / Likes */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '2px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#fbbf24',
            border: '1px solid rgba(217, 119, 6, 0.3)',
          }}
        >
          ★ {series.likes}
        </div>
      </div>

      {/* Info */}
      <div
        style={{
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: '0.875rem',
            color: 'var(--brand-text)',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '0.5rem',
          }}
        >
          {series.title}
        </h3>

        <p style={{ fontSize: '0.75rem', color: 'var(--brand-text-subtle)' }}>
          Cap. {series.totalChapters}
        </p>
      </div>
    </div>
  );
}
