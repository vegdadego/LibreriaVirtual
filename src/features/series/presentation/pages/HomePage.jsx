import React from 'react';
import HeroBanner from '../components/HeroBanner';
import SeriesCard from '../components/SeriesCard';

export default function HomePage({ seriesList, featuredSeries, onSelectSeries, onReadNow }) {
  const currentContinue = featuredSeries || seriesList[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3.5rem' }}>
      {/* Saludo Mobile / Editorial Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
        <div>
          <h1
            className="serif-title"
            style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)',
              fontWeight: 700,
              color: 'var(--brand-text)',
              lineHeight: 1.2,
            }}
          >
            Good Morning, Reader
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--brand-text-subtle)', marginTop: '0.2rem' }}>
            Explora las mejores obras de la biblioteca
          </p>
        </div>

        <div
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '9999px',
            backgroundColor: 'var(--brand-pill)',
            border: '1px solid var(--brand-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--brand-pillText)',
          }}
        >
          <span>✦ LECTOR</span>
        </div>
      </div>

      {/* Hero / Continue Reading Section (Estilo Left Screen Mockup) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h2
          style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--brand-text)',
            letterSpacing: '-0.01em',
          }}
        >
          Continue Reading
        </h2>

        {currentContinue && (
          <div
            style={{
              backgroundColor: 'var(--brand-cardBg)',
              border: '1px solid var(--brand-border)',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'row',
              gap: '1.25rem',
              alignItems: 'center',
              boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.25s ease',
            }}
          >
            {/* Mini Cover Vertical */}
            <div
              style={{
                width: '100px',
                minWidth: '100px',
                height: '135px',
                borderRadius: '0.85rem',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                backgroundColor: '#27211c',
              }}
            >
              <img
                src={currentContinue.cover}
                alt={currentContinue.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  right: '6px',
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#ffffff',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                }}
              >
                LOREM IPSUM
              </span>
            </div>

            {/* Info y Barra de Progreso */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div>
                <h3
                  className="serif-title"
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--brand-text)',
                    lineHeight: 1.25,
                  }}
                >
                  LOREM IPSUM
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--brand-text-subtle)', fontStyle: 'italic' }}>
                  Dolor Sit Amet
                </span>
              </div>

              {/* Progress Bar 65% */}
              <div style={{ marginTop: '0.35rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--brand-text-muted)',
                    marginBottom: '0.3rem',
                  }}
                >
                  <span>Capítulo 20</span>
                  <span style={{ color: 'var(--brand-accent)' }}>65%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--brand-border)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '65%',
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--brand-accent) 0%, var(--brand-goldHover) 100%)',
                      borderRadius: '9999px',
                    }}
                  />
                </div>
              </div>

              {/* Botón Continuar */}
              <div style={{ paddingTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => onReadNow(currentContinue.id, 20)}
                  style={{
                    padding: '0.55rem 1.4rem',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--brand-text)',
                    color: 'var(--brand-darkBg)',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección Populares Del Día */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--brand-text)',
              letterSpacing: '-0.02em',
            }}
          >
            Populares del Día
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--brand-text-muted)' }}>
            Las obras más leídas y aclamadas de la actualidad.
          </p>
        </div>

        {/* Grid / Carousel de Comics */}
        <div className="series-grid">
          {seriesList.map((item) => (
            <SeriesCard
              key={item.id}
              series={item}
              onClick={() => onSelectSeries(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
