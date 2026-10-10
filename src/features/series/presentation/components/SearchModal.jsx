import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchModal({ isOpen, onClose, onSearch, onSelectSeries }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    } else {
      setQuery('');
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = onSearch(query);

  return (
    <div className="olympus-modal-backdrop" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--brand-cardBg)',
          border: '1px solid var(--brand-border)',
          borderRadius: '1rem',
          maxWidth: '560px',
          width: '100%',
          padding: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Header con Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--brand-border)',
            paddingBottom: '0.75rem',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexGrow: 1 }}>
            <Search size={20} style={{ color: 'var(--brand-accent)' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título..."
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--brand-text)',
                fontSize: '1rem',
              }}
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-text-subtle)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Resultados */}
        <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {!query.trim() ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--brand-text-subtle)', textAlign: 'center', padding: '1rem' }}>
              Escribe algo para buscar...
            </p>
          ) : results.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--brand-text-subtle)', textAlign: 'center', padding: '1rem' }}>
              No se encontraron series coincidentes.
            </p>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectSeries(item.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.5rem',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--brand-cardHover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <img
                  src={item.cover}
                  alt={item.title}
                  style={{
                    width: '42px',
                    height: '56px',
                    objectFit: 'cover',
                    borderRadius: '0.35rem',
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-text)' }}>
                    {item.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--brand-accent)', fontWeight: 600 }}>
                    {item.totalChapters} Capítulos
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
