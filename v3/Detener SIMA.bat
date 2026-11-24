@echo off
chcp 65001 >nul
title SIMA
cd /d "%~dp0"
echo   Deteniendo SIMA (los datos se conservan)...
docker compose down
echo.
echo   Listo. Para volver a abrirlo, haga doble clic en "Iniciar SIMA.bat".
timeout /t 5 >nul
