import React from 'react';
import { Edit2, Trash2, BookmarkCheck } from 'lucide-react';
import Badge from '../../../../components/common/Badge';

export default function LibroCard({ libro, onEdit, onDelete, onPrestar }) {
  const isAvailable = libro.estaDisponible ? libro.estaDisponible() : (libro.copiasDisponibles || 0) > 0;

  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ marginBottom: '0.75rem' }}>
        <Badge variant={isAvailable ? 'success' : 'danger'}>
          {isAvailable ? `${libro.copiasDisponibles} Disponibles` : 'Agotado'}
        </Badge>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          ISBN: {libro.isbn}
        </span>
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem', lineHeight: '1.3' }}>
          {libro.titulo}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
          {libro.autor}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>📂 {libro.categoria}</span>
          <span>•</span>
          <span>📅 {libro.año}</span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: '0.5rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onEdit(libro)}
            title="Editar libro"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onDelete(libro.id)}
            title="Eliminar libro"
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!isAvailable}
          onClick={() => onPrestar(libro)}
          style={{ opacity: isAvailable ? 1 : 0.5 }}
        >
          <BookmarkCheck size={14} />
          Prestar
        </button>
      </div>
    </div>
  );
}
