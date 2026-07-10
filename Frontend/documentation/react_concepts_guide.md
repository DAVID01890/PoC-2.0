# Guía de Conceptos React en Velzon

Velzon es una aplicación profesional y utiliza patrones avanzados de React. Aquí tienes una referencia sencilla de los términos que verás con más frecuencia:

## 1. Componentes (`Components`)
Son las piezas de construcción de la aplicación. Todo lo que ves (un botón, una barra lateral, una tabla) es un componente.
- **¿Cómo los identifico?**: Son archivos que terminan en `.tsx` y su nombre empieza con mayúscula (ej. `Header.tsx`).
- **Función**: Encierran HTML y lógica en una sola pieza reutilizable.

## 2. Props (`Propiedades`)
Es la forma en que pasamos información de un componente "Padre" a un componente "Hijo".
- **Ejemplo**: Si tienes un componente `Button`, puedes pasarle una prop llamada `color="blue"`.
- **En Velzon**: Verás muchas interfaces en TypeScript que definen qué props acepta un componente.

## 3. Hooks (Funciones "Especiales")
Son funciones que empiezan con `use` y permiten "enganchar" lógica de React en tus componentes.
- **`useState`**: Se usa para guardar datos locales que pueden cambiar (ej. si un menú está abierto o cerrado).
- **`useEffect`**: Se usa para ejecutar código cuando algo sucede (ej. cargar datos de una API cuando se abre la página o cambiar el tema del layout).

## 4. Redux Toolkit (Estado Global)
A veces, muchos componentes necesitan la misma información (ej. el nombre del usuario logueado o si estamos en Dark Mode). Redux guarda esa información en un "almacén" central.
- **`Slice`**: Es un trozo de ese almacén (ej. el slice de Layout).
- **`useSelector`**: Se usa para **leer** datos de Redux.
- **`useDispatch`**: Se usa para **enviar una acción** y cambiar los datos (ej. cambiar de Light a Dark mode).

## 5. JSX / TSX
Es la sintaxis que mezcla HTML con JavaScript/TypeScript.
- Verás que puedes poner código entre llaves `{ }` dentro del HTML para mostrar variables o ejecutar lógica simple.

## 6. Rutas (`Routing`)
Determinan qué componente mostrar basándose en lo que escribes en la barra de direcciones del navegador.
- En Velzon, las rutas se definen en una lista (`allRoutes.tsx`) y el sistema decide si mostrar la página o pedirte login (`AuthProtected`).

---

**Tip de Aprendizaje**: No intentes aprenderte todo de memoria. Piensa en la aplicación como un juego de LEGO: los componentes son las piezas, y Redux es el manual de instrucciones que todos leen.
