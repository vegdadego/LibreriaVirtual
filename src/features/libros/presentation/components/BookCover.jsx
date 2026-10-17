import React, { useEffect, useState } from 'react';

/**
 * Tono estable (0-359) derivado del título, para la portada de relleno.
 *
 * @param {string} text
 * @returns {number}
 */
function hueFor(text = '') {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
  return hash;
}

/**
 * Portada de un libro: la imagen si existe y, si no (o si falla al cargar),
 * una tapa de color con el título.
 *
 * @param {Object} props
 * @param {string} props.titulo Título del libro (texto alternativo y relleno).
 * @param {string|null} [props.src] URL de la portada.
 * @returns {JSX.Element}
 */
export default function BookCover({ titulo, src }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        className="book-cover-fallback"
        style={{ '--cover-hue': hueFor(titulo) }}
        role="img"
        aria-label={`Portada de ${titulo}`}
      >
        <span>{titulo}</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`Portada de ${titulo}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
