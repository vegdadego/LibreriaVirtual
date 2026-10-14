import React, { useState } from 'react';
import { Search } from 'lucide-react';
import Shelf from '../components/Shelf';
import SeriesCard from '../components/SeriesCard';

// Marcador: aún no existe progreso de lectura real por usuario.
const CONTINUE_PROGRESS = 65;

/**
 * Página de inicio: la biblioteca organizada en estantes o en cuadrícula.
 *
 * @param {Object} props
 * @param {Array} props.seriesList Series disponibles.
 * @param {Object|null} props.featuredSeries Serie para "Continuar leyendo".
 * @param {Function} props.onSelectSeries Abre el detalle de una serie por id.
 * @param {Function} props.onOpenSearch Abre el buscador.
 * @returns {JSX.Element} La página de inicio.
 */
export default function HomePage({ seriesList, featuredSeries, onSelectSeries, onOpenSearch }) {
  const [view, setView] = useState('shelves'); // 'shelves' | 'all'
  const currentContinue = featuredSeries || seriesList[0];

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

        <button type="button" className="library-search" onClick={onOpenSearch}>
          <Search size={17} />
          <span>Buscar en la biblioteca</span>
        </button>
      </div>

      {view === 'shelves' ? (
        <>
          {currentContinue && (
            <Shelf
              title="Continuar leyendo"
              books={[currentContinue]}
              progress={CONTINUE_PROGRESS}
              onSelect={onSelectSeries}
            />
          )}
          <Shelf title="Populares del día" books={seriesList} onSelect={onSelectSeries} />
        </>
      ) : (
        <div className="series-grid library-grid">
          {seriesList.map((item) => (
            <SeriesCard key={item.id} series={item} onClick={() => onSelectSeries(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
