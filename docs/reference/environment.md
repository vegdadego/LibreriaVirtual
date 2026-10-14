# Variables de entorno

## Backend (`server/.env`)

El backend carga siempre `server/.env`, sin importar desde qué carpeta se ejecute.
Plantilla: [server/.env.example](../../server/.env.example). El archivo real está en `.gitignore`.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `MONGO_URI` | Sí | Cadena de conexión de MongoDB. El servidor termina si falta. Formato Atlas: `mongodb+srv://<usuario>:<contraseña>@<cluster>.mongodb.net/virtual_library_db?retryWrites=true&w=majority` |
| `JWT_SECRET` | Sí | Clave para firmar y verificar los tokens JWT. El servidor termina si falta. |
| `PORT` | No | Puerto de la API. Por defecto `8000`. |
| `NODE_ENV` | No | `development` o `production`. |
| `DNS_SERVERS` | No | Servidores DNS separados por comas (ej. `1.1.1.1,8.8.8.8`). Úsala si la conexión a Atlas falla con `querySrv ECONNREFUSED`. |

Las contraseñas con caracteres `@ : / ? # [ ]` deben codificarse en la URI (por ejemplo `@` → `%40`).

## Frontend (`.env` en la raíz)

| Variable | Descripción |
|---|---|
| `VITE_API_BASE_URL` | URL base de la API. Por defecto `http://localhost:8000/api/v1`. |
| `VITE_API_TIMEOUT` | Tiempo máximo de espera de cada petición, en ms. Por defecto `15000`. |
| `VITE_APP_TITLE` | Título de la aplicación. |
