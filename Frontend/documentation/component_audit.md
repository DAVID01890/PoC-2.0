# Auditoría de Componentes y Librerías (Velzon)

He analizado las librerías y componentes integrados en la plantilla. Para optimizar el tamaño de tu aplicación, podemos clasificar los componentes en tres categorías: **Escenciales**, **Útiles pero Opcionales** y **Específicos** (que podrías eliminar si no los necesitas).

## 1. Componentes Esenciales (RECOMENDADO MANTENER)
Estos son la base de cualquier aplicación moderna y tienen un peso moderado.

| Componente | Uso | Recomendación |
| :--- | :--- | :--- |
| **Reactstrap / Bootstrap** | Botones, Tablas básicas, Modals, Alertas, Grids. | Mantener (Base UI). |
| **Formik & Yup** | Gestión de formularios y validaciones avanzadas. | Mantener (Ahorra mucho tiempo). |
| **Axios** | Comunicación con servidores/APIs. | Mantener. |
| **React-Toastify** | Notificaciones flotantes tipo "Toast". | Mantener (Mejora el UX). |
| **Feather Icons** | Iconografía ligera y moderna. | Mantener. |

## 2. Componentes Útiles (EVALUAR SEGÚN EL PROYECTO)
Son componentes comunes, pero si no los vas a usar en absoluto, se pueden quitar.

| Componente | Uso | Relevancia |
| :--- | :--- | :--- |
| **Flatpickr** | Calendarios para selección de fechas en formularios. | Alta si usas fechas. |
| **Select2 (React-Select)** | Selectores con buscador y selección múltiple. | Alta para dashboards. |
| **Swiper** | Carruseles, sliders o galerías de imágenes. | Media-Baja. |
| **FilePond / Dropzone** | Subida de archivos con drag-and-drop. | Media (Solo si subes archivos). |

## 3. Componentes Específicos (CANDIDATOS A ELIMINACIÓN)
Estos son los más pesados y solo deben quedarse si son el "core" de tu funcionalidad.

| Componente | Uso | Impacto en Tamaño |
| :--- | :--- | :--- |
| **[REMOVED] ApexCharts** | Gráficos y visualización de datos. | Muy Alto. |
| **[REMOVED] FullCalendar** | Gestión de agendas y calendarios de eventos. | Muy Alto. |
| **[REMOVED] CKEditor / Quill** | Editores de texto enriquecido (tipo Word). | Muy Alto. |
| **Google Maps / Leaflet** | Mapas interactivos con coordenadas. | Alto. |
| **Grid.js** | Tablas ultra-avanzadas con búsqueda/orden remoto. | Medio-Alto. |

---

## Estrategia de Limpieza Sugerida

Si quieres una aplicación **ligera**, mi recomendación es:
1.  Mantener la **Categoría 1**.
2.  De la **Categoría 2**, quedarnos solo con lo que uses en tus primeros formularios.
3.  **Eliminar TODA la Categoría 3** por ahora. Si más adelante necesitas un gráfico, podemos volver a instalar solo la librería necesaria.

**¿Ves algún componente en la Categoría 3 que sepas con seguridad que NO vas a usar?** Si me confirmas, podemos empezar por remover sus archivos y dependencias.
