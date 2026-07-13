# Stage 1: Compilar la aplicación React
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias limpias
RUN npm ci

# Copiar código fuente del Frontend
COPY . .

# Argumento para pasar la URL de la API durante la compilación
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Compilar a producción
RUN npm run build

# Stage 2: Servir los estáticos compilados usando Nginx
FROM nginx:stable-alpine

# Eliminar configuración por defecto de Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos de la compilación anterior
COPY --from=build /app/build /usr/share/nginx/html

# Exponer el puerto 80 para tráfico HTTP
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
