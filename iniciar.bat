@echo off
setlocal enabledelayedexpansion
title Fish Audio Local
cd /d "%~dp0"

echo ===================================================
echo               Fish Audio Local
echo ===================================================
echo.

:: 1. Verificar si ya existe un entorno virtual listo
if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
    goto :CHECK_DEPS
)

:: 2. Si no existe venv, buscar Python en el sistema para crearlo
echo [1/3] Detectando instalacion de Python...
set "SYS_PYTHON="

where python >nul 2>&1
if %errorlevel% equ 0 (
    set "SYS_PYTHON=python"
    goto :CREATE_VENV
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    set "SYS_PYTHON=py -3"
    goto :CREATE_VENV
)

where python3 >nul 2>&1
if %errorlevel% equ 0 (
    set "SYS_PYTHON=python3"
    goto :CREATE_VENV
)

echo.
echo [ERROR] No se encontro Python 3 instalado en tu sistema.
echo Por favor descarga e instala Python desde: https://www.python.org/downloads/
echo (Asegurate de marcar la casilla "Add Python to PATH" durante la instalacion).
echo.
pause
exit /b 1

:CREATE_VENV
echo [2/3] Creando entorno virtual (venv)...
%SYS_PYTHON% -m venv venv
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] No se pudo crear el entorno virtual.
    echo Intentando ejecutar con el Python del sistema...
    set "PYTHON_EXE=%SYS_PYTHON%"
) else (
    set "PYTHON_EXE=venv\Scripts\python.exe"
)

:CHECK_DEPS
echo [3/3] Verificando dependencias...
"%PYTHON_EXE%" -c "import flask, requests, pydub" >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando librerias necesarias desde requirements.txt...
    "%PYTHON_EXE%" -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Ocurrio un problema instalando las dependencias.
        pause
        exit /b 1
    )
)

echo.
echo Servidor iniciando en: http://127.0.0.1:5050
echo Abriendo navegador...
start http://127.0.0.1:5050

echo Presiona Ctrl+C en esta ventana para detener el servidor.
echo.
"%PYTHON_EXE%" app.py

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] El servidor se detuvo con un error.
    pause
)
