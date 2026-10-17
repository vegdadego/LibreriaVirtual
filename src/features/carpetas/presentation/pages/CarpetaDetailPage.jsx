import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, FolderX, Lock, Pencil, Trash2, X } from 'lucide-react';
import FolderMosaic from '../components/FolderMosaic';
import FolderFormDialog from '../components/FolderFormDialog';
import Dialog from '../../../../components/common/Dialog';
import LibroCard from '../../../libros/presentation/components/LibroCard';
import BookmarkButton from '../../../biblioteca/presentation/components/BookmarkButton';
import PageState from '../../../../components/common/PageState';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { useCarpetas } from '../context/CarpetasContext';

/**
 * Detalle de una carpeta: nombre, descripción y sus libros, con opciones para
 * editarla, quitar libros o borrarla.
 *
 * @returns {JSX.Element}
 */
export default function CarpetaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openLogin } = useOutletContext();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { obtener, editar, eliminar, cambiarLibro, version } = useCarpetas();

  const [carpeta, setCarpeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setNotFound(false);
    try {
      setCarpeta(await obtener(id));
    } catch (err) {
      setCarpeta(null);
      if (err.status === 404 || err.status === 400) setNotFound(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [obtener, id]);

  // `version` cambia con cada modificación hecha desde cualquier parte.
  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load, version]);

  if (authLoading) return <PageState kind="loading" title="Cargando..." />;
  if (!isAuthenticated) {
    return (
      <PageState
        icon={Lock}
        title="Inicia sesión para ver esta carpeta"
        actionLabel="Ingresar"
        onAction={openLogin}
      />
    );
  }
  if (loading) return <PageState kind="loading" title="Cargando carpeta..." />;
  if (notFound) {
    return (
      <PageState
        icon={FolderX}
        title="Carpeta no encontrada"
        description="Puede que se haya borrado."
        actionLabel="Ver mis carpetas"
        onAction={() => navigate('/carpetas')}
      />
    );
  }
  if (error) return <PageState kind="error" title="No se pudo cargar la carpeta" description={error} onRetry={load} />;

  const handleRemoveBook = async (libroId) => {
    setActionError(null);
    try {
      await cambiarLibro(carpeta.id, libroId, false);
    } catch (err) {
      setActionError(err.message || 'No se pudo quitar el libro.');
    }
  };

  const handleDelete = async () => {
    try {
      await eliminar(carpeta.id);
      navigate('/carpetas');
    } catch (err) {
      setConfirmDelete(false);
      setActionError(err.message || 'No se pudo borrar la carpeta.');
    }
  };

  return (
    <section className="library">
      <button type="button" className="detail-back" onClick={() => navigate('/carpetas')}>
        <ArrowLeft size={15} />
        <span>Carpetas</span>
      </button>

      <header className="folder-head">
        <FolderMosaic previews={carpeta.previews} />
        <div className="folder-head-info">
          <h1>{carpeta.nombre}</h1>
          {carpeta.descripcion && <p>{carpeta.descripcion}</p>}
          <small>
            {carpeta.totalLibros} {carpeta.totalLibros === 1 ? 'libro' : 'libros'}
          </small>
          <div className="folder-head-actions">
            <button type="button" className="dialog-btn" onClick={() => setEditing(true)}>
              <Pencil size={15} />
              <span>Editar</span>
            </button>
            <button type="button" className="dialog-btn danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} />
              <span>Borrar carpeta</span>
            </button>
          </div>
        </div>
      </header>

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      {carpeta.libros.length === 0 ? (
        <PageState
          title="Esta carpeta está vacía"
          description="Abre un libro y pulsa «Añadir a carpeta» para agregarlo aquí."
          actionLabel="Explorar la biblioteca"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="series-grid library-grid">
          {carpeta.libros.map((libro) => (
            <LibroCard
              key={libro.id}
              libro={libro}
              onClick={() => navigate(`/libro/${libro.id}`)}
              actions={
                <>
                  <BookmarkButton libroId={libro.id} titulo={libro.titulo} />
                  <button
                    type="button"
                    className="bookmark-btn"
                    onClick={() => handleRemoveBook(libro.id)}
                    aria-label={`Quitar «${libro.titulo}» de la carpeta`}
                    title="Quitar de la carpeta"
                  >
                    <X size={16} />
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}

      <FolderFormDialog
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="Editar carpeta"
        submitLabel="Guardar cambios"
        initial={{ nombre: carpeta.nombre, descripcion: carpeta.descripcion }}
        onSubmit={(datos) => editar(carpeta.id, datos)}
      />

      <Dialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="¿Borrar la carpeta?">
        <p className="dialog-note">
          Se borrará «{carpeta.nombre}». Los libros no se eliminan de la biblioteca.
        </p>
        <div className="dialog-actions">
          <button type="button" className="dialog-btn" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </button>
          <button type="button" className="dialog-btn danger" onClick={handleDelete}>
            Borrar
          </button>
        </div>
      </Dialog>
    </section>
  );
}
