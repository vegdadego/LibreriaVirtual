# Cómo importar libros pequeños de Project Gutenberg

Añade libros de 30 a 50 páginas en español e inglés. Decisiones en el [ADR 0013](../adr/0013-importar-libros-de-gutenberg.md).

Requisitos: el backend instalado y `backend/.env` completo (ver [variables de entorno](../reference/environment.md)).

## 1. Preparar la lista (no escribe en la base)

```powershell
cd backend
.venv\Scripts\python -m scripts.import_gutenberg plan --total 358
```

Tarda entre 20 y 40 minutos: descarga el catálogo (unos 130 MB) y el texto de cada libro elegido. Al terminar indica la carpeta con `lista.csv` (por defecto `%TEMP%\libreria-gutenberg`; se cambia con `--data-dir` antes de `plan`).

## 2. Revisar

Abre `lista.csv`. Para quitar un libro, borra su entrada (identificada por `id`) en `plan.json`.

## 3. Guardar

```powershell
.venv\Scripts\python -m scripts.import_gutenberg apply --owner admin@gmail.com --yes
```

El dueño debe ser `uploader` o `admin`. Ejecútalo en el equipo que sirve la API, porque las portadas se guardan en su disco. Si se interrumpe, repite el comando: los ya guardados se omiten.

## Si algo falla

| Mensaje | Qué hacer |
|---|---|
| `El espejo rechazó la descarga` | Espera y repite; lo descargado se conserva. |
| `el texto no coincide con el plan` | Borra ese archivo en `textos/` y repite `apply`. |
| Menos libros de los pedidos | No hay más candidatos con esos criterios. |

Cada carga queda marcada en `origen.lote` (aparece al empezar `apply`).
