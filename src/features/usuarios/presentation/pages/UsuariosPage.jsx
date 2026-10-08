import React, { useState } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import { useUsuarios } from '../hooks/useUsuarios';
import UsuarioCard from '../components/UsuarioCard';
import UsuarioModal from '../components/UsuarioModal';
import Button from '../../../../components/common/Button';
import EmptyState from '../../../../components/common/EmptyState';
import { ENDPOINTS } from '../../../../services/api/endpoints';

export default function UsuariosPage() {
  const {
    usuarios,
    totalCount,
    searchQuery,
    setSearchQuery,
    addUsuario,
    updateUsuario,
    removeUsuario
  } = useUsuarios();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);

  const handleOpenCreate = () => {
    setEditingUsuario(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (usuario) => {
    setEditingUsuario(usuario);
    setModalOpen(true);
  };

  const handleSave = async (userData) => {
    if (editingUsuario) {
      await updateUsuario(editingUsuario.id, userData);
    } else {
      await addUsuario(userData);
    }
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
          <h2>Lectores y Usuarios</h2>
          <p style={{ fontSize: '0.875rem' }}>
            Directorio de estudiantes, profesores y lectores autorizados para préstamos.
          </p>
        </div>

        <Button onClick={handleOpenCreate} icon={Plus} variant="primary">
          Nuevo Lector
        </Button>
      </div>

      {/* Buscador */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{
          position: 'relative',
          maxWidth: '500px'
        }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-subtle)'
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Buscar por nombre, correo o matrícula/ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Usuarios o Empty State */}
      {usuarios.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
          description={
            searchQuery
              ? `No se encontró ningún lector con el criterio "${searchQuery}".`
              : 'Registra a los primeros lectores para que puedan solicitar libros.'
          }
          actionLabel="Registrar Lector"
          actionIcon={Plus}
          onAction={handleOpenCreate}
          backendEndpoint={ENDPOINTS.USUARIOS.BASE}
        />
      ) : (
        <div className="items-grid">
          {usuarios.map((usuario) => (
            <UsuarioCard
              key={usuario.id}
              usuario={usuario}
              onEdit={handleOpenEdit}
              onDelete={removeUsuario}
            />
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <UsuarioModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingUsuario}
      />
    </div>
  );
}
