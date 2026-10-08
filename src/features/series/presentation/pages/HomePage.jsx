import React from 'react';
import HeroBanner from '../components/HeroBanner';
import SeriesCard from '../components/SeriesCard';

export default function HomePage({ seriesList, featuredSeries, onSelectSeries, onReadNow }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Hero Featured Banner */}
      <HeroBanner
        series={featuredSeries || seriesList[0]}
        onReadNow={(id) => onReadNow(id, 1)}
      />

      {/* Sección Popular Del Día */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--brand-text)',
              letterSpacing: '-0.02em',
            }}
          >
            Popular Del Día
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--brand-text-muted)' }}>
            Las series más leídas y aclamadas de la actualidad.
          </p>
        </div>

        {/* Grid de Manhwas */}
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
