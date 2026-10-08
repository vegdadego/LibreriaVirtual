import { Usuario } from '../domain/models/Usuario';

/**
 * Caso de Uso: Registrar nuevo usuario lector
 */
export class CreateUsuarioUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute(usuarioData) {
    const usuario = new Usuario(usuarioData);
    usuario.validar();
    return await this.usuarioRepository.create(usuario);
  }
}
