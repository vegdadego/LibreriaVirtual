/**
 * Caso de Uso: Login de usuario en el sistema
 */
export class LoginUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute(credentials) {
    if (!credentials.email) {
      throw new Error('El correo electrónico es requerido para iniciar sesión.');
    }
    return await this.authRepository.login(credentials);
  }
}
