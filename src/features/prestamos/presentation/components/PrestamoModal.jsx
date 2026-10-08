import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import Input from '../../../../components/common/Input';
import Button from '../../../../components/common/Button';

export default function PrestamoModal({ isOpen, onClose, onSave, preselectedLibro }) {
  const getDefaultReturnDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    libroTitulo: '',
    usuarioNombre: '',
    usuarioEmail: '',
    fechaDevolucionEsperada: getDefaultReturnDate(),
  });

  useEffect(() => {
    if (preselectedLibro) {
      setFormData((prev) => ({
        ...prev,
        libroId: preselectedLibro.id,
        libroTitulo: preselectedLibro.titulo,
      }));
    }
  }, [preselectedLibro, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nuevo Préstamo de Libro"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Confirmar Préstamo
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Título del Libro o ID"
          id="libroTitulo"
          placeholder="Ej: Cien Años de Soledad"
          value={formData.libroTitulo}
          onChange={(e) => setFormData({ ...formData, libroTitulo: e.target.value })}
          required
        />

        <Input
          label="Nombre del Lector / Usuario"
          id="usuarioNombre"
          placeholder="Ej: Laura Gómez"
          value={formData.usuarioNombre}
          onChange={(e) => setFormData({ ...formData, usuarioNombre: e.target.value })}
          required
        />

        <Input
          label="Correo Electrónico del Lector"
          id="usuarioEmail"
          type="email"
          placeholder="laura@ejemplo.com"
          value={formData.usuarioEmail}
          onChange={(e) => setFormData({ ...formData, usuarioEmail: e.target.value })}
          required
        />

        <Input
          label="Fecha de Devolución Estimada"
          id="fechaDevolucionEsperada"
          type="date"
          value={formData.fechaDevolucionEsperada}
          onChange={(e) => setFormData({ ...formData, fechaDevolucionEsperada: e.target.value })}
          required
        />
      </form>
    </Modal>
  );
}
