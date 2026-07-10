# Plan de Optimización Paso a Paso

## Fase 0: Seguridad y Respaldo (Git)
Antes de nada, prepararemos un "salvavidas" para poder deshacer cualquier cambio.

*   **Acción**: Inicializar un repositorio Git local. Esto guardará el estado original de la plantilla.
*   **Comandos**: `git init`, `git add .`, `git commit`.

## Fase 1: Limpieza de Rutas y Páginas
El objetivo es que al abrir tu app, solo veas el Dashboard y las páginas de Auth, eliminando el "ruido" de las páginas de ejemplo.

*   **Acciones**:
    *   Editar `src/Routes/allRoutes.tsx` para dejar solo las rutas esenciales.
    *   Editar `src/Layouts/LayoutMenuData.tsx` para que el menú lateral solo muestre el Dashboard.
*   **Archivos a tocar**:
    *   `src/Routes/allRoutes.tsx`
    *   `src/Layouts/LayoutMenuData.tsx`

## Fase 2: Eliminación de Componentes Pesados (Categoría 3)
Eliminaremos las librerías que más pesan y que no usaremos (Gráficos avanzados, Calendarios, Editores).

*   **Acciones**:
    *   Desinstalar paquetes de `package.json`.
    *   Quitar imports de plugins en `src/assets/scss/app.scss`.
    *   Borrar archivos de ejemplo que usen estas librerías.
*   **Archivos a tocar**:
    *   `package.json`
    *   `src/assets/scss/app.scss`
    *   `src/assets/scss/themes.scss`

## Fase 3: Reducción de Opciones de Layout y Temas
### Fase 3: Restricción de Opciones de Layout y Temas (Hecho)
- **Objetivo**: Limitar la flexibilidad del template a las opciones seleccionadas por el usuario.
- **Acciones**:
    - [x] Modificar `src/Components/constants/layout.ts` para restringir enums.
    - [x] Actualizar `src/slices/layouts/reducer.ts` con el estado inicial simplificado.
    - [x] Limpieza profunda de `src/Components/Common/RightSidebar.tsx` (eliminación de UI y lógica para opciones eliminadas).
- **Resultado**: El configurador solo muestra las opciones autorizadas, con un código más limpio y sin errores de TypeScript.

### Fase 4: Ajuste de Idiomas (Hecho)
- **Objetivo**: Limitar la aplicación a Español e Inglés, estableciendo el Español como predeterminado.
- **Acciones**:
    - [x] Modificar `src/common/languages.ts` (quitar idiomas extra, corregir etiqueta "Español").
    - [x] Modificar `src/i18n.ts` (importar solo `sp` y `en`, configurar `sp` como default y fallback).
    - [x] Eliminar archivos `.json` de traducción sobrantes en `src/locales/`.
- **Resultado**: Aplicación bilingüe con inicio automático en español.

### Fase 5: Botón de Personalización en Topbar (Hecho)
- **Objetivo**: Proporcionar un punto de acceso fácil al configurador desde la barra superior.
- **Acciones**:
    - [x] Reactivar `RightSidebar` en `Layouts/index.tsx`.
    - [x] Implementar estado `showRightSidebar` compartido entre Layout, Header y Sidebar.
    - [x] Añadir botón con icono de configuración en `Header.tsx`.
- **Resultado**: El usuario puede abrir el panel de opciones restringidas desde la cabecera, manteniendo el botón flotante original oculto.

### Fase 6: Simulador Interno y Modo Offline (Hecho)
- **Objetivo**: Eliminar la dependencia de internet y configurar el ambiente de pruebas local.
- **Acciones**:
    - [x] Modificar `.env` para eliminar la referencia a la API externa de Themesbrand.
    - [x] Asegurar la activación de `REACT_APP_DEFAULTAUTH=fake`.
    - [x] Crear una guía de configuración para el cambio a API real en el futuro.
- **Resultado**: La aplicación funciona de forma local e independiente, con instrucciones claras para la integración futura.

### Fase 7: Investigación de Telemetría / "Call Home" (Hecho)
- **Objetivo**: Asegurar que la plantilla no envíe datos de uso o licencias a Themesbrand sin consentimiento.
- **Acciones**:
    - [x] Escaneo de dominios externos en todo el código fuente.
    - [x] Revisión de scripts en `index.html` y dependencias en `package.json`.
    - [x] Auditoría de funciones de monitoreo (se encontró `web-vitals` pero está inactivo).
- **Resultado**: No se encontró evidencia de rastreo, telemetría o validación de licencias oculta. La plantilla es limpia y segura.

### Fase 8: Limpieza de Barra Superior (Hecho)
- **Objetivo**: Simplificar el `Header` eliminando elementos no utilizados y mejorando la claridad visual.
- **Acciones**:
    - [x] Eliminar cuadro de búsqueda, selector de idiomas, selector de aplicaciones y carrito.
    - [x] Ocultar (comentar) el componente de notificaciones.
    - [x] Limpiar estado y funciones de búsqueda obsoletas en `Header.tsx`.
- **Resultado**: Cabecera minimalista con solo los controles esenciales (Logo, Menú, Fullscreen, Tema, Perfil y Configuración).

### Fase 9: Refinamiento Estético de Barra Superior (Hecho)
- **Objetivo**: Compactar el diseño y mejorar la integración visual del perfil de usuario.
- **Acciones**:
    - [x] Cambiar `$header-height` de `70px` a `60px` en `_variables-custom.scss`.
    - [x] Establecer `background-color: transparent` para `.topbar-user` en `_topbar.scss`.
- **Resultado**: Una barra superior más delgada y elegante, con un perfil de usuario que se funde perfectamente con el fondo.

---

**¿Empezamos con la Fase 1?** Solo confírmame y te mostraré el primer cambio para limpiar las rutas.
