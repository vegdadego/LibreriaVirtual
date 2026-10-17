import React from 'react';
import BookCover from './BookCover';

/**
 * Estante con libros de pie sobre una repisa; se desplaza horizontalmente si no caben.
 *
 * @param {Object} props
 * @param {string} props.title Título del estante.
 * @param {Array<{id: string, titulo: string, portadaUrl: string|null, progress?: number}>} props.books
 *   Libros a mostrar; `progress` (0-100) dibuja una barra sobre la repisa.
 * @param {Function} props.onSelect Se invoca con el id del libro elegido.
 * @returns {JSX.Element} El estante.
 */
export default function Shelf({ title, books, onSelect }) {
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
                title={book.titulo}
                aria-label={book.titulo}
              >
                <BookCover titulo={book.titulo} src={book.portadaUrl} />
              </button>
              {typeof book.progress === 'number' && (
                <span
                  className="shelf-progress"
                  role="progressbar"
                  aria-label={`Progreso de ${book.titulo}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={book.progress}
                >
                  <i style={{ width: `${book.progress}%` }} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
