# 📚 BiblioTech - Frontend con Clean Architecture Modular

Frontend moderno, responsivo (Web y Móvil) para gestión bibliotecaria desarrollado con **React**, **Vite** y **Vanilla CSS**, estructurado bajo una rigurosa **Clean Architecture Modular (Feature-Driven Clean Architecture)**, preparado para desacoplamiento total y conexión inmediata con cualquier backend.

---

## 🏛️ Arquitectura Limpia Modular

El proyecto implementa la **Regla de Dependencia de Clean Architecture** en cada funcionalidad (`libros`, `prestamos`, `usuarios`, `auth`, `dashboard`):

> **Domain &larr; Application &larr; Infrastructure / Presentation**

```text
src/
├── features/
│   ├── libros/
│   │   ├── domain/               # 🟢 Entidades y reglas de negocio puras
│   │   │   ├── models/Libro.js
│   │   │   └── repositories/LibroRepository.js (Contrato de interfaz)
│   │   ├── application/          # 🟡 Casos de uso de la aplicación
│   │   │   ├── GetLibrosUseCase.js
│   │   │   ├── CreateLibroUseCase.js
│   │   │   ├── UpdateLibroUseCase.js
│   │   │   └── DeleteLibroUseCase.js
│   │   ├── infrastructure/       # 🔵 Adaptadores técnicos y llamadas a la API
│   │   │   └── LibroApiRepository.js
│   │   └── presentation/         # 🟣 UI en React
│   │       ├── components/ (LibroCard.jsx, LibroModal.jsx)
│   │       ├── hooks/useLibros.js (Presenter)
│   │       └── pages/LibrosPage.jsx
│   │
│   ├── prestamos/
│   │   ├── domain/ (Prestamo.js, PrestamoRepository.js)
│   │   ├── application/ (GetPrestamosUseCase.js, RegistrarPrestamoUseCase.js, DevolverLibroUseCase.js)
│   │   ├── infrastructure/ (PrestamoApiRepository.js)
│   │   └── presentation/ (PrestamoCard.jsx, PrestamoModal.jsx, usePrestamos.js, PrestamosPage.jsx)
│   │
│   ├── usuarios/
│   │   ├── domain/ (Usuario.js, UsuarioRepository.js)
│   │   ├── application/ (GetUsuariosUseCase.js, CreateUsuarioUseCase.js, etc.)
│   │   ├── infrastructure/ (UsuarioApiRepository.js)
│   │   └── presentation/ (UsuarioCard.jsx, UsuarioModal.jsx, useUsuarios.js, UsuariosPage.jsx)
│   │
│   ├── auth/
│   │   ├── domain/ (User.js, AuthRepository.js)
│   │   ├── application/ (LoginUseCase.js, LogoutUseCase.js, GetCurrentUserUseCase.js)
│   │   ├── infrastructure/ (AuthApiRepository.js)
│   │   └── presentation/ (AuthContext.jsx)
│   │
│   └── dashboard/
│       ├── domain/ (DashboardMetrics.js, DashboardRepository.js)
│       ├── application/ (GetDashboardMetricsUseCase.js, GetActividadRecienteUseCase.js)
│       ├── infrastructure/ (DashboardApiRepository.js)
│       └── presentation/ (DashboardPage.jsx)
│
├── services/api/                 # Cliente HTTP y catálogo de endpoints
│   ├── apiClient.js              # Fetch wrapper con JWT, timeout y error handling
│   ├── endpoints.js              # Rutas del backend centralizadas
│   └── errorHandler.js           # Manejo normalizado de errores
│
├── components/                   # Componentes visuales transversales
│   ├── common/                   # Button, Input, Modal, Badge, EmptyState, Banner
│   └── layout/                   # Sidebar (desktop), Header, MobileNavbar (móvil)
│
└── styles/                       # Sistema de diseño (Vanilla CSS)
    ├── variables.css             # Tokens de diseño (paleta, fuentes, radios, sombras)
    ├── layout.css                # Layout responsivo web/móvil
    └── components.css            # Estilos de botones, formularios, tarjetas y modales
```

---

## 💡 Beneficios de esta Arquitectura

1. **Cero Acoplamiento al Backend**: La capa de dominio (`domain/`) y los casos de uso (`application/`) no saben cómo se obtienen los datos. Si mañana cambias de REST API a GraphQL o Firebase, solo tocas la carpeta `infrastructure/` sin modificar la UI ni la lógica de negocio.
2. **Independiente de la UI**: Si cambias de React a React Native, Vue o Angular, las carpetas `domain/` y `application/` se reutilizan al 100%.
3. **Facilidad de Pruebas Unitarias (TDD)**: Puedes testear entidades y casos de uso sin mocks complejos ni servidores levantados.

---

## 🔌 Conexión con el Backend

1. Ajusta [` .env `](file:///c:/Code/frondend%20biblioteca/.env) con la URL de tu servidor:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```
2. Revisa o adapta las rutas en [`src/services/api/endpoints.js`](file:///c:/Code/frondend%20biblioteca/src/services/api/endpoints.js).
3. Cada repositorio en `infrastructure/` (`LibroApiRepository.js`, `PrestamoApiRepository.js`, `UsuarioApiRepository.js`) consume automáticamente esa API con Bearer tokens JWT inyectados.

---

## 🚀 Comandos

```bash
# Servidor de desarrollo
npm run dev

# Compilación de producción
npm run build
```
