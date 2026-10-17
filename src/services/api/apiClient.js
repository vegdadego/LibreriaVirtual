import { ApiError, handleApiError } from './errorHandler';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

class ApiClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Obtiene el token de autenticación almacenado.
   *
   * `AuthApiRepository` lo guarda con `storage.set`, que lo serializa a JSON
   * (queda entre comillas); aquí se deserializa para no enviar las comillas.
   */
  getToken() {
    try {
      const raw = localStorage.getItem('bibliotech_token');
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return null;
    }
  }

  /**
   * Genera los encabezados HTTP comunes
   */
  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...customHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * URL absoluta de una ruta de la API (para `<img src>` y descargas).
   *
   * @param {string} endpoint Ruta que empieza con `/`.
   * @returns {string}
   */
  url(endpoint) {
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  /**
   * Realiza la petición HTTP con timeout
   */
  async request(endpoint, options = {}) {
    const url = this.url(endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? TIMEOUT_MS);

    const headers = this.getHeaders(options.headers);
    // Con FormData el navegador añade el Content-Type con su `boundary`.
    if (options.body instanceof FormData) delete headers['Content-Type'];

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      // Si la respuesta no contiene contenido (204 No Content)
      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get('content-type');
      const data = contentType && contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        throw new ApiError(
          data?.message || `Error del servidor (${response.status})`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw handleApiError(error);
    }
  }

  // Métodos HTTP listos para consumir los endpoints del backend
  /**
   * @param {string} endpoint
   * @param {Record<string, string>} [headers]
   * @param {{timeout?: number}} [options] `timeout` en ms, para respuestas grandes.
   */
  get(endpoint, headers = {}, options = {}) {
    return this.request(endpoint, { method: 'GET', headers, ...options });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  /**
   * Envía un `multipart/form-data` (subida de archivos) con un plazo mayor,
   * porque el PDF puede pesar decenas de MB.
   *
   * @param {string} endpoint
   * @param {FormData} formData
   * @returns {Promise<any>}
   */
  postForm(endpoint, formData) {
    return this.request(endpoint, { method: 'POST', body: formData, timeout: 120000 });
  }

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers,
    });
  }

  patch(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }

  /**
   * Método de diagnóstico para probar si el backend responde
   */
  async checkConnection() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
