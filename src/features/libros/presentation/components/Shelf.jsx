import React from 'react';
import BookCover from './BookCover';

/**
 * Progreso de lectura sobre la portada: páginas leídas de las totales, las que faltan y una barra.
 *
 * @param {Object} props
 * @param {{titulo: string, progress: number, leidas?: number, total?: number}} props.book
 * @returns {JSX.Element}
 */
function ReadingProgress({ book }) {
  const hasPages = typeof book.leidas === 'number' && typeof book.total === 'number';
  const faltan = hasPages ? Math.max(book.total - book.leidas, 0) : null;
  const summary = hasPages
    ? `Leíste ${book.leidas} de ${book.total} páginas; te ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}`
    : `${book.progress} % leído`;
  return (
    <div
      className="shelf-reading"
      role="progressbar"
      aria-label={`Progreso de ${book.titulo}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={book.progress}
      aria-valuetext={summary}
      title={summary}
    >
      {hasPages ? (
        <>
          <span className="shelf-reading-pages">
            <strong>{book.leidas}</strong> / {book.total} págs.
          </span>
          <span className="shelf-reading-left">{faltan === 1 ? 'Falta 1' : `Faltan ${faltan}`}</span>
        </>
      ) : (
        <span className="shelf-reading-pages">{book.progress} %</span>
      )}
      <span className="shelf-reading-bar">
        <i style={{ width: `${book.progress}%` }} />
      </span>
    </div>
  );
}

/**
 * Estante con libros de pie sobre una repisa; se desplaza horizontalmente si no caben.
 *
 * @param {Object} props
 * @param {string} [props.title] Título del estante (sin él, solo se ve la repisa).
 * @param {Array<{id: string, titulo: string, portadaUrl: string|null, progress?: number, leidas?: number, total?: number}>} props.books
 *   Libros a mostrar; `progress` (0-100) dibuja una barra de lectura sobre la parte baja de la portada y,
 *   si vienen `leidas` y `total`, las páginas leídas y las que faltan.
 * @param {Function} props.onSelect Se invoca con el id del libro elegido.
 * @param {React.ReactNode} [props.leading] Elemento que va antes de los libros (por ejemplo, el libro en blanco).
 * @param {(book: object) => React.ReactNode} [props.renderActions] Controles que se superponen a cada portada.
 * @returns {JSX.Element} El estante.
 */
export default function Shelf({ title, books, onSelect, leading, renderActions }) {
  return (
    <section className="shelf" aria-label={title}>
      {title && (
        <header className="shelf-head">
          <h2 className="shelf-title">{title}</h2>
        </header>
      )}

      <div className="shelf-scroll">
        <div className="shelf-row">
          {leading}
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
              {renderActions && <div className="shelf-manage">{renderActions(book)}</div>}
              {typeof book.progress === 'number' && <ReadingProgress book={book} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
