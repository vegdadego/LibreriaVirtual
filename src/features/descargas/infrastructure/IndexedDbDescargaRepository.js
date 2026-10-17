import { DescargaRepository } from '../domain/repositories/DescargaRepository';
import { Descarga } from '../domain/models/Descarga';

const DB_NAME = 'libreria-offline';
const DB_VERSION = 1;
/** Metadatos, portada y PDF de cada descarga. */
const STORE_META = 'descargas';
/** Texto de las páginas, aparte para no cargarlo al listar. */
const STORE_TEXT = 'textos';

/**
 * Clave de una descarga: va por usuario para que las cuentas no se mezclen.
 *
 * @param {string} usuarioId
 * @param {string} libroId
 * @returns {string}
 */
const keyFor = (usuarioId, libroId) => `${usuarioId}:${libroId}`;

/**
 * Convierte una petición de IndexedDB en una promesa.
 *
 * @template T
 * @param {IDBRequest<T>} request
 * @returns {Promise<T>}
 */
const promisify = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/**
 * Espera a que termine una transacción (todas sus escrituras confirmadas).
 *
 * @param {IDBTransaction} tx
 * @returns {Promise<void>}
 */
const done = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('La operación local se canceló.'));
  });

/** Adaptador de `DescargaRepository` sobre IndexedDB del navegador. */
export class IndexedDbDescargaRepository extends DescargaRepository {
  dbPromise = null;

  /** Abre (y crea la primera vez) la base local. */
  open() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('Este navegador no permite guardar libros sin conexión.'));
          return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_META)) {
            const store = db.createObjectStore(STORE_META, { keyPath: 'key' });
            store.createIndex('usuarioId', 'usuarioId');
          }
          if (!db.objectStoreNames.contains(STORE_TEXT)) {
            db.createObjectStore(STORE_TEXT, { keyPath: 'key' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('La base local está bloqueada por otra pestaña.'));
      }).catch((error) => {
        this.dbPromise = null;
        throw error;
      });
    }
    return this.dbPromise;
  }

  async guardar(usuarioId, descarga, paginas) {
    const db = await this.open();
    const key = keyFor(usuarioId, descarga.libroId);
    const tx = db.transaction([STORE_META, STORE_TEXT], 'readwrite');
    tx.objectStore(STORE_META).put({ key, usuarioId, ...descarga });
    tx.objectStore(STORE_TEXT).put({ key, paginas });
    await done(tx);
  }

  async obtener(usuarioId, libroId) {
    const db = await this.open();
    const row = await promisify(
      db.transaction(STORE_META).objectStore(STORE_META).get(keyFor(usuarioId, libroId))
    );
    return row ? new Descarga(row) : null;
  }

  async obtenerPaginas(usuarioId, libroId) {
    const db = await this.open();
    const row = await promisify(
      db.transaction(STORE_TEXT).objectStore(STORE_TEXT).get(keyFor(usuarioId, libroId))
    );
    return row ? row.paginas : null;
  }

  async listar(usuarioId) {
    const db = await this.open();
    const rows = await promisify(
      db.transaction(STORE_META).objectStore(STORE_META).index('usuarioId').getAll(usuarioId)
    );
    return rows.map((row) => new Descarga(row)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  async ids(usuarioId) {
    const db = await this.open();
    const rows = await promisify(
      db.transaction(STORE_META).objectStore(STORE_META).index('usuarioId').getAll(usuarioId)
    );
    return rows.map((row) => row.libroId);
  }

  async eliminar(usuarioId, libroId) {
    const db = await this.open();
    const key = keyFor(usuarioId, libroId);
    const tx = db.transaction([STORE_META, STORE_TEXT], 'readwrite');
    tx.objectStore(STORE_META).delete(key);
    tx.objectStore(STORE_TEXT).delete(key);
    await done(tx);
  }
}

export const defaultDescargaRepository = new IndexedDbDescargaRepository();
