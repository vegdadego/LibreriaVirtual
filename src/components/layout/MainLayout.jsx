import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNavbar from './MobileNavbar';

export default function MainLayout({ children, currentRoute, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Sidebar para desktop y drawer para móvil */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Backdrop oscuro cuando el drawer móvil está abierto */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <div className="app-main">
        <Header
          currentRoute={currentRoute}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="app-content">{children}</main>
      </div>

      {/* Barra de navegación inferior para pantallas móviles */}
      <MobileNavbar
        currentRoute={currentRoute}
        onNavigate={onNavigate}
      />
    </div>
  );
}
