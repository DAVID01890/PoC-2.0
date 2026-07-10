# Velzon Architecture Analysis

## Core Technologies
| Technology | Role |
| :--- | :--- |
| **React 19** | Core library for building the UI. |
| **TypeScript** | Static typing for better developer experience and reliability. |
| **Redux Toolkit (RTK)** | Centralized state management (Layout, Auth, etc.). |
| **React Router Dom v7** | Handles all navigation and routing. |
| **Bootstrap 5 / Reactstrap** | CSS framework and React-ready UI components. |
| **i18next** | Multi-language support. |
| **Axios** | Standardized way to handle API requests. |
| **Formik & Yup** | Form state management and schema-based validation. |

## Project Structure (The "Core")

### 1. `src/Layouts/`
Este es el "esqueleto" de tu aplicación. Define cómo se ven el Header, el Sidebar (navegación lateral) y el Footer. 
- **Punto de Entrada**: `src/Layouts/index.tsx` coordina todo.
- **Configuración Dinámica**: El layout cambia en tiempo real mediante Redux (`src/slices/layouts/`).

### 2. `src/Routes/`
Controla qué componente se muestra según la URL.
- **`allRoutes.tsx`**: Aquí es donde registrarás tus propias páginas.
- **`AuthProtected.tsx`**: Middleware que verifica si un usuario está logueado antes de mostrar la página.

### 3. `src/slices/`
Aquí vive el estado global. Cada feature (Auth, Layout, etc.) tiene su propia carpeta con un `reducer.ts` y posiblemente un `thunk.ts` para lógica asíncrona.

### 4. `src/assets/scss/`
El sistema de estilos. Velzon usa SCSS modularizado. La mayoría de lo que ves es CSS puro de Bootstrap extendido con temas personalizados.

---

## Estrategia de Optimización

Para que tu aplicación sea ligera, seguiremos estos pasos:
1. **Remoción de Librerías no usadas**: Velzon viene con gráficos, calendarios y editores que quizás no necesites.
2. **Code Splitting**: Asegurarnos de usar `React.lazy` para cargar páginas solo cuando se visitan.
3. **Limpieza de Rutas**: Eliminar todas las rutas de ejemplo de Velzon que no sean útiles para tu proyecto final.
