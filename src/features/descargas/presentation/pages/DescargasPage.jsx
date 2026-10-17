import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BookOpen, Download, FileDown, Lock, Trash2, WifiOff } from 'lucide-react';
import BookCover from '../../../libros/presentation/components/BookCover';
import PageState from '../../../../components/common/PageState';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { useDescargas } from '../context/DescargasContext';
import { ListDescargasUseCase } from '../../application/DescargaUseCases';
import { useMiBiblioteca } from '../../../biblioteca/presentation/context/MiBibliotecaContext';
import { useOnlineStatus } from '../../../../hooks/useOnlineStatus';

/**
 * Peso legible ("1,4 MB").
 *
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Guarda el PDF de una descarga como archivo en el dispositivo.
 *
 * @param {import('../../domain/models/Descarga').Descarga} descarga
 */
function saveAsFile(descarga) {
  const url = URL.createObjectURL(descarga.pdf);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${descarga.titulo.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'libro'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Tarjeta de un libro descargado.
 *
 * @param {Object} props
 * @param {import('../../domain/models/Descarga').Descarga} props.descarga
 * @param {Function} props.onRead
 * @param {Function} props.onRemove
 * @returns {JSX.Element}
 */
function DescargaCard({ descarga, onRead, onRemove }) {
  const [coverUrl, setCoverUrl] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!descarga.portada) {
      setCoverUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(descarga.portada);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [descarga.portada]);

  return (
    <article className="download-card">
      <button type="button" className="download-card-cover" onClick={onRead} aria-label={`Leer ${descarga.titulo}`}>
        <BookCover titulo={descarga.titulo} src={coverUrl} />
      </button>
      <div className="download-card-info">
        <h2>{descarga.titulo}</h2>
        {descarga.autores.length > 0 && <p>{descarga.autores.join(', ')}</p>}
        <small>
          {descarga.totalPaginas} págs. · {formatSize(descarga.tamano)} ·{' '}
          {new Date(descarga.fecha).toLocaleDateString('es')}
        </small>
        <div className="download-card-actions">
          <button type="button" className="download-action primary" onClick={onRead}>
            <BookOpen size={15} />
            <span>Leer</span>
          </button>
          <button type="button" className="download-action" onClick={() => saveAsFile(descarga)}>
            <FileDown size={15} />
            <span>Guardar PDF</span>
          </button>
          <button
            type="button"
            className="download-action danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRemove();
              } finally {
                setBusy(false);
              }
            }}
            aria-label={`Quitar la descarga de ${descarga.titulo}`}
          >
            <Trash2 size={15} />
            <span>Quitar</span>
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * "Descargados": libros guardados en este dispositivo para leer sin conexión.
 * Solo usa el almacén local, así que funciona sin red.
 *
 * @returns {JSX.Element}
 */
export default function DescargasPage() {
  const navigate = useNavigate();
  const { openLogin } = useOutletContext();
  const { user, loading: authLoading } = useAuth();
  const { usuarioId, repository, version, quitar } = useDescargas();
  const { paginaActual } = useMiBiblioteca();
  const online = useOnlineStatus();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const useCase = useMemo(() => new ListDescargasUseCase(repository), [repository]);

  const load = useCallback(async () => {
    if (!usuarioId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setItems(await useCase.execute(usuarioId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [usuarioId, useCase]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (authLoading) return <PageState kind="loading" title="Cargando..." />;
  if (!user) {
    return (
      <PageState
        icon={Lock}
        title="Inicia sesión para ver tus descargas"
        description="Las descargas se guardan en este dispositivo, separadas por cuenta."
        actionLabel="Ingresar"
        onAction={openLogin}
      />
    );
  }

  const total = items.reduce((sum, item) => sum + item.tamano, 0);

  return (
    <section className="library">
      <header className="page-header">
        <h1>Descargados</h1>
        <p>
          Libros guardados en este dispositivo para leer sin conexión
          {items.length > 0 ? ` · ${items.length} (${formatSize(total)})` : ''}.
        </p>
        {!online && (
          <p className="offline-note">
            <WifiOff size={15} /> Estás sin conexión: aquí puedes seguir leyendo tus descargas.
          </p>
        )}
      </header>

      {loading ? (
        <PageState kind="loading" title="Cargando tus descargas..." />
      ) : error ? (
        <PageState kind="error" title="No se pudieron leer las descargas" description={error} onRetry={load} />
      ) : items.length === 0 ? (
        <PageState
          icon={Download}
          title="Aún no descargaste libros"
          description="Pulsa «Descargar» en la ficha de un libro para leerlo sin conexión."
          actionLabel="Explorar la biblioteca"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="download-list">
          {items.map((descarga) => (
            <DescargaCard
              key={descarga.libroId}
              descarga={descarga}
              onRead={() =>
                navigate(`/leer/${descarga.libroId}/${Math.min(paginaActual(descarga.libroId) || 1, descarga.totalPaginas)}`)
              }
              onRemove={() => quitar(descarga.libroId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
