import React from 'react';
import { Calendar, User, CheckCircle, Clock } from 'lucide-react';
import Badge from '../../../../components/common/Badge';
import Button from '../../../../components/common/Button';
import { formatDate } from '../../../../utils/formatters';

export default function PrestamoCard({ prestamo, onDevolver }) {
  const isVencido = prestamo.estado === 'VENCIDO';
  const isDevuelto = prestamo.estado === 'DEVUELTO';

  const badgeVariant = isDevuelto ? 'success' : isVencido ? 'danger' : 'warning';
  const badgeText = isDevuelto ? 'Devuelto' : isVencido ? 'Vencido' : 'En Préstamo';

  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ marginBottom: '0.75rem' }}>
        <Badge variant={badgeVariant}>{badgeText}</Badge>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          ID: {prestamo.id}
        </span>
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '1.05rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
          {prestamo.libroTitulo}
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-secondary)', marginBottom: '0.75rem' }}>
          <User size={14} />
          <span>{prestamo.usuarioNombre}</span>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={13} style={{ color: 'var(--text-subtle)' }} />
            <span>Prestado: <strong>{formatDate(prestamo.fechaPrestamo)}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={13} style={{ color: isVencido ? 'var(--color-danger)' : 'var(--text-subtle)' }} />
            <span>
              Devolución esperada:{' '}
              <strong style={{ color: isVencido ? 'var(--color-danger)' : 'inherit' }}>
                {formatDate(prestamo.fechaDevolucionEsperada)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {!isDevuelto && (
        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDevolver(prestamo.id)}
            icon={CheckCircle}
            style={{ width: '100%' }}
          >
            Registrar Devolución
          </Button>
        </div>
      )}
    </div>
  );
}
