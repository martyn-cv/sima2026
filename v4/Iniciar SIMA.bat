@echo off
chcp 65001 >nul
title SIMA
cd /d "%~dp0"
echo.
echo   Iniciando SIMA. La primera vez tarda unos minutos; despues, segundos.
echo.

where docker >nul 2>nul
if errorlevel 1 (
  echo   No se encontro Docker. Instale Docker Desktop desde https://www.docker.com/products/docker-desktop
  pause
  exit /b 1
)
docker info >nul 2>nul
if errorlevel 1 (
  echo   Docker Desktop no esta abierto. Abralo, espere a que diga "Engine running" y vuelva a hacer doble clic.
  pause
  exit /b 1
)

docker compose up -d --build
if errorlevel 1 (
  echo.
  echo   Hubo un error. Copie los mensajes de arriba y envieselos a quien le ayuda.
  pause
  exit /b 1
)

echo.
echo   Esperando a que la API este lista...
set /a intentos=0
:espera
curl -fs http://localhost:5080/salud >nul 2>nul
if not errorlevel 1 goto listo
set /a intentos+=1
if %intentos% gtr 60 (
  echo   La API no respondio a tiempo. Revise con:  docker compose logs api
  pause
  exit /b 1
)
timeout /t 3 /nobreak >nul
goto espera

:listo
echo.
echo   SIMA esta listo.
echo     Web de administracion   http://localhost:3000
echo     App de terreno          http://localhost:1421
echo     Simulador de PLC        http://localhost:1420
echo.
start "" http://localhost:3000
start "" http://localhost:1421
start "" http://localhost:1420
echo   Puede cerrar esta ventana: SIMA sigue funcionando. Para apagarlo, use "Detener SIMA.bat".
timeout /t 8 >nul
