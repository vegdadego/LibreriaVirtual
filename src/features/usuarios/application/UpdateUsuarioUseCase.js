import { Usuario } from '../domain/models/Usuario';

/**
 * Caso de Uso: Actualizar información de un usuario
 */
export class UpdateUsuarioUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute(id, usuarioData) {
    const usuario = new Usuario({ ...usuarioData, id });
    usuario.validar();
    return await this.usuarioRepository.update(id, usuario);
  }
}
