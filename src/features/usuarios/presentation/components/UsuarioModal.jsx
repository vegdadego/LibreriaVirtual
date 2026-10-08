import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import Input from '../../../../components/common/Input';
import Button from '../../../../components/common/Button';

export default function UsuarioModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    documento: '',
    tipo: 'Estudiante',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre || '',
        email: initialData.email || '',
        telefono: initialData.telefono || '',
        documento: initialData.documento || '',
        tipo: initialData.tipo || 'Estudiante',
      });
    } else {
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        documento: '',
        tipo: 'Estudiante',
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
      title={initialData ? 'Editar Lector / Usuario' : 'Registrar Nuevo Lector'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {initialData ? 'Guardar Cambios' : 'Registrar Lector'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Nombre Completo"
          id="nombre"
          placeholder="Ej: Sofia Valenzuela"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          required
        />

        <Input
          label="Correo Electrónico"
          id="email"
          type="email"
          placeholder="sofia@correo.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Teléfono"
            id="telefono"
            placeholder="+52 55 ..."
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />

          <Input
            label="Matrícula / ID"
            id="documento"
            placeholder="EST-001"
            value={formData.documento}
            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tipo" className="form-label">Tipo de Usuario</label>
          <select
            id="tipo"
            className="form-select"
            value={formData.tipo}
            onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
          >
            <option value="Estudiante">Estudiante</option>
            <option value="Profesor / Investigador">Profesor / Investigador</option>
            <option value="Público General">Público General</option>
            <option value="Personal Administrativo">Personal Administrativo</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
