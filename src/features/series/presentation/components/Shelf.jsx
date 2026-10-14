import React from 'react';

/**
 * Estante con libros de pie sobre una repisa; se desplaza horizontalmente si no caben.
 *
 * @param {Object} props
 * @param {string} props.title Título del estante.
 * @param {Array<{id: number|string, title: string, cover: string}>} props.books Series a mostrar.
 * @param {Function} props.onSelect Se invoca con el id de la serie elegida.
 * @param {number} [props.progress] Porcentaje de lectura (0-100) que se dibuja sobre la repisa.
 * @returns {JSX.Element} El estante.
 */
export default function Shelf({ title, books, onSelect, progress }) {
  return (
    <section className="shelf">
      <header className="shelf-head">
        <h2 className="shelf-title">{title}</h2>
      </header>

      <div className="shelf-scroll">
        <div className="shelf-row">
          {books.map((book) => (
            <div key={book.id} className="shelf-item">
              <button
                type="button"
                className="shelf-book"
                onClick={() => onSelect(book.id)}
                title={book.title}
                aria-label={book.title}
              >
                <img src={book.cover} alt="" loading="lazy" />
              </button>
              {typeof progress === 'number' && (
                <span
                  className="shelf-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <i style={{ width: `${progress}%` }} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
