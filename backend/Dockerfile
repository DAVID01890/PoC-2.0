# Imagen base ligera de Python 3.13
FROM python:3.13-slim

# Evitar que Python escriba archivos .pyc en disco y asegurar salida sin buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema mínimas necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY src/ /app/src/

# Crear un usuario sin privilegios por seguridad
RUN useradd -u 10001 appuser && chown -R appuser:appuser /app
USER appuser

# Exponer el puerto
EXPOSE 8000

# Ejecutar el servidor ASGI Uvicorn para producción
CMD ["sh", "-c", "uvicorn src.entrypoint.app:create_app --host 0.0.0.0 --port ${PORT}"]
