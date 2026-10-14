/**
 * Lee un entero positivo de una variable de entorno.
 *
 * @param {string} name Nombre de la variable.
 * @param {number} fallback Valor por defecto si falta o no es válida.
 * @returns {number}
 */
const readPositiveInt = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

/**
 * Límites de la carga de PDF. Se leen en cada uso (no al cargar el módulo)
 * porque los imports se evalúan antes de que dotenv cargue server/.env.
 *
 * @returns {{maxPdfBytes: number, maxPdfPages: number, concurrency: number, jobTtlMs: number, maxContentBytes: number}}
 */
export const getLimits = () => ({
  maxPdfBytes: readPositiveInt('MAX_PDF_SIZE_MB', 50) * 1024 * 1024,
  maxPdfPages: readPositiveInt('MAX_PDF_PAGES', 2000),
  concurrency: readPositiveInt('UPLOAD_CONCURRENCY', 2),
  jobTtlMs: readPositiveInt('JOB_TTL_MINUTES', 60) * 60 * 1000,
  // MongoDB limita cada documento a 16 MB; el texto va embebido en el libro.
  maxContentBytes: 15 * 1024 * 1024,
});
