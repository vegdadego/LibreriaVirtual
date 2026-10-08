import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  BookmarkCheck,
  Users,
  Settings,
  Server,
  X
} from 'lucide-react';

export default function Sidebar({
  currentRoute,
  onNavigate,
  isOpen,
  onClose
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'libros', label: 'Catálogo de Libros', icon: BookOpen },
    { id: 'prestamos', label: 'Préstamos y Circulación', icon: BookmarkCheck },
    { id: 'usuarios', label: 'Lectores y Usuarios', icon: Users },
  ];

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-logo-icon">
          <BookOpen size={20} />
        </div>
        <span className="brand-text">BiblioTech</span>
        <span className="brand-badge">v1.0</span>

        <button
          type="button"
          className="btn-ghost btn-icon"
          onClick={onClose}
          style={{ marginLeft: 'auto', display: isOpen ? 'flex' : 'none' }}
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-title">Módulos del Sistema</span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.id);
                if (onClose) onClose();
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="backend-indicator-card">
          <div className="indicator-row">
            <span className="status-dot"></span>
            <span>API Client Configurado</span>
          </div>
          <p className="indicator-subtitle">{baseUrl}</p>
        </div>
      </div>
    </aside>
  );
}
