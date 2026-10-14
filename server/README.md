# 🚀 API Virtual Library (MongoDB NoSQL)

Backend RESTful con Node.js, Express y Mongoose conectado a la base de datos **`virtual_library_db`** en MongoDB.

---

## 🗄️ Colecciones y Modelos

1. **`users`**: Administra cuentas de lectores y uploaders.
2. **`sagas`**: Gestión de sagas y universos literarios.
3. **`authors`**: Perfil de autores literarios.
4. **`books`**: Libros, metadatos, referencias a saga/autores y arreglo de páginas con `contenido_escaneado` (texto de cada página, extraído de los PDF).

---

## 🔌 Rutas y Endpoints (`http://localhost:8000/api/v1`)

### 📖 Libros (`/books`)
Detalle completo, formato de respuestas y códigos de error: [docs/reference/api.md](../docs/reference/api.md).

* `POST /api/v1/books/upload` 🔒 - Subir un PDF (`multipart/form-data`, campo `pdf` + metadatos). Responde `202` con un `jobId`; el texto se extrae por página y el PDF no se guarda.
* `GET /api/v1/books/uploads/:jobId` 🔒 - Estado de la carga: `pendiente`, `procesando`, `completado` o `error`
* `GET /api/v1/books` - Catálogo paginado sin texto (filtros: `?categoria=`, `?saga=`, `?autor=`, `?busqueda=`, `?page=`, `?limit=`)
* `GET /api/v1/books/categorias` - Categorías en uso
* `GET /api/v1/books/:id` - Metadatos del libro y `total_paginas`
* `GET /api/v1/books/:id/paginas/:numero` - Texto de una página con `anterior` y `siguiente`
* `POST /api/v1/books` 🔒 - Registrar un libro solo con metadatos
* `PUT /api/v1/books/:id` 🔒 - Editar metadatos
* `DELETE /api/v1/books/:id` 🔒 - Eliminar libro

🔒 = requiere `Authorization: Bearer <token>` de un usuario `uploader` o `admin`.

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

# Pruebas (usan una MongoDB en memoria, nunca la base de Atlas)
npm --prefix server test
```
