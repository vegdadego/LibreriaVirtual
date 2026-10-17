import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Sun, Moon, LogOut, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../features/auth/presentation/context/AuthContext';
import { getNavLinks } from './navLinks';

/**
 * Barra de navegación lateral izquierda (visible desde 768 px de ancho).
 *
 * Agrupa la marca, los accesos principales, el cambio de tema y la sesión del usuario.
 *
 * @param {Object} props
 * @param {boolean} props.collapsed Si es `true` solo se ven los iconos.
 * @param {Function} props.onToggle Alterna entre barra expandida y reducida.
 * @param {Function} props.onOpenLogin Abre el libro de acceso.
 * @returns {JSX.Element} La barra lateral.
 */
export default function SideNav({ collapsed, onToggle, onOpenLogin }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  const displayName = user?.nombre || user?.nombre_usuario || '';
  const role = user?.tipo_usuario || user?.rol || 'lector';
  const links = getNavLinks(user);

  return (
    <aside className="sidenav" aria-label="Navegación principal">
      <div className="sidenav-head">
        <NavLink to="/" className="sidenav-brand" title="Biblioteca Virtual">
          <span className="sidenav-logo gold-gradient" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-6 6m6-6l6 6" />
            </svg>
          </span>
          <span className="sidenav-brand-text">
            <strong>Biblioteca</strong>
            <small>Virtual</small>
          </span>
        </NavLink>
        <button
          type="button"
          className="sidenav-toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Reducir barra lateral'}
          title={collapsed ? 'Expandir barra lateral' : 'Reducir barra lateral'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="sidenav-nav">
        <NavLink to="/" end title="Inicio" className={({ isActive }) => `sidenav-link ${isActive ? 'active' : ''}`}>
          <Home size={18} />
          <span>Inicio</span>
        </NavLink>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) => `sidenav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidenav-footer">
        <button type="button" className="sidenav-link" onClick={toggleTheme} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
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
          <button type="button" className="sidenav-login" onClick={onOpenLogin} title="Ingresar">
            <User size={16} />
            <span>Ingresar</span>
          </button>
        )}
      </div>
    </aside>
  );
}
