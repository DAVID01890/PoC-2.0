@echo off
title PoC 2.0 - Servidores de Desarrollo
echo ===================================================
echo Iniciando Servidores de Desarrollo (PoC 2.0)
echo ===================================================

echo.
echo [+] Levantando el Backend en Litestar (Puerto 8000)...
start "Backend - Litestar" cmd /k "cd backend && litestar --app src.entrypoint.app:create_app run --port 8000 --reload"

echo.
echo [+] Levantando el Frontend en React (Puerto 3000)...
start "Frontend - React" cmd /k "cd Frontend && npm run start"

echo.
echo ===================================================
echo Servidores iniciados en ventanas independientes.
echo Puedes presionar Ctrl+C en sus respectivas ventanas para detenerlos.
echo ===================================================
echo.
pause
