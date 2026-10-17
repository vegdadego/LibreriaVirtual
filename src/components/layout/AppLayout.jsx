import React, { useCallback, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, LogOut, User, WifiOff } from 'lucide-react';
import SideNav from './SideNav';
import { getNavLinks } from './navLinks';
import BookLogin from '../../features/auth/presentation/components/BookLogin/BookLogin';
import { useAuth } from '../../features/auth/presentation/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const NAV_COLLAPSED_KEY = 'nav-collapsed';

/** Lee si la barra lateral quedó reducida; sin almacenamiento disponible, expandida. */
function readNavCollapsed() {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Estructura común de la app: barra lateral (escritorio, se puede reducir a iconos),
 * barra flotante (móvil) y libro de acceso. Las pantallas se pintan en `<Outlet>` y
 * reciben `openLogin` por `useOutletContext()`.
 *
 * @returns {JSX.Element}
 */
export default function AppLayout() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(readNavCollapsed);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const online = useOnlineStatus();

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);
  const toggleNav = useCallback(() => {
    setNavCollapsed((collapsed) => {
      try {
        localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '0' : '1');
      } catch {
        // Sin almacenamiento la preferencia solo dura mientras la página está abierta.
      }
      return !collapsed;
    });
  }, []);

  const links = getNavLinks(user);

  return (
    <div className={`app-shell ${navCollapsed ? 'nav-collapsed' : ''}`}>
      <SideNav collapsed={navCollapsed} onToggle={toggleNav} onOpenLogin={openLogin} />

      <div className="app-main">
        <main className="main-content" key={location.pathname.split('/')[1] || 'home'}>
          {!online && (
            <p className="offline-banner" role="status">
              <WifiOff size={15} /> Sin conexión. Puedes leer los libros que descargaste en «Descargados».
            </p>
          )}
          <Outlet context={{ openLogin }} />
        </main>
      </div>

      <nav className="floating-mobile-nav" aria-label="Navegación móvil">
        <NavLink to="/" end className={({ isActive }) => `floating-nav-btn ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Inicio</span>
        </NavLink>

        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `floating-nav-btn ${isActive ? 'active' : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}

        {isAuthenticated ? (
          <button
            type="button"
            className="floating-nav-btn"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        ) : (
          <button type="button" className="floating-nav-btn" onClick={openLogin}>
            <User size={20} />
            <span>Ingresar</span>
          </button>
        )}
      </nav>

      <BookLogin isOpen={isLoginOpen} onClose={closeLogin} />
    </div>
  );
}
