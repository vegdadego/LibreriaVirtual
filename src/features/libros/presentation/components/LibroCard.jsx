import React from 'react';
import BookCover from './BookCover';

/**
 * Tarjeta de un libro para las cuadrículas. Es un botón; las acciones extra
 * (guardar, carpeta...) se pasan en `actions` y quedan fuera del botón.
 *
 * @param {Object} props
 * @param {import('../../domain/models/Libro').Libro} props.libro
 * @param {Function} props.onClick Abre el detalle del libro.
 * @param {React.ReactNode} [props.actions] Controles que se muestran sobre la portada.
 * @returns {JSX.Element}
 */
export default function LibroCard({ libro, onClick, actions }) {
  return (
    <div className="book-card series-card-hover">
      <button type="button" className="book-card-main" onClick={onClick}>
        <span className="book-card-cover">
          <BookCover titulo={libro.titulo} src={libro.portadaUrl} />
        </span>
        <span className="book-card-info">
          <strong className="book-card-title">{libro.titulo}</strong>
          {libro.autores.length > 0 && (
            <span className="book-card-author">{libro.autoresTexto}</span>
          )}
          <span className="book-card-meta">{libro.totalPaginas} págs.</span>
        </span>
      </button>
      {actions && <div className="book-card-actions">{actions}</div>}
    </div>
  );
}
