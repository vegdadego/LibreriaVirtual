import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useMiBiblioteca } from '../context/MiBibliotecaContext';
import { useAuth } from '../../../auth/presentation/context/AuthContext';

/**
 * Botón de marcador para guardar un libro "para ver más tarde". Sin sesión
 * abre el libro de acceso.
 *
 * @param {Object} props
 * @param {string} props.libroId
 * @param {string} props.titulo Título, para la etiqueta accesible.
 * @param {'icon'|'detail'} [props.variant='icon'] `detail` es el botón redondo de la ficha del libro.
 * @returns {JSX.Element}
 */
export default function BookmarkButton({ libroId, titulo, variant = 'icon' }) {
  const { isAuthenticated } = useAuth();
  const { isGuardado, toggleGuardado } = useMiBiblioteca();
  const { openLogin } = useOutletContext();
  const [busy, setBusy] = useState(false);

  const saved = isGuardado(libroId);
  const label = saved ? `Quitar «${titulo}» de guardados` : `Guardar «${titulo}» para ver más tarde`;

  const handleClick = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    setBusy(true);
    try {
      await toggleGuardado(libroId);
    } catch (err) {
      console.error('No se pudo actualizar guardados:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={variant === 'detail' ? 'detail-icon-btn' : 'bookmark-btn'}
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? 'Guardado' : 'Guardar para ver más tarde'}
    >
      <Bookmark size={variant === 'detail' ? 18 : 16} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
