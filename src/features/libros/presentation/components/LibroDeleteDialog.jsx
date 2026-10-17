import React, { useEffect, useState } from 'react';
import Dialog from '../../../../components/common/Dialog';

/**
 * Confirmación para eliminar un libro propio. Avisa de que el borrado es definitivo y
 * alcanza a todos los usuarios.
 *
 * @param {Object} props
 * @param {import('../../domain/models/Libro').Libro|null} props.libro Libro a eliminar; con `null` el diálogo está cerrado.
 * @param {Function} props.onClose
 * @param {(id: string) => Promise<void>} props.onConfirm
 *   Debe lanzar el error del servidor si rechaza el borrado; el diálogo lo muestra.
 * @returns {JSX.Element}
 */
export default function LibroDeleteDialog({ libro, onClose, onConfirm }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (libro) setError(null);
  }, [libro]);

  const handleConfirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await onConfirm(libro.id);
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el libro.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={Boolean(libro)} onClose={onClose} title="¿Eliminar el libro?">
      <p className="dialog-note">
        Se eliminará «{libro?.titulo}» para todos los usuarios, con su texto y su portada. También desaparece de sus
        guardados y carpetas. No se puede deshacer.
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="dialog-actions">
        <button type="button" className="dialog-btn" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="dialog-btn danger" onClick={handleConfirm} disabled={busy}>
          {busy ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </Dialog>
  );
}
