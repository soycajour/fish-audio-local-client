@echo off
setlocal enabledelayedexpansion
title Compilar Fish Audio Local a EXE
cd /d "%~dp0"

echo ===================================================
echo      Compilador Fish Audio Local (PyInstaller)
echo ===================================================
echo.

set "PYTHON_EXE="
if exist "venv\Scripts\python.exe" (
    set "PYTHON_EXE=venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PYTHON_EXE=python"
    )
)

if not defined PYTHON_EXE (
    echo [ERROR] No se detecto Python. Ejecuta iniciar.bat primero para crear el entorno virtual.
    pause
    exit /b 1
)

echo [1/3] Verificando e instalando dependencias de compilacion...
"%PYTHON_EXE%" -m pip install -r requirements.txt
"%PYTHON_EXE%" -m pip install pyinstaller

echo.
echo [2/3] Limpiando carpetas temporales de compilacion...
if exist "dist\FishAudioLocal" rmdir /s /q "dist\FishAudioLocal"
if exist "build" rmdir /s /q "build"

echo.
echo [3/3] Compilando ejecutable standalone...
"%PYTHON_EXE%" -m PyInstaller ^
    --name "FishAudioLocal" ^
    --noconfirm ^
    --onedir ^
    --icon "app_icon.ico" ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --add-data "docs;docs" ^
    app.py

if exist "dist\FishAudioLocal\FishAudioLocal.exe" (
    echo.
    echo ===================================================
    echo  ^!COMPILACION EXITOSA!
    echo ===================================================
    echo  Tu aplicacion compilada esta lista en:
    echo  dist\FishAudioLocal\FishAudioLocal.exe
    echo ===================================================
    echo.
) else (
    echo.
    echo [ERROR] No se pudo generar el archivo ejecutable.
    echo.
)

pause
