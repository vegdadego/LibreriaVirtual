import React, { useState } from 'react';
import { Search, Plus, BookOpen, Filter } from 'lucide-react';
import { useLibros } from '../hooks/useLibros';
import LibroCard from '../components/LibroCard';
import LibroModal from '../components/LibroModal';
import Button from '../../../../components/common/Button';
import EmptyState from '../../../../components/common/EmptyState';
import { ENDPOINTS } from '../../../../services/api/endpoints';

export default function LibrosPage({ onPrestarLibro }) {
  const {
    libros,
    totalCount,
    searchQuery,
    setSearchQuery,
    selectedCategoria,
    setSelectedCategoria,
    categorias,
    addLibro,
    updateLibro,
    removeLibro
  } = useLibros();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLibro, setEditingLibro] = useState(null);

  const handleOpenCreate = () => {
    setEditingLibro(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (libro) => {
    setEditingLibro(libro);
    setModalOpen(true);
  };

  const handleSave = async (libroData) => {
    if (editingLibro) {
      await updateLibro(editingLibro.id, libroData);
    } else {
      await addLibro(libroData);
    }
  };

  return (
    <div>
      {/* Barra Superior de Control */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2>Catálogo de Libros</h2>
          <p style={{ fontSize: '0.875rem' }}>
            Gestiona ejemplares, existencias y disponibilidad del acervo bibliográfico.
          </p>
        </div>

        <Button onClick={handleOpenCreate} icon={Plus} variant="primary">
          Nuevo Libro
        </Button>
      </div>

      {/* Filtros y Buscador */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Buscador */}
          <div style={{
            position: 'relative',
            flex: '1 1 300px',
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
              placeholder="Buscar por título, autor o ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filtro por Categoría */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Filter size={16} style={{ color: 'var(--text-subtle)' }} />
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Libros o Empty State */}
      {libros.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={searchQuery ? 'No se encontraron libros' : 'El catálogo está vacío'}
          description={
            searchQuery
              ? `No hay coincidencias para "${searchQuery}". Intenta con otros términos.`
              : 'Empieza registrando el primer libro para que tu backend lo almacene.'
          }
          actionLabel="Registrar Primer Libro"
          actionIcon={Plus}
          onAction={handleOpenCreate}
          backendEndpoint={ENDPOINTS.LIBROS.BASE}
        />
      ) : (
        <div className="items-grid">
          {libros.map((libro) => (
            <LibroCard
              key={libro.id}
              libro={libro}
              onEdit={handleOpenEdit}
              onDelete={removeLibro}
              onPrestar={(l) => {
                if (onPrestarLibro) onPrestarLibro(l);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal Crear / Editar */}
      <LibroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingLibro}
        categorias={categorias}
      />
    </div>
  );
}
