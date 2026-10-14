/**
 * Caso de Uso: Login de usuario en el sistema
 */
export class LoginUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute(credentials) {
    const identifier = credentials.email || credentials.correo || credentials.username || credentials.nombre_usuario;
    if (!identifier) {
      throw new Error('El usuario o correo electrónico es requerido.');
    }
    if (!credentials.password) {
      throw new Error('La contraseña es requerida.');
    }
    return await this.authRepository.login(credentials);
  }
}
