import React, { useEffect, useState } from 'react';
import Dialog from '../../../../components/common/Dialog';
import { MAX_DESCRIPCION, MAX_NOMBRE } from '../../application/CarpetaUseCases';

/**
 * Diálogo para crear o editar una carpeta (nombre y descripción).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.title
 * @param {string} props.submitLabel Texto del botón de guardar.
 * @param {{nombre: string, descripcion: string}} [props.initial] Valores iniciales (al editar).
 * @param {(datos: {nombre: string, descripcion: string}) => Promise<void>} props.onSubmit
 *   Debe lanzar un error con mensaje si algo falla; el diálogo lo muestra.
 * @returns {JSX.Element|null}
 */
export default function FolderFormDialog({ isOpen, onClose, title, submitLabel, initial, onSubmit }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNombre(initial?.nombre ?? '');
      setDescripcion(initial?.descripcion ?? '');
      setError(null);
    }
  }, [isOpen, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ nombre, descripcion });
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la carpeta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <form className="dialog-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Nombre</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={MAX_NOMBRE}
            autoFocus
            required
          />
        </label>
        <label className="field">
          <span>Descripción (opcional)</span>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={MAX_DESCRIPCION}
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="dialog-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="dialog-btn primary" disabled={busy}>
            {busy ? 'Guardando...' : submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
