import random
from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from . import models as m
from . import planta
from .management.commands.seed_demo import USUARIOS
from .perfiles import CARGO_PERFIL, PERFILES

CLAVES = {p: c for _, p, _, _, _, c in USUARIOS}
EMAIL = {p: e for e, p, _, _, _, _ in USUARIOS}


class Base(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", verbosity=0)

    def entrar(self, perfil, canal=None):
        u = m.Usuario.objects.get(username=EMAIL[perfil])
        r = self.client.post("/api/login/", {"email": u.username, "password": CLAVES[perfil], "canal": canal or u.canal}, content_type="application/json")
        self.assertEqual(r.status_code, 200, r.content)
        self.tok = {"HTTP_AUTHORIZATION": "Bearer " + r.json()["token"]}
        return r.json()

    def get(self, url, **kw):
        return self.client.get(url, **self.tok, **kw)

    def post(self, url, datos=None, **kw):
        return self.client.post(url, datos or {}, content_type="application/json", **self.tok, **kw)

    def patch(self, url, datos):
        return self.client.patch(url, datos, content_type="application/json", **self.tok)

    def equipo(self, codigo):
        return m.Equipo.objects.get(codigo=codigo)

    def ot_in3(self):
        return m.OrdenTrabajo.objects.get(titulo__startswith="Pérdida")


class Catalogo(Base):
    def test_los_informes_estan_completos(self):
        cuenta = {c: m.Ficha.objects.filter(categoria=c).count() for c, _ in m.Ficha.CATEGORIAS}
        self.assertEqual(cuenta, {"maquinaria": 10, "automatizacion": 12, "pieza": 9, "herramienta": 14})
        self.assertEqual(m.Cargo.objects.count(), 64)
        self.assertEqual(m.Cargo.objects.values("familia").distinct().count(), 10)
        self.assertFalse(m.Cargo.objects.filter(medir="").exists())

    def test_cada_cargo_tiene_perfil_y_cada_perfil_un_usuario(self):
        self.assertEqual(set(CARGO_PERFIL.values()), set(PERFILES))
        self.assertEqual(set(EMAIL), set(PERFILES))
        for u in m.Usuario.objects.exclude(cargo=None):
            self.assertEqual(u.rol, u.cargo.perfil)

    def test_usuario_nuevo_toma_el_perfil_de_su_cargo(self):
        u = m.Usuario.objects.create(username="nuevo@manuandina.cl", cargo=m.Cargo.objects.get(numero=41))   # bodeguero
        self.assertEqual(u.rol, "panol")

    def test_cada_maquina_tiene_ficha_y_sensores(self):
        for e in m.Equipo.objects.all():
            self.assertEqual(e.ficha.categoria, "maquinaria")
            self.assertGreaterEqual(e.sensores.count(), 2, e.codigo)


class Acceso(Base):
    def test_dominio_distinto_y_clave_mala(self):
        r = self.client.post("/api/login/", {"email": "x@gmail.com", "password": "Tecnico2026"}, content_type="application/json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/login/", {"email": "tecnico@manuandina.cl", "password": "mala"}, content_type="application/json")
        self.assertEqual(r.status_code, 401)

    def test_cada_perfil_entra_solo_por_su_canal(self):
        for perfil, p in PERFILES.items():
            otro = "web" if p["canal"] == "app" else "app"
            r = self.client.post("/api/login/", {"email": EMAIL[perfil], "password": CLAVES[perfil], "canal": otro}, content_type="application/json")
            self.assertEqual(r.status_code, 403, perfil)
            self.assertEqual(self.entrar(perfil)["usuario"]["canal"], p["canal"])

    def test_menu_distinto_por_perfil(self):
        menus = {p: tuple(self.entrar(p)["usuario"]["menu"]) + tuple(self.entrar(p)["usuario"]["extras"]) for p in PERFILES}
        self.assertEqual(len(set(menus.values())), len(menus))

    def test_cors_solo_origenes_conocidos(self):
        self.assertEqual(self.client.options("/api/login/", HTTP_ORIGIN="http://localhost:3000")["Access-Control-Allow-Origin"], "http://localhost:3000")
        self.assertNotIn("Access-Control-Allow-Origin", self.client.options("/api/login/", HTTP_ORIGIN="http://malo.example"))

    def test_sin_token_no_hay_acceso(self):
        self.assertEqual(self.client.get("/api/me/").status_code, 401)


class Permisos(Base):
    def test_tecnico_no_ve_finanzas_ni_contratos(self):
        self.entrar("tecnico")
        for r in ("contratos", "movimientos", "despachos", "procesos"):
            self.assertEqual(self.get(f"/api/{r}/").status_code, 403, r)

    def test_operador_solo_ve_sus_reportes(self):
        self.entrar("operador")
        self.assertEqual(self.get("/api/ordenes/").status_code, 403)
        nombre = m.Usuario.objects.get(username=EMAIL["operador"]).nombre
        for x in self.get("/api/reportes/").json()["resultados"]:
            self.assertEqual(x["operador_nombre"], nombre)

    def test_rrhh_crea_contrato_gerencia_solo_lee(self):
        datos = {"trabajador": "Ana Pérez", "rut": "12.345.678-5", "cargo": "Analista", "area": "Finanzas", "tipo": "indefinido", "fecha_inicio": "2026-01-05", "sueldo_bruto": 1200000}
        self.entrar("gerencia")
        self.assertEqual(self.post("/api/contratos/", datos).status_code, 403)
        self.assertEqual(self.get("/api/contratos/").status_code, 200)
        self.entrar("rrhh")
        self.assertEqual(self.post("/api/contratos/", datos).status_code, 201)

    def test_solo_automatizacion_edita_plc(self):
        plc = m.PLC.objects.get(nombre="PLC Compresor")
        self.entrar("jefe_mant")
        self.assertEqual(self.patch(f"/api/plcs/{plc.pk}/", {"programa_version": "v9"}).status_code, 403)
        self.entrar("ing_automatizacion")
        self.assertEqual(self.patch(f"/api/plcs/{plc.pk}/", {"programa_version": "v1.2.1"}).status_code, 200)

    def test_informes_privados_no_los_ve_un_tecnico(self):
        priv = m.Informe.objects.create(titulo="Borrador", contenido="x", autor=m.Usuario.objects.get(username=EMAIL["jefe_mant"]))
        self.entrar("tecnico")
        self.assertEqual(self.get(f"/api/informes/{priv.pk}/").status_code, 404)

    def test_validacion_de_campos(self):
        self.entrar("finanzas_adm")
        r = self.post("/api/movimientos/", {"tipo": "gasto", "categoria": "", "descripcion": "x", "monto": ""})
        self.assertEqual(r.status_code, 400)
        self.assertIn("monto", r.json()["campos"])


class Historias(Base):
    def test_h1_operador_reporta_tecnico_toma_y_ve_estado(self):
        self.entrar("operador")
        eq = self.equipo("TC-01")
        r = self.post("/api/reportes/", {"equipo": eq.pk, "descripcion": "Vibra mucho", "detiene_linea": False})
        self.assertEqual(r.status_code, 201)
        rid = r.json()["id"]
        self.entrar("tecnico")
        t = self.post(f"/api/reportes/{rid}/tomar/")
        self.assertEqual(t.status_code, 200)
        self.assertEqual(self.post(f"/api/reportes/{rid}/tomar/").status_code, 409)
        self.assertEqual(m.OrdenTrabajo.objects.get(pk=t.json()["orden_id"]).estado, "abierta")   # falta el bloqueo antes de intervenir
        self.entrar("operador")
        self.assertEqual({x["id"]: x["estado_display"] for x in self.get("/api/reportes/").json()["resultados"]}[rid], "Tomado por un técnico")

    def test_h1_reporte_incompleto_y_foto_base64(self):
        self.entrar("operador")
        r = self.post("/api/reportes/", {"equipo": "", "descripcion": ""})
        self.assertEqual(set(r.json()["campos"]), {"equipo", "descripcion"})
        png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        r = self.post("/api/reportes/", {"equipo": self.equipo("TC-01").pk, "descripcion": "con foto", "foto_b64": png, "foto_nombre": "placa.png"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.get(r.json()["foto"]).status_code, 200)
        self.assertEqual(self.client.get(r.json()["foto"]).status_code, 401)

    def test_h2_ficha_con_historial_maximo_5_y_guia_de_fallas(self):
        self.entrar("tecnico")
        eq = self.equipo("IN-03")
        u = m.Usuario.objects.get(username=EMAIL["tecnico"])
        for i in range(6):
            m.OrdenTrabajo.objects.create(equipo=eq, titulo=f"Extra {i}", creado_por=u)
        d = self.get(f"/api/equipos/{eq.pk}/").json()
        self.assertEqual(len(d["historial"]), 5)
        self.assertIn("Boquilla obstruida", d["ficha"]["fallas"])           # del catálogo técnico
        self.assertEqual(d["manual"], "")
        self.assertTrue(d["sensores"])

    def test_h3_reservar_solicitar_entregar_y_consumo(self):
        self.entrar("tecnico")
        kit = m.RepuestoOT.objects.get(ot=self.ot_in3(), repuesto__codigo="RP-0202")
        stock = m.Repuesto.objects.get(codigo="RP-0202").stock
        self.assertEqual(self.post(f"/api/repuestos-ot/{kit.pk}/reservar/").status_code, 200)
        self.assertEqual(m.Repuesto.objects.get(codigo="RP-0202").stock, stock - 1)
        self.assertEqual(self.post(f"/api/repuestos-ot/{kit.pk}/entregar/").status_code, 200)
        self.assertEqual(m.Repuesto.objects.get(codigo="RP-0202").stock, stock - 1)   # no descuenta dos veces
        u = m.Usuario.objects.get(username=EMAIL["tecnico"])
        falta = m.RepuestoOT.objects.create(ot=self.ot_in3(), repuesto=m.Repuesto.objects.get(codigo="RP-0702"), cantidad=5, registrado_por=u)
        self.assertEqual(self.post(f"/api/repuestos-ot/{falta.pk}/reservar/").status_code, 400)
        self.assertEqual(self.post(f"/api/repuestos-ot/{falta.pk}/solicitar/").status_code, 200)
        hoy = timezone.localdate()
        r = self.get(f"/api/consumo/?desde={hoy - timedelta(days=1)}&hasta={hoy}").json()
        self.assertIn("Inyectora 3 (pasillo norte)", [e["equipo"] for e in r["equipos"]])

    def test_h4_bitacora_inalterable_y_sin_duplicados(self):
        b = m.Bitacora.objects.first()
        b.texto = "x"
        with self.assertRaises(PermissionError):
            b.save()
        with self.assertRaises(PermissionError):
            b.delete()
        self.entrar("tecnico")
        datos = {"texto": "Diagnóstico sin señal", "horas": 2.5, "uid": "abc-123", "hecho_en": (timezone.now() - timedelta(hours=2)).isoformat()}
        for _ in range(2):
            self.assertIn(self.post(f"/api/ordenes/{self.ot_in3().pk}/bitacora/", datos).status_code, (200, 201))
        regs = m.Bitacora.objects.filter(uid="abc-123")
        self.assertEqual(regs.count(), 1)
        self.assertLess(regs[0].creado, timezone.now() - timedelta(hours=1))

    def test_h4_alerta_traspaso_y_borrador(self):
        self.entrar("supervisor_mant")
        listas = {l["titulo"]: l for l in self.get("/api/dashboard/").json()["listas"]}
        self.assertTrue(any("sin avance" in i["etiqueta"] for i in listas["Órdenes sin avance"]["items"]))
        self.entrar("supervisor_turno")
        b = self.get("/api/traspaso/borrador/").json()
        self.assertEqual(len(b["items_revision"]), 6)
        self.assertTrue(b["resumen"]["ordenes"] and b["resumen"]["equipos_fuera_servicio"])
        r = self.post("/api/traspasos/", {"turno": "A", "resumen": b["resumen"], "notas": "Entrego con 2 equipos detenidos", "responsables": "Camila Rojas", "uid": "tr-1"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.post("/api/traspasos/", {"turno": "A", "resumen": {}, "uid": "tr-1"}).status_code, 200)
        self.assertEqual(m.TraspasoTurno.objects.filter(uid="tr-1").count(), 1)

    def test_ot_cerrada_no_admite_registros(self):
        self.entrar("tecnico")
        ot = m.OrdenTrabajo.objects.get(titulo__startswith="Cambio de elemento")
        self.assertEqual(self.post(f"/api/ordenes/{ot.pk}/bitacora/", {"texto": "tarde"}).status_code, 409)


class SeguridadYOperacion(Base):
    def test_iniciar_una_ot_exige_bloqueo_y_etiquetado(self):
        self.entrar("tecnico")
        ot = m.OrdenTrabajo.objects.get(titulo__startswith="Línea detenida")
        r = self.post(f"/api/ordenes/{ot.pk}/estado/", {"estado": "en_curso"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("loto", r.json()["campos"])
        self.assertEqual(self.post(f"/api/ordenes/{ot.pk}/estado/", {"estado": "en_curso", "loto": True}).status_code, 200)
        ot.refresh_from_db()
        self.assertIsNotNone(ot.loto_en)
        self.assertTrue(ot.bitacora.filter(texto__contains="LOTO").exists())
        self.assertEqual(ot.equipo.estado, "en_mantencion")

    def test_cerrar_exige_retirar_bloqueo_y_devuelve_el_equipo_a_operar(self):
        self.entrar("tecnico")
        ot = self.ot_in3()
        self.assertEqual(self.post(f"/api/ordenes/{ot.pk}/estado/", {"estado": "cerrada"}).status_code, 400)
        self.assertEqual(self.post(f"/api/ordenes/{ot.pk}/estado/", {"estado": "cerrada", "retiro_loto": True}).status_code, 200)
        self.assertEqual(self.equipo("IN-03").estado, "operando")
        self.assertFalse(self.equipo("IN-03").paradas.filter(fin__isnull=True).exists())

    def test_herramientas_retirar_devolver_y_calibracion_vencida(self):
        self.entrar("tecnico")
        h = m.Herramienta.objects.filter(estado="disponible", proxima_calibracion=None).first()
        self.assertEqual(self.post(f"/api/herramientas/{h.pk}/retirar/").status_code, 200)
        self.assertEqual(self.post(f"/api/herramientas/{h.pk}/retirar/").status_code, 409)
        self.assertEqual(self.post(f"/api/herramientas/{h.pk}/devolver/").status_code, 200)
        v = m.Herramienta.objects.filter(estado="disponible", proxima_calibracion__lt=timezone.localdate()).first()
        self.assertEqual(self.post(f"/api/herramientas/{v.pk}/retirar/").status_code, 409)       # calibración vencida
        self.entrar("instrumentacion")
        self.assertEqual(self.post(f"/api/herramientas/{v.pk}/enviar_calibracion/").status_code, 200)
        self.assertEqual(self.post(f"/api/herramientas/{v.pk}/calibrada/").status_code, 200)
        v.refresh_from_db()
        self.assertGreater(v.proxima_calibracion, timezone.localdate())

    def test_rutina_sin_conexion_no_se_duplica(self):
        self.entrar("tecnico")
        p = m.PlantillaRutina.objects.get(nombre="Inspección del equipo por turno")
        d = {"plantilla": p.pk, "equipo": self.equipo("PH-01").pk, "items_ok": [True, True, False, True, True], "observacion": "Fuga leve", "uid": "rut-1"}
        self.assertEqual(self.post("/api/ejecuciones/", d).status_code, 201)
        self.assertEqual(self.post("/api/ejecuciones/", d).status_code, 200)
        self.assertEqual(m.EjecucionRutina.objects.filter(uid="rut-1").count(), 1)
        self.assertFalse(m.EjecucionRutina.objects.get(uid="rut-1").completa)

    def test_incidente_notifica_a_prevencion(self):
        self.entrar("operador")
        r = self.post("/api/incidentes/", {"tipo": "condicion_insegura", "descripcion": "Cable suelto cerca del torno", "ubicacion": "Nave 1"})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(m.Notificacion.objects.filter(usuario__rol="prevencion", texto__contains="Cable suelto").exists())
        self.entrar("prevencion")
        self.assertEqual(self.patch(f"/api/incidentes/{r.json()['id']}/", {"estado": "en_investigacion"}).status_code, 200)

    def test_parada_manual_detiene_y_cierra_el_equipo(self):
        self.entrar("supervisor_turno")
        eq = self.equipo("TC-02")
        r = self.post("/api/paradas/", {"equipo": eq.pk, "inicio": timezone.now().isoformat(), "motivo": "falta_material", "nota": "Sin barra de acero"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.equipo("TC-02").estado, "detenido")
        self.assertEqual(self.patch(f"/api/paradas/{r.json()['id']}/", {"fin": timezone.now().isoformat()}).status_code, 200)
        self.assertEqual(self.equipo("TC-02").estado, "operando")


class Telemetria(Base):
    def test_una_falla_simulada_llega_a_alarma_detiene_y_notifica(self):
        eq = self.equipo("CP-01")
        s = m.Sensor.objects.get(equipo=eq, variable="temp_descarga")
        s.deriva = 0.9
        s.save()
        rng = random.Random(3)
        for _ in range(30):
            planta.tick(rng, prob_falla=0)
        eq.refresh_from_db()
        self.assertEqual(eq.estado, "alarma")
        self.assertTrue(m.Alarma.objects.filter(equipo=eq, nivel="alarma", fin__isnull=True).exists())
        self.assertTrue(eq.paradas.filter(fin__isnull=True, automatica=True).exists())
        self.assertTrue(m.Notificacion.objects.filter(usuario__rol="supervisor_turno", nivel="alarma").exists())

    def test_cerrar_la_ot_normaliza_la_falla(self):
        eq = self.equipo("CP-01")
        m.Sensor.objects.filter(equipo=eq).update(deriva=1)
        for _ in range(20):
            planta.tick(random.Random(5), prob_falla=0)
        self.assertEqual(self.equipo("CP-01").estado, "alarma")
        self.entrar("tecnico")
        u = m.Usuario.objects.get(username=EMAIL["tecnico"])
        ot = m.OrdenTrabajo.objects.create(equipo=eq, titulo="Alta temperatura", creado_por=u, asignado_a=u)
        self.post(f"/api/ordenes/{ot.pk}/estado/", {"estado": "en_curso", "loto": True})
        self.post(f"/api/ordenes/{ot.pk}/estado/", {"estado": "cerrada", "retiro_loto": True})
        eq.refresh_from_db()
        self.assertEqual(eq.estado, "operando")
        self.assertFalse(m.Alarma.objects.filter(equipo=eq, fin__isnull=True).exists())
        self.assertEqual(m.Sensor.objects.filter(equipo=eq, deriva__gt=0).count(), 0)

    def test_ingesta_externa_con_clave(self):
        datos = {"lecturas": [{"equipo": "BC-01", "variable": "vibracion", "valor": 8.4}, {"equipo": "NO-EXISTE", "variable": "x", "valor": 1}]}
        self.assertEqual(self.client.post("/api/telemetria/ingesta/", datos, content_type="application/json").status_code, 401)
        r = self.client.post("/api/telemetria/ingesta/", datos, content_type="application/json", HTTP_X_API_KEY="dev-ingesta-sima")
        self.assertEqual((r.json()["aceptadas"], len(r.json()["rechazadas"])), (1, 1))
        self.assertEqual(self.equipo("BC-01").estado, "alarma")     # 8,4 mm/s supera el umbral de alarma

    def test_resumen_y_serie_para_el_mapa_y_el_monitor(self):
        self.entrar("operador")
        d = self.get("/api/telemetria/resumen/").json()
        self.assertEqual(d["total"], 15)
        self.assertTrue(all(e["sensores"] and "icono" in e for e in d["equipos"]))
        s = self.get(f"/api/telemetria/{self.equipo('CP-01').pk}/serie/?minutos=30").json()
        self.assertTrue(s["series"][0]["puntos"])


class Indicadores(Base):
    def test_los_10_indicadores_del_informe_tienen_serie_y_meta(self):
        self.entrar("gerencia")
        ks = self.get("/api/kpis/").json()["kpis"]
        self.assertEqual(len(ks), 10)
        for k in ks:
            self.assertEqual(len(k["serie"]), 6, k["clave"])
            self.assertIsNotNone(k["valor"], k["clave"])
        oee = next(k for k in ks if k["clave"] == "oee")
        self.assertTrue(40 < oee["valor"] < 95, oee["valor"])

    def test_el_oee_es_disponibilidad_por_rendimiento_por_calidad(self):
        from . import kpis
        hoy = timezone.localdate()
        r = m.RegistroProduccion.objects.filter(fecha__gte=hoy - timedelta(days=30))
        pl, pa = sum(x.minutos_planificados for x in r), sum(x.minutos_parada for x in r)
        ideal, prod, buenas = (sum(getattr(x, c) for x in r) for c in ("ideal", "producidas", "buenas"))
        esperado = round(100 * ((pl - pa) / pl) * (prod / ideal) * (buenas / prod), 1)
        self.assertEqual(kpis.calcular("oee", hoy - timedelta(days=30), hoy), esperado)

    def test_ingesta_de_mediciones_desde_erp(self):
        r = self.client.post("/api/kpis/ingesta/", {"mediciones": [{"clave": "ausentismo", "periodo": "2026-10-15", "valor": 2.9}]}, content_type="application/json", HTTP_X_API_KEY="dev-ingesta-sima")
        self.assertEqual(r.json()["guardadas"], 1)
        self.assertEqual(m.MedicionKPI.objects.get(clave="ausentismo", periodo="2026-10-01").valor, 2.9)

    def test_panel_responde_a_todos_los_perfiles_y_es_distinto(self):
        titulos = {}
        for perfil in PERFILES:
            self.entrar(perfil)
            d = self.get("/api/dashboard/").json()
            self.assertTrue(d["kpis"], perfil)
            titulos[perfil] = tuple(k["etiqueta"] for k in d["kpis"])
        self.assertEqual(len(set(titulos.values())), len(titulos))

    def test_mi_cargo_trae_el_cargo_del_informe_y_sus_indicadores(self):
        self.entrar("supervisor_turno")
        d = self.get("/api/mi-cargo/").json()
        self.assertEqual(d["cargo"]["nombre"], "Supervisor/a de turno")
        self.assertIn("Unidades buenas/turno", d["cargo"]["medir"])
        self.assertEqual(len(d["rutina_dia"]), 6)
        self.assertEqual(len(d["checklist"]["items"]), 6)
        self.assertTrue(d["kpis"])

    def test_buscador_respeta_permisos(self):
        self.entrar("finanzas_adm")
        self.assertTrue(any(x["tipo"] == "Contrato" for x in self.get("/api/buscar/?q=Jorge").json()["resultados"]))
        self.entrar("tecnico")
        self.assertFalse(any(x["tipo"] == "Contrato" for x in self.get("/api/buscar/?q=Jorge").json()["resultados"]))
        self.assertTrue(any(x["tipo"] == "Equipo" for x in self.get("/api/buscar/?q=Inyectora").json()["resultados"]))
        self.assertTrue(any(x["tipo"] == "Catálogo técnico" for x in self.get("/api/buscar/?q=torquímetro").json()["resultados"]))
        self.assertEqual(self.get("/api/buscar/?q=a").json()["resultados"], [])

    def test_referencia_del_informe(self):
        self.entrar("operador")
        self.assertEqual(len(self.get("/api/referencia/raci/").json()["raci"]["filas"]), 7)
        self.assertEqual(self.get("/api/referencia/nada/").status_code, 404)
