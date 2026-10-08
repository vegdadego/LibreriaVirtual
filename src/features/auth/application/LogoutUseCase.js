/**
 * Caso de Uso: Cierre de sesión
 */
export class LogoutUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute() {
    return await this.authRepository.logout();
  }
}
