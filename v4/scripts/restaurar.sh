#!/bin/sh
# Restaura un respaldo en una base de datos NUEVA (no pisa la que está en uso).
#   ./scripts/restaurar.sh respaldos/sima-20261121-020000.dump sima_restaurada
# Después apunte la API a esa base (ConnectionStrings__Sima) o cámbiele el nombre a la original con la API detenida.
set -eu
[ $# -eq 2 ] || { echo "Uso: $0 archivo.dump nombre_de_la_base_nueva"; exit 1; }
: "${PGHOST:=localhost}" "${PGUSER:=sima}" "${PGPASSWORD:=sima}"
export PGHOST PGUSER PGPASSWORD
createdb "$2"
pg_restore --no-owner --dbname="$2" "$1"
echo "Restaurado en la base «$2»."
