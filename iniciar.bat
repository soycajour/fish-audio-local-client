@echo off
cd /d "%~dp0"
echo Iniciando Fish Audio Local...

:: Intentar primero con el Python de UV que usas en VS Code
set PYTHON_BIN="%USERPROFILE%\AppData\Roaming\uv\python\cpython-3.14.3-windows-x86_64-none\python.exe"
if exist %PYTHON_BIN% (
    goto RUN
)

:: Intentar con python global del sistema
where python >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_BIN=python
    goto RUN
)

:: Si no se encuentra python, ir directamente a start.sh
echo No se detecto Python rapido. Iniciando con start.sh...
bash start.sh
exit /b

:RUN
start http://127.0.0.1:5050
%PYTHON_BIN% app.py
if %errorlevel% neq 0 (
    echo.
    echo Ocurrio un error al ejecutar app.py directamente.
    echo Intentando actualizar/iniciar con start.sh...
    bash start.sh
)



