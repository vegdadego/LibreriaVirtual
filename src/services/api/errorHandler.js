/**
 * Manejo centralizado y normalización de errores HTTP provenientes del Backend.
 */

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function handleApiError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  // Error de conexión / red
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new ApiError(
      'No se pudo conectar con el servidor backend. Verifica que esté iniciado y accesible.',
      0
    );
  }

  if (error.name === 'AbortError') {
    return new ApiError('La petición excedió el tiempo límite de espera (timeout).', 408);
  }

  return new ApiError(error.message || 'Error inesperado en la comunicación con el servidor.', 500);
}
