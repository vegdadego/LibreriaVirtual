# 🚀 API Virtual Library (MongoDB NoSQL)

Backend RESTful con Node.js, Express y Mongoose conectado a la base de datos **`virtual_library_db`** en MongoDB.

---

## 🗄️ Colecciones y Modelos

1. **`users`**: Administra cuentas de lectores y uploaders.
2. **`sagas`**: Gestión de sagas y universos literarios.
3. **`authors`**: Perfil de autores literarios.
4. **`books`**: Libros, metadatos, referencias a saga/autores y arreglo de páginas con `contenido_escaneado`.

---

## 🔌 Rutas y Endpoints (`http://localhost:8000/api/v1`)

### 📖 Libros (`/books`)
* `GET /api/v1/books` - Listar libros (admite filtros query: `?categoria=...`, `?saga=...`, `?busqueda=...`)
* `GET /api/v1/books/:id` - Obtener detalle de libro y sus páginas escaneadas
* `POST /api/v1/books` - Crear / Subir un nuevo libro
* `PUT /api/v1/books/:id` - Editar información o páginas de un libro
* `DELETE /api/v1/books/:id` - Eliminar libro

### 🌌 Sagas (`/sagas`)
* `GET /api/v1/sagas` - Listar sagas
* `GET /api/v1/sagas/:id` - Obtener saga
* `POST /api/v1/sagas` - Crear saga
* `PUT /api/v1/sagas/:id` - Editar saga
* `DELETE /api/v1/sagas/:id` - Eliminar saga

### ✍️ Autores (`/authors`)
* `GET /api/v1/authors` - Listar autores
* `GET /api/v1/authors/:id` - Obtener autor
* `POST /api/v1/authors` - Registrar autor
* `PUT /api/v1/authors/:id` - Editar autor
* `DELETE /api/v1/authors/:id` - Eliminar autor

### 👤 Usuarios (`/users`)
* `GET /api/v1/users` - Listar usuarios (sin exponer passwords)
* `GET /api/v1/users/:id` - Obtener usuario
* `POST /api/v1/users` - Registrar nuevo usuario
* `PUT /api/v1/users/:id` - Actualizar datos de usuario
* `DELETE /api/v1/users/:id` - Eliminar usuario

### 🩺 Diagnóstico
* `GET /api/v1/health` o `GET /health` - Estado del servidor y confirmación de base de datos.

---

## 💻 Comandos Útiles

Desde la raíz del proyecto:
```bash
# Iniciar el servidor API en modo desarrollo (recarga automática)
npm run server:dev

# Iniciar el servidor API en modo estándar
npm run server

# Reinicializar y poblar la base de datos con los datos iniciales
npm run seed
```
