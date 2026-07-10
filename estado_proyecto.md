# Estado del Proyecto - PoC 2.0 (Scrum Management)

Este documento detalla el estado actual de todos los módulos del proyecto, incluyendo la base de datos, el backend y el frontend.

---

## 1. Módulo de Base de Datos (SQLite / Turso)
La base de datos está completamente configurada con soporte híbrido para **SQLite local** (`local.db`) y **Turso (LibSQL en la nube)** mediante variables de entorno en el archivo `.env`.

*   **Esquema de Tablas (Estable y Consistente):**
    *   `usuarios`: Registro de cuentas con hash `bcrypt`, avatar y roles (`admin`, `developer`).
    *   `proyectos`: Información principal del proyecto.
    *   `proyecto_miembros`: Tabla intermedia que relaciona proyectos con sus miembros y roles.
    *   `sprints`: Sprints planificados, activos o cerrados.
    *   `historias`: Historias de usuario del backlog de producto (estimadas en Story Points).
    *   `tareas_tecnicas`: Tareas de desarrollo asociadas a las historias (estimadas en horas).
    *   `outbox_events` y `proyecto_read_model`: Soporte para arquitectura orientada a eventos (EDA) y sincronización de modelos de lectura asíncronos.
*   **Semillado Automático (Seeding):**
    *   Al arrancar el backend por primera vez, si la tabla de usuarios está vacía, se crea automáticamente la cuenta administradora global:
        *   **Email:** `admin@luma.com`
        *   **Contraseña:** `123456`
        *   **Rol:** `admin` (desbloquea automáticamente el panel de administración).
    *   Este proceso se omite de forma automática durante la suite de pruebas para evitar contaminación de base de datos en los tests.
*   **Integridad de Datos:**
    *   Se corrigió el borrado de proyectos asegurando que los miembros del proyecto en `proyecto_miembros` se eliminen primero, evitando fallas de clave foránea (`FOREIGN KEY`).

---

## 2. Módulo de Backend (Servidor Litestar)
El backend es un servicio REST desarrollado en **Python 3.13** utilizando el framework **Litestar**.

*   **Rutas y Controladores:**
    *   **Autenticación (`/auth`):** Login, Registro, Obtener perfil (`/me`) y Actualizar perfil.
    *   **Usuarios (`/usuarios`):** Endpoint para listar todos los usuarios en el sistema (usado por el panel de administración).
    *   **Proyectos (`/proyectos`):** CRUD de proyectos, sprints, historias y tareas.
*   **Lógica de Negocio y Seguridad:**
    *   **Filtrado de Proyectos:** Un desarrollador solo puede listar y ver los proyectos que ha creado o en los que participa. El administrador (`admin`) puede ver y gestionar todos los proyectos del sistema.
    *   **Transiciones de Estado Flexibles:** Se añadieron endpoints dedicados `PUT /status` para cambiar directamente el estado de cualquier Sprint, Historia o Tarea Técnica en cualquier dirección sin restricciones estrictas de flujo de trabajo.
*   **Suite de Pruebas:**
    *   **276 pruebas unitarias y de integración pasando exitosamente (100%).**
    *   Se aislaron las pruebas de repositorio de usuarios y del servidor MCP para que utilicen bases de datos SQLite temporales en memoria o disco temporal. Esto permite ejecutar la suite de pruebas sin interrumpir ni bloquear el servidor de desarrollo activo.

---

## 3. Módulo de Frontend (Dashboard Velzon)
El frontend está basado en la plantilla de alta calidad **Velzon** con React 18, TypeScript, Redux y Reactstrap.

*   **Componentes Clave e Interfaz:**
    *   **Página de Inicio (`/home` y `/projects`):** Redirige directamente al gestor de proyectos en lugar de una página de relleno.
    *   **Menú Lateral Inteligente:** Muestra opciones contextuales para **Proyectos**, **Backlog** y **Sprints** basadas en el proyecto seleccionado actualmente (guardado en `localStorage`).
    *   **Diseño del Backlog (Estilo Jira):** 
        *   Las **Historias de Usuario** se muestran en formato de lista de tarjetas verticales una debajo de otra en la columna izquierda.
        *   Los **Sprints** y su planificación se muestran en una columna vertical a la derecha.
        *   Se integraron controles de tipo `select` para cambiar los estados de sprints, historias y tareas directamente desde el Backlog.
        *   Se limitaron las estimaciones de complejidad (**Story Points**) a la **serie Fibonacci** (`1, 2, 3, 5, 8, 13, 21`).
    *   **Panel del Administrador (`/admin/users`):** Vista en tabla que lista a todos los usuarios del sistema. Solo es visible en el menú lateral si el usuario que inicia sesión tiene el rol de `admin`.
