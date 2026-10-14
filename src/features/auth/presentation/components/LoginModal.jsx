import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, CheckCircle, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [registerData, setRegisterData] = useState({
    nombre_usuario: '',
    correo: '',
    password: '',
    tipo_usuario: 'lector',
  });

  if (!isOpen) return null;

  const handleQuickFillGustavo = () => {
    setLoginData({
      identifier: 'gustavo@example.com',
      password: 'admin',
    });
    setError(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({
        email: loginData.identifier,
        password: loginData.password,
      });
      setSuccessMsg('¡Bienvenido de nuevo!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1000);
    } catch (err) {
      setError(err?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(registerData);
      setSuccessMsg('¡Cuenta creada e iniciada con éxito!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1000);
    } catch (err) {
      setError(err?.message || 'Error al registrar usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--brand-cardBg, #18181b)',
          border: '1px solid var(--brand-border, rgba(255, 255, 255, 0.12))',
          borderRadius: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '1.5rem 1.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--glass-border, rgba(255, 255, 255, 0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #d97706, #b45309)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 10px rgba(217, 119, 6, 0.3)',
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--brand-text, #f4f4f5)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Acceso a la Biblioteca
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--brand-text-subtle, #a1a1aa)' }}>
                Base de datos: virtual_library_db
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-text-muted, #71717a)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Pestañas de Alternancia */}
        <div
          style={{
            display: 'flex',
            padding: '0.75rem 1.5rem 0',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.6rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              borderRadius: '0.65rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'login' ? 'rgba(217, 119, 6, 0.15)' : 'transparent',
              color: activeTab === 'login' ? '#f59e0b' : 'var(--brand-text-muted, #a1a1aa)',
              borderBottom: activeTab === 'login' ? '2px solid #f59e0b' : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.6rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              borderRadius: '0.65rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'register' ? 'rgba(217, 119, 6, 0.15)' : 'transparent',
              color: activeTab === 'register' ? '#f59e0b' : 'var(--brand-text-muted, #a1a1aa)',
              borderBottom: activeTab === 'register' ? '2px solid #f59e0b' : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Contenido del Formulario */}
        <div style={{ padding: '1.25rem 1.5rem 1.75rem' }}>
          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulario de Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-text-subtle, #a1a1aa)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Usuario o Correo Electrónico
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User
                    size={17}
                    style={{ position: 'absolute', left: '0.9rem', color: 'var(--brand-text-muted, #71717a)' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="ej. GustavoM o gustavo@example.com"
                    value={loginData.identifier}
                    onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.6rem',
                      borderRadius: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--brand-border, rgba(255, 255, 255, 0.1))',
                      color: 'var(--brand-text, #f4f4f5)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-text-subtle, #a1a1aa)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Contraseña
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock
                    size={17}
                    style={{ position: 'absolute', left: '0.9rem', color: 'var(--brand-text-muted, #71717a)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Ingresa tu contraseña"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                      borderRadius: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--brand-border, rgba(255, 255, 255, 0.1))',
                      color: 'var(--brand-text, #f4f4f5)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.9rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-text-muted, #71717a)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Botón rápido para demo con GustavoM */}
              <button
                type="button"
                onClick={handleQuickFillGustavo}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: 'none',
                  color: '#d97706',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>⚡ Autocompletar con usuario GustavoM</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#18181b',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
                  transition: 'opacity 0.2s ease',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Validando...' : 'Entrar a la Biblioteca'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          )}

          {/* Formulario de Registro */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-text-subtle, #a1a1aa)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Nombre de Usuario
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User
                    size={17}
                    style={{ position: 'absolute', left: '0.9rem', color: 'var(--brand-text-muted, #71717a)' }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="ej. CarlosR"
                    value={registerData.nombre_usuario}
                    onChange={(e) => setRegisterData({ ...registerData, nombre_usuario: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem 0.7rem 2.6rem',
                      borderRadius: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--brand-border, rgba(255, 255, 255, 0.1))',
                      color: 'var(--brand-text, #f4f4f5)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-text-subtle, #a1a1aa)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Correo Electrónico
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail
                    size={17}
                    style={{ position: 'absolute', left: '0.9rem', color: 'var(--brand-text-muted, #71717a)' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="carlos@example.com"
                    value={registerData.correo}
                    onChange={(e) => setRegisterData({ ...registerData, correo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem 0.7rem 2.6rem',
                      borderRadius: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--brand-border, rgba(255, 255, 255, 0.1))',
                      color: 'var(--brand-text, #f4f4f5)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-text-subtle, #a1a1aa)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Contraseña
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock
                    size={17}
                    style={{ position: 'absolute', left: '0.9rem', color: 'var(--brand-text-muted, #71717a)' }}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 4 caracteres"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem 0.7rem 2.6rem',
                      borderRadius: '0.75rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--brand-border, rgba(255, 255, 255, 0.1))',
                      color: 'var(--brand-text, #f4f4f5)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--brand-text-subtle, #a1a1aa)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Tipo de Usuario
                </label>
                <select
                  value={registerData.tipo_usuario}
                  onChange={(e) => setRegisterData({ ...registerData, tipo_usuario: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem',
                    borderRadius: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--brand-border, rgba(255, 255, 255, 0.1))',
                    color: 'var(--brand-text, #f4f4f5)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="lector" style={{ backgroundColor: '#18181b' }}>Lector (Lectura de libros)</option>
                  <option value="uploader" style={{ backgroundColor: '#18181b' }}>Uploader (Subir y escanear libros)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#18181b',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
                  transition: 'opacity 0.2s ease',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Creando cuenta...' : 'Completar Registro'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
