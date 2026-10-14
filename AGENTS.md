# AGENTS.md - Contrato Operativo para IA

## 0. Lectura obligatoria (ANTES de cualquier tarea)
Antes de escribir código o documentación, DEBES leer completo
`docs/DOCUMENTATION_FRAMEWORK.md`. Ese archivo es la autoridad sobre cómo se
documenta en este repositorio. Si algo en este AGENTS.md contradice al
framework, el framework gana.

Los datos del proyecto (nombre, descripción, stack, estilo) NO están aquí:
viven en `docs/README.md`. Léelo también antes de trabajar.

Si encuentras el texto `[COMPLETAR]` en `docs/README.md`, DETENTE y pide esos
datos al usuario antes de trabajar. Nunca inventes el stack.

## 1. Punteros de Contexto (qué leer antes de trabajar)
Lee SOLO lo que la tarea necesita. Si el archivo aún no existe, créalo
cuando la tarea lo requiera (nunca antes).

| Tarea | Lee antes | Actualiza después |
|---|---|---|
| Cambiar BD o modelos | `docs/reference/database.md`, `docs/adr/` | `docs/reference/database.md` + script de migración |
| Crear o cambiar endpoints/API | `docs/reference/api.md`, `docs/explanation/architecture.md` | `docs/reference/api.md` |
| Tocar la UI o crear una pantalla nueva | `docs/reference/ui.md` | `docs/reference/ui.md` (si cambia un token o componente) |
| Decisión técnica (librería, patrón, arquitectura) | `docs/adr/` (busca por tema) | ADR nuevo `docs/adr/NNNN-titulo.md` |
| Cambio en instalación o ejecución | `docs/README.md` | `docs/README.md` y `docs/tutorials/` si aplica |
| Tarea repetitiva o propensa a errores | `docs/how-to/` | Guía nueva en `docs/how-to/` solo si se repetirá |

No leas todos los ADRs en tareas diarias; búscalos por tema. Léelos todos
solo en refactorizaciones arquitectónicas mayores.

## 2. Definition of Done
Una tarea NO está completa hasta que:
1. Todo módulo, clase y función pública nueva o modificada tiene docstring.
2. Los archivos de `docs/reference/` afectados están actualizados.
3. Si hubo una decisión técnica no trivial, existe un ADR nuevo (formato MADR).
4. Las pruebas pasan.
5. Se verificó el checklist de la sección 5 de `docs/DOCUMENTATION_FRAMEWORK.md`.

## 3. Límites
- Código y documentación van en el mismo commit.
- Comentarios en el código solo para explicar el "por qué" no obvio.
- No crees ADRs para cambios triviales.
- Los archivos `_EJEMPLO-*` son guías de formato: no los edites; al crear el
  primer documento real de esa carpeta, elimina el ejemplo.
- Si después de leer la documentación te falta contexto, PREGUNTA antes de codificar.
