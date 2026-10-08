import React, { useState } from 'react';
import { BookmarkCheck, Plus, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePrestamos } from '../hooks/usePrestamos';
import PrestamoCard from '../components/PrestamoCard';
import PrestamoModal from '../components/PrestamoModal';
import Button from '../../../../components/common/Button';
import EmptyState from '../../../../components/common/EmptyState';
import { ENDPOINTS } from '../../../../services/api/endpoints';

export default function PrestamosPage({ preselectedLibro, onClearPreselectedLibro }) {
  const {
    prestamos,
    activosCount,
    vencidosCount,
    filterEstado,
    setFilterEstado,
    registrarPrestamo,
    devolverLibro
  } = usePrestamos();

  const [modalOpen, setModalOpen] = useState(Boolean(preselectedLibro));

  const handleOpenCreate = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (onClearPreselectedLibro) onClearPreselectedLibro();
  };

  const handleSavePrestamo = async (prestamoData) => {
    await registrarPrestamo(prestamoData);
  };

  return (
    <div>
      {/* Encabezado */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2>Préstamos y Circulación</h2>
          <p style={{ fontSize: '0.875rem' }}>
            Control de entregas, devoluciones y alertas de vencimiento de libros prestados.
          </p>
        </div>

        <Button onClick={handleOpenCreate} icon={Plus} variant="primary">
          Nuevo Préstamo
        </Button>
      </div>

      {/* Tabs / Filtros de Estado */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn btn-sm ${filterEstado === 'TODOS' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterEstado('TODOS')}
        >
          Todos ({prestamos.length})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filterEstado === 'ACTIVO' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterEstado('ACTIVO')}
        >
          <Clock size={13} />
          Activos ({activosCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filterEstado === 'VENCIDO' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterEstado('VENCIDO')}
          style={filterEstado === 'VENCIDO' ? { background: 'var(--color-danger)' } : {}}
        >
          <AlertTriangle size={13} />
          Vencidos ({vencidosCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filterEstado === 'DEVUELTO' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterEstado('DEVUELTO')}
        >
          <CheckCircle2 size={13} />
          Devueltos
        </button>
      </div>

      {/* Lista o Empty State */}
      {prestamos.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="No hay préstamos en esta categoría"
          description="Los registros de circulación se gestionan aquí y se sincronizan con la base de datos del backend."
          actionLabel="Registrar Préstamo"
          actionIcon={Plus}
          onAction={handleOpenCreate}
          backendEndpoint={ENDPOINTS.PRESTAMOS.BASE}
        />
      ) : (
        <div className="items-grid">
          {prestamos.map((prestamo) => (
            <PrestamoCard
              key={prestamo.id}
              prestamo={prestamo}
              onDevolver={devolverLibro}
            />
          ))}
        </div>
      )}

      {/* Modal de Préstamo */}
      <PrestamoModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePrestamo}
        preselectedLibro={preselectedLibro}
      />
    </div>
  );
}
