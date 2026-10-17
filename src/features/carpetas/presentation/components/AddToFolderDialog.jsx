import React, { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import Dialog from '../../../../components/common/Dialog';
import FolderMosaic from './FolderMosaic';
import { useCarpetas } from '../context/CarpetasContext';

/**
 * Diálogo "Añadir a carpeta": marca en qué carpetas está un libro y permite
 * crear una carpeta nueva con ese libro.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {{id: string, titulo: string}} props.libro
 * @returns {JSX.Element|null}
 */
export default function AddToFolderDialog({ isOpen, onClose, libro }) {
  const { carpetas, loading, error: loadError, cambiarLibro, crear, reload } = useCarpetas();
  const [nuevo, setNuevo] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setNuevo('');
      setError(null);
      reload();
    }
  }, [isOpen, reload]);

  const toggle = async (carpeta) => {
    setError(null);
    setBusyId(carpeta.id);
    try {
      await cambiarLibro(carpeta.id, libro.id, !carpeta.contiene(libro.id));
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la carpeta.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setBusyId('nueva');
    try {
      await crear({ nombre: nuevo, libroId: libro.id });
      setNuevo('');
    } catch (err) {
      setError(err.message || 'No se pudo crear la carpeta.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Añadir a carpeta">
      <p className="dialog-hint">«{libro.titulo}»</p>

      {loading ? (
        <p className="dialog-note">Cargando tus carpetas...</p>
      ) : loadError ? (
        <p className="form-error" role="alert">
          {loadError}
        </p>
      ) : carpetas.length === 0 ? (
        <p className="dialog-note">Aún no tienes carpetas. Crea la primera aquí abajo.</p>
      ) : (
        <ul className="folder-pick-list">
          {carpetas.map((carpeta) => {
            const included = carpeta.contiene(libro.id);
            return (
              <li key={carpeta.id}>
                <button
                  type="button"
                  className={`folder-pick ${included ? 'included' : ''}`}
                  onClick={() => toggle(carpeta)}
                  disabled={busyId === carpeta.id}
                  aria-pressed={included}
                >
                  <FolderMosaic previews={carpeta.previews} />
                  <span className="folder-pick-info">
                    <strong>{carpeta.nombre}</strong>
                    <small>{carpeta.totalLibros} libros</small>
                  </span>
                  <span className="folder-pick-check" aria-hidden="true">
                    {included && <Check size={16} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form className="folder-new" onSubmit={handleCreate}>
        <label className="sr-only" htmlFor="folder-new-name">
          Nombre de la nueva carpeta
        </label>
        <input
          id="folder-new-name"
          type="text"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nueva carpeta..."
          maxLength={80}
        />
        <button type="submit" className="dialog-btn primary" disabled={!nuevo.trim() || busyId === 'nueva'}>
          <Plus size={15} />
          <span>Crear</span>
        </button>
      </form>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
