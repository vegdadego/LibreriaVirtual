import React from 'react';
import { X } from 'lucide-react';

/**
 * Diálogo modal para la configuración de lectura (ancho de página, brillo, barra de progreso,
 * modo de lectura y separación entre párrafos/viñetas).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {Object} props.config
 * @param {(patch: Partial<import('../pages/ReaderPage').ReaderConfig>) => void} props.onChange
 * @returns {JSX.Element|null}
 */
export default function ConfiguracionLecturaModal({ isOpen, onClose, config, onChange }) {
  if (!isOpen) return null;

  return (
    <div className="olympus-modal-backdrop" onClick={onClose}>
      <aside
        className="reader-config-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-config-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="reader-config-head">
          <h2 id="reader-config-title" className="reader-config-title">Configuración de lectura</h2>
          <button
            type="button"
            className="reader-config-close"
            onClick={onClose}
            aria-label="Cerrar configuración de lectura"
          >
            <X size={18} />
          </button>
        </header>

        <div className="reader-config-body">
          {/* Ancho de página */}
          <div className="reader-config-field">
            <div className="reader-config-label-row">
              <label htmlFor="reader-page-width">Ancho de página</label>
              <span className="reader-config-value">{config.anchoPagina} px</span>
            </div>
            <input
              id="reader-page-width"
              type="range"
              min={480}
              max={1200}
              step={10}
              value={config.anchoPagina}
              onChange={(e) => onChange({ anchoPagina: Number(e.target.value) })}
              className="reader-config-slider"
            />
          </div>

          {/* Brillo */}
          <div className="reader-config-field">
            <div className="reader-config-label-row">
              <label htmlFor="reader-brightness">Brillo</label>
              <span className="reader-config-value">{config.brillo}%</span>
            </div>
            <input
              id="reader-brightness"
              type="range"
              min={30}
              max={100}
              step={5}
              value={config.brillo}
              onChange={(e) => onChange({ brillo: Number(e.target.value) })}
              className="reader-config-slider"
            />
          </div>

          {/* Barra de progreso */}
          <div className="reader-config-field">
            <span className="reader-config-label">Barra de progreso</span>
            <div className="reader-config-segmented" role="radiogroup" aria-label="Barra de progreso">
              <button
                type="button"
                role="radio"
                aria-checked={config.barraProgreso === 'mostrar'}
                className={`reader-config-seg-btn ${config.barraProgreso === 'mostrar' ? 'active' : ''}`}
                onClick={() => onChange({ barraProgreso: 'mostrar' })}
              >
                Mostrar
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={config.barraProgreso === 'ocultar'}
                className={`reader-config-seg-btn ${config.barraProgreso === 'ocultar' ? 'active' : ''}`}
                onClick={() => onChange({ barraProgreso: 'ocultar' })}
              >
                Ocultar
              </button>
            </div>
          </div>

          {/* Mostrar la barra con */}
          <div className="reader-config-field">
            <span className="reader-config-label">Mostrar la barra con</span>
            <div className="reader-config-segmented" role="radiogroup" aria-label="Mostrar la barra con">
              <button
                type="button"
                role="radio"
                aria-checked={config.mostrarBarraCon === 'un_toque'}
                className={`reader-config-seg-btn ${config.mostrarBarraCon === 'un_toque' ? 'active' : ''}`}
                onClick={() => onChange({ mostrarBarraCon: 'un_toque' })}
              >
                Un toque
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={config.mostrarBarraCon === 'doble_toque'}
                className={`reader-config-seg-btn ${config.mostrarBarraCon === 'doble_toque' ? 'active' : ''}`}
                onClick={() => onChange({ mostrarBarraCon: 'doble_toque' })}
              >
                Doble toque
              </button>
            </div>
          </div>

          {/* Modo */}
          <div className="reader-config-field">
            <span className="reader-config-label">Modo</span>
            <div className="reader-config-segmented" role="radiogroup" aria-label="Modo de lectura">
              <button
                type="button"
                role="radio"
                aria-checked={config.modo === 'cascada'}
                className={`reader-config-seg-btn ${config.modo === 'cascada' ? 'active' : ''}`}
                onClick={() => onChange({ modo: 'cascada' })}
              >
                Cascada
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={config.modo === 'pagina_a_pagina'}
                className={`reader-config-seg-btn ${config.modo === 'pagina_a_pagina' ? 'active' : ''}`}
                onClick={() => onChange({ modo: 'pagina_a_pagina' })}
              >
                Página a página
              </button>
            </div>
          </div>

          {/* Separación entre viñetas */}
          <div className="reader-config-field">
            <span className="reader-config-label">Separación entre viñetas</span>
            <div className="reader-config-segmented" role="radiogroup" aria-label="Separación entre viñetas">
              <button
                type="button"
                role="radio"
                aria-checked={config.separacionVinetas === 'sin_espacio'}
                className={`reader-config-seg-btn ${config.separacionVinetas === 'sin_espacio' ? 'active' : ''}`}
                onClick={() => onChange({ separacionVinetas: 'sin_espacio' })}
              >
                Sin espacio
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={config.separacionVinetas === 'fina'}
                className={`reader-config-seg-btn ${config.separacionVinetas === 'fina' ? 'active' : ''}`}
                onClick={() => onChange({ separacionVinetas: 'fina' })}
              >
                Fina
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={config.separacionVinetas === 'amplia'}
                className={`reader-config-seg-btn ${config.separacionVinetas === 'amplia' ? 'active' : ''}`}
                onClick={() => onChange({ separacionVinetas: 'amplia' })}
              >
                Amplia
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
