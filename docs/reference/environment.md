# Variables de entorno

## Backend (`backend/.env`)

El backend (Python) carga siempre `backend/.env`, sin importar desde qué carpeta se ejecute; las variables que ya estén definidas en el entorno tienen prioridad.
Plantilla: [backend/.env.example](../../backend/.env.example). El archivo real está en `.gitignore`. Si vienes del backend anterior (Node), copia tu `server/.env`: usa las mismas variables y la misma `JWT_SECRET` mantiene vigentes las sesiones.

Instalación y arranque (desde la raíz del proyecto; Python 3.11 o superior):

```bash
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt     # Windows (en Linux/macOS: .venv/bin/python)
```

`npm run server` arranca la API en el puerto 8000 y `npm run server:dev` la reinicia al cambiar el código. Documentación interactiva de los endpoints: `http://localhost:8000/docs`.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `MONGO_URI` | Sí | Cadena de conexión de MongoDB. El servidor termina si falta. Formato Atlas: `mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/virtual_library_db?retryWrites=true&w=majority` |
| `JWT_SECRET` | Sí | Clave para firmar y verificar los tokens JWT. El servidor termina si falta. |
| `PORT` | No | Puerto de la API: se pasa a uvicorn con `--port` (los scripts de `npm` usan `8000`). |
| `DNS_SERVERS` | No | Servidores DNS separados por comas (ej. `1.1.1.1,8.8.8.8`). Úsala si la conexión a Atlas falla con `querySrv ECONNREFUSED`. |

Almacenamiento de portadas (opcional):

| Variable | Por defecto | Descripción |
|---|---|---|
| `UPLOADS_DIR` | `uploads` | Carpeta donde se guardan los archivos subidos; las portadas van en `<UPLOADS_DIR>/portadas`. Ruta absoluta o relativa a `backend/`. Está en `.gitignore`. Debe estar en un disco que **persista** (no sirve en hostings de disco temporal) y entra en tus copias de seguridad junto con la base de datos. |

Carga de PDF (todas opcionales):

| Variable | Por defecto | Descripción |
|---|---|---|
| `MAX_PDF_SIZE_MB` | `200` | Tamaño máximo del PDF al importarlo (en la base de datos solo se guarda el texto, no el archivo). Con varias cargas a la vez cuenta unas 3 veces su tamaño en RAM por carga (el archivo, su copia en memoria compartida y el trabajo de lectura): con `UPLOAD_CONCURRENCY=2` y 200 MB, reserva ~1,2 GB. Si lo supera responde `413 FILE_TOO_LARGE`. El archivo se mantiene en RAM mientras se procesa (y en memoria compartida si es grande). |
| `MAX_PDF_PAGES` | `2000` | Páginas máximas por PDF (`TOO_MANY_PAGES`). |
| `UPLOAD_CONCURRENCY` | `2` | PDF que se procesan a la vez; el resto espera en cola. |
| `JOB_TTL_MINUTES` | `60` | Minutos que se conserva el estado de una carga terminada. |
| `STAGE_TTL_MINUTES` | `20` | Minutos que espera un PDF ya leído (preparado con `POST /books/stage`) a que se envíe el formulario. Mientras espera solo ocupa su texto (hasta 15 MB) y la portada; el PDF se suelta al terminar de leerlo. |
| `PDF_WORKERS` | `min(6, CPU - 1)` | Procesos que leen PDF en paralelo. Más procesos leen más rápido un PDF grande pero usan más memoria (unos 60 MB cada uno). |
| `PDF_PARALLEL_MIN_PAGES` | `120` | Desde cuántas páginas un PDF se reparte entre varios procesos; uno más pequeño se lee entero en uno solo. |
| `PDF_POOL_WARMUP` | `1` | Con `0` no se arrancan los procesos de lectura al iniciar el servidor (se crean en la primera carga). |

Las contraseñas con caracteres `@ : / ? # [ ]` deben codificarse en la URI (por ejemplo `@` → `%40`).

## Frontend (`.env` en la raíz)

| Variable | Descripción |
|---|---|
| `VITE_API_BASE_URL` | URL base de la API. Por defecto `http://localhost:8000/api/v1`. |
| `VITE_MAX_PDF_MB` | Tamaño máximo de PDF que acepta el formulario de subida, en MB. Por defecto `200`; debe coincidir con `MAX_PDF_SIZE_MB` del servidor. |
| `VITE_API_TIMEOUT` | Tiempo máximo de espera de cada petición, en ms. Por defecto `15000`. |
| `VITE_APP_TITLE` | Título de la aplicación. |
