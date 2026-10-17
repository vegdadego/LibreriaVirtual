import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Dialog from '../../../../components/common/Dialog';
import DatePicker from '../../../../components/common/DatePicker';
import { CATEGORIAS } from '../../domain/categorias';
import { IDIOMAS } from '../../domain/idiomas';

/**
 * Valores iniciales del formulario a partir de un libro.
 *
 * @param {import('../../domain/models/Libro').Libro|null} libro
 * @returns {Record<string, any>}
 */
function formFromLibro(libro) {
  return {
    titulo: libro?.titulo ?? '',
    autores: libro?.autoresTexto ?? '',
    categorias: libro?.categorias ?? [],
    sinopsis: libro?.sinopsis ?? '',
    idioma: libro?.idioma ?? 'es',
    empresa_edicion: libro?.editorial ?? '',
    numero_edicion: libro ? String(libro.numeroEdicion ?? 1) : '',
    fecha_publicacion: libro?.fechaPublicacion ? libro.fechaPublicacion.slice(0, 10) : '',
    saga: libro?.saga?.nombre ?? '',
    numero_en_saga: libro?.saga ? String(libro.saga.numero ?? 1) : '',
  };
}

/**
 * Convierte el formulario en el cuerpo de `PUT /books/:id`. Los números y la fecha vacíos
 * se omiten (el backend no permite vaciarlos); una saga vacía la quita.
 *
 * @param {Record<string, any>} form
 * @returns {Record<string, any>}
 */
function toPayload(form) {
  const payload = {
    titulo: form.titulo.trim(),
    autores: form.autores,
    categorias: form.categorias,
    sinopsis: form.sinopsis.trim(),
    idioma: form.idioma,
    empresa_edicion: form.empresa_edicion.trim(),
    saga: form.saga.trim(),
  };
  if (form.numero_edicion) payload.numero_edicion = Number(form.numero_edicion);
  if (form.fecha_publicacion) payload.fecha_publicacion = form.fecha_publicacion;
  if (form.saga.trim() && form.numero_en_saga) payload.numero_en_saga = Number(form.numero_en_saga);
  return payload;
}

/**
 * Diálogo para editar los datos de un libro propio (el texto y la portada no cambian).
 *
 * @param {Object} props
 * @param {import('../../domain/models/Libro').Libro|null} props.libro Libro a editar; con `null` el diálogo está cerrado.
 * @param {Function} props.onClose
 * @param {(id: string, datos: Record<string, any>) => Promise<void>} props.onSubmit
 *   Debe lanzar el error del servidor si rechaza los cambios; el diálogo lo muestra.
 * @returns {JSX.Element}
 */
export default function LibroEditDialog({ libro, onClose, onSubmit }) {
  const [form, setForm] = useState(() => formFromLibro(libro));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (libro) {
      setForm(formFromLibro(libro));
      setError(null);
    }
  }, [libro]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const onlyDigits = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value.replace(/\D/g, '') }));
  const toggleCategoria = (categoria) =>
    setForm((f) => ({
      ...f,
      categorias: f.categorias.includes(categoria)
        ? f.categorias.filter((c) => c !== categoria)
        : [...f.categorias, categoria],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      setError({ message: 'El título es obligatorio.' });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(libro.id, toPayload(form));
      onClose();
    } catch (err) {
      setError({
        message: err.message || 'No se pudieron guardar los cambios.',
        libroId: err.libro_id ?? err.data?.libro_id,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen={Boolean(libro)} onClose={onClose} title="Editar libro" maxWidth="680px">
      <form className="dialog-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <label className="field field-wide">
            <span>Título *</span>
            <input type="text" value={form.titulo} onChange={setField('titulo')} autoFocus required />
          </label>
          <label className="field field-wide">
            <span>Autores</span>
            <input
              type="text"
              value={form.autores}
              onChange={setField('autores')}
              placeholder="Separados por coma"
            />
          </label>
          <div className="field field-wide" role="group" aria-labelledby="edit-categorias-label">
            <span id="edit-categorias-label">
              Categorías{form.categorias.length > 0 && ` (${form.categorias.length})`}
            </span>
            <div className="chip-group">
              {CATEGORIAS.map((categoria) => {
                const selected = form.categorias.includes(categoria);
                return (
                  <button
                    key={categoria}
                    type="button"
                    className={`chip ${selected ? 'selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleCategoria(categoria)}
                  >
                    {selected && <Check size={13} aria-hidden="true" />}
                    {categoria}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="field field-wide">
            <span>Sinopsis</span>
            <textarea rows={4} value={form.sinopsis} onChange={setField('sinopsis')} />
          </label>
          <label className="field">
            <span>Idioma</span>
            <select value={form.idioma} onChange={setField('idioma')}>
              {IDIOMAS.map(({ codigo, nombre }) => (
                <option key={codigo} value={codigo}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Editorial</span>
            <input type="text" value={form.empresa_edicion} onChange={setField('empresa_edicion')} />
          </label>
          <label className="field">
            <span>N.º de edición</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={form.numero_edicion}
              onChange={onlyDigits('numero_edicion')}
              placeholder="1"
            />
          </label>
          <div className="field">
            <span>Fecha de publicación</span>
            <DatePicker
              label="Fecha de publicación"
              value={form.fecha_publicacion}
              onChange={(value) => setForm((f) => ({ ...f, fecha_publicacion: value }))}
            />
          </div>
          <label className="field">
            <span>Saga</span>
            <input type="text" value={form.saga} onChange={setField('saga')} />
          </label>
          <label className="field">
            <span>N.º en la saga</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              value={form.numero_en_saga}
              onChange={onlyDigits('numero_en_saga')}
              placeholder="1"
            />
          </label>
        </div>

        {error && (
          <p className="form-error" role="alert">
            <span>
              {error.message}{' '}
              {error.libroId && (
                <Link to={`/libro/${error.libroId}`} onClick={onClose}>
                  Ver el libro existente
                </Link>
              )}
            </span>
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="dialog-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="dialog-btn primary" disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
