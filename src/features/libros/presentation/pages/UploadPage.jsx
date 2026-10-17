import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, FileText, Loader2, Lock, RefreshCw, Sparkles, Upload, XCircle } from 'lucide-react';
import PageState from '../../../../components/common/PageState';
import DatePicker from '../../../../components/common/DatePicker';
import { IDIOMAS } from '../../domain/idiomas';
import { CATEGORIAS } from '../../domain/categorias';
import { CAMPOS_MAS_DATOS, ETIQUETAS_CAMPOS, sugerenciasParaFormulario } from '../../domain/sugerencias';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { canUploadBooks } from '../../../../components/layout/navLinks';
import { useUploadLibro } from '../hooks/useUploadLibro';
import { usePreparacionPdf } from '../hooks/usePreparacionPdf';
import { useLibroDuplicado } from '../hooks/useLibroDuplicado';
import { imageFileToCover } from '../../../../services/pdf/coverImage';

/** Debe coincidir con `MAX_PDF_SIZE_MB` del servidor (200 por defecto); se cambia con `VITE_MAX_PDF_MB`. */
const MAX_PDF_MB = Number(import.meta.env.VITE_MAX_PDF_MB) || 200;

/** Desde qué parte de las páginas sin texto se avisa, y desde cuál se avisa que casi no hay texto. */
const MIN_SIN_TEXTO = 0.1;
const MAX_SIN_TEXTO = 0.5;

const EMPTY_FORM = {
  titulo: '',
  autores: '',
  categorias: [],
  sinopsis: '',
  idioma: 'es',
  empresa_edicion: '',
  numero_edicion: '',
  fecha_publicacion: '',
  saga: '',
  numero_en_saga: '',
};

/**
 * Título sugerido a partir del nombre del archivo ("mi_libro-final.pdf" → "mi libro final").
 *
 * @param {string} fileName
 * @returns {string}
 */
function titleFromFileName(fileName) {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

/**
 * Etiqueta que marca un dato rellenado por la detección automática; desaparece
 * cuando la persona lo edita.
 *
 * @param {{show: boolean}} props
 * @returns {JSX.Element|null}
 */
function AutoTag({ show }) {
  if (!show) return null;
  return (
    <em className="auto-tag" title="Detectado automáticamente en el PDF. Revísalo antes de subir.">
      <Sparkles size={11} aria-hidden="true" /> Auto
    </em>
  );
}

/**
 * Pantalla para subir un libro en PDF: archivo, datos (que se rellenan solos al
 * elegir el PDF y se pueden corregir), elección de portada y avance del
 * procesamiento. Solo disponible para `uploader` y `admin`.
 *
 * @returns {JSX.Element}
 */
export default function UploadPage() {
  const navigate = useNavigate();
  const { openLogin } = useOutletContext();
  const { user, loading: authLoading } = useAuth();
  const { fase, progreso, libroId, error, subir, reiniciar } = useUploadLibro();

  const [pdf, setPdf] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [coverMode, setCoverMode] = useState('pdf'); // 'pdf' | 'imagen' | 'ninguna'
  const [coverImage, setCoverImage] = useState(null);
  const [cover, setCover] = useState({ status: 'idle', blob: null, url: null, message: null });
  const [formError, setFormError] = useState(null);
  const fileInput = useRef(null);

  const prep = usePreparacionPdf();
  const { duplicado } = useLibroDuplicado(
    {
      titulo: form.titulo,
      autores: form.autores,
      numeroEdicion: form.numero_edicion,
      idioma: form.idioma,
      stageId: prep.stageId,
    },
    fase === 'inactivo' || fase === 'error'
  );
  // Campos que la persona editó (la detección no los pisa) y los que rellenó la detección.
  const tocados = useRef(new Set());
  const [detectados, setDetectados] = useState([]);
  const [precisionFecha, setPrecisionFecha] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Prepara la imagen de portada propia (y su vista previa). La portada del PDF la dibuja el servidor.
  useEffect(() => {
    if (coverMode !== 'imagen' || !coverImage) {
      setCover({ status: 'idle', blob: null, url: null, message: null });
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;
    setCover({ status: 'loading', blob: null, url: null, message: null });

    imageFileToCover(coverImage)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setCover({ status: 'ready', blob, url: objectUrl, message: null });
      })
      .catch((err) => {
        if (!cancelled) setCover({ status: 'error', blob: null, url: null, message: err.message });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [coverMode, coverImage]);

  /** Aviso si muchas páginas del PDF no traen texto (son imágenes): en la biblioteca se verían vacías. */
  const totalPaginas = prep.progreso?.total_paginas ?? 0;
  const paginasSinTexto = prep.paginasSinTexto ?? 0;
  const faltaTexto = prep.fase === 'listo' && totalPaginas > 0 && paginasSinTexto / totalPaginas >= MIN_SIN_TEXTO;
  const casiSinTexto = faltaTexto && paginasSinTexto / totalPaginas >= MAX_SIN_TEXTO;

  /** Portada que se muestra y se enviará: la del servidor (PDF), la imagen propia o ninguna. */
  const coverView = (() => {
    if (coverMode === 'imagen') return cover;
    if (coverMode !== 'pdf' || !pdf) return { status: 'idle', blob: null, url: null, message: null };
    if (prep.portadaUrl) return { status: 'ready', blob: null, url: prep.portadaUrl, message: null };
    if (prep.fase === 'leyendo' || prep.fase === 'listo') {
      return { status: 'error', blob: null, url: null, message: 'No se pudo dibujar la portada de este PDF. Elige otra opción.' };
    }
    if (prep.fase === 'error') return { status: 'idle', blob: null, url: null, message: null };
    return { status: 'loading', blob: null, url: null, message: null };
  })();

  if (authLoading) return <PageState kind="loading" title="Cargando..." />;

  if (!user) {
    return (
      <PageState
        icon={Lock}
        title="Inicia sesión para subir libros"
        description="Necesitas una cuenta con permiso de subida."
        actionLabel="Ingresar"
        onAction={openLogin}
      />
    );
  }

  if (!canUploadBooks(user)) {
    return (
      <PageState
        icon={Lock}
        title="Tu cuenta es de lector"
        description="Solo las cuentas de tipo uploader o admin pueden subir libros."
        actionLabel="Volver a la biblioteca"
        onAction={() => navigate('/')}
      />
    );
  }

  const busy = fase === 'enviando' || fase === 'procesando';
  /** Cambia un campo a mano: deja de ser "automático" y la detección ya no lo pisa. */
  const edit = (key, value) => {
    tocados.current.add(key);
    setDetectados((list) => list.filter((k) => k !== key));
    if (key === 'fecha_publicacion') setPrecisionFecha(null);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const setField = (key) => (e) => edit(key, e.target.value);
  const onlyDigits = (key) => (e) => edit(key, e.target.value.replace(/\D/g, ''));

  /** Rellena los campos que la persona no ha editado con los datos que detectó el servidor. */
  const aplicarAnalisis = (datos) => {
    if (!datos) return;
    const { valores, detectados: claves, precisionFecha: precision } = sugerenciasParaFormulario(datos, tocados.current);
    setForm((f) => ({ ...f, ...valores }));
    setDetectados(claves);
    setPrecisionFecha(precision);
    if (claves.some((clave) => CAMPOS_MAS_DATOS.has(clave))) setMoreOpen(true);
  };

  const handlePdf = (file) => {
    setFormError(null);
    if (!file) {
      setPdf(null);
      prep.reiniciar();
      return;
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setFormError('El archivo debe ser un PDF.');
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setFormError(`El PDF supera el máximo de ${MAX_PDF_MB} MB.`);
      return;
    }
    setPdf(file);
    // Lo que rellenó el PDF anterior se vacía; lo que la persona escribió se conserva.
    setForm((f) => {
      const next = { ...f };
      detectados.forEach((clave) => {
        next[clave] = EMPTY_FORM[clave];
      });
      if (!tocados.current.has('titulo')) next.titulo = titleFromFileName(file.name);
      return next;
    });
    setDetectados([]);
    setPrecisionFecha(null);
    // El PDF se sube una sola vez; el servidor responde con los datos detectados y sigue leyendo el texto.
    prep.preparar(file).then(aplicarAnalisis);
  };

  /** Vuelve a aplicar los datos detectados y sobrescribe todos los campos, también los editados. */
  const redetectar = () => {
    tocados.current.clear();
    aplicarAnalisis(prep.analisis);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (!pdf) return setFormError('Elige el archivo PDF del libro.');
    if (prep.fase === 'subiendo') return setFormError('Espera a que termine de subirse el PDF.');
    if (prep.fase === 'error' || !prep.stageId) {
      return setFormError(prep.error || 'No se pudo preparar el PDF. Elige el archivo de nuevo.');
    }
    if (!form.titulo.trim()) return setFormError('El título es obligatorio.');
    if (duplicado) return setFormError('Este libro ya está en la biblioteca.');
    if (coverView.status === 'loading') return setFormError('Espera a que termine de prepararse la portada.');
    if (coverMode !== 'ninguna' && coverView.status === 'error') {
      return setFormError('Corrige la portada o elige "Sin portada" para continuar.');
    }

    const { titulo, categorias, ...metadatos } = form;
    return subir({
      stageId: prep.stageId,
      usarPortadaPdf: coverMode === 'pdf',
      portada: coverMode === 'imagen' ? cover.blob : null,
      titulo: titulo.trim(),
      metadatos: { ...metadatos, categorias: categorias.join(', ') },
    });
  };

  const handleReset = () => {
    reiniciar();
    prep.reiniciar();
    tocados.current.clear();
    setDetectados([]);
    setPrecisionFecha(null);
    setMoreOpen(false);
    setPdf(null);
    setCoverImage(null);
    setForm(EMPTY_FORM);
    setCoverMode('pdf');
    setFormError(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  if (fase === 'completado') {
    return (
      <div className="page-state" role="status">
        <span className="page-state-icon upload-ok">
          <CheckCircle2 size={30} />
        </span>
        <h3>¡Libro subido!</h3>
        <p>
          «{form.titulo}» ya está en la biblioteca
          {progreso?.total_paginas ? ` con ${progreso.total_paginas} páginas` : ''}.
        </p>
        <div className="upload-done-actions">
          <button type="button" className="page-state-btn" onClick={() => navigate(`/libro/${libroId}`)}>
            Ver libro
          </button>
          <button type="button" className="page-state-btn" onClick={handleReset}>
            Subir otro
          </button>
          <button type="button" className="page-state-btn" onClick={() => navigate('/mis-libros')}>
            Ir a Mis libros
          </button>
        </div>
      </div>
    );
  }

  const percent =
    progreso?.total_paginas ? Math.round((progreso.paginas_procesadas / progreso.total_paginas) * 100) : null;

  return (
    <div className="upload">
      <Link to="/mis-libros" className="detail-back upload-back">
        <ArrowLeft size={15} />
        <span>Mis libros</span>
      </Link>

      <header className="upload-header">
        <h1>Subir un libro</h1>
        <p>
          Sube un PDF con texto seleccionable. Se guarda solo el texto de cada página; el PDF original no se
          conserva.
        </p>
      </header>

      <form className="upload-form" onSubmit={handleSubmit} noValidate>
        <fieldset disabled={busy}>
          <section className="form-block">
            <h2>Archivo</h2>
            <label className={`file-drop ${pdf ? 'has-file' : ''}`}>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => handlePdf(e.target.files?.[0])}
              />
              <FileText size={28} />
              {pdf ? (
                <span>
                  <strong>{pdf.name}</strong>
                  <small>{(pdf.size / (1024 * 1024)).toFixed(1)} MB · pulsa para cambiar</small>
                </span>
              ) : (
                <span>
                  <strong>Elige un PDF</strong>
                  <small>Hasta {MAX_PDF_MB} MB</small>
                </span>
              )}
            </label>
          </section>

          <section className="form-block">
            <h2>Datos del libro</h2>

            {prep.fase !== 'inactivo' && (
              <div className={`analysis-banner ${prep.fase === 'subiendo' ? 'analizando' : prep.fase}`} role="status" aria-live="polite">
                {prep.fase === 'subiendo' && (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden="true" />
                    <span>Subiendo el PDF: {prep.porcentaje} %. Mientras tanto puedes ir rellenando los datos.</span>
                    <span
                      className="upload-bar"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={prep.porcentaje}
                      aria-label="Progreso de la subida del PDF"
                    >
                      <i style={{ width: `${prep.porcentaje}%` }} />
                    </span>
                  </>
                )}
                {(prep.fase === 'leyendo' || prep.fase === 'listo') && (
                  <>
                    <Sparkles size={16} aria-hidden="true" />
                    <span>
                      {detectados.length > 0
                        ? `Se detectaron ${detectados.length} datos (${detectados.map((k) => ETIQUETAS_CAMPOS[k]).join(', ')}). Revísalos: son sugerencias y puedes corregirlos.`
                        : 'No se pudo detectar ningún dato en este PDF. Completa el formulario a mano.'}{' '}
                      {prep.fase === 'leyendo'
                        ? prep.progreso?.total_paginas
                          ? `Leyendo páginas: ${prep.progreso.paginas_procesadas} de ${prep.progreso.total_paginas}.`
                          : 'Leyendo las páginas...'
                        : `PDF leído: ${prep.progreso?.total_paginas ?? 0} páginas listas.`}
                    </span>
                  </>
                )}
                {prep.fase === 'error' && (
                  <>
                    <XCircle size={16} aria-hidden="true" />
                    <span>{prep.error} Elige otro PDF para continuar.</span>
                  </>
                )}
                {pdf && prep.analisis && (
                  <button type="button" className="analysis-retry" onClick={redetectar} disabled={busy}>
                    <RefreshCw size={13} aria-hidden="true" /> Volver a detectar
                  </button>
                )}
              </div>
            )}

            {faltaTexto && (
              <div className="analysis-banner warning" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>
                  {paginasSinTexto} de {totalPaginas} páginas tienen muy poco texto o ninguno: son imágenes o están en blanco.{' '}
                  {casiSinTexto
                    ? 'Casi todo este PDF son imágenes (por ejemplo, un PDF escaneado o de diapositivas), así que en la biblioteca se verá casi vacío. Si puedes, sube una versión con texto seleccionable.'
                    : 'Esas páginas se mostrarán sin contenido en el lector.'}
                </span>
              </div>
            )}

            <div className="form-grid">
              <label className="field field-wide">
                <span>
                  Título * <AutoTag show={detectados.includes('titulo')} />
                </span>
                <input type="text" value={form.titulo} onChange={setField('titulo')} required />
              </label>
              <label className="field field-wide">
                <span>
                  Autores <AutoTag show={detectados.includes('autores')} />
                </span>
                <input
                  type="text"
                  value={form.autores}
                  onChange={setField('autores')}
                  placeholder="Separados por coma"
                />
              </label>
              <div className="field field-wide" role="group" aria-labelledby="categorias-label">
                <span id="categorias-label">
                  Categorías{form.categorias.length > 0 && ` (${form.categorias.length})`}{' '}
                  <AutoTag show={detectados.includes('categorias')} />
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
                        onClick={() =>
                          edit(
                            'categorias',
                            selected ? form.categorias.filter((c) => c !== categoria) : [...form.categorias, categoria]
                          )
                        }
                      >
                        {selected && <Check size={13} aria-hidden="true" />}
                        {categoria}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="field field-wide">
                <span>
                  Sinopsis <AutoTag show={detectados.includes('sinopsis')} />
                </span>
                <textarea rows={4} value={form.sinopsis} onChange={setField('sinopsis')} />
              </label>
            </div>

            <details className="form-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
              <summary>Más datos (idioma, editorial, saga...)</summary>
              <div className="form-grid">
                <label className="field">
                  <span>
                    Idioma <AutoTag show={detectados.includes('idioma')} />
                  </span>
                  <select value={form.idioma} onChange={setField('idioma')}>
                    {IDIOMAS.map(({ codigo, nombre }) => (
                      <option key={codigo} value={codigo}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>
                    Editorial <AutoTag show={detectados.includes('empresa_edicion')} />
                  </span>
                  <input type="text" value={form.empresa_edicion} onChange={setField('empresa_edicion')} />
                </label>
                <label className="field">
                  <span>
                    N.º de edición <AutoTag show={detectados.includes('numero_edicion')} />
                  </span>
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
                  <span>
                    Fecha de publicación <AutoTag show={detectados.includes('fecha_publicacion')} />
                  </span>
                  <DatePicker
                    label="Fecha de publicación"
                    value={form.fecha_publicacion}
                    onChange={(value) => edit('fecha_publicacion', value)}
                  />
                  {precisionFecha && precisionFecha !== 'dia' && (
                    <small className="field-hint">
                      {precisionFecha === 'anio'
                        ? 'Solo se detectó el año; ajusta el día y el mes si los sabes.'
                        : 'Solo se detectó el mes; ajusta el día si lo sabes.'}
                    </small>
                  )}
                </div>
                <label className="field">
                  <span>
                    Saga <AutoTag show={detectados.includes('saga')} />
                  </span>
                  <input type="text" value={form.saga} onChange={setField('saga')} />
                </label>
                <label className="field">
                  <span>
                    N.º en la saga <AutoTag show={detectados.includes('numero_en_saga')} />
                  </span>
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
            </details>
          </section>

          <section className="form-block">
            <h2>Portada</h2>
            <div className="cover-picker">
              <div className="cover-options" role="radiogroup" aria-label="Origen de la portada">
                {[
                  ['pdf', 'Primera página del PDF'],
                  ['imagen', 'Subir una imagen'],
                  ['ninguna', 'Sin portada'],
                ].map(([value, label]) => (
                  <label key={value} className={`cover-option ${coverMode === value ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cover-mode"
                      value={value}
                      checked={coverMode === value}
                      onChange={() => setCoverMode(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}

                {coverMode === 'imagen' && (
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setCoverImage(e.target.files?.[0] ?? null)}
                    aria-label="Imagen de portada"
                  />
                )}
              </div>

              <div className="cover-preview" aria-live="polite">
                {coverView.status === 'loading' && <Loader2 size={24} className="spin" />}
                {coverView.status === 'ready' && <img src={coverView.url} alt="Vista previa de la portada" />}
                {coverView.status === 'error' && <p role="alert">{coverView.message}</p>}
                {coverView.status === 'idle' && (
                  <p>
                    {coverMode === 'ninguna'
                      ? 'Se usará una tapa con el título.'
                      : coverMode === 'pdf'
                        ? 'Elige el PDF para ver la portada.'
                        : 'Elige una imagen.'}
                  </p>
                )}
              </div>
            </div>
          </section>
        </fieldset>

        {duplicado && (
          <p className="form-error upload-duplicate" role="alert">
            <XCircle size={16} />
            <span>
              Este libro ya está en la biblioteca: «{duplicado.titulo}». No se puede subir otra vez.{' '}
              <Link to={`/libro/${duplicado.libroId}`}>Ver el libro existente</Link>
            </span>
          </p>
        )}

        {formError && (
          <p className="form-error" role="alert">
            <XCircle size={16} /> {formError}
          </p>
        )}

        {fase === 'error' && error && (
          <p className="form-error" role="alert">
            <XCircle size={16} />
            <span>
              {error.message}{' '}
              {error.libroId && <Link to={`/libro/${error.libroId}`}>Ver el libro existente</Link>}
            </span>
          </p>
        )}

        {busy && (
          <div className="upload-progress" role="status">
            <div className="upload-progress-label">
              <Loader2 size={16} className="spin" />
              <span>
                {fase === 'enviando'
                  ? 'Enviando los datos del libro...'
                  : percent !== null
                    ? `Procesando páginas: ${progreso.paginas_procesadas} de ${progreso.total_paginas}`
                    : 'Procesando el PDF...'}
              </span>
            </div>
            <span
              className="upload-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent ?? undefined}
              aria-label="Progreso de la subida"
            >
              <i className={percent === null ? 'indeterminate' : ''} style={percent === null ? undefined : { width: `${percent}%` }} />
            </span>
          </div>
        )}

        <button type="submit" className="upload-submit" disabled={busy || prep.fase === 'subiendo' || prep.fase === 'error' || Boolean(duplicado)}>
          <Upload size={17} />
          <span>
            {busy ? 'Guardando...' : prep.fase === 'subiendo' ? 'Subiendo el PDF...' : 'Subir libro'}
          </span>
        </button>
      </form>
    </div>
  );
}
