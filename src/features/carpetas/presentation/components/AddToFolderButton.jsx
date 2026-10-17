import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FolderPlus } from 'lucide-react';
import AddToFolderDialog from './AddToFolderDialog';
import { useAuth } from '../../../auth/presentation/context/AuthContext';

/**
 * Botón que abre "Añadir a carpeta" para un libro. Sin sesión abre el libro de acceso.
 *
 * @param {Object} props
 * @param {{id: string, titulo: string}} props.libro
 * @param {'icon'|'detail'} [props.variant='icon'] `detail` es el botón redondo de la ficha del libro.
 * @returns {JSX.Element}
 */
export default function AddToFolderButton({ libro, variant = 'icon' }) {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useOutletContext();
  const [open, setOpen] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={variant === 'detail' ? 'detail-icon-btn' : 'bookmark-btn'}
        onClick={handleClick}
        aria-label={`Añadir «${libro.titulo}» a una carpeta`}
        title="Añadir a carpeta"
      >
        <FolderPlus size={variant === 'detail' ? 18 : 16} />
      </button>
      {open && <AddToFolderDialog isOpen onClose={() => setOpen(false)} libro={libro} />}
    </>
  );
}
