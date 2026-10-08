import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, BookmarkCheck, Users, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { defaultDashboardRepository } from '../../infrastructure/DashboardApiRepository';
import { GetDashboardMetricsUseCase } from '../../application/GetDashboardMetricsUseCase';
import { GetActividadRecienteUseCase } from '../../application/GetActividadRecienteUseCase';
import BackendStatusBanner from '../../../../components/common/BackendStatusBanner';
import { formatTimeAgo } from '../../../../utils/formatters';

export default function DashboardPage({ onNavigate, repository = defaultDashboardRepository }) {
  const [metricas, setMetricas] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inyección de casos de uso
  const getMetricsUseCase = useMemo(() => new GetDashboardMetricsUseCase(repository), [repository]);
  const getActividadUseCase = useMemo(() => new GetActividadRecienteUseCase(repository), [repository]);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, a] = await Promise.all([
          getMetricsUseCase.execute(),
          getActividadUseCase.execute()
        ]);
        setMetricas(m);
        setActividades(a);
      } catch (err) {
        console.error('Error cargando dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [getMetricsUseCase, getActividadUseCase]);

  return (
    <div>
      {/* Banner de estado de Backend */}
      <BackendStatusBanner />

      {/* Saludo y bienvenida */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h2>Panel de Control Bibliotecario</h2>
        <p>Visión general del estado del catálogo, circulación y lectores.</p>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Libros</h4>
            <div className="metric-number">{metricas?.totalLibros || 0}</div>
          </div>
          <div
            className="metric-icon-box"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            <BookOpen size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Préstamos Activos</h4>
            <div className="metric-number">{metricas?.prestamosActivos || 0}</div>
          </div>
          <div
            className="metric-icon-box"
            style={{ background: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}
          >
            <BookmarkCheck size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Préstamos Vencidos</h4>
            <div className="metric-number" style={{ color: 'var(--color-danger)' }}>
              {metricas?.prestamosVencidos || 0}
            </div>
          </div>
          <div
            className="metric-icon-box"
            style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}
          >
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Lectores Registrados</h4>
            <div className="metric-number">{metricas?.totalUsuarios || 0}</div>
          </div>
          <div
            className="metric-icon-box"
            style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
          >
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Acciones Rápidas y Resumen de Arquitectura */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Atajos de Navegación */}
        <div className="card">
          <div className="card-header">
            <h3>Acceso Rápido a Módulos</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
              onClick={() => onNavigate('libros')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BookOpen size={18} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 600 }}>Administrar Catálogo de Libros</span>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--text-subtle)' }} />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
              onClick={() => onNavigate('prestamos')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BookmarkCheck size={18} style={{ color: 'var(--color-secondary)' }} />
                <span style={{ fontWeight: 600 }}>Gestionar Préstamos y Devoluciones</span>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--text-subtle)' }} />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
              onClick={() => onNavigate('usuarios')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={18} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontWeight: 600 }}>Padrón de Lectores y Alumnos</span>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--text-subtle)' }} />
            </div>
          </div>
        </div>

        {/* Resumen de Arquitectura Limpia Modular */}
        <div className="card">
          <div className="card-header">
            <h3>Clean Architecture Modular</h3>
            <span className="badge badge-success">Capas Concéntricas</span>
          </div>
          <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            Cada feature implementa la regla de dependencias: <code>Domain &larr; Application &larr; Infrastructure / Presentation</code>.
          </p>

          <div style={{
            fontSize: '0.775rem',
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            color: '#38bdf8',
            lineHeight: '1.6'
          }}>
            📁 src/features/[feature]/<br />
            &nbsp; ├── 📁 domain/ (models, repositories)<br />
            &nbsp; ├── 📁 application/ (use cases puros)<br />
            &nbsp; ├── 📁 infrastructure/ (ApiRepository)<br />
            &nbsp; └── 📁 presentation/ (components, hooks, pages)
          </div>
        </div>
      </div>

      {/* Registro de Actividad Reciente */}
      <div className="card">
        <div className="card-header">
          <h3>
            <Activity size={18} style={{ color: 'var(--color-secondary)', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Actividad Reciente
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Sincronización en vivo</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {actividades.map((act) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.85rem'
              }}
            >
              <span>{act.descripcion}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                {formatTimeAgo(act.fecha)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
