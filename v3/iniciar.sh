#!/usr/bin/env bash
# Arranque de SIMA v3.
#   ./iniciar.sh           API (.NET) y web (Next.js) en este equipo; usa Docker solo para PostgreSQL si hace falta
#   ./iniciar.sh docker    todo en contenedores (base de datos, API y web)
#   ./iniciar.sh pruebas   pruebas de la API y revisión de tipos de las tres interfaces
set -euo pipefail
cd "$(dirname "$0")"
LOGS=.logs; mkdir -p "$LOGS"
[ -f .env ] && set -a && . ./.env && set +a
DB=${POSTGRES_DB:-sima}; USR=${POSTGRES_USER:-sima}; PASS=${POSTGRES_PASSWORD:-sima}

faltan() { echo "Falta $1. Ejecute scripts/instalar-herramientas.sh o revise el README."; exit 1; }

case "${1:-local}" in
  docker)
    command -v docker >/dev/null || faltan "Docker"
    exec docker compose up --build ;;
  pruebas)
    command -v dotnet >/dev/null || faltan ".NET 8 SDK"; command -v npm >/dev/null || faltan "Node.js 22"
    [ -d node_modules ] || npm install --no-audit --no-fund
    dotnet test api/Sima.Api.Tests
    npm run tipos
    exit 0 ;;
  local) ;;
  *) echo "Uso: $0 [local|docker|pruebas]"; exit 1 ;;
esac

command -v dotnet >/dev/null || faltan ".NET 8 SDK"
command -v npm >/dev/null || faltan "Node.js 22"

# PostgreSQL: si nadie escucha en 5432 y hay Docker, se levanta solo la base de datos
if ! (exec 3<>/dev/tcp/127.0.0.1/5432) 2>/dev/null; then
  command -v docker >/dev/null || faltan "PostgreSQL en el puerto 5432 (o Docker para levantarlo)"
  echo "Levantando PostgreSQL con Docker…"
  docker compose up -d db
  for _ in $(seq 1 30); do (exec 3<>/dev/tcp/127.0.0.1/5432) 2>/dev/null && break; sleep 1; done
fi

[ -d node_modules ] || npm install --no-audit --no-fund
export ConnectionStrings__Sima="Host=localhost;Port=5432;Database=$DB;Username=$USR;Password=$PASS"
export Ingesta__ApiKey="${SIMA_INGESTA_KEY:-dev-ingesta-key}"

PIDS=()
limpiar() { echo; echo "Deteniendo SIMA…"; kill "${PIDS[@]}" 2>/dev/null || true; wait 2>/dev/null || true; }
trap limpiar EXIT INT TERM

echo "Iniciando la API (importa el Excel y crea la base en el primer arranque)…"
dotnet run --project api/Sima.Api > "$LOGS/api.log" 2>&1 & PIDS+=($!)
for _ in $(seq 1 90); do curl -fs localhost:5080/salud >/dev/null 2>&1 && break; sleep 1; done
curl -fs localhost:5080/salud >/dev/null || { echo "La API no arrancó. Revise $LOGS/api.log"; exit 1; }

echo "Iniciando la web…"
npm run dev -w web > "$LOGS/web.log" 2>&1 & PIDS+=($!)

cat <<MSG

  SIMA v3 está funcionando
    Web de administración   http://localhost:3000     (ingrese con rrhh@manuandina.cl · Rrhh2026)
    API                      http://localhost:5080/salud
    Simulador de PLC         npm run plc:escritorio    (o  npm run plc  para verlo en el navegador, puerto 1420)
    App de terreno           npm run terreno:escritorio (o  npm run terreno, puerto 1421)

  Los registros quedan en $LOGS/. Presione Ctrl+C para detener todo.
MSG
wait
