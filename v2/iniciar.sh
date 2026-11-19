#!/bin/sh
# Inicia SIMA (API + web + app) en Linux o macOS. Usa SQLite; para PostgreSQL use docker compose.
set -e
cd "$(dirname "$0")"
[ -d api/.venv ] || python3 -m venv api/.venv
. api/.venv/bin/activate
pip install -q -r api/requirements-local.txt
export DJANGO_DEBUG=1
(cd api && python manage.py migrate -v0 && python manage.py seed_demo)
trap 'kill 0' EXIT INT TERM
(cd api && python manage.py runserver 8000 --noreload) &
(cd api && python manage.py simular_planta) &
python tools/serve.py &
echo ""
echo "SIMA v2 listo (con simulador de planta):  web http://localhost:3000   app http://localhost:3001   API http://localhost:8000"
wait
