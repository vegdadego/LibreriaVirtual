/**
 * Envío de un archivo grande por fragmentos (ver docs/adr/0012-paginas-aparte-y-subida-por-fragmentos.md).
 *
 * Este módulo solo decide **cuándo** se manda cada fragmento: varios a la vez, repitiendo el que
 * falle por la red y sumando el avance de todos. Cómo se manda (XMLHttpRequest) lo recibe en `enviar`,
 * así se puede probar en Node sin red (`subidaFragmentada.test.js`).
 */

/** Fragmentos que viajan al mismo tiempo (el navegador abre hasta 6 conexiones por servidor). */
export const FRAGMENTOS_EN_PARALELO = 3;
/** Veces que se repite un fragmento que falló por la red o por el servidor antes de rendirse. */
export const REINTENTOS_POR_FRAGMENTO = 3;
/** Un PDF de este tamaño o menos se manda de una vez (no compensa el viaje extra de abrir y cerrar la subida). */
export const UMBRAL_FRAGMENTOS = 4 * 1024 * 1024;

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `true` si repetir el fragmento puede arreglarlo: sin conexión (`status` 0), tiempo agotado,
 * limitación de tráfico o fallo del servidor. Un error 4xx o una cancelación (499) no se repiten.
 *
 * @param {{status?: number}} error
 * @returns {boolean}
 */
export function esReintentable(error) {
  const status = error?.status;
  if (status === undefined || status === null) return false;
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * Manda todos los fragmentos, `paralelo` a la vez. Si uno falla de forma reintentable lo repite
 * (con espera creciente); si falla del todo, deja de lanzar los que faltan y propaga el error.
 *
 * @param {Object} opciones
 * @param {number} opciones.total Cuántos fragmentos hay.
 * @param {(indice: number) => number} opciones.bytesDe Tamaño en bytes del fragmento `indice`.
 * @param {(indice: number, alAvanzar: (bytes: number) => void) => Promise<void>} opciones.enviar
 *   Manda un fragmento; llama a `alAvanzar` con los bytes ya enviados de él.
 * @param {number} [opciones.paralelo] Fragmentos simultáneos.
 * @param {number} [opciones.reintentos] Repeticiones por fragmento.
 * @param {(ms: number) => Promise<void>} [opciones.espera] Pausa entre reintentos (se cambia en las pruebas).
 * @param {(avance: {cargado: number, total: number}) => void} [opciones.onProgress] Avance sumado de todos.
 * @param {AbortSignal} [opciones.signal] Cancela lo que falte.
 * @returns {Promise<void>}
 */
export async function enviarFragmentos({
  total,
  bytesDe,
  enviar,
  paralelo = FRAGMENTOS_EN_PARALELO,
  reintentos = REINTENTOS_POR_FRAGMENTO,
  espera = esperar,
  onProgress,
  signal,
}) {
  const enviados = new Array(total).fill(0);
  let granTotal = 0;
  for (let i = 0; i < total; i += 1) granTotal += bytesDe(i);

  const informar = () => {
    const cargado = enviados.reduce((suma, bytes) => suma + bytes, 0);
    onProgress?.({ cargado: Math.min(cargado, granTotal), total: granTotal });
  };

  let siguiente = 0;
  let fallo = null;

  const trabajador = async () => {
    while (!fallo && !signal?.aborted) {
      const indice = siguiente;
      siguiente += 1;
      if (indice >= total) return;

      for (let intento = 0; ; intento += 1) {
        try {
          await enviar(indice, (bytes) => {
            enviados[indice] = Math.min(bytes, bytesDe(indice));
            informar();
          });
          enviados[indice] = bytesDe(indice);
          informar();
          break;
        } catch (error) {
          if (fallo || !esReintentable(error) || intento >= reintentos) throw error;
          enviados[indice] = 0;
          informar();
          await espera(400 * 2 ** intento);
        }
      }
    }
  };

  const lanzar = () =>
    trabajador().catch((error) => {
      fallo = fallo ?? error;
      throw error;
    });

  await Promise.all(Array.from({ length: Math.min(paralelo, total) }, lanzar));
  if (signal?.aborted && !fallo) {
    const cancelado = new Error('Subida cancelada.');
    cancelado.status = 499;
    throw cancelado;
  }
}
