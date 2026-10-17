import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, FileX, Minus, Plus, SkipForward, Type } from 'lucide-react';
import PageState from '../../../../components/common/PageState';
import { useLibroPagina } from '../hooks/useLibroPagina';
import { useMiBiblioteca } from '../../../biblioteca/presentation/context/MiBibliotecaContext';
import { storage } from '../../../../utils/storage';
import { parsePageBlocks } from '../../../../utils/pageContent';

const PREFS_KEY = 'libreria_reader_prefs';
const MIN_SIZE = 14;
const MAX_SIZE = 30;

/**
 * Dibuja un bloque de una página: tabla, lista, índice con puntos guía, líneas sueltas o prosa.
 *
 * @param {Object} props
 * @param {ReturnType<typeof parsePageBlocks>[number]} props.block
 * @returns {JSX.Element}
 */
function BlockBody({ block }) {
  if (block.type === 'figure') {
    return (
      <figure className="reader-figure">
        {block.caption && <figcaption>{block.caption}</figcaption>}
        <p className="reader-figure-note">
          {block.caption ? 'La imagen de esta figura no se muestra.' : 'Aquí hay una figura que es solo una imagen; no se muestra.'}
        </p>
      </figure>
    );
  }
  if (block.type === 'heading') {
    const Heading = block.level === 1 ? 'h2' : 'h3';
    return <Heading className={`reader-heading level-${block.level}`}>{block.text}</Heading>;
  }
  if (block.type === 'table') {
    return (
      <div className="reader-table-wrap" tabIndex={0} role="region" aria-label="Tabla">
        <table className="reader-table">
          <thead>
            <tr>
              {block.header.map((cell, i) => (
                <th key={i}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === 'list') {
    const List = block.ordered ? 'ol' : 'ul';
    return (
      <List
        className={`reader-list${block.ordered ? ' ordered' : ''}${block.letters ? ' letters' : ''}`}
        start={block.ordered && block.start ? block.start : undefined}
        type={block.letters ? 'a' : undefined}
      >
        {block.items.map((item, i) => (
          <li key={i}>{item.text}</li>
        ))}
      </List>
    );
  }
  if (block.type === 'toc') {
    return (
      <div className="reader-block">
        {block.intro.length > 0 && <p className="reader-paragraph reader-lines">{block.intro.join('\n')}</p>}
        <ul className="reader-toc">
          {block.rows.map((row, j) => (
            <li key={j} className="reader-toc-row">
              <span className="reader-toc-title">{row.title}</span>
              {row.page && <span className="reader-toc-leader" aria-hidden="true" />}
              {row.page && <span className="reader-toc-page">{row.page}</span>}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <p className={`reader-paragraph${block.type === 'lines' ? ' reader-lines' : ''}`}>{block.text}</p>;
}

/**
 * Un bloque de la página; los rótulos que el libro pone en el margen salen en una columna a su lado.
 *
 * @param {Object} props
 * @param {ReturnType<typeof parsePageBlocks>[number]} props.block
 * @param {boolean} props.withMargin La página tiene rótulos de margen: todos los bloques reservan la columna.
 * @returns {JSX.Element}
 */
function PageBlock({ block, withMargin }) {
  if (!withMargin) return <BlockBody block={block} />;
  return (
    <div className="reader-row">
      <aside className="reader-margin" aria-label="Nota al margen">
        {block.notes?.map((note, i) => (
          <span key={i}>{note}</span>
        ))}
      </aside>
      <div className="reader-row-body">{block.type === 'lines' && !block.text ? null : <BlockBody block={block} />}</div>
    </div>
  );
}

/**
 * Lector de texto: muestra una página del libro con controles de tamaño y tipo de letra.
 * Se navega con los botones, el campo de página o las flechas del teclado.
 *
 * @returns {JSX.Element}
 */
export default function ReaderPage() {
  const { id, pagina: paginaParam } = useParams();
  const navigate = useNavigate();
  const numero = Number.parseInt(paginaParam, 10);
  const validNumber = Number.isInteger(numero) && numero >= 1;

  const { pagina, loading, error, notFound } = useLibroPagina(id, validNumber ? numero : 1);
  const [prefs, setPrefs] = useState(() => ({ size: 19, serif: true, ...storage.get(PREFS_KEY, {}) }));
  const [jump, setJump] = useState('');
  const { registrarProgreso } = useMiBiblioteca();

  const goTo = (n) => navigate(`/leer/${id}/${n}`);

  useEffect(() => {
    storage.set(PREFS_KEY, prefs);
  }, [prefs]);

  // Recuerda por dónde va el lector; el retraso evita una petición por cada página que se hojea rápido.
  useEffect(() => {
    if (!pagina || pagina.pagina !== numero) return undefined;
    const timer = setTimeout(() => registrarProgreso(id, numero), 800);
    return () => clearTimeout(timer);
  }, [pagina, numero, id, registrarProgreso]);

  useEffect(() => {
    setJump('');
    window.scrollTo({ top: 0 });
  }, [numero]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || !pagina) return;
      if (e.key === 'ArrowLeft' && pagina.anterior) goTo(pagina.anterior);
      if (e.key === 'ArrowRight' && pagina.siguiente) goTo(pagina.siguiente);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!validNumber) {
    return (
      <PageState
        icon={FileX}
        title="Página no válida"
        actionLabel="Ir a la primera página"
        onAction={() => goTo(1)}
      />
    );
  }
  if (notFound) {
    return (
      <PageState
        icon={FileX}
        title="Esta página no existe"
        actionLabel="Volver al libro"
        onAction={() => navigate(`/libro/${id}`)}
      />
    );
  }
  if (error) {
    return <PageState kind="error" title="No se pudo cargar la página" description={error} onRetry={() => navigate(0)} />;
  }

  const submitJump = (e) => {
    e.preventDefault();
    const target = Number.parseInt(jump, 10);
    if (!pagina || !Number.isInteger(target)) return;
    goTo(Math.min(Math.max(target, 1), pagina.totalPaginas));
  };

  const blocks = pagina ? parsePageBlocks(pagina.texto) : [];
  const withMargin = blocks.some((block) => block.notes?.length);
  // Si el libro tiene portada, índice y prólogo antes del contenido, ofrece saltar directo a él.
  const inicioContenido = pagina?.inicioContenido;
  const puedeSaltar = Boolean(inicioContenido) && numero < inicioContenido;
  const setSize = (delta) =>
    setPrefs((p) => ({ ...p, size: Math.min(MAX_SIZE, Math.max(MIN_SIZE, p.size + delta)) }));

  return (
    <div className="reader">
      <div className="reader-bar">
        <button type="button" className="reader-back" onClick={() => navigate(`/libro/${id}`)}>
          <ArrowLeft size={16} />
          <span>Volver al libro</span>
        </button>

        <span className="reader-title" title={pagina?.titulo}>
          {pagina?.titulo || 'Cargando...'}
        </span>

        <div className="reader-tools" role="group" aria-label="Ajustes de lectura">
          <button
            type="button"
            onClick={() => setSize(-1)}
            disabled={prefs.size <= MIN_SIZE}
            aria-label="Reducir letra"
          >
            <Minus size={15} />
          </button>
          <span aria-hidden="true">{prefs.size}</span>
          <button
            type="button"
            onClick={() => setSize(1)}
            disabled={prefs.size >= MAX_SIZE}
            aria-label="Aumentar letra"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, serif: !p.serif }))}
            aria-pressed={prefs.serif}
            aria-label="Letra con serifa"
            title="Alternar letra con serifa"
          >
            <Type size={15} />
          </button>
        </div>
      </div>

      {puedeSaltar && (
        <button type="button" className="reader-skip" onClick={() => goTo(inicioContenido)}>
          <SkipForward size={16} aria-hidden="true" />
          <span>Ir al contenido (página {inicioContenido})</span>
        </button>
      )}

      <article
        className="reader-sheet"
        style={{ fontSize: `${prefs.size}px`, fontFamily: prefs.serif ? 'var(--font-serif)' : 'var(--font-sans)' }}
        aria-busy={loading}
      >
        {loading && !pagina ? (
          <PageState kind="loading" title="Cargando página..." />
        ) : blocks.length === 0 ? (
          <p className="reader-empty">
            Esta página no tiene texto.
            <small>Puede ser una imagen o una hoja en blanco del libro original.</small>
          </p>
        ) : (
          blocks.map((block, i) => <PageBlock key={i} block={block} withMargin={withMargin} />)
        )}
        {pagina && <footer className="reader-folio">— {pagina.pagina} —</footer>}
      </article>

      <nav className="reader-nav" aria-label="Navegación de páginas">
        <button type="button" disabled={!pagina?.anterior} onClick={() => goTo(pagina.anterior)}>
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <form className="reader-jump" onSubmit={submitJump}>
          <label htmlFor="reader-page-input" className="sr-only">
            Ir a la página
          </label>
          <input
            id="reader-page-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={pagina?.totalPaginas}
            placeholder={String(numero)}
            value={jump}
            onChange={(e) => setJump(e.target.value)}
          />
          <span>/ {pagina?.totalPaginas ?? '—'}</span>
        </form>

        <button
          type="button"
          className="reader-next"
          disabled={!pagina?.siguiente}
          onClick={() => goTo(pagina.siguiente)}
        >
          <span>Siguiente</span>
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
