# 0005. Portadas como archivos en disco, no dentro del documento del libro

- Estado: aceptado (reemplaza el punto 3 del [ADR 0002](0002-portada-renderizada-en-el-cliente.md)). Nota: tras el [ADR 0007](0007-backend-python.md) el código vive en `backend/app/services/cover_storage.py` y `backend/app/config.py`, y la carpeta por defecto es `backend/uploads/portadas`; la decisión no cambia.
- Fecha: 2026-10-15

## Contexto y problema

El ADR 0002 guardó la imagen de portada como `Book.portada.data` (Buffer) dentro del documento del libro. Eso comparte los 16 MB que MongoDB permite por documento con el texto, hace crecer la base de datos y la copia de seguridad con cada imagen y obliga a excluir el campo en cada consulta. El usuario pidió que las imágenes se guarden fuera de la base de datos y eligió **una carpeta del servidor** frente a un servicio externo (Cloudinary, S3/R2).

## Opciones consideradas

- **Servicio externo (Cloudinary, S3, R2).** Sobrevive a cambios de servidor y quita carga al API, pero exige cuenta, claves y configuración.
- **Carpeta del servidor (elegida).** Sin cuentas ni dependencias nuevas; la desventaja es que depende de un disco persistente.
- **Seguir en MongoDB.** Descartada por la petición del usuario.

## Decisión

1. Las portadas se guardan en `<UPLOADS_DIR>/portadas/<id del libro>.<jpg|png|webp>` (por defecto `server/uploads/portadas`, en `.gitignore`). `services/coverStorage.js` escribe, borra y valida los nombres; `config/storage.js` resuelve la carpeta.
2. `Book.portada` pasa a `{ archivo, mime }`. `mime` se mantiene porque `tiene_portada` se calcula con él sin traer nada más.
3. **El contrato de la API no cambia:** `GET /books/:id/portada` sigue sirviendo la imagen (con `sendFile` y caché de un día) y el frontend no se toca. Si el archivo falta responde `404 COVER_NOT_FOUND`.
4. El nombre del archivo es siempre `<ObjectId>.<ext>` y se valida con una expresión regular antes de usarlo, así un valor corrupto en la base de datos no puede apuntar fuera de la carpeta.
5. Al subir, la imagen se escribe antes de guardar el libro y se borra si el guardado falla; al borrar un libro se borra su archivo. Un fallo al borrar el archivo no impide borrar el libro (solo queda un archivo suelto).
6. **Compatibilidad:** los libros anteriores conservan `portada.data` y se siguen sirviendo desde la base de datos. `npm run migrate:covers` (seguro de repetir) los pasa a disco y elimina el campo.

## Consecuencias

- Positivas: el documento del libro ya no comparte los 16 MB con la imagen y la base de datos queda más pequeña.
- **La carpeta `uploads` hay que respaldarla junto con la base de datos** y debe estar en un disco que persista: en hostings de disco efímero (Render gratuito, Vercel, contenedores sin volumen) las portadas se perderían al reiniciar. Si el proyecto se despliega así, conviene pasar a un servicio externo; el cambio queda acotado a `coverStorage.js` y al controlador de portadas.
- Con varias instancias del servidor todas necesitarían compartir la misma carpeta.
