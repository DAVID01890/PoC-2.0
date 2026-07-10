# Guía de Desinstalación de Componentes (Velzon React)

Esta guía detalla el proceso paso a paso para eliminar una librería o componente de la plantilla Velzon de forma segura, reduciendo el tamaño del proyecto y evitando errores de compilación.

---

## Paso 1: Identificación de Dependencias
Lo primero es saber qué paquetes de `npm` pertenecen al componente.
- **Archivo**: `package.json`
- **Acción**: Busca el nombre del componente (ej. `apexcharts`) en la sección de `dependencies`.
- **Nota**: A veces hay un paquete principal y un "wrapper" para React (ej. `apexcharts` y `react-apexcharts`).

## Paso 2: Eliminación de Referencias en Código (JS/TSX)
Antes de borrar la librería física, debemos quitar los rastros en el código para que el compilador no busque algo que ya no existe.
1.  **Páginas y Rutas**: Si la librería solo se usaba en una página demo (como el Dashboard), elimina la página en `src/pages/` y quita su ruta en `src/Routes/allRoutes.tsx`.
2.  **Menú**: Quita el enlace del componente en `src/Layouts/LayoutMenuData.tsx`.
3.  **Búsqueda Global**: Haz una búsqueda en todo el proyecto (`Ctrl+Shift+F`) de la palabra clave para encontrar importaciones huérfanas.

## Paso 3: Limpieza de Estilos (SCSS)
Velzon importa los estilos de cada plugin de forma individual. Si no quitas esto, la compilación de SASS fallará.
- **Archivo**: `src/assets/scss/app.scss`
- **Acción**: Busca y comenta o elimina la línea `@import "plugins/[nombre]";`.
- **Ejemplo**: `@import "plugins/apexcharts";`

## Paso 4: Desinstalación Física (npm)
Una vez el código está "limpio" de referencias, puedes ejecutar el comando de eliminación.
- **Comando**:
```bash
npm uninstall [nombre-paquete] --legacy-peer-deps
```
- **Importante**: El flag `--legacy-peer-deps` es necesario en esta plantilla para evitar conflictos de versiones con React 19.

## Paso 5: Verificación
- **Terminal**: Asegúrate de que no aparezcan errores de "Module not found".
- **Navegador**: Verifica que la aplicación cargue correctamente en `localhost:3000`.

---

> [!TIP]
> **¿Por qué este orden?** Si desinstalas primero (`npm uninstall`) antes de limpiar el código, la aplicación dejará de funcionar inmediatamente y será más difícil identificar todos los archivos que necesitan limpieza.
