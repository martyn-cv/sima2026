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
if not exist .venv\Scripts\activate.bat %PY% -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install -r requirements-local.txt -q
if errorlevel 1 goto error
set DJANGO_DEBUG=1
python manage.py migrate -v0
if errorlevel 1 goto error
python manage.py seed_demo
if errorlevel 1 goto error
echo.
echo SIMA esta listo en http://localhost:8000 (cierre esta ventana para detenerlo)
start "" http://localhost:8000
python manage.py runserver 8000 --noreload
goto fin

:sinpython
echo No se encontro Python. Instalelo desde https://www.python.org/downloads/ marcando "Add python.exe to PATH".
goto fin

:error
echo Algo fallo. Copie el mensaje de arriba.

:fin
pause
