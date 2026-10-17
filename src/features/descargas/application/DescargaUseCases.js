import { Descarga } from '../domain/models/Descarga';

/**
 * Descarga la imagen de portada de un libro; `null` si no se puede obtener
 * (la descarga del libro sigue sin ella).
 *
 * @param {string} url
 * @returns {Promise<Blob|null>}
 */
export async function fetchPortada(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

/**
 * Caso de uso: descargar un libro para leerlo sin conexión.
 *
 * Pide el texto completo al servidor, genera el PDF en el dispositivo y guarda
 * todo en el almacén local.
 */
export class DescargarLibroUseCase {
  /**
   * @param {Object} deps
   * @param {import('../../libros/domain/repositories/LibroRepository').LibroRepository} deps.libroRepository
   * @param {import('../domain/repositories/DescargaRepository').DescargaRepository} deps.descargaRepository
   * @param {typeof import('../infrastructure/buildBookPdf').buildBookPdf} deps.buildPdf
   * @param {typeof fetchPortada} [deps.fetchPortada]
   */
  constructor({ libroRepository, descargaRepository, buildPdf, fetchPortada: fetchCover = fetchPortada }) {
    this.libroRepository = libroRepository;
    this.descargaRepository = descargaRepository;
    this.buildPdf = buildPdf;
    this.fetchCover = fetchCover;
  }

  /**
   * @param {string} usuarioId
   * @param {import('../../libros/domain/models/Libro').Libro} libro
   * @param {(avance: {fase: 'texto'|'pdf'|'guardando', hecho?: number, total?: number}) => void} [onProgress]
   * @returns {Promise<Descarga>}
   */
  async execute(usuarioId, libro, onProgress) {
    onProgress?.({ fase: 'texto' });
    const { paginas } = await this.libroRepository.getTextoCompleto(libro.id);
    if (paginas.length === 0) throw new Error('Este libro no tiene contenido para descargar.');

    const portada = libro.portadaUrl ? await this.fetchCover(libro.portadaUrl) : null;

    const pdf = await this.buildPdf({
      titulo: libro.titulo,
      autores: libro.autores,
      paginas,
      portada,
      onProgress: (hecho, total) => onProgress?.({ fase: 'pdf', hecho, total }),
    });

    onProgress?.({ fase: 'guardando' });
    const { portadaUrl: _url, ...snapshot } = libro;
    const descarga = new Descarga({
      libroId: libro.id,
      titulo: libro.titulo,
      autores: libro.autores,
      totalPaginas: paginas.length,
      tamano: pdf.size,
      fecha: new Date().toISOString(),
      portada,
      pdf,
      libro: snapshot,
    });
    await this.descargaRepository.guardar(usuarioId, descarga, paginas);
    return descarga;
  }
}

/** Caso de uso: listar los libros descargados del usuario. */
export class ListDescargasUseCase {
  /** @param {import('../domain/repositories/DescargaRepository').DescargaRepository} descargaRepository */
  constructor(descargaRepository) {
    this.descargaRepository = descargaRepository;
  }

  /** @param {string} usuarioId */
  execute(usuarioId) {
    return this.descargaRepository.listar(usuarioId);
  }
}

/** Caso de uso: borrar una descarga del dispositivo. */
export class EliminarDescargaUseCase {
  /** @param {import('../domain/repositories/DescargaRepository').DescargaRepository} descargaRepository */
  constructor(descargaRepository) {
    this.descargaRepository = descargaRepository;
  }

  /**
   * @param {string} usuarioId
   * @param {string} libroId
   */
  execute(usuarioId, libroId) {
    return this.descargaRepository.eliminar(usuarioId, libroId);
  }
}
