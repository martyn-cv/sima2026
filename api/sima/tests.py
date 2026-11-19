from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from . import models as m
from .management.commands.seed_demo import USUARIOS

CLAVES = {e: c for e, _, _, c in USUARIOS}
ROL_EMAIL = {r: e for e, r, _, _ in USUARIOS}


class Base(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", verbosity=0)

    def entrar(self, rol, canal=None):
        email = ROL_EMAIL[rol]
        r = self.client.post("/api/login/", {"email": email, "password": CLAVES[email], "canal": canal or m.Usuario.objects.get(username=email).canal},
                             content_type="application/json")
        self.assertEqual(r.status_code, 200, r.content)
        self.tok = {"HTTP_AUTHORIZATION": "Bearer " + r.json()["token"]}
        return r.json()

    def get(self, url, **kw):
        return self.client.get(url, **self.tok, **kw)

    def post(self, url, datos=None):
        return self.client.post(url, datos or {}, content_type="application/json", **self.tok)

    def patch(self, url, datos):
        return self.client.patch(url, datos, content_type="application/json", **self.tok)

    def ot1(self):
        return m.OrdenTrabajo.objects.get(titulo__startswith="Pérdida")


class Acceso(Base):
    def test_dominio_distinto_rechazado(self):
        r = self.client.post("/api/login/", {"email": "x@gmail.com", "password": "Tecnico2026"}, content_type="application/json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("@manuandina.cl", r.json()["error"])

    def test_usuario_no_autorizado_y_clave_mala(self):
        for email, clave in (("otro@manuandina.cl", "Cualquiera1"), ("tecnico@manuandina.cl", "mala")):
            r = self.client.post("/api/login/", {"email": email, "password": clave}, content_type="application/json")
            self.assertEqual(r.status_code, 401)

    def test_sin_token_no_hay_acceso(self):
        self.assertEqual(self.client.get("/api/me/").status_code, 401)
        self.assertEqual(self.client.get("/api/equipos/", HTTP_AUTHORIZATION="Bearer falso").status_code, 401)

    def test_cada_rol_entra_solo_por_su_canal(self):
        for rol, email in ROL_EMAIL.items():
            u = m.Usuario.objects.get(username=email)
            otro = "web" if u.canal == "app" else "app"
            r = self.client.post("/api/login/", {"email": email, "password": CLAVES[email], "canal": otro}, content_type="application/json")
            self.assertEqual(r.status_code, 403, rol)
            r = self.client.post("/api/login/", {"email": email, "password": CLAVES[email], "canal": u.canal}, content_type="application/json")
            self.assertEqual(r.status_code, 200, rol)

    def test_menu_distinto_por_rol(self):
        menus = {}
        for rol in ROL_EMAIL:
            menus[rol] = tuple(self.entrar(rol)["usuario"]["menu"])
        self.assertEqual(len(set(menus.values())), len(menus))   # ningún par de roles comparte el mismo menú
        self.assertIn("plcs", menus["ing_automatizacion"])
        self.assertIn("finanzas", menus["administrativo"])
        self.assertNotIn("finanzas", menus["ing_transporte"])

    def test_cors_solo_para_origenes_conocidos(self):
        r = self.client.options("/api/login/", HTTP_ORIGIN="http://localhost:3000")
        self.assertEqual(r["Access-Control-Allow-Origin"], "http://localhost:3000")
        r = self.client.options("/api/login/", HTTP_ORIGIN="http://malo.example")
        self.assertNotIn("Access-Control-Allow-Origin", r)


class Permisos(Base):
    def test_tecnico_no_ve_finanzas_ni_contratos(self):
        self.entrar("tecnico")
        for r in ("contratos", "movimientos", "procesos", "despachos"):
            self.assertEqual(self.get(f"/api/{r}/").status_code, 403, r)

    def test_operador_solo_ve_sus_reportes_y_no_ordenes(self):
        self.entrar("operador")
        self.assertEqual(self.get("/api/ordenes/").status_code, 403)
        self.assertEqual(self.get("/api/repuestos/").status_code, 403)
        for x in self.get("/api/reportes/").json()["resultados"]:
            self.assertEqual(x["operador_nombre"], m.Usuario.objects.get(username=ROL_EMAIL["operador"]).nombre)

    def test_administrativo_crea_contrato_ejecutivo_solo_lee(self):
        datos = {"trabajador": "Ana Pérez", "rut": "12.345.678-5", "cargo": "Analista", "area": "Finanzas", "tipo": "indefinido",
                 "fecha_inicio": "2026-01-05", "sueldo_bruto": 1200000}
        self.entrar("ejecutivo")
        self.assertEqual(self.post("/api/contratos/", datos).status_code, 403)
        self.assertEqual(self.get("/api/contratos/").status_code, 200)
        self.entrar("administrativo")
        r = self.post("/api/contratos/", datos)
        self.assertEqual(r.status_code, 201, r.content)

    def test_solo_automatizacion_edita_plc(self):
        plc = m.PLC.objects.get(nombre="PLC Caldera")
        self.entrar("ing_mecanico")
        self.assertEqual(self.patch(f"/api/plcs/{plc.pk}/", {"programa_version": "v9"}).status_code, 403)
        self.entrar("ing_automatizacion")
        self.assertEqual(self.patch(f"/api/plcs/{plc.pk}/", {"programa_version": "v1.9.5"}).status_code, 200)
        plc.refresh_from_db()
        self.assertEqual(plc.programa_version, "v1.9.5")

    def test_tecnico_solo_ve_informes_compartidos(self):
        priv = m.Informe.objects.create(titulo="Borrador", contenido="x", autor=m.Usuario.objects.get(username=ROL_EMAIL["ing_mantenimiento"]))
        self.entrar("tecnico")
        self.assertNotIn("Borrador", [i["titulo"] for i in self.get("/api/informes/").json()["resultados"]])
        self.assertEqual(self.get(f"/api/informes/{priv.pk}/").status_code, 404)

    def test_validacion_de_campos(self):
        self.entrar("administrativo")
        r = self.post("/api/movimientos/", {"tipo": "gasto", "categoria": "", "descripcion": "x", "monto": ""})
        self.assertEqual(r.status_code, 400)
        self.assertIn("monto", r.json()["campos"])


class Historias(Base):
    def test_h1_operador_reporta_tecnico_toma_operador_ve_estado(self):
        self.entrar("operador")
        eq = m.Equipo.objects.get(codigo="EXT-01")
        r = self.post("/api/reportes/", {"equipo": eq.pk, "descripcion": "Se calienta", "detiene_linea": False})
        self.assertEqual(r.status_code, 201)
        rid = r.json()["id"]
        self.entrar("tecnico")
        self.assertEqual(self.post(f"/api/reportes/{rid}/tomar/").status_code, 200)
        self.assertEqual(self.post(f"/api/reportes/{rid}/tomar/").status_code, 409)   # otro técnico ya no puede
        self.entrar("operador")
        estados = {x["id"]: x["estado_display"] for x in self.get("/api/reportes/").json()["resultados"]}
        self.assertEqual(estados[rid], "Tomado por un técnico")
        self.assertTrue(m.Notificacion.objects.filter(usuario__rol="operador", texto__contains="tomado").exists())

    def test_h1_reporte_incompleto_se_rechaza_y_foto_base64(self):
        self.entrar("operador")
        r = self.post("/api/reportes/", {"equipo": "", "descripcion": ""})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(set(r.json()["campos"]), {"equipo", "descripcion"})
        png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        r = self.post("/api/reportes/", {"equipo": m.Equipo.objects.first().pk, "descripcion": "con foto", "foto_b64": png, "foto_nombre": "placa.png"})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()["foto"].startswith("/api/media/reportes/"))
        self.assertEqual(self.get(r.json()["foto"]).status_code, 200)
        self.assertEqual(self.client.get(r.json()["foto"]).status_code, 401)   # sin sesión no se descarga

    def test_h2_historial_maximo_5_y_orden(self):
        self.entrar("tecnico")
        eq = m.Equipo.objects.get(codigo="INY-03")
        user = m.Usuario.objects.get(username=ROL_EMAIL["tecnico"])
        for i in range(6):
            m.OrdenTrabajo.objects.create(equipo=eq, titulo=f"Extra {i}", creado_por=user)
        h = self.get(f"/api/equipos/{eq.pk}/").json()["historial"]
        self.assertEqual(len(h), 5)
        self.assertEqual([x["fecha"] for x in h], sorted([x["fecha"] for x in h], reverse=True))
        vacio = m.Equipo.objects.get(codigo="CHI-01")
        self.assertEqual(self.get(f"/api/equipos/{vacio.pk}/").json()["historial"], [])
        self.assertEqual(self.get(f"/api/equipos/{vacio.pk}/").json()["manual"], "")

    def test_h3_reservar_solicitar_entregar(self):
        self.entrar("tecnico")
        sello = m.RepuestoOT.objects.get(ot=self.ot1(), repuesto__codigo="RP-0201")   # stock 5, pide 1
        self.assertTrue(self.get(f"/api/ordenes/{self.ot1().pk}/").json()["repuestos"][0]["suficiente"] in (True, False))
        self.assertEqual(self.post(f"/api/repuestos-ot/{sello.pk}/reservar/").status_code, 200)
        self.assertEqual(m.Repuesto.objects.get(codigo="RP-0201").stock, 4)
        self.assertEqual(self.post(f"/api/repuestos-ot/{sello.pk}/entregar/").status_code, 200)   # no descuenta dos veces
        sello.refresh_from_db()
        self.assertEqual((sello.estado, m.Repuesto.objects.get(codigo="RP-0201").stock), ("usado", 4))
        self.assertTrue(self.ot1().bitacora.filter(texto__contains="entregado").exists())
        self.assertEqual(self.post(f"/api/repuestos-ot/{sello.pk}/entregar/").status_code, 409)

    def test_h3_stock_insuficiente_se_solicita_y_no_se_reserva(self):
        self.entrar("tecnico")
        user = m.Usuario.objects.get(username=ROL_EMAIL["tecnico"])
        uso = m.RepuestoOT.objects.create(ot=self.ot1(), repuesto=m.Repuesto.objects.get(codigo="RP-0402"), cantidad=5, registrado_por=user)
        self.assertEqual(self.post(f"/api/repuestos-ot/{uso.pk}/reservar/").status_code, 400)
        self.assertEqual(m.Repuesto.objects.get(codigo="RP-0402").stock, 1)
        self.assertEqual(self.post(f"/api/repuestos-ot/{uso.pk}/solicitar/").status_code, 200)
        uso.refresh_from_db()
        self.assertEqual(uso.estado, "solicitado")

    def test_h3_consumo_por_equipo_en_rango(self):
        self.entrar("tecnico")
        hoy = timezone.localdate()
        r = self.get(f"/api/consumo/?desde={hoy - timedelta(days=1)}&hasta={hoy}").json()
        nombres = [e["equipo"] for e in r["equipos"]]
        self.assertIn("Inyectora 3 (pasillo norte)", nombres)
        self.assertNotIn("Caldera principal", nombres)       # su consumo fue hace 3 días
        r = self.get(f"/api/consumo/?desde={hoy - timedelta(days=10)}&hasta={hoy}").json()
        self.assertIn("Caldera principal", [e["equipo"] for e in r["equipos"]])
        self.assertEqual(r["total"], sum(e["total"] for e in r["equipos"]))

    def test_h4_bitacora_inalterable(self):
        b = m.Bitacora.objects.first()
        b.texto = "x"
        with self.assertRaises(PermissionError):
            b.save()
        with self.assertRaises(PermissionError):
            b.delete()

    def test_h4_traspaso_y_alerta_al_ingeniero_de_terreno(self):
        self.entrar("tecnico")
        self.assertIsNotNone(self.get(f"/api/ordenes/{self.ot1().pk}/").json()["traspaso"])
        self.entrar("ing_terreno")
        listas = self.get("/api/dashboard/").json()["listas"]
        alertas = next(l for l in listas if l["titulo"].startswith("Alertas"))
        self.assertTrue(any("sin avance" in i["etiqueta"] for i in alertas["items"]))

    def test_h5_registro_sin_conexion_no_duplica_y_conserva_hora(self):
        self.entrar("tecnico")
        hecho = (timezone.now() - timedelta(hours=2)).isoformat()
        datos = {"texto": "Diagnóstico sin señal", "horas": 2.5, "uid": "abc-123", "hecho_en": hecho}
        for _ in range(2):
            self.assertIn(self.post(f"/api/ordenes/{self.ot1().pk}/bitacora/", datos).status_code, (200, 201))
        regs = m.Bitacora.objects.filter(uid="abc-123")
        self.assertEqual(regs.count(), 1)
        self.assertLess(regs[0].creado, timezone.now() - timedelta(hours=1))

    def test_h5_reporte_offline_no_duplica(self):
        self.entrar("operador")
        d = {"equipo": m.Equipo.objects.first().pk, "descripcion": "sin señal", "uid": "rep-1", "hecho_en": (timezone.now() - timedelta(hours=1)).isoformat()}
        self.post("/api/reportes/", d)
        self.post("/api/reportes/", d)
        self.assertEqual(m.Reporte.objects.filter(uid="rep-1").count(), 1)

    def test_ot_cerrada_no_admite_registros(self):
        self.entrar("tecnico")
        ot = m.OrdenTrabajo.objects.get(titulo__startswith="Limpieza")
        self.assertEqual(self.post(f"/api/ordenes/{ot.pk}/bitacora/", {"texto": "tarde"}).status_code, 409)


class AvisosYPaneles(Base):
    def test_tecnico_avisa_y_notifica_a_ingenieros(self):
        self.entrar("tecnico")
        eq = m.Equipo.objects.get(codigo="COM-01")
        antes = m.Notificacion.objects.filter(usuario__rol="ing_terreno").count()
        r = self.post("/api/avisos/", {"tipo": "pendiente", "equipo": eq.pk, "texto": "Falta apretar pernos de la base"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(m.Notificacion.objects.filter(usuario__rol="ing_terreno").count(), antes + 1)
        self.entrar("ing_terreno")
        self.assertTrue(self.get("/api/me/").json()["no_leidas"] >= 1)
        self.assertEqual(self.patch(f"/api/avisos/{r.json()['id']}/", {"atendido": True}).status_code, 200)
        self.entrar("tecnico")
        self.assertTrue(m.Notificacion.objects.filter(usuario__rol="tecnico", texto__contains="atendido").exists())

    def test_operador_no_puede_enviar_avisos_a_ingenieros(self):
        self.entrar("operador")
        r = self.post("/api/avisos/", {"tipo": "pendiente", "equipo": 1, "texto": "x"})
        self.assertEqual(r.status_code, 403)

    def test_panel_responde_para_todos_los_roles_y_es_distinto(self):
        titulos = {}
        for rol in ROL_EMAIL:
            self.entrar(rol)
            d = self.get("/api/dashboard/").json()
            self.assertTrue(d["kpis"], rol)
            titulos[rol] = tuple(k["etiqueta"] for k in d["kpis"])
        self.assertEqual(len(set(titulos.values())), len(titulos))

    def test_panel_automatizacion_habla_de_plc(self):
        self.entrar("ing_automatizacion")
        d = self.get("/api/dashboard/").json()
        self.assertTrue(any("PLC" in k["etiqueta"] for k in d["kpis"]))

    def test_buscador_respeta_permisos(self):
        self.entrar("administrativo")
        self.assertTrue(any(x["tipo"] == "Contrato" for x in self.get("/api/buscar/?q=Jorge").json()["resultados"]))
        self.entrar("tecnico")
        self.assertFalse(any(x["tipo"] == "Contrato" for x in self.get("/api/buscar/?q=Jorge").json()["resultados"]))
        self.assertTrue(any(x["tipo"] == "Equipo" for x in self.get("/api/buscar/?q=Grande").json()["resultados"]))
        self.assertEqual(self.get("/api/buscar/?q=a").json()["resultados"], [])

    def test_calendario_y_indicadores(self):
        self.entrar("ejecutivo")
        self.assertIn("eventos", self.get("/api/calendario/").json())
        ind = self.get("/api/indicadores/").json()
        self.assertIn("disponibilidad", ind)
        self.entrar("operador")
        self.assertEqual(self.get("/api/indicadores/").status_code, 403)
