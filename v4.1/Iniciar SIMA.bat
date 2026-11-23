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

rem Las versiones anteriores de SIMA (v3, v4) usan los mismos puertos y sus contenedores se reinician solos con Docker:
rem se detienen (sin borrar sus datos) para que esta version pueda usar los puertos 5080, 3000, 1420 y 1421.
for %%v in (v3 v4) do (
  docker compose -p %%v ps -q 2>nul | findstr . >nul && (
    echo   Deteniendo SIMA %%v, que esta usando los mismos puertos ^(sus datos se conservan^)...
    docker compose -p %%v stop >nul 2>nul
  )
)

rem Si otro contenedor sigue ocupando un puerto, se avisa cual y se detiene (los de esta version se llaman v41-...).
for %%p in (5080 3000 1420 1421) do (
  for /f "delims=" %%a in ('docker ps --filter "publish=%%p" --format "{{.Names}}" 2^>nul') do (
    echo %%a| findstr /b /i "v41-" >nul || (
      echo   El puerto %%p lo usa el contenedor %%a. Deteniendolo...
      docker stop %%a >nul 2>nul
    )
  )
)

docker compose up -d --build
if errorlevel 1 (
  echo.
  echo   Hubo un error al arrancar.
  echo   Si dice "port is already allocated" o "failed to set up container networking", otro programa usa
  echo   el puerto 5080, 3000, 1420 o 1421. Cierre ese programa ^(o la otra version de SIMA^) y vuelva a intentar.
  echo   Para ver que contenedores estan encendidos:  docker ps
  echo   Si no es eso, copie los mensajes de arriba y envieselos a quien le ayuda.
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
echo     SIMA Desktop (navegador) http://localhost:1421
echo     Simulador de PLC        http://localhost:1420
echo   Los ejecutables SIMA-Desktop.exe y SIMA-PLC-Simulator.exe se conectan a http://localhost:5080
echo.
start "" http://localhost:3000
start "" http://localhost:1421
start "" http://localhost:1420
echo   Puede cerrar esta ventana: SIMA sigue funcionando. Para apagarlo, use "Detener SIMA.bat".
timeout /t 8 >nul
