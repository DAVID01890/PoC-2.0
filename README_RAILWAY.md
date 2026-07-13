# Guía de Despliegue en Railway - PoC 2.0

Esta guía describe cómo desplegar el Frontend (React) y el Backend (Litestar) de este proyecto en **Railway.app** usando los Dockerfiles proporcionados.

## Requisitos Previos

1. Una cuenta en [Railway.app](https://railway.app) (puedes ingresar con GitHub).
2. El código de este proyecto subido a un repositorio de GitHub (público o privado).
3. Una base de datos de **Turso** activa y sus credenciales (`TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`).

---

## Pasos para el Despliegue

### Paso 1: Crear un nuevo Proyecto en Railway
1. Ve a tu dashboard de Railway y haz clic en **New Project**.
2. Selecciona **Deploy from GitHub repo**.
3. Elige tu repositorio `PoC-2.0`.

---

### Paso 2: Configurar el Servicio del Backend
Por defecto, Railway creará un servicio apuntando al repositorio raíz. Lo configuraremos para que sea el **Backend**:

1. Haz clic en el servicio recién creado y ve a **Settings**.
2. Cambia el nombre del servicio a `backend`.
3. Busca la opción **Build** y configura:
   * **Root Directory:** `/backend`
4. Ve a la pestaña **Variables** y agrega las siguientes variables de entorno:
   * `PORT`: `8000`
   * `JWT_SECRET`: *(Genera un string hexadecimal seguro de 64 caracteres)*
   * `TURSO_DATABASE_URL`: *(Tu URL de conexión de Turso, ej. `libsql://...`)*
   * `TURSO_AUTH_TOKEN`: *(Tu token de autenticación de Turso)*
   * `DEFAULT_ADMIN_EMAIL`: *(El email del administrador inicial, ej. `admin@tudominio.com`)*
   * `DEFAULT_ADMIN_NAME`: *(El nombre del administrador, ej. `Administrador`)*
   * `DEFAULT_ADMIN_PASSWORD`: *(Contraseña segura para el administrador)*
5. Ve a **Settings** -> **Networking** y haz clic en **Generate Domain** para obtener una URL pública (ej. `https://backend-production.up.railway.app`). Copia esta URL ya que la usaremos para el Frontend.

---

### Paso 3: Configurar el Servicio del Frontend
Ahora agregaremos el segundo servicio para el Frontend:

1. En el canvas de tu proyecto de Railway, haz clic en **+ New** -> **GitHub Repo**.
2. Selecciona el mismo repositorio `PoC-2.0`.
3. Ve a **Settings** de este nuevo servicio y cambia el nombre a `frontend`.
4. Configura:
   * **Root Directory:** `/Frontend`
5. Ve a la pestaña **Variables** y agrega la siguiente variable de entorno:
   * `REACT_APP_API_URL`: *(La URL que generó el backend en el Paso 2, incluyendo el prefijo del API, ej. `https://backend-production.up.railway.app/api/v1`)*
6. Ve a **Settings** -> **Networking** y haz clic en **Generate Domain**.
7. *¡Listo!* Ahora podrás acceder a tu aplicación de producción ingresando al dominio generado para el frontend.

---

## Limpieza de Base de Datos y Semillado Inicial

Si necesitas inicializar o vaciar la base de datos de Turso para producción con las credenciales del nuevo administrador configurado en tus variables de entorno, puedes ejecutar de forma local antes de desplegar:

```bash
cd backend
python scratch_clean_db.py
```
*(Asegúrate de tener configurado tu archivo `.env` local con las mismas credenciales de producción para que limpie la base de datos correcta).*
