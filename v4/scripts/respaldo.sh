#!/bin/sh
# Respaldo de la base de datos de SIMA con pg_dump (formato comprimido).
#   ./scripts/respaldo.sh [carpeta]        usa PGHOST, PGUSER, PGPASSWORD y PGDATABASE (por defecto, la base local de pruebas)
# Conserva los últimos RESPALDOS_DIAS días (14 por defecto).
set -eu
DESTINO="${1:-./respaldos}"
: "${PGHOST:=localhost}" "${PGUSER:=sima}" "${PGPASSWORD:=sima}" "${PGDATABASE:=sima_v4}" "${RESPALDOS_DIAS:=14}"
export PGHOST PGUSER PGPASSWORD PGDATABASE
mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/sima-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --file="$ARCHIVO"
echo "Respaldo guardado: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"
find "$DESTINO" -name 'sima-*.dump' -mtime +"$RESPALDOS_DIAS" -delete
