@echo off
chcp 65001 >nul
rem Arranque de SIMA v4 en Windows.
rem   iniciar.bat           con Docker Desktop: base de datos, API y web en contenedores
rem   iniciar.bat local     API y web en este equipo (necesita .NET 8 SDK, Node.js 22 y PostgreSQL)
cd /d "%~dp0"

if /i "%~1"=="local" goto local
where docker >nul 2>nul
if errorlevel 1 (
  echo No se encontro Docker. Se usara el modo local.
  goto local
)
docker compose up --build
goto fin

:local
where dotnet >nul 2>nul || (echo Falta el SDK de .NET 8. Ejecute scripts\instalar-herramientas.ps1 & goto fin)
where npm >nul 2>nul || (echo Falta Node.js 22. Ejecute scripts\instalar-herramientas.ps1 & goto fin)
if not exist node_modules call npm install --no-audit --no-fund
if not defined POSTGRES_PUERTO set POSTGRES_PUERTO=5432
where docker >nul 2>nul && docker compose -f docker-compose.yml -f docker-compose.local.yml up -d db
set ConnectionStrings__Sima=Host=localhost;Port=%POSTGRES_PUERTO%;Database=sima;Username=sima;Password=sima
start "SIMA API" cmd /k dotnet run --project api\Sima.Api
timeout /t 15 /nobreak >nul
start "SIMA Web" cmd /k npm run dev -w web
echo.
echo   SIMA v4 esta iniciando
echo     Web de administracion   http://localhost:3000   (rrhh@manuandina.cl - Rrhh2026)
echo     Simulador de PLC        npm run plc:escritorio
echo     App de terreno          npm run terreno:escritorio
:fin
