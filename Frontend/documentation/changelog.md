# Historial de Cambios - Proyecto Luma

Este documento registra las modificaciones, optimizaciones y cambios de identidad realizados sobre la plantilla base Velzon para crear el boilerplate de **Luma**.

## [1.2.0] - 2026-04-25
### Optimización Extrema de Recursos (Fase de Limpieza Final)
- **Eliminación masiva de activos**: Se borraron cientos de imágenes huérfanas de los módulos originales (Ecommerce, NFT, Landing, Blog).
- **Limpieza de SCSS**: Se purgaron los archivos `app.scss` y `themes.scss`, eliminando importaciones de plugins y páginas inexistentes.
- **Reducción de dependencias**: Se eliminaron más de 40 paquetes de `package.json` (ApexCharts, ECharts, Google Maps, Firebase, Quill, etc.).

## [1.1.0] - 2026-04-25
### Rebranding y Documentación
- **Cambio de Identidad**: Reemplazo total de la marca "Velzon" por **Luma** en toda la aplicación (Títulos, Footers, Cookies, Meta-tags).
- **Nueva Identidad Visual**: Generación e instalación de logos (claro/oscuro) y favicons optimizados para el esquema de colores #405189.
- **Guías Técnicas**: 
    - Creada la `Guía del Desarrollador` para la creación de nuevas páginas.
    - Creada la `Guía de Diseño de Logo` para el equipo creativo.
- **Configuración de API**: Actualización de `API_URL` a `api.luma.com`.

## [1.0.0] - 2026-04-25
### Estabilización de Layout y Navegación
- **Ruta Base**: Unificación de la navegación principal bajo el endpoint `/home`.
- **Layout Fijo**: Estabilización del Header y Footer. Implementación de Breadcrumb pegajoso (sticky) en modo vertical.
- **Fake Backend**: Ajuste del sistema de autenticación simulada para funcionamiento 100% offline y compatible con los nuevos thunks de React.
- **Limpieza de Código**: Remoción de los componentes de página originales de la plantilla.

---
*Este historial se actualiza tras cada fase mayor de desarrollo.*
