import React, { useState } from 'react';
import { Home, Layers, Trophy, BookOpen, Search, User, Sun, Moon, LogOut, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../features/auth/presentation/context/AuthContext';

export default function Header({ onGoHome, onToggleSearch, onOpenLogin }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

          {/* Autenticación & Perfil de Usuario */}
          <div style={{ position: 'relative' }}>
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.75rem',
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  border: '1px solid rgba(217, 119, 6, 0.35)',
                  color: '#f59e0b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  transition: 'all 0.2s ease',
                }}
                title={`Conectado como ${user.nombre || user.nombre_usuario}`}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#d97706',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  {(user.nombre || user.nombre_usuario || 'U').charAt(0).toUpperCase()}
                </div>
                <span>{user.nombre || user.nombre_usuario}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '0.75rem',
                  backgroundColor: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  background: '#d97706',
                  border: 'none',
                  color: '#18181b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.35)',
                  transition: 'all 0.2s ease',
                }}
                title="Iniciar sesión en la biblioteca"
              >
                <User size={15} />
                <span>Ingresar</span>
              </button>
            )}

            {/* Menú desplegable cuando está conectado */}
            {isMenuOpen && isAuthenticated && user && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 0.6rem)',
                  width: '230px',
                  backgroundColor: 'var(--brand-cardBg, #18181b)',
                  border: '1px solid var(--brand-border, rgba(255, 255, 255, 0.12))',
                  borderRadius: '1rem',
                  padding: '0.85rem',
                  boxShadow: '0 20px 30px rgba(0, 0, 0, 0.6)',
                  zIndex: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))', paddingBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--brand-text, #fff)' }}>
                      {user.nombre || user.nombre_usuario}
                    </span>
                    <CheckCircle2 size={14} style={{ color: '#4ade80' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--brand-text-subtle, #a1a1aa)', display: 'block', marginTop: '0.15rem' }}>
                    {user.email || user.correo}
                  </span>
                  <div
                    style={{
                      display: 'inline-block',
                      marginTop: '0.4rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(217, 119, 6, 0.15)',
                      color: '#f59e0b',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    Rol: {user.tipo_usuario || user.rol || 'lector'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '0.65rem',
                    padding: '0.55rem',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <LogOut size={14} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
