/**
 * Caso de Uso: Obtener todos los usuarios / lectores
 */
export class GetUsuariosUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute() {
    return await this.usuarioRepository.getAll();
  }
}
