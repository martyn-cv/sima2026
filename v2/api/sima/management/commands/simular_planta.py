"""Simula la planta: lecturas de sensores, fallas que se desarrollan, alarmas y paradas automáticas.
Uso:  python manage.py simular_planta                 (ciclo continuo, cada 3 s)
      python manage.py simular_planta --una-vez       (un solo paso)
"""
import random
import time

from django.core.management.base import BaseCommand

from sima import planta


class Command(BaseCommand):
    help = "Simula la telemetría de la planta."

    def add_arguments(self, parser):
        parser.add_argument("--intervalo", type=float, default=3.0, help="Segundos entre lecturas")
        parser.add_argument("--una-vez", action="store_true")
        parser.add_argument("--prob-falla", type=float, default=0.01, help="Probabilidad de que empiece una falla en cada paso")

    def handle(self, *a, intervalo, una_vez, prob_falla, **o):
        rng, n = random.Random(), 0
        self.stdout.write(f"Simulador de planta activo (cada {intervalo:g} s). Detener con Ctrl+C.")
        while True:
            planta.tick(rng, prob_falla=prob_falla)
            n += 1
            if n % 200 == 0:
                planta.purgar()
            if una_vez:
                break
            time.sleep(intervalo)
