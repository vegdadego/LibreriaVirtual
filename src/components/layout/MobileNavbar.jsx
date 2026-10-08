import React from 'react';
import { LayoutDashboard, BookOpen, BookmarkCheck, Users } from 'lucide-react';

export default function MobileNavbar({ currentRoute, onNavigate }) {
  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'libros', label: 'Libros', icon: BookOpen },
    { id: 'prestamos', label: 'Préstamos', icon: BookmarkCheck },
    { id: 'usuarios', label: 'Lectores', icon: Users },
  ];

  return (
    <nav className="app-mobile-nav" aria-label="Navegación móvil">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentRoute === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(tab.id)}
          >
            <Icon size={20} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
