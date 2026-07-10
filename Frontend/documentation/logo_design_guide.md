# Guía Técnica para el Diseño del Logo (Luma)

Esta guía detalla los requisitos técnicos para la generación y actualización de los activos visuales de la marca **Luma**. Es fundamental seguir estas especificaciones para asegurar que el logo se visualice correctamente en los espacios restringidos de la plantilla.

## 1. Especificaciones Generales
*   **Formato recomendado:** SVG (Scalable Vector Graphics). Es el formato ideal por su nitidez en tamaños pequeños y su ligereza.
*   **Formato alternativo:** PNG de alta resolución con fondo transparente (Alpha channel).
*   **Importante:** Las imágenes deben estar **recortadas al borde exacto** de los elementos gráficos (sin márgenes o "aire" alrededor).

## 2. Tipos de Logo y Archivos

### A. Logo Principal (Extendido)
Se usa en el Sidebar (cuando está desplegado) y en el Header (modo horizontal).
*   **Orientación:** Horizontal (Isotipo + Logotipo).
*   **Variantes necesarias:**
    1.  **Versión Oscura (`logo-light.png`):** Texto en blanco o colores claros para fondos oscuros (Indigo #405189).
    2.  **Versión Clara (`logo-dark.png`):** Texto en color oscuro para fondos claros (Blanco #FFFFFF).
*   **Dimensiones objetivo:** El contenedor CSS escala estas imágenes a una altura de entre **17px y 22px**. Se recomienda diseñar en un lienzo proporcional (ej: 200px x 40px) pero siempre ajustado al borde.

### B. Logo Compacto (Isotipo)
Se usa cuando el menú lateral está colapsado (abatido) y como base para el favicon.
*   **Archivo:** `logo-sm.png`
*   **Orientación:** Cuadrada (Solo el Isotipo/Icono).
*   **Dimensiones objetivo:** Se escala a una altura de **22px**.
*   **Variante:** Debe ser visible sobre el fondo oscuro del sidebar (#405189).

### C. Favicon
*   **Archivo:** `favicon.ico`
*   **Ubicación:** `/public/favicon.ico`
*   **Dimensiones:** 32x32px o 16x16px.

## 3. Ubicación de los Archivos
Todos los archivos de imagen deben guardarse en el siguiente directorio del proyecto:
`src/assets/images/`

| Archivo | Función | Requisito de Color |
| :--- | :--- | :--- |
| `logo-dark.png` | Logo horizontal para fondo claro | Texto oscuro |
| `logo-light.png` | Logo horizontal para fondo oscuro | Texto claro |
| `logo-sm.png` | Icono para menú colapsado | Texto/Gráfico claro |
| `favicon.ico` | Icono de pestaña del navegador | Multiresolución |

## 4. Notas Técnicas (Dimensiones CSS)
Las dimensiones están delimitadas por atributos en los componentes React y clases CSS:
*   **Atributos Inline:** En `Header.tsx` y `Sidebar.tsx` se usan los atributos `height="17"` y `height="22"`. 
*   **Contenedor:** El `.navbar-brand-box` limita el ancho máximo.
*   **Recomendación:** Si el logo final requiere ser más grande, el desarrollador debe aumentar el valor del atributo `height` en los archivos mencionados.

---
*Documento generado para el equipo de diseño - Proyecto Luma.*
