import React, { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import PageState from '../../../../components/common/PageState';
import Shelf from '../components/Shelf';
import LibroEditDialog from '../components/LibroEditDialog';
import LibroDeleteDialog from '../components/LibroDeleteDialog';
import { useMisLibros } from '../hooks/useMisLibros';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { useMiBiblioteca } from '../../../biblioteca/presentation/context/MiBibliotecaContext';
import { useCarpetas } from '../../../carpetas/presentation/context/CarpetasContext';
import { canUploadBooks } from '../../../../components/layout/navLinks';

/** Libros por estante (el primero comparte fila con el libro en blanco). */
const BOOKS_PER_SHELF = 6;
const UPLOAD_PATH = '/mis-libros/subir';

/**
 * Reparte los libros en estantes. El primer estante lleva el libro en blanco, así que
 * cabe un libro menos.
 *
 * @param {Array} libros
 * @returns {Array<Array>} Un arreglo por estante (siempre al menos uno, aunque esté vacío).
 */
function toShelves(libros) {
  const first = libros.slice(0, BOOKS_PER_SHELF - 1);
  const shelves = [first];
  for (let i = first.length; i < libros.length; i += BOOKS_PER_SHELF) {
    shelves.push(libros.slice(i, i + BOOKS_PER_SHELF));
  }
  return shelves;
}

/**
 * Mis libros: la librería de quien sube libros. Muestra los libros que subió (un admin ve
 * todos) en estantes, empezando por un libro en blanco que lleva a subir uno nuevo, y
 * permite editarlos o eliminarlos.
 *
 * @returns {JSX.Element}
 */
export default function MisLibrosPage() {
  const navigate = useNavigate();
  const { openLogin } = useOutletContext();
  const { user, loading: authLoading } = useAuth();
  const { olvidarLibro } = useMiBiblioteca();
  const { reload: reloadCarpetas } = useCarpetas();
  const allowed = canUploadBooks(user);
  const { libros, loading, error, reload, editar, eliminar } = useMisLibros({ enabled: allowed });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const shelves = useMemo(() => toShelves(libros), [libros]);
  const byId = useMemo(() => new Map(libros.map((libro) => [libro.id, libro])), [libros]);

  if (authLoading) return <PageState kind="loading" title="Cargando..." />;

  if (!user) {
    return (
      <PageState
        icon={Lock}
        title="Inicia sesión para ver tus libros"
        description="Necesitas una cuenta con permiso de subida."
        actionLabel="Ingresar"
        onAction={openLogin}
      />
    );
  }

  if (!allowed) {
    return (
      <PageState
        icon={Lock}
        title="Tu cuenta es de lector"
        description="Solo las cuentas de tipo uploader o admin pueden subir y gestionar libros."
        actionLabel="Volver a la biblioteca"
        onAction={() => navigate('/')}
      />
    );
  }

  if (loading) return <PageState kind="loading" title="Cargando tus libros..." />;
  if (error) return <PageState kind="error" title="No se pudieron cargar tus libros" description={error} onRetry={reload} />;

  const blankBook = (
    <div className="shelf-item">
      <button type="button" className="shelf-book shelf-book-new" onClick={() => navigate(UPLOAD_PATH)}>
        <Plus size={30} aria-hidden="true" />
        <span>Subir libro</span>
      </button>
    </div>
  );

  const handleDelete = async (id) => {
    await eliminar(id);
    olvidarLibro(id);
    reloadCarpetas();
  };

  return (
    <section className="my-books">
      <header className="my-books-head">
        <h1>Mis libros</h1>
        <p>
          {libros.length === 0
            ? 'Aún no has subido libros. Elige el libro en blanco para subir el primero.'
            : `${libros.length} ${libros.length === 1 ? 'libro' : 'libros'}. Pulsa uno para abrirlo, o usa el lápiz y la papelera para gestionarlo.`}
        </p>
      </header>

      {shelves.map((books, index) => (
        <Shelf
          key={index}
          books={books}
          leading={index === 0 ? blankBook : undefined}
          onSelect={(id) => navigate(`/libro/${id}`)}
          renderActions={(book) => (
            <>
              <button
                type="button"
                className="shelf-manage-btn"
                onClick={() => setEditing(byId.get(book.id))}
                aria-label={`Editar «${book.titulo}»`}
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="shelf-manage-btn danger"
                onClick={() => setDeleting(byId.get(book.id))}
                aria-label={`Eliminar «${book.titulo}»`}
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        />
      ))}

      <LibroEditDialog libro={editing} onClose={() => setEditing(null)} onSubmit={editar} />
      <LibroDeleteDialog libro={deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete} />
    </section>
  );
}
