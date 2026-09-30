@echo off
chcp 65001 >nul 2>&1
title CRM Servicio Tecnico
color 0A

echo ============================================
echo       CRM Servicio Tecnico - Iniciando
echo ============================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo desde https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/3] Instalando dependencias por primera vez...
    echo       Esto puede tardar unos minutos.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencias instaladas correctamente.
    echo.
) else (
    echo [OK] Dependencias ya instaladas.
)

echo [2/3] Iniciando backend (Express + SQLite) en puerto 3002...
start "" /b cmd /c "node server\index.cjs"

echo Esperando que el backend arranque...
:wait_backend
timeout /t 1 /nobreak >nul
powershell -Command "try { (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', 3002); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 goto wait_backend
echo [OK] Backend listo en puerto 3002.
echo.

echo [3/3] Iniciando frontend (Vite) en puerto 4000...
start "" /b cmd /c "npx vite --port=4000 --host=0.0.0.0"

echo Esperando que el frontend arranque...
:wait_frontend
timeout /t 1 /nobreak >nul
powershell -Command "try { (New-Object Net.Sockets.TcpClient).Connect('127.0.0.1', 4000); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 goto wait_frontend

echo.
echo ============================================
echo   CRM listo en: http://localhost:4000
echo   Backend API:  http://localhost:3002
echo   Abriendo Google Chrome...
echo.
echo   Para detener: cierra esta ventana.
echo ============================================
echo.

start "" "chrome" "http://localhost:4000"

echo Servidor corriendo. Cierra esta ventana para detener.
:keep_alive
timeout /t 3600 /nobreak >nul
goto keep_alive
