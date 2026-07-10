@echo off
title PoC 2.0 - Deteniendo Servidores
echo ===================================================
echo Deteniendo Servidores de Desarrollo (PoC 2.0)
echo ===================================================

echo.
echo [+] Cerrando ventanas de servidores...
taskkill /FI "WINDOWTITLE eq Backend - Litestar*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend - React*" /T /F >nul 2>&1

echo.
echo [+] Liberando Puerto 8000 (Backend)...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
    echo     PID %%p terminado.
)

echo.
echo [+] Liberando Puerto 3000 (Frontend)...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
    echo     PID %%p terminado.
)

echo.
echo ===================================================
echo Servidores detenidos correctamente.
echo ===================================================
echo.
pause
