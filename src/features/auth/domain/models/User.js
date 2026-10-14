/**
 * Entidad de Dominio: User
 */

export class User {
  constructor({
    id,
    _id,
    nombre,
    nombre_usuario,
    email,
    correo,
    rol,
    tipo_usuario,
    fecha_registro,
  } = {}) {
    this.id = id ? String(id) : _id ? String(_id) : null;
    this.nombre = nombre || nombre_usuario || 'Usuario';
    this.nombre_usuario = nombre_usuario || nombre || 'Usuario';
    this.email = email || correo || '';
    this.correo = correo || email || '';
    this.tipo_usuario = tipo_usuario || rol || 'lector';
    this.rol = rol || this.tipo_usuario;
    this.fecha_registro = fecha_registro || new Date();
  }

  esAdministrador() {
    return this.tipo_usuario?.toLowerCase() === 'admin' || this.rol?.toLowerCase() === 'administrador';
  }

  esUploader() {
    return this.tipo_usuario?.toLowerCase() === 'uploader' || this.esAdministrador();
  }
}
