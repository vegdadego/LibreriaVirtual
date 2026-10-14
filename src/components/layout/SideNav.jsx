import React from 'react';
import { Home, Library, Search, Sun, Moon, LogOut, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../features/auth/presentation/context/AuthContext';

/**
 * Barra de navegación lateral izquierda (visible desde 768 px de ancho).
 *
 * Agrupa la marca, los accesos principales, el cambio de tema y la sesión del usuario.
 *
 * @param {Object} props
 * @param {'home'|'series'|'reader'} props.currentView Vista activa, para resaltar el acceso.
 * @param {Function} props.onGoHome Navega al inicio.
 * @param {Function} props.onGoLibrary Navega a la última serie abierta.
 * @param {Function} props.onOpenSearch Abre el buscador.
 * @param {Function} props.onOpenLogin Abre el libro de acceso.
 * @returns {JSX.Element} La barra lateral.
 */
export default function SideNav({ currentView, onGoHome, onGoLibrary, onOpenSearch, onOpenLogin }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  const displayName = user?.nombre || user?.nombre_usuario || '';
  const role = user?.tipo_usuario || user?.rol || 'lector';

  return (
    <aside className="sidenav" aria-label="Navegación principal">
      <button type="button" className="sidenav-brand" onClick={onGoHome}>
        <span className="sidenav-logo gold-gradient" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-6 6m6-6l6 6" />
          </svg>
        </span>
        <span className="sidenav-brand-text">
          <strong>Biblioteca</strong>
          <small>Virtual</small>
        </span>
      </button>

      <nav className="sidenav-nav">
        <button
          type="button"
          className={`sidenav-link ${currentView === 'home' ? 'active' : ''}`}
          onClick={onGoHome}
        >
          <Home size={18} />
          <span>Inicio</span>
        </button>
        <button
          type="button"
          className={`sidenav-link ${currentView !== 'home' ? 'active' : ''}`}
          onClick={onGoLibrary}
        >
          <Library size={18} />
          <span>Biblioteca</span>
        </button>
        <button type="button" className="sidenav-link" onClick={onOpenSearch}>
          <Search size={18} />
          <span>Explorar</span>
        </button>
      </nav>

      <div className="sidenav-footer">
        <button type="button" className="sidenav-link" onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>

        {isAuthenticated && user ? (
          <div className="sidenav-user">
            <span className="sidenav-avatar" aria-hidden="true">
              {displayName.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="sidenav-user-info">
              <strong>{displayName}</strong>
              <small>{role}</small>
            </span>
            <button type="button" className="sidenav-icon-btn" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button type="button" className="sidenav-login" onClick={onOpenLogin}>
            <User size={16} />
            <span>Ingresar</span>
          </button>
        )}
      </div>
    </aside>
  );
}
