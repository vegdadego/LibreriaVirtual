/**
 * Caso de Uso: Registro de nuevo usuario
 */
export class RegisterUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute(userData) {
    if (!userData.nombre_usuario) {
      throw new Error('El nombre de usuario es obligatorio.');
    }
    if (!userData.correo) {
      throw new Error('El correo electrónico es obligatorio.');
    }
    if (!userData.password || userData.password.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }
    return await this.authRepository.register(userData);
  }
}
