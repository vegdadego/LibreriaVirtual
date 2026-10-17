import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

/**
 * Diálogo modal con el estilo de la biblioteca. Se cierra con Escape, con la X
 * o al pulsar fuera.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.title Título visible (y nombre accesible del diálogo).
 * @param {React.ReactNode} props.children Contenido.
 * @param {string} [props.maxWidth='460px']
 * @returns {JSX.Element|null}
 */
export default function Dialog({ isOpen, onClose, title, children, maxWidth = '460px' }) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="olympus-modal-backdrop" onClick={onClose}>
      <div
        className="dialog"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dialog-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}
