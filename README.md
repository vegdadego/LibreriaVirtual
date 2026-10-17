# Biblioteca Virtual

Una biblioteca en línea, con la idea de un "Netflix de libros": creas una cuenta, lees libros y, si tu cuenta lo permite, subes los tuyos en PDF. Se guarda solo el **texto** de cada página (el PDF original no se conserva) y la única imagen es la **portada**.

## Qué se puede hacer

- **Leer** en una pantalla de texto con tamaño de letra ajustable; la biblioteca recuerda por qué página vas ("Continuar leyendo").
- **Mis libros** (`uploader` y `admin`): una librería con los libros que subiste, donde los editas o eliminas (solo los tuyos; un `admin` gestiona todos). El libro en blanco al inicio del estante lleva a **subir un libro**: PDF con texto seleccionable. Al elegirlo, el formulario se rellena solo (autores, categorías, editorial, fecha, edición, saga, idioma y sinopsis) y se puede corregir. La portada es una imagen propia o la primera página del PDF y se guarda como archivo en `backend/uploads/portadas`.
- **Guardar para ver más tarde** y organizar en **carpetas**, como listas de reproducción.
- **Descargar** un libro en PDF para leerlo **sin conexión** y ver la sección "Descargados" (en la versión compilada la app abre incluso sin red).

## Estructura

```text
LibreriaVirtual/
├── src/                      # Frontend (React + Vite + CSS propio), Clean Architecture por funcionalidad
│   ├── features/
│   │   ├── libros/           # catálogo, detalle, lector de texto, subida
│   │   ├── biblioteca/       # guardados y progreso de lectura
│   │   ├── descargas/        # PDF en el navegador y almacén local (IndexedDB)
│   │   ├── carpetas/         # carpetas de libros
│   │   └── auth/             # sesión
│   ├── components/           # layout y piezas comunes
│   └── services/             # cliente HTTP, endpoints, portadas
├── backend/                  # API REST en Python (FastAPI + MongoDB + PyMuPDF)
├── public/                   # service worker y manifest (modo sin conexión)
└── docs/                     # referencia (API, base de datos, UI) y decisiones (ADR)
```

En cada funcionalidad: `domain` (entidades y contratos) ← `application` (casos de uso) ← `infrastructure` (API, IndexedDB) y `presentation` (React).

## Puesta en marcha

1. Backend (Python 3.11+): copia `backend/.env.example` a `backend/.env` y completa los valores (ver [docs/reference/environment.md](docs/reference/environment.md)).
2. Frontend: `.env` con `VITE_API_BASE_URL` (por defecto `http://localhost:8000/api/v1`).

```bash
npm install
(cd backend && python -m venv .venv && .venv\Scripts\python -m pip install -r requirements-dev.txt)   # Windows

npm run server:dev     # API en http://localhost:8000 (docs interactivas en /docs)
npm run dev            # frontend en http://localhost:5173

npm run build          # versión de producción (activa el modo sin conexión)
npm run preview        # sirve la versión compilada

npm run server:test    # pruebas del backend (pytest con un MongoDB temporal)
cd backend && .venv\Scripts\python -m scripts.assign_owner <usuario> --dry-run   # libros anteriores sin dueño: sin --dry-run se los asigna a ese usuario
cd backend && .venv\Scripts\python -m scripts.migrate_covers   # una vez: pasa a disco las portadas guardadas antes en la base de datos
```

## Documentación

- [API](docs/reference/api.md) · [Base de datos](docs/reference/database.md) · [UI](docs/reference/ui.md)
- Decisiones: [docs/adr/](docs/adr/)
