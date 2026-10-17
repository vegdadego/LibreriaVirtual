# Referencia de UI

## Tokens de diseño

Definidos en `src/styles/olympus.css` (clases `.dark` y `.light` sobre `<html>`). Los estilos nuevos usan solo estos tokens, así que respetan ambos temas.

| Token | Uso |
|---|---|
| `--brand-darkBg` | Fondo de la página y de la barra de herramientas |
| `--brand-cardBg` | Superficie del panel principal y de las tarjetas |
| `--brand-cardHover` | Fondo al pasar el cursor |
| `--brand-pill` / `--brand-pillText` | Elemento activo (pestañas, acceso de la barra lateral) y repisas |
| `--brand-border` | Bordes |
| `--brand-accent` / `--brand-goldHover` | Acento, avatar, botón de ingreso, progreso |
| `--brand-text`, `-muted`, `-subtle` | Jerarquía de texto |
| `--gold-glow` | Sombra del acento |

## Capa skeuomorphic

Archivo: `src/styles/skeuomorphic.css` (se importa en `App.jsx` después de `library.css`). Solo sobrescribe aspecto; quitar su import devuelve el diseño plano.

| Token | Uso |
|---|---|
| `--sk-paper-1`, `--sk-paper-2` | Degradado del panel principal (papel en claro, cuero en oscuro) |
| `--sk-side-1`, `--sk-side-2` | Degradado de la barra lateral |
| `--sk-key-1`, `--sk-key-2`, `--sk-key-edge` | Cara y borde inferior de los controles en relieve |
| `--sk-hi`, `--sk-lo`, `--sk-well` | Luz superior, sombra proyectada y fondo hundido |
| `--sk-stitch` | Color de las costuras punteadas |
| `--sk-wood-1`, `--sk-wood-2`, `--sk-back` | Madera de las repisas y fondo del estante |
| `--sk-noise` | Grano de papel/cuero (SVG en línea, más tenue en el tema claro) |

Reglas de relieve:
- **Elevado** (botones, pestaña activa, tarjetas): degradado `--sk-key-*`, borde inferior `--sk-key-edge`, luz interior `--sk-hi`.
- **Hundido** (barra de herramientas, buscador, acceso activo de la barra lateral): sombra interior `--sk-lo`.
- **Presionado** (`:active` de `.sidenav-login`): baja 2 px y cambia a sombra interior.

## Estructura de la aplicación

Estilos: `src/styles/library.css` (estantes, barra lateral, ficha) y `src/styles/books.css` (portadas, tarjetas, lector, subida, diálogos, descargas y carpetas); `books.css` se importa al final en `App.jsx`.

| Clase | Descripción |
|---|---|
| `.app-shell` | Contenedor flex: barra lateral + área principal |
| `.app-main` | Área principal con margen |
| `.app-main .main-content` | Panel redondeado con borde y sombra donde se muestran las vistas |

- **≥ 768 px:** barra lateral a la izquierda (248 px) con `position: fixed`, de modo que no se desplaza con el contenido. Se usa `fixed` porque `html` y `body` tienen `overflow-x: hidden`, lo que anula `position: sticky`. `.app-main` compensa con `margin-left: 248px`. La barra flotante inferior se oculta.
- **< 768 px:** sin barra lateral; se usa la barra flotante inferior (`.floating-mobile-nav`).

### Rutas

`react-router-dom`, definidas en `src/App.jsx` dentro de `AppLayout`. Los proveedores, de fuera hacia dentro: tema → sesión → biblioteca personal → descargas → carpetas → router.

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | `HomePage` | Todos |
| `/libro/:id` | `LibroDetailPage` | Todos |
| `/leer/:id/:pagina` | `ReaderPage` | Todos |
| `/subir` | `UploadPage` | `uploader` y `admin` (otros ven un aviso) |
| `/guardados` | `GuardadosPage` | Con sesión (sin ella, aviso para ingresar) |
| `/carpetas`, `/carpetas/:id` | `CarpetasPage`, `CarpetaDetailPage` | Con sesión |
| `/descargas` | `DescargasPage` | Con sesión; funciona sin conexión |

Estructura por funcionalidad (Clean Architecture, ver README): `features/libros` (catálogo, lector, subida), `features/biblioteca` (guardados y progreso), `features/descargas` (PDF y almacén local), `features/carpetas`. `features/prestamos`, `usuarios` y `dashboard` son del proyecto anterior y no están enlazados.

## Componentes

### AppLayout y navegación
- **Rutas:** `src/components/layout/AppLayout.jsx`, `SideNav.jsx`, `navLinks.js`.
- `AppLayout` pinta `SideNav`, la barra flotante móvil y el libro de acceso, y expone `openLogin` a las pantallas por `useOutletContext()`. Avisa "Sin conexión" cuando el navegador la pierde.
- **Barra lateral reducible:** el botón junto a la marca alterna entre barra completa (248 px) y solo iconos (76 px). `AppLayout` pone la clase `nav-collapsed` en `.app-shell` (el CSS ajusta barra y `margin-left` del contenido) y recuerda la elección en `localStorage` (`nav-collapsed`). Reducida, cada acceso conserva su nombre en `title`.
- No hay "Explorar": la búsqueda vive en el inicio (ver `HomePage`).
- `getNavLinks(user)` define los accesos (Guardados, Carpetas, Descargados y, para `uploader`/`admin`, Subir libro); Inicio se pinta aparte. `canUploadBooks(user)` decide quién ve la subida.

### Shelf
- **Ruta:** `src/features/libros/presentation/components/Shelf.jsx`
- **Props:** `title`, `books` (`{ id, titulo, portadaUrl, progress? }`), `onSelect(id)`.
- Dibuja los libros de pie sobre una tabla de madera, con desplazamiento horizontal si no caben. Cada libro es una tapa dura con canto de páginas a la derecha y bisagra en el lomo. Si `progress` (0-100) está presente, dibuja una barra sobre la repisa.

### BookCover y LibroCard
- `BookCover`: muestra la portada; si no hay o falla la carga, una tapa de color (según el título) con el título.
- `LibroCard`: tarjeta de cuadrícula (`.series-grid`). La portada y el título forman un botón; las acciones (`actions`) quedan sobre la portada. `BookActions` reúne guardar y añadir a carpeta.

### HomePage
- Pestaña "Estantes": "Continuar leyendo" (con progreso real), "Guardados para más tarde", "Novedades" y un estante por categoría (hasta 6). Pestaña "Todos": cuadrícula. Muestra estados de carga, error, vacío y sin conexión (`PageState`).
- **Búsqueda integrada:** la barra de la cabecera es un campo de texto real (sin ventana emergente). Al escribir, `useBusquedaLibros` consulta `GET /books?busqueda=` con 300 ms de retardo y los resultados reemplazan los estantes por una cuadrícula con el total; Escape o la X borran la búsqueda y vuelven los estantes.

### LibroDetailPage
- Estructura (clases `.detail-*`): portada, título, autores, páginas y frase inicial de la sinopsis; acciones "Comenzar a leer" / "Continuar en la página N", guardar, añadir a carpeta y descargar; hoja con descripción, categorías y ficha (páginas, idioma, editorial, publicación, saga).

### ReaderPage
- Lector de texto (`.reader-*`): una página por vez, párrafos separados por línea en blanco. Controles: tamaño de letra (14-30 px) y letra con serifa (se recuerdan en `localStorage`), página anterior/siguiente, campo para saltar de página y flechas del teclado. Guarda el progreso tras 800 ms en la misma página.

### UploadPage
- **Autodetección:** al elegir el PDF, `useAnalisisPdf` llama a `POST /books/analyze` y `sugerenciasParaFormulario` (`domain/sugerencias.js`) rellena los campos que la persona no haya editado. Los campos rellenados llevan la etiqueta "Auto" (desaparece al editarlos), un aviso arriba lista lo detectado, "Más datos" se abre si algo cayó ahí y "Volver a detectar" sobrescribe todo. Si solo se detectó el año o el mes de la fecha, se avisa bajo el campo. Si el análisis falla, el formulario sigue funcionando a mano.
- Archivo PDF (máx. 50 MB), datos del libro (las categorías se eligen entre las opciones de `domain/categorias.js`, como botones que se pueden marcar varios; el idioma se elige de una lista, `domain/idiomas.js`; el n.º de edición y el de saga son campos numéricos sin flechas; la fecha de publicación usa `DatePicker`), elección de portada (primera página del PDF, imagen propia o ninguna) con vista previa y avance de procesamiento (consulta cada segundo). Muestra el error del servidor y, si es `DUPLICATE_BOOK`, un enlace al libro existente.

### DownloadButton y DescargasPage
- `DownloadButton` descarga el libro (texto → PDF → guardado) mostrando el avance; una vez descargado permite quitarlo. `DescargasPage` lista lo descargado con "Leer", "Guardar PDF" y "Quitar"; solo usa el almacén local.

### Carpetas
- `CarpetasPage`: cuadrícula de carpetas con mosaico de hasta 4 portadas (`FolderMosaic`). `CarpetaDetailPage`: editar, borrar (con confirmación) y quitar libros. `AddToFolderDialog`: marca en qué carpetas está un libro y crea carpetas nuevas.

### DatePicker
- **Ruta:** `src/components/common/DatePicker.jsx`. **Props:** `value` y `onChange` (formato `AAAA-MM-DD`, `''` si no hay), `label`, `placeholder`, `max` (por defecto hoy).
- Sustituye al calendario nativo. Tres vistas: días → meses → años (se entra tocando el título; los años van en bloques de 12 desde el 1000), así se llega a fechas antiguas sin avanzar mes a mes. Cierra con Escape o al pulsar fuera; incluye "Hoy" y "Borrar". No permite fechas futuras.

### Dialog y PageState
- `components/common/Dialog.jsx`: modal accesible (`role="dialog"`, Escape, clic fuera). `components/common/PageState.jsx`: estados de pantalla `loading`, `error` (con "Reintentar") y `empty` (con acción).

### BookLogin
- **Ruta:** `src/features/auth/presentation/components/BookLogin/BookLogin.jsx` (estilos en `BookLogin.css`).
- **Props:** `isOpen`, `onClose`.
- Libro abierto casi a pantalla completa sobre fondo desenfocado. Página izquierda: formulario de acceso o registro. Página derecha: introducción.
- **Campos enviados** (ver `backend/app/routers/auth.py`): login `email` (usuario o correo) y `password`; registro `nombre_usuario`, `correo`, `password`, `tipo_usuario` (`lector` | `uploader`).
- Define sus propios colores de papel y tinta; no cambian con el tema.

## Modo sin conexión

`public/sw.js` (service worker) y `public/manifest.webmanifest`. Se registra solo en la versión compilada (`src/main.jsx`); para probarlo: `npm run build && npm run preview`. Detalles y límites en [ADR 0003](../adr/0003-descarga-pdf-offline-en-el-cliente.md).
