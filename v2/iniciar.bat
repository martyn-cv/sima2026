@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SIMA
set PY=
where py >nul 2>nul
if not errorlevel 1 set PY=py
if "%PY%"=="" (
  where python >nul 2>nul
  if not errorlevel 1 set PY=python
)
if "%PY%"=="" goto sinpython

echo Preparando SIMA (la primera vez tarda unos minutos)...
if not exist api\.venv\Scripts\activate.bat %PY% -m venv api\.venv
call api\.venv\Scripts\activate.bat
python -m pip install -r api\requirements-local.txt -q
if errorlevel 1 goto error
set DJANGO_DEBUG=1
cd api
python manage.py migrate -v0
if errorlevel 1 goto error
python manage.py seed_demo
if errorlevel 1 goto error
cd ..

start "SIMA API" cmd /k "cd /d %~dp0api && call .venv\Scripts\activate.bat && set DJANGO_DEBUG=1 && python manage.py runserver 8000 --noreload"
start "SIMA simulador" cmd /k "cd /d %~dp0api && call .venv\Scripts\activate.bat && set DJANGO_DEBUG=1 && python manage.py simular_planta"
start "SIMA web y app" cmd /k "cd /d %~dp0 && call api\.venv\Scripts\activate.bat && python tools\serve.py"
timeout /t 4 >nul
start "" http://localhost:3000
start "" http://localhost:3001
echo.
echo SIMA listo: web http://localhost:3000   app http://localhost:3001
echo Para detenerlo cierre las tres ventanas negras que se abrieron.
goto fin

:sinpython
echo No se encontro Python. Instalelo desde https://www.python.org/downloads/ marcando "Add python.exe to PATH".
goto fin

:error
echo Algo fallo. Copie el mensaje de arriba.

:fin
pause
