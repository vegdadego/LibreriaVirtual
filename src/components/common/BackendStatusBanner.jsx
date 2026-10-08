import React, { useState, useEffect } from 'react';
import { Server, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import apiClient from '../../services/api/apiClient';

export default function BackendStatusBanner() {
  const [isConnected, setIsConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  const verifyConnection = async () => {
    setChecking(true);
    const connected = await apiClient.checkConnection();
    setIsConnected(connected);
    setChecking(false);
  };

  useEffect(() => {
    verifyConnection();
  }, []);

  return (
    <div className="integration-banner">
      <div className="integration-text">
        <h4>
          <Server size={18} style={{ color: 'var(--color-primary)' }} />
          Arquitectura Frontend Lista para Backend
        </h4>
        <p>
          Las carpetas y servicios apuntan a{' '}
          <code className="code-pill">{baseUrl}</code>.
          {isConnected ? (
            <span style={{ color: 'var(--color-accent)', marginLeft: '0.5rem', fontWeight: 600 }}>
              • Conectado al backend
            </span>
          ) : (
            <span style={{ color: 'var(--color-warning)', marginLeft: '0.5rem' }}>
              • Esperando inicio del servidor backend (Modo Frontend activo)
            </span>
          )}
        </p>
      </div>

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={verifyConnection}
        title="Probar conexión con el backend"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
      >
        <RefreshCw size={14} className={checking ? 'spin' : ''} />
        {checking ? 'Probando...' : isConnected ? 'En línea' : 'Verificar API'}
      </button>
    </div>
  );
}
