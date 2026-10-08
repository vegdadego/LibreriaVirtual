/**
 * Contrato de Dominio: AuthRepository
 */

export class AuthRepository {
  async login(credentials) {
    throw new Error('Método login(credentials) no implementado.');
  }

  async logout() {
    throw new Error('Método logout() no implementado.');
  }

  getCurrentUser() {
    throw new Error('Método getCurrentUser() no implementado.');
  }
}
