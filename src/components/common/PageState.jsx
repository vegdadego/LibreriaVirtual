import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

/**
 * Estado de una pantalla: cargando, error o vacío, con un botón de acción opcional.
 *
 * @param {Object} props
 * @param {'loading'|'error'|'empty'} [props.kind='empty']
 * @param {React.ComponentType<{size: number}>} [props.icon] Icono para el estado vacío.
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {Function} [props.onRetry] Si se pasa, el estado de error muestra "Reintentar".
 * @param {string} [props.actionLabel] Texto del botón de acción (estado vacío).
 * @param {Function} [props.onAction]
 * @returns {JSX.Element}
 */
export default function PageState({
  kind = 'empty',
  icon: Icon,
  title,
  description,
  onRetry,
  actionLabel,
  onAction,
}) {
  const StateIcon = kind === 'loading' ? Loader2 : kind === 'error' ? AlertTriangle : Icon;

  return (
    <div className="page-state" role={kind === 'error' ? 'alert' : 'status'}>
      {StateIcon && (
        <span className={`page-state-icon ${kind === 'loading' ? 'spin' : ''}`}>
          <StateIcon size={30} />
        </span>
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {kind === 'error' && onRetry && (
        <button type="button" className="page-state-btn" onClick={onRetry}>
          <RefreshCw size={15} />
          <span>Reintentar</span>
        </button>
      )}
      {kind === 'empty' && actionLabel && onAction && (
        <button type="button" className="page-state-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
