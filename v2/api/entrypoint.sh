#!/bin/sh
set -e
python manage.py migrate --noinput
# Carga el catálogo de los informes, los usuarios por perfil y la planta de demostración la primera vez. SIMA_SEED=0 para omitirlo.
if [ "${SIMA_SEED:-1}" = "1" ]; then python manage.py seed_demo; fi
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 --access-logfile -
