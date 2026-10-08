import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function HeroBanner({ series, onReadNow }) {
  if (!series) return null;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '1rem',
        overflow: 'hidden',
        border: '1px solid var(--brand-border)',
        backgroundColor: 'var(--brand-cardBg)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
      }}
      className="group"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, var(--brand-darkBg) 0%, rgba(11, 15, 25, 0.8) 50%, transparent 100%)',
          zIndex: 10,
        }}
      />

      <img
        src={series.cover}
        alt={series.title}
        style={{
          width: '100%',
          height: '360px',
          objectFit: 'cover',
          objectPosition: 'top',
          opacity: 0.6,
          transition: 'transform 0.7s ease',
        }}
        className="group-hover:scale-105"
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          padding: '2rem',
          zIndex: 20,
          maxWidth: '640px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <span
          style={{
            alignSelf: 'flex-start',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: 'rgba(217, 119, 6, 0.2)',
            color: '#fbbf24',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Destacado del Mes
        </span>

        <h1
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            textShadow: '0 2px 4px rgba(0,0,0,0.6)',
          }}
        >
          {series.title}
        </h1>

        <p
          style={{
            fontSize: '0.925rem',
            color: '#d1d5db',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {series.synopsis}
        </p>

        <div style={{ paddingTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => onReadNow(series.id)}
            className="gold-gradient"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontWeight: 800,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Leer Ahora</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
