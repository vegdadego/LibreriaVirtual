/* Service worker de Biblioteca Virtual: deja abrir la app sin conexión.
 *
 * - Instalación: guarda `index.html` y los archivos que enlaza (JS, CSS, iconos), que
 *   son los que hacen falta para arrancar la app.
 * - Navegación: red primero; sin red se sirve el `index.html` guardado (la app
 *   es de una sola página y decide qué mostrar según la ruta).
 * - Resto de archivos de la app y tipografías: caché primero, refrescada en segundo plano.
 * - La API nunca se guarda aquí: los libros descargados viven en IndexedDB.
 */
const VERSION = 'v3';
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/** Rutas locales (src/href) que enlaza un HTML. */
const localAssetsOf = (html) =>
  [...html.matchAll(/(?:src|href)="(\/[^"/][^"]*)"/g)].map((match) => match[1]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const response = await fetch('/', { cache: 'reload' });
      const html = await response.clone().text();
      await cache.put('/', response);
      // Si algún icono falla no debe impedir instalar la app.
      await Promise.all(
        localAssetsOf(html).map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {}))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

/*
 * Todas las búsquedas en caché usan ignoreVary: los servidores suelen responder con
 * `Vary: Origin` y las peticiones de módulos JS llevan cabecera Origin, mientras que
 * las que hizo la instalación no, así que sin esto la copia guardada no coincidiría.
 */
const MATCH_OPTIONS = { ignoreVary: true };

/** Responde de la caché (la que sea) y, a la vez, refresca el archivo desde la red. */
const staleWhileRevalidate = async (request) => {
  const cached = await caches.match(request, MATCH_OPTIONS);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match('/', MATCH_OPTIONS)) || Response.error())
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin || FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
