/**
 * Caso de Uso: Eliminar un usuario
 */
export class DeleteUsuarioUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute(id) {
    return await this.usuarioRepository.delete(id);
  }
}
