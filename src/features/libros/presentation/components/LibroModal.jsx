import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import Input from '../../../../components/common/Input';
import Button from '../../../../components/common/Button';

export default function LibroModal({ isOpen, onClose, onSave, initialData, categorias }) {
  const [formData, setFormData] = useState({
    titulo: '',
    autor: '',
    isbn: '',
    categoria: 'Novela / Realismo Mágico',
    editorial: '',
    año: new Date().getFullYear(),
    copiasTotales: 1,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        titulo: initialData.titulo || '',
        autor: initialData.autor || '',
        isbn: initialData.isbn || '',
        categoria: initialData.categoria || 'Novela / Realismo Mágico',
        editorial: initialData.editorial || '',
        año: initialData.año || new Date().getFullYear(),
        copiasTotales: initialData.copiasTotales || 1,
      });
    } else {
      setFormData({
        titulo: '',
        autor: '',
        isbn: '',
        categoria: 'Novela / Realismo Mágico',
        editorial: '',
        año: new Date().getFullYear(),
        copiasTotales: 1,
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Libro' : 'Registrar Nuevo Libro en Catálogo'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {initialData ? 'Guardar Cambios' : 'Registrar Libro'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Título del Libro"
          id="titulo"
          placeholder="Ej: El Principito"
          value={formData.titulo}
          onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Autor(es)"
            id="autor"
            placeholder="Ej: Antoine de Saint-Exupéry"
            value={formData.autor}
            onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
            required
          />

          <Input
            label="ISBN"
            id="isbn"
            placeholder="Ej: 978-0156012195"
            value={formData.isbn}
            onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="categoria" className="form-label">Categoría</label>
          <select
            id="categoria"
            className="form-select"
            value={formData.categoria}
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
          >
            {categorias
              ?.filter((c) => c !== 'Todas')
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Año de Publicación"
            id="año"
            type="number"
            value={formData.año}
            onChange={(e) => setFormData({ ...formData, año: Number(e.target.value) })}
          />

          <Input
            label="Copias en Stock"
            id="copiasTotales"
            type="number"
            min="1"
            value={formData.copiasTotales}
            onChange={(e) => setFormData({ ...formData, copiasTotales: Number(e.target.value) })}
            required
          />
        </div>
      </form>
    </Modal>
  );
}
