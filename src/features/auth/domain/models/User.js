/**
 * Entidad de Dominio: User
 */

export class User {
  constructor({ id, nombre, email, rol = 'Bibliotecario' }) {
    this.id = id ? String(id) : null;
    this.nombre = nombre;
    this.email = email;
    this.rol = rol;
  }

  esAdministrador() {
    return this.rol?.toLowerCase() === 'administrador';
  }
}
