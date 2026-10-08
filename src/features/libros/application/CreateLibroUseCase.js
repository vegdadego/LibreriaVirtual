import { Libro } from '../domain/models/Libro';

/**
 * Caso de Uso: Crear un nuevo libro en el sistema
 */
export class CreateLibroUseCase {
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  async execute(libroData) {
    const libro = new Libro(libroData);
    libro.validar();
    return await this.libroRepository.create(libro);
  }
}
