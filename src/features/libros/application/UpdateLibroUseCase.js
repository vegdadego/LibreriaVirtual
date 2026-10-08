import { Libro } from '../domain/models/Libro';

/**
 * Caso de Uso: Actualizar un libro existente
 */
export class UpdateLibroUseCase {
  constructor(libroRepository) {
    this.libroRepository = libroRepository;
  }

  async execute(id, libroData) {
    const libro = new Libro({ ...libroData, id });
    libro.validar();
    return await this.libroRepository.update(id, libro);
  }
}
