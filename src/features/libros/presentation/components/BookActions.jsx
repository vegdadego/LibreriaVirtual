import React from 'react';
import BookmarkButton from '../../../biblioteca/presentation/components/BookmarkButton';
import AddToFolderButton from '../../../carpetas/presentation/components/AddToFolderButton';

/**
 * Acciones rápidas de una tarjeta de libro: guardar para después y añadir a carpeta.
 *
 * @param {Object} props
 * @param {import('../../domain/models/Libro').Libro} props.libro
 * @returns {JSX.Element}
 */
export default function BookActions({ libro }) {
  return (
    <>
      <BookmarkButton libroId={libro.id} titulo={libro.titulo} />
      <AddToFolderButton libro={libro} />
    </>
  );
}
