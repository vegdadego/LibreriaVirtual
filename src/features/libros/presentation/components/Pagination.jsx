import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { rangoDePagina, totalDePaginas } from '../../domain/paginacion';

/**
 * Controles para pasar de página en un listado, fijos en la parte inferior de la pantalla.
 * Reservan su hueco al final del contenido para no tapar los últimos libros. No se muestran si
 * todo cabe en una página.
 *
 * @param {Object} props
 * @param {number} props.page Página actual (desde 1).
 * @param {number} props.pageSize Libros por página.
 * @param {number} props.total Libros en todo el listado.
 * @param {(page: number) => void} props.onChange Se invoca con la página elegida.
 * @returns {JSX.Element|null}
 */
export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = totalDePaginas(total, pageSize);
  if (pages <= 1) return null;
  const { desde, hasta } = rangoDePagina(page, pageSize, total);

  return (
    <>
      <div className="pagination-space" aria-hidden="true" />
      <nav className="pagination" aria-label="Páginas del listado">
        <button type="button" className="pagination-btn" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Anterior</span>
        </button>
        <p className="pagination-status" role="status">
          <strong>
            Página {page} de {pages}
          </strong>
          <span>
            Libros {desde}–{hasta} de {total}
          </span>
        </p>
        <button type="button" className="pagination-btn" onClick={() => onChange(page + 1)} disabled={page >= pages}>
          <span>Siguiente</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </nav>
    </>
  );
}
