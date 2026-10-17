import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { useDescargas } from '../context/DescargasContext';
import { useAuth } from '../../../auth/presentation/context/AuthContext';
import { useOnlineStatus } from '../../../../hooks/useOnlineStatus';

/**
 * Texto del avance de una descarga en curso.
 *
 * @param {{fase: string, hecho?: number, total?: number}} avance
 * @returns {string}
 */
function labelFor(avance) {
  if (avance.fase === 'pdf' && avance.total) {
    return `Creando PDF ${Math.round((avance.hecho / avance.total) * 100)} %`;
  }
  if (avance.fase === 'guardando') return 'Guardando...';
  return 'Descargando...';
}

/**
 * Botón para descargar un libro (PDF para leer sin conexión) o quitar la descarga.
 * Sin sesión abre el libro de acceso.
 *
 * @param {Object} props
 * @param {import('../../../libros/domain/models/Libro').Libro} props.libro
 * @returns {JSX.Element}
 */
export default function DownloadButton({ libro }) {
  const { isAuthenticated } = useAuth();
  const { isDescargado, progresoDe, descargar, quitar } = useDescargas();
  const { openLogin } = useOutletContext();
  const online = useOnlineStatus();
  const [error, setError] = useState(null);

  const downloaded = isDescargado(libro.id);
  const avance = progresoDe(libro.id);
  const disabled = Boolean(avance) || libro.totalPaginas === 0 || (!downloaded && !online);

  const handleClick = async () => {
    setError(null);
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    try {
      if (downloaded) await quitar(libro.id);
      else await descargar(libro);
    } catch (err) {
      setError(err.message || 'No se pudo completar la descarga.');
    }
  };

  return (
    <span className="download-wrap">
      <button
        type="button"
        className="detail-pill-btn"
        onClick={handleClick}
        disabled={disabled}
        aria-pressed={downloaded}
        title={
          downloaded
            ? 'Quitar la descarga de este dispositivo'
            : !online
              ? 'Necesitas conexión para descargar'
              : 'Descargar para leer sin conexión'
        }
      >
        {avance ? (
          <Loader2 size={17} className="spin" />
        ) : downloaded ? (
          <CheckCircle2 size={17} />
        ) : (
          <Download size={17} />
        )}
        <span>{avance ? labelFor(avance) : downloaded ? 'Descargado' : 'Descargar'}</span>
      </button>
      {error && (
        <span className="download-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
