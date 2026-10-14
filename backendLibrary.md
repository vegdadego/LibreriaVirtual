# Checklist de desarrollo backend — Biblioteca Virtual (MVP)

## Objetivo general

Desarrollar el backend de la biblioteca virtual para permitir la carga de libros en PDF, la extracción y almacenamiento de su texto, la clasificación de los libros y su consulta desde la interfaz gráfica existente.

**Prioridades del desarrollo:**
1. Procesamiento rápido y optimizado de PDF.
2. Almacenamiento correcto del texto por página.
3. Integración con la base de datos existente en la nube.
4. Registro, clasificación y búsqueda de libros.
5. No almacenar los archivos PDF originales.

---

## 1. Procesamiento y extracción de PDF

- [ ] **1.1. Carga de documentos:** permitir que la interfaz envíe archivos PDF al backend.
- [ ] **1.2. Validación:** verificar el formato del archivo, que no esté dañado y que cumpla con los límites de tamaño establecidos.
- [ ] **1.3. Extracción de texto:** leer y extraer el texto de cada página del PDF.
- [ ] **1.4. Conservación de páginas:** guardar el texto de forma independiente por página, respetando el orden original. Si un libro tiene 30 páginas, deben registrarse sus 30 páginas, incluso si alguna está vacía.
- [ ] **1.5. Integridad del texto:** conservar, en la medida de lo posible, los párrafos, saltos de línea, caracteres especiales, acentos y demás contenido extraído.
- [ ] **1.6. Archivos temporales:** utilizar memoria o almacenamiento temporal durante el procesamiento y eliminar los archivos temporales al terminar, tanto si el proceso tiene éxito como si falla.
- [ ] **1.7. Optimización:** evitar procesamientos innecesarios y cargas excesivas de memoria; priorizar la velocidad sin comprometer la integridad del contenido.

**Criterio de aceptación:** al cargar un PDF de prueba de 30 páginas con texto seleccionable, el backend extrae el contenido de todas las páginas, lo guarda en el orden correcto y no conserva el archivo PDF original.

## 2. Integración con la base de datos

- [ ] **2.1. Registro del libro:** guardar el registro del libro en la base de datos existente en la nube.
- [ ] **2.2. Almacenamiento por página:** guardar el texto de cada página asociado al identificador del libro y a su número de página.
- [ ] **2.3. Metadatos:** permitir registrar el nombre del libro, la descripción y los demás campos que ya contemple el diseño de la base de datos.
- [ ] **2.4. Consistencia:** evitar libros duplicados por reintentos accidentales y registros incompletos cuando falle la extracción.
- [ ] **2.5. Limpieza:** confirmar que ni el PDF original ni sus copias temporales permanezcan almacenados después del procesamiento.

**Criterio de aceptación:** el libro aparece registrado en la base de datos y se puede recuperar su texto completo, página por página, sin depender del PDF original.

## 3. Registro e integración con la interfaz gráfica

- [ ] **3.1. Formulario de registro:** proporcionar los endpoints necesarios para que la interfaz permita ingresar el nombre, la descripción y los metadatos disponibles del libro.
- [ ] **3.2. Flujo de carga:** integrar la selección del PDF con el envío al backend y el registro del libro.
- [ ] **3.3. Estado del procesamiento:** devolver estados claros, por ejemplo: pendiente, procesando, completado y error.
- [ ] **3.4. Manejo de errores:** informar si el archivo no es válido, está dañado, no contiene texto extraíble o falla el almacenamiento.
- [ ] **3.5. Actualización del catálogo:** permitir que la interfaz consulte los libros registrados y refleje los nuevos registros al finalizar la carga.

**Criterio de aceptación:** el usuario puede cargar un libro, ingresar sus datos y visualizarlo en el catálogo sin tener que registrar manualmente su contenido.

## 4. Clasificación y búsqueda

- [ ] **4.1. Clasificación:** conectar el registro de libros con las categorías o los campos de clasificación que ya estén definidos en la base de datos.
- [ ] **4.2. Consulta por categoría:** permitir recuperar los libros correspondientes a una categoría determinada.
- [ ] **4.3. Búsqueda de libros:** permitir buscar por nombre y, cuando corresponda al diseño existente, por autor u otros metadatos.
- [ ] **4.4. Resultados correctos:** comprobar que la búsqueda y la clasificación devuelvan los libros esperados y que la interfaz pueda mostrarlos.

**Criterio de aceptación:** los libros cargados aparecen en la categoría correspondiente y pueden encontrarse mediante los filtros de búsqueda implementados.

## 5. Consulta del contenido para el lector

- [ ] **5.1. Recuperación por página:** crear los endpoints para consultar el texto de una página específica.
- [ ] **5.2. Navegación:** permitir consultar páginas anteriores y siguientes conservando su numeración y orden.
- [ ] **5.3. Rendimiento:** evitar enviar el texto completo del libro en cada solicitud si el lector solo necesita mostrar una página.
- [ ] **5.4. Integridad de lectura:** verificar que el contenido mostrado corresponda al libro y número de página solicitados.

**Criterio de aceptación:** el lector puede abrir un libro, mostrar su contenido y desplazarse entre sus páginas sin necesitar el PDF original.

## 6. Pruebas finales del MVP

- [ ] Probar PDF pequeños y grandes dentro de los límites establecidos.
- [ ] Comprobar que todas las páginas y sus textos se guarden correctamente.
- [ ] Probar archivos inválidos, dañados y sin texto extraíble.
- [ ] Verificar que no queden archivos originales ni temporales después de la carga.
- [ ] Comprobar el registro, la clasificación, la búsqueda y la lectura desde la interfaz.
- [ ] Medir el tiempo de procesamiento y corregir los principales cuellos de botella.
- [ ] Verificar que los errores no generen libros incompletos o registros inconsistentes.

---

## Orden recomendado de desarrollo

1. Extracción de texto de PDF.
2. Almacenamiento del texto por página en la base de datos.
3. Registro de metadatos e integración con la interfaz.
4. Consulta del contenido y navegación del lector.
5. Clasificación y búsqueda.
6. Pruebas, corrección de errores y optimización.

## Fuera del alcance inicial del MVP

Para evitar que el proyecto crezca demasiado, dejar para versiones posteriores:

- OCR para PDF que contengan únicamente páginas escaneadas como imágenes.
- Almacenamiento y administración de portadas e imágenes.
- Procesamiento de formatos distintos de PDF.
- Funciones avanzadas de análisis, recomendación o clasificación automática mediante inteligencia artificial.

**Resultado esperado:** una biblioteca virtual funcional en la que se puedan cargar libros PDF, extraer y conservar su texto organizado por páginas, registrar sus metadatos, clasificarlos, buscarlos y leerlos desde la interfaz, sin almacenar los archivos PDF originales.