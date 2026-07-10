# Guía de Configuración de API y Simulador (Fase 6)

Esta guía explica cómo cambiar entre el simulador interno (Offline) y una API propia o externa (Online).

## 1. Configuración Actual: Modo Simulador (Offline)

Actualmente, la aplicación está configurada para interceptar las peticiones de autenticación y perfil localmente sin salir a internet.

### Cambios Realizados:
- **Archivo**: `.env`
- **Variable**: `REACT_APP_API_URL` cambiada de la URL de Themesbrand a `""` (vío) o `http://localhost:3000`.
- **Variable**: `REACT_APP_DEFAULTAUTH` establecida en `fake`.

### Cómo funciona:
El archivo `src/helpers/AuthType/fakeBackend.ts` utiliza una librería llamada `axios-mock-adapter`. Cuando la aplicación intenta hacer una petición a `/post-jwt-login` o `/post-jwt-profile`, esta librería "atrapa" la petición y devuelve una respuesta predefinida con datos locales de prueba, ignorando la URL real.

---

## 2. Cómo usar tu propia API (Online)

Para conectar la aplicación a tu propio backend en el futuro, sigue estos pasos:

### Paso A: Modificar el archivo `.env`
Cambia las siguientes variables:
```env
# 1. Pon la URL de tu backend real
REACT_APP_API_URL="https://tu-api.ejemplo.com"

# 2. Cambia el modo de autenticación a 'jwt'
REACT_APP_DEFAULTAUTH=jwt
```

### Paso B: Desactivar el Simulador en `App.tsx`
Para asegurar que las peticiones salgan realmente a tu servidor y no sean interceptadas, debes comentar la activación del simulador:
- **Archivo**: [src/App.tsx](file:///d:/download/templates/velzon/velson-424/custom/velzon_424_react_ts_starter_master/src/App.tsx)
- **Acción**: Comenta las líneas 13 y 16.
```tsx
// import fakeBackend from "./helpers/AuthType/fakeBackend";
// fakeBackend();
```

---

## 3. Credenciales del Simulador
Para entrar en modo offline, puedes usar:
- **Usuario**: `admin@themesbrand.com`
- **Contraseña**: `123456`

> [!NOTE]
> En modo `fake`, los datos que guardes (como cambios en el perfil) solo persistirán mientras la aplicación esté cargada en el navegador o en la sesión actual, ya que no se guardan en una base de datos real.
