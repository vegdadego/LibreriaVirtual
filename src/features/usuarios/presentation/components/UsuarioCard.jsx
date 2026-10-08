import React from 'react';
import { Mail, Phone, Hash, Edit2, Trash2 } from 'lucide-react';
import Badge from '../../../../components/common/Badge';

export default function UsuarioCard({ usuario, onEdit, onDelete }) {
  const hasLoans = usuario.tienePrestamosPendientes
    ? usuario.tienePrestamosPendientes()
    : (usuario.prestamosActivos || 0) > 0;

  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ marginBottom: '0.75rem' }}>
        <Badge variant={hasLoans ? 'warning' : 'primary'}>
          {hasLoans ? `${usuario.prestamosActivos} Libros en Préstamo` : 'Sin Préstamos'}
        </Badge>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          {usuario.tipo || 'Lector'}
        </span>
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
          {usuario.nombre}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Mail size={13} style={{ color: 'var(--color-primary)' }} />
            <span>{usuario.email}</span>
          </div>
          {usuario.telefono && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={13} style={{ color: 'var(--text-subtle)' }} />
              <span>{usuario.telefono}</span>
            </div>
          )}
          {usuario.documento && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Hash size={13} style={{ color: 'var(--text-subtle)' }} />
              <span>Matrícula/ID: <strong>{usuario.documento}</strong></span>
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.5rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: '0.5rem'
      }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onEdit(usuario)}
          title="Editar usuario"
        >
          <Edit2 size={14} />
          Editar
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onDelete(usuario.id)}
          title="Eliminar usuario"
          style={{ color: 'var(--color-danger)' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
