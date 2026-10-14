import React, { useEffect, useState } from 'react';
import { X, Lock, Mail, User, CheckCircle, AlertCircle, ArrowRight, Eye, EyeOff, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './BookLogin.css';

const INITIAL_LOGIN = { identifier: '', password: '' };
const INITIAL_REGISTER = { nombre_usuario: '', correo: '', password: '', tipo_usuario: 'lector' };

/**
 * Muestra el acceso a la aplicación como un libro abierto a pantalla casi completa.
 *
 * Página izquierda: formulario de inicio de sesión / registro con los campos que
 * exige el backend (`/auth/login` y `/auth/register`). Página derecha: introducción
 * a la aplicación. El fondo de la página queda desenfocado.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen Indica si el libro está visible.
 * @param {Function} props.onClose Se invoca al cerrar el libro o tras autenticarse.
 * @returns {JSX.Element|null} El libro de acceso, o null si está cerrado.
 */
export default function BookLogin({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loginData, setLoginData] = useState(INITIAL_LOGIN);
  const [registerData, setRegisterData] = useState(INITIAL_REGISTER);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    // Evita que la página de fondo se desplace mientras el libro está abierto.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError(null);
  };

  const finishSuccessfully = (message) => {
    setSuccessMsg(message);
    setTimeout(() => {
      setSuccessMsg(null);
      setLoginData(INITIAL_LOGIN);
      setRegisterData(INITIAL_REGISTER);
      onClose();
    }, 1000);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email: loginData.identifier, password: loginData.password });
      finishSuccessfully('¡Bienvenido de nuevo!');
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
      finishSuccessfully('¡Cuenta creada e iniciada con éxito!');
    } catch (err) {
      setError(err?.message || 'Error al registrar usuario.');
    } finally {
      setLoading(false);
    }
  };

  const isLogin = activeTab === 'login';

  return (
    <div
      className="book-login-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="book-login" role="dialog" aria-modal="true" aria-labelledby="book-login-title">
        <button type="button" className="book-login-close" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>

        {/* Página izquierda: formulario */}
        <section className="book-login-page book-login-page--left">
          <p className="book-login-chapter">Capítulo I · El umbral</p>
          <h2 id="book-login-title" className="book-login-title">
            {isLogin ? 'Abre tu biblioteca' : 'Escribe tu nombre en el libro'}
          </h2>

          <div className="book-login-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`book-login-tab ${isLogin ? 'is-active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={`book-login-tab ${!isLogin ? 'is-active' : ''}`}
              onClick={() => switchTab('register')}
            >
              Crear cuenta
            </button>
          </div>

          {error && (
            <div className="book-login-alert book-login-alert--error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="book-login-alert book-login-alert--success" role="status">
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {isLogin ? (
            <form className="book-login-form" onSubmit={handleLoginSubmit}>
              <label className="book-login-field" htmlFor="bl-identifier">
                <span>Usuario o correo electrónico</span>
                <div className="book-login-input">
                  <User size={17} />
                  <input
                    id="bl-identifier"
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="Tu usuario o correo"
                    value={loginData.identifier}
                    onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  />
                </div>
              </label>

              <label className="book-login-field" htmlFor="bl-password">
                <span>Contraseña</span>
                <div className="book-login-input">
                  <Lock size={17} />
                  <input
                    id="bl-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="book-login-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <button type="submit" className="book-login-submit" disabled={loading}>
                {loading ? 'Validando...' : 'Entrar a la biblioteca'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          ) : (
            <form className="book-login-form" onSubmit={handleRegisterSubmit}>
              <label className="book-login-field" htmlFor="bl-reg-user">
                <span>Nombre de usuario</span>
                <div className="book-login-input">
                  <User size={17} />
                  <input
                    id="bl-reg-user"
                    type="text"
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="ej. CarlosR"
                    value={registerData.nombre_usuario}
                    onChange={(e) => setRegisterData({ ...registerData, nombre_usuario: e.target.value })}
                  />
                </div>
              </label>

              <label className="book-login-field" htmlFor="bl-reg-mail">
                <span>Correo electrónico</span>
                <div className="book-login-input">
                  <Mail size={17} />
                  <input
                    id="bl-reg-mail"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="carlos@example.com"
                    value={registerData.correo}
                    onChange={(e) => setRegisterData({ ...registerData, correo: e.target.value })}
                  />
                </div>
              </label>

              <label className="book-login-field" htmlFor="bl-reg-pass">
                <span>Contraseña</span>
                <div className="book-login-input">
                  <Lock size={17} />
                  <input
                    id="bl-reg-pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Elige una contraseña"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="book-login-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <label className="book-login-field" htmlFor="bl-reg-type">
                <span>Tipo de usuario</span>
                <div className="book-login-input">
                  <select
                    id="bl-reg-type"
                    value={registerData.tipo_usuario}
                    onChange={(e) => setRegisterData({ ...registerData, tipo_usuario: e.target.value })}
                  >
                    <option value="lector">Lector (leer libros)</option>
                    <option value="uploader">Uploader (subir y escanear libros)</option>
                  </select>
                </div>
              </label>

              <button type="submit" className="book-login-submit" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Completar registro'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          )}
        </section>

        {/* Página derecha: introducción */}
        <section className="book-login-page book-login-page--right">
          <p className="book-login-chapter">Prólogo</p>
          <BookOpen size={34} className="book-login-emblem" aria-hidden="true" />
          <h2 className="book-login-title">Bienvenido a Librería Virtual</h2>

          <p className="book-login-intro">
            Cada historia espera su siguiente lector. Aquí reunimos libros, sagas y autores
            en un solo lugar para que leas a tu ritmo, desde donde estés, y retomes
            justo en la página donde lo dejaste.
          </p>

          <ul className="book-login-highlights">
            <li>Explora sagas completas y descubre autores nuevos.</li>
            <li>Lee cada libro página a página, sin perder el hilo.</li>
            <li>Comparte tu opinión y sigue las series que te atrapan.</li>
          </ul>

          <p className="book-login-quote">
            «Un lector vive mil vidas antes de morir.»
            <span>Abre el libro. Tu próxima historia empieza al iniciar sesión.</span>
          </p>
        </section>
      </div>
    </div>
  );
}
