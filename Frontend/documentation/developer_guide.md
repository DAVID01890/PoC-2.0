# Guía del Desarrollador - Plantilla Luma

Bienvenido a la versión optimizada de la plantilla **Luma**. Este documento describe el flujo de trabajo para añadir nuevas funcionalidades, páginas y componentes manteniendo el rendimiento y la limpieza del código.

## 1. Arquitectura del Proyecto
La estructura se ha simplificado para eliminar el "ruido" de la plantilla original:
*   `src/pages/`: Contiene los componentes de página. Cada página debe tener su propia carpeta.
*   `src/Components/Common/`: Componentes reutilizables en toda la aplicación.
*   `src/Routes/`: Configuración central de rutas.
*   `src/Layouts/`: Estructura visual (Header, Sidebar, Footer).
*   `src/assets/scss/`: Estilos globales y personalizados.

---

## 2. Cómo añadir una nueva Página

Sigue estos tres pasos para añadir una página de forma correcta:

### Paso A: Crear el Componente de Página
Crea una nueva carpeta en `src/pages/` con el nombre de tu página y un archivo `index.tsx`.
Ejemplo: `src/pages/MisDatos/index.tsx`
```tsx
import React from 'react';
import { Container } from 'reactstrap';

const MisDatos = () => {
    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <h1>Mis Datos</h1>
                </Container>
            </div>
        </React.Fragment>
    );
};
export default MisDatos;
```

### Paso B: Registrar la Ruta
Edita `src/Routes/allRoutes.tsx` para importar tu componente y añadirlo a `authProtectedRoutes`:
```tsx
import MisDatos from "../pages/MisDatos";

const authProtectedRoutes = [
    { path: "/mis-datos", component: <MisDatos /> },
    // ... otras rutas
];
```

### Paso C: Agregar al Menú Lateral
Edita `src/Layouts/LayoutMenuData.tsx` para que aparezca el enlace en el sidebar:
```tsx
{
    id: "mis-datos",
    label: "Mis Datos",
    icon: "ri-user-settings-line",
    link: "/mis-datos",
    click: function (e: any) {
        e.preventDefault();
        setIscurrentState('MisDatos');
    },
},
```

---

## 3. Estilos y Diseño
*   **Custom CSS**: Evita editar los archivos base de Velzon. Añade tus estilos personalizados en `src/assets/scss/custom.scss`.
*   **Iconos**: Utilizamos [Remix Icon](https://remixicon.com/) y [Feather Icons](https://feathericons.com/).
*   **Layout**: El diseño es responsivo por defecto usando Bootstrap 5.

---

## 4. Backend y Datos (Mock API)
La aplicación utiliza un "Fake Backend" para desarrollo offline.
*   **Configuración**: `src/config.ts` define la URL base de la API.
*   **Intercepción de llamadas**: Si necesitas simular un nuevo endpoint, agrégalo en `src/helpers/AuthType/fakeBackend.ts` usando `mock.onGet()` o `mock.onPost()`.

---

## 5. Mejores Prácticas
1.  **Mantenlo ligero**: Antes de instalar una nueva librería vía NPM, verifica si la funcionalidad ya existe en el core de React o Bootstrap.
2.  **Imágenes**: Sigue la `documentation/logo_design_guide.md` para cualquier cambio en la identidad visual.
3.  **Rutas**: Siempre usa rutas protegidas (`authProtectedRoutes`) a menos que sea una página pública (como Login).

---
*Manual de desarrollo - Equipo Luma.*
