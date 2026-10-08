/**
 * Caso de Uso: Obtener el usuario autenticado actualmente
 */
export class GetCurrentUserUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  execute() {
    return this.authRepository.getCurrentUser();
  }
}
