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
                {/* Logo Icon */}
                <svg
                  style={{ width: '20px', height: '20px', color: '#d97706', fill: 'currentColor' }}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 7h20L12 2zm-8 7v10h2V9H4zm5 0v10h2V9H9zm5 0v10h2V9h-2zm5 0v10h2V9h-2zM2 20v2h20v-2H2z" />
                </svg>
              </div>
            </div>

            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: 'var(--brand-text)',
                textTransform: 'uppercase',
              }}
            >

            </span>
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
