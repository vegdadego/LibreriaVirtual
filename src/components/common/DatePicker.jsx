import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MIN_YEAR = 1000;
const YEARS_PER_PAGE = 12;

const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * Interpreta "AAAA-MM-DD" sin pasar por `Date` (evita desfases de zona horaria).
 *
 * @param {string} iso
 * @returns {{y: number, m: number, d: number}|null} `m` va de 0 a 11.
 */
function parseIso(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

/** Texto como "14 de octubre de 2026". */
function formatLong({ y, m, d }) {
  return `${d} de ${MESES[m]} de ${y}`;
}

/**
 * Selector de fecha propio: elige día, mes y año en tres vistas (días → meses → años),
 * pensado para fechas lejanas como la publicación de un libro. Sustituye al calendario
 * nativo del navegador, que obliga a avanzar mes a mes.
 *
 * @param {object} props
 * @param {string} props.value Fecha en formato `AAAA-MM-DD`, o `''` si no hay.
 * @param {(value: string) => void} props.onChange Recibe `AAAA-MM-DD` o `''` al borrar.
 * @param {string} [props.label] Nombre accesible del campo.
 * @param {string} [props.placeholder]
 * @param {string} [props.max] Fecha máxima permitida (`AAAA-MM-DD`); por defecto hoy.
 * @returns {JSX.Element}
 */
export default function DatePicker({
  value,
  onChange,
  label = 'Fecha',
  placeholder = 'Elegir fecha',
  max,
}) {
  const [todayParts] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  });
  const limit = parseIso(max) ?? todayParts;
  const selected = parseIso(value);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('dias'); // 'dias' | 'meses' | 'anios'
  const [cursor, setCursor] = useState({ y: selected?.y ?? todayParts.y, m: selected?.m ?? todayParts.m });
  const [yearPage, setYearPage] = useState(0);
  const root = useRef(null);
  const trigger = useRef(null);
  const popoverId = useId();

  // Cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (root.current && !root.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openPicker = () => {
    setCursor({ y: selected?.y ?? todayParts.y, m: selected?.m ?? todayParts.m });
    setView('dias');
    setOpen((o) => !o);
  };

  const afterLimit = (y, m, d) => toIso(y, m, d) > toIso(limit.y, limit.m, limit.d);

  const pick = (d) => {
    onChange(toIso(cursor.y, cursor.m, d));
    setOpen(false);
    trigger.current?.focus();
  };

  const moveMonth = (delta) =>
    setCursor(({ y, m }) => {
      const total = y * 12 + m + delta;
      return { y: Math.floor(total / 12), m: total % 12 };
    });

  const firstYearOfPage = () => {
    // La página 0 es el bloque de 12 años que contiene el año del cursor.
    const start = cursor.y - (cursor.y % YEARS_PER_PAGE);
    return start + yearPage * YEARS_PER_PAGE;
  };

  const goToYears = () => {
    setYearPage(0);
    setView('anios');
  };

  // Días del mes: la semana empieza el lunes.
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const offset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const canNext = cursor.y * 12 + cursor.m < limit.y * 12 + limit.m;
  const yearStart = firstYearOfPage();

  return (
    <div className="datepicker" ref={root}>
      <div className="datepicker-field">
        <button
          type="button"
          ref={trigger}
          className="datepicker-trigger"
          onClick={openPicker}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          aria-label={selected ? `${label}: ${formatLong(selected)}` : label}
        >
          <CalendarDays size={16} aria-hidden="true" />
          <span className={selected ? '' : 'placeholder'}>{selected ? formatLong(selected) : placeholder}</span>
        </button>
        {selected && (
          <button
            type="button"
            className="datepicker-clear"
            onClick={() => onChange('')}
            aria-label={`Borrar ${label.toLowerCase()}`}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="datepicker-popover" id={popoverId} role="dialog" aria-label={`Elegir ${label.toLowerCase()}`}>
          <div className="datepicker-head">
            {view === 'dias' && (
              <button type="button" className="dp-nav" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
                <ChevronLeft size={16} />
              </button>
            )}
            {view === 'meses' && (
              <button type="button" className="dp-nav" onClick={() => setCursor((c) => ({ ...c, y: c.y - 1 }))} aria-label="Año anterior">
                <ChevronLeft size={16} />
              </button>
            )}
            {view === 'anios' && (
              <button
                type="button"
                className="dp-nav"
                onClick={() => setYearPage((p) => p - 1)}
                disabled={yearStart <= MIN_YEAR}
                aria-label="Años anteriores"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <button
              type="button"
              className="dp-title"
              onClick={() => (view === 'dias' ? setView('meses') : view === 'meses' ? goToYears() : setView('dias'))}
              aria-live="polite"
            >
              {view === 'dias' && `${MESES[cursor.m]} de ${cursor.y}`}
              {view === 'meses' && cursor.y}
              {view === 'anios' && `${yearStart} – ${yearStart + YEARS_PER_PAGE - 1}`}
            </button>

            {view === 'dias' && (
              <button type="button" className="dp-nav" onClick={() => moveMonth(1)} disabled={!canNext} aria-label="Mes siguiente">
                <ChevronRight size={16} />
              </button>
            )}
            {view === 'meses' && (
              <button
                type="button"
                className="dp-nav"
                onClick={() => setCursor((c) => ({ ...c, y: c.y + 1 }))}
                disabled={cursor.y >= limit.y}
                aria-label="Año siguiente"
              >
                <ChevronRight size={16} />
              </button>
            )}
            {view === 'anios' && (
              <button
                type="button"
                className="dp-nav"
                onClick={() => setYearPage((p) => p + 1)}
                disabled={yearStart + YEARS_PER_PAGE > limit.y}
                aria-label="Años siguientes"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {view === 'dias' && (
            <>
              <div className="dp-grid dp-weekdays" aria-hidden="true">
                {DIAS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="dp-grid">
                {cells.map((d, i) =>
                  d === null ? (
                    <span key={`v${i}`} />
                  ) : (
                    <button
                      key={d}
                      type="button"
                      className={[
                        'dp-cell',
                        selected && selected.y === cursor.y && selected.m === cursor.m && selected.d === d ? 'selected' : '',
                        todayParts.y === cursor.y && todayParts.m === cursor.m && todayParts.d === d ? 'today' : '',
                      ].join(' ')}
                      disabled={afterLimit(cursor.y, cursor.m, d)}
                      onClick={() => pick(d)}
                      aria-label={formatLong({ y: cursor.y, m: cursor.m, d })}
                      aria-pressed={selected?.y === cursor.y && selected?.m === cursor.m && selected?.d === d}
                    >
                      {d}
                    </button>
                  )
                )}
              </div>
            </>
          )}

          {view === 'meses' && (
            <div className="dp-grid dp-cols-3">
              {MESES.map((nombre, m) => (
                <button
                  key={nombre}
                  type="button"
                  className={`dp-cell dp-wide ${selected && selected.y === cursor.y && selected.m === m ? 'selected' : ''}`}
                  disabled={afterLimit(cursor.y, m, 1)}
                  onClick={() => {
                    setCursor((c) => ({ ...c, m }));
                    setView('dias');
                  }}
                >
                  {nombre.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {view === 'anios' && (
            <div className="dp-grid dp-cols-3">
              {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearStart + i).map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`dp-cell dp-wide ${selected?.y === y ? 'selected' : ''}`}
                  disabled={y > limit.y || y < MIN_YEAR}
                  onClick={() => {
                    setCursor((c) => ({ ...c, y, m: Math.min(c.m, y === limit.y ? limit.m : 11) }));
                    setView('meses');
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          <div className="datepicker-foot">
            <button type="button" onClick={() => { onChange(toIso(limit.y, limit.m, limit.d)); setOpen(false); }}>
              {max ? 'Última fecha' : 'Hoy'}
            </button>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}>
              Borrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
