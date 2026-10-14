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

Estilos: `src/styles/library.css` (se importa después de `olympus.css`).

| Clase | Descripción |
|---|---|
| `.app-shell` | Contenedor flex: barra lateral + área principal |
| `.app-main` | Área principal con margen |
| `.app-main .main-content` | Panel redondeado con borde y sombra donde se muestran las vistas |

- **≥ 768 px:** barra lateral a la izquierda (248 px) con `position: fixed`, de modo que no se desplaza con el contenido. Se usa `fixed` porque `html` y `body` tienen `overflow-x: hidden`, lo que anula `position: sticky`. `.app-main` compensa con `margin-left: 248px`. La barra flotante inferior se oculta.
- **< 768 px:** sin barra lateral; se usa la barra flotante inferior (`.floating-mobile-nav`).

## Componentes

### SideNav
- **Ruta:** `src/components/layout/SideNav.jsx`
- **Props:** `currentView`, `onGoHome`, `onGoLibrary`, `onOpenSearch`, `onOpenLogin`.
- **Contiene:** marca, accesos (Inicio, Biblioteca, Explorar), cambio de tema y la sesión (botón "Ingresar" o tarjeta del usuario con cierre de sesión).

### Shelf
- **Ruta:** `src/features/series/presentation/components/Shelf.jsx`
- **Props:** `title`, `books` (`{ id, title, cover }`), `onSelect(id)`, `progress` (opcional, 0-100).
- Dibuja los libros de pie sobre una tabla de madera, con desplazamiento horizontal si no caben. Cada libro es una tapa dura con canto de páginas a la derecha y bisagra en el lomo. El título está en `title` y `aria-label`.
- Al pulsar un libro se invoca `onSelect(id)`; la aplicación abre el **detalle** de la serie, no el lector.

### HomePage
- **Ruta:** `src/features/series/presentation/pages/HomePage.jsx`
- **Props:** `seriesList`, `featuredSeries`, `onSelectSeries`, `onOpenSearch`.
- Pestaña "Estantes": estante "Continuar leyendo" y "Populares del día". Pestaña "Todos": cuadrícula de `SeriesCard`.
- El progreso mostrado en "Continuar leyendo" (65 %, capítulo 20) es un marcador: aún no hay progreso de lectura real.

### SeriesDetailPage
- **Ruta:** `src/features/series/presentation/pages/SeriesDetailPage.jsx`
- **Props:** `series`, `comments`, `isLiked`, `isFollowing`, `onToggleLike`, `onToggleFollow`, `onOpenChapter`, `onAddComment`, `onBack`.
- **Estructura** (clases `.detail-*` en `library.css`; relieve en `skeuomorphic.css`):
  1. `.detail-top`: portada a la izquierda, que sobresale sobre la hoja; a la derecha título, número de capítulos, frase inicial de la sinopsis y fila de acciones.
  2. `.detail-sheet`: hoja con costura. Columna principal (Descripción, Capítulos en un recuadro hundido con scroll, Comentarios) y columna de datos de la obra (Capítulos, Último capítulo, Vistas, Me gusta).
- **Acciones:** "Comenzar a leer" abre el capítulo 1; el marcador alterna seguir; el corazón alterna "me gusta"; "Biblioteca" vuelve al inicio.
- **< 768 px:** una sola columna, portada centrada y sin solapamiento con la hoja.
- La serie no tiene autor en el modelo, por eso la cabecera no muestra uno.

### BookLogin
- **Ruta:** `src/features/auth/presentation/components/BookLogin/BookLogin.jsx` (estilos en `BookLogin.css`).
- **Props:** `isOpen`, `onClose`.
- Libro abierto casi a pantalla completa sobre fondo desenfocado. Página izquierda: formulario de acceso o registro. Página derecha: introducción.
- **Campos enviados** (ver `server/src/controllers/authController.js`): login `email` (usuario o correo) y `password`; registro `nombre_usuario`, `correo`, `password`, `tipo_usuario` (`lector` | `uploader`).
- Define sus propios colores de papel y tinta; no cambian con el tema.
