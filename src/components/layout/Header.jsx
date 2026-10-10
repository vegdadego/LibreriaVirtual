import React from 'react';
import { Home, Layers, Trophy, BookOpen, Search, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ onGoHome, onToggleSearch }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '70px',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.25s ease',
      }}
      className="glass-header"
    >
      <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Logo & Marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div
            onClick={onGoHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div
              className="gold-gradient"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-darkBg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Logo Icon (Minimalista) */}
                <svg
                  style={{ width: '22px', height: '22px', color: 'var(--brand-accent)', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2 }}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-6 6m6-6l6 6" />
                </svg>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  letterSpacing: '0.18em',
                  color: 'var(--brand-text)',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 1.1,
                }}
              >
                BIBLIOTECA
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--brand-text-subtle)',
                  fontWeight: 600,
                }}
              >
                Virtual
              </span>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            className="md-flex"
          >
            <button
              type="button"
              onClick={onGoHome}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                color: '#d97706',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <Home size={15} />
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={onGoHome}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: 'transparent',
                color: 'var(--brand-text-muted)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <Layers size={15} />
              <span>Series</span>
            </button>

            <button
              type="button"
              onClick={() => alert('Sección de Rankings próximamente disponible')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: 'transparent',
                color: 'var(--brand-text-muted)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <Trophy size={15} />
              <span>Rankings</span>
            </button>

            <button
              type="button"
              onClick={() => alert('Sección de Capítulos recopilados')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: 'transparent',
                color: 'var(--brand-text-muted)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <BookOpen size={15} />
              <span>Capítulos</span>
            </button>
          </nav>
        </div>

        {/* Acciones Derecha (Buscar, Modo Claro/Oscuro y Perfil) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Botón Buscar */}
          <button
            type="button"
            onClick={onToggleSearch}
            style={{
              padding: '0.6rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--brand-border)',
              color: 'var(--brand-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            title="Buscar Manhwa"
          >
            <Search size={18} />
          </button>

          {/* Botón Alternar Tema Claro / Oscuro */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              padding: '0.6rem',
              borderRadius: '0.75rem',
              backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              color: '#d97706',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label="Alternar tema claro y oscuro"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Menú de Usuario */}
          <button
            type="button"
            onClick={() => {}}
            style={{
              padding: '0.6rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--brand-border)',
              color: 'var(--brand-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Perfil de Usuario"
          >
            <User size={18} />
          </button>
        </div>

      </div>
    </header>
  );
}
