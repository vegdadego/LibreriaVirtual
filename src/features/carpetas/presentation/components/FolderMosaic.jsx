import React from 'react';
import { Folder } from 'lucide-react';
import BookCover from '../../../libros/presentation/components/BookCover';

/**
 * Mosaico de hasta 4 portadas que representa una carpeta (como la imagen de una lista de reproducción).
 *
 * @param {Object} props
 * @param {Array<{id: string, titulo: string, portadaUrl: string|null}>} props.previews
 * @returns {JSX.Element}
 */
export default function FolderMosaic({ previews }) {
  if (previews.length === 0) {
    return (
      <span className="folder-mosaic empty" aria-hidden="true">
        <Folder size={34} />
      </span>
    );
  }

  return (
    <span className={`folder-mosaic count-${Math.min(previews.length, 4)}`} aria-hidden="true">
      {previews.slice(0, 4).map((preview) => (
        <span key={preview.id} className="folder-mosaic-cell">
          <BookCover titulo={preview.titulo} src={preview.portadaUrl} />
        </span>
      ))}
    </span>
  );
}
