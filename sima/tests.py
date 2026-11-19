from datetime import timedelta
from decimal import Decimal

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Bitacora, OrdenTrabajo, Repuesto, RepuestoOT, Reporte, Informe, Usuario

CLAVES = {"tecnico@manuandina.cl": "Tecnico2026", "ingeniero@manuandina.cl": "Ingeniero2026",
          "operador@manuandina.cl": "Operador2026"}


class Base(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", verbosity=0)

    def entrar(self, email):
        self.client.logout()
        self.client.post(reverse("login"), {"email": email, "password": CLAVES[email]})

    def ot1(self):
        return OrdenTrabajo.objects.get(titulo__startswith="Pérdida")


class Acceso(Base):
    def test_dominio_distinto_rechazado(self):
        r = self.client.post(reverse("login"), {"email": "x@gmail.com", "password": "Tecnico2026"})
        self.assertContains(r, "@manuandina.cl")
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_usuario_no_autorizado_y_clave_mala(self):
        for email, clave in (("otro@manuandina.cl", "Cualquiera1"), ("tecnico@manuandina.cl", "mala")):
            r = self.client.post(reverse("login"), {"email": email, "password": clave})
            self.assertContains(r, "incorrectos")

    def test_sin_sesion_va_al_login(self):
        self.assertEqual(self.client.get(reverse("inicio")).status_code, 302)

    def test_permisos_por_rol(self):
        self.entrar("tecnico@manuandina.cl")
        self.assertEqual(self.client.get(reverse("plan_lista")).status_code, 403)
        self.assertEqual(self.client.get(reverse("repuesto_lista")).status_code, 200)
        self.entrar("operador@manuandina.cl")
        for n in ("repuesto_lista", "ot_lista", "nota_lista", "plan_lista", "consumo"):
            self.assertEqual(self.client.get(reverse(n)).status_code, 403, n)
        self.entrar("ingeniero@manuandina.cl")
        self.assertEqual(self.client.get(reverse("plan_lista")).status_code, 200)

    def test_tecnico_solo_ve_informes_compartidos(self):
        priv = Informe.objects.create(titulo="Borrador", contenido="x", autor=Usuario.objects.get(username="ingeniero@manuandina.cl"))
        self.entrar("tecnico@manuandina.cl")
        self.assertNotContains(self.client.get(reverse("informe_lista")), "Borrador")
        self.assertEqual(self.client.get(reverse("informe_detalle", args=[priv.pk])).status_code, 404)


class Historias(Base):
    def test_h1_operador_reporta_tecnico_toma_operador_ve_estado(self):
        self.entrar("operador@manuandina.cl")
        r = self.client.get(reverse("aviso_nuevo"))
        self.assertContains(r, "La Grande · Línea 1")  # nombre habitual + lugar
        eq = Reporte.objects.first().equipo_id
        self.client.post(reverse("aviso_nuevo"), {"equipo": eq, "descripcion": "Se calienta"})
        aviso = Reporte.objects.get(descripcion="Se calienta")
        self.entrar("tecnico@manuandina.cl")
        self.client.post(reverse("aviso_tomar", args=[aviso.pk]))
        self.entrar("operador@manuandina.cl")
        self.assertContains(self.client.get(reverse("mis_reportes")), "Tomado por un técnico")

    def test_h1_aviso_incompleto_se_rechaza(self):
        self.entrar("operador@manuandina.cl")
        n = Reporte.objects.count()
        r = self.client.post(reverse("aviso_nuevo"), {"equipo": "", "descripcion": ""})
        self.assertEqual(Reporte.objects.count(), n)
        self.assertContains(r, "obligatorio")

    def test_h2_historial_maximo_5_y_vacio(self):
        from .models import Equipo
        self.entrar("tecnico@manuandina.cl")
        eq = Equipo.objects.get(codigo="INY-03")
        for i in range(6):
            OrdenTrabajo.objects.create(equipo=eq, titulo=f"Extra {i}", creado_por=Usuario.objects.first())
        r = self.client.get(reverse("equipo_detalle", args=[eq.pk]))
        self.assertEqual(len(r.context["historial"]), 5)
        self.assertContains(r, "Sin manual disponible")
        vacio = Equipo.objects.get(codigo="CHI-01")
        self.assertContains(self.client.get(reverse("equipo_detalle", args=[vacio.pk])), "Sin historial registrado")

    def test_h3_reservar_solicitar_entregar(self):
        self.entrar("tecnico@manuandina.cl")
        ot = self.ot1()
        sello = RepuestoOT.objects.get(ot=ot, repuesto__codigo="RP-0201")   # stock 5, pide 1
        self.client.post(reverse("ot_repuesto_accion", args=[sello.pk, "reservar"]))
        sello.refresh_from_db()
        self.assertEqual(sello.estado, "reservado")
        self.assertEqual(Repuesto.objects.get(codigo="RP-0201").stock, 4)
        self.client.post(reverse("ot_repuesto_accion", args=[sello.pk, "entregar"]))  # no descuenta dos veces
        sello.refresh_from_db()
        self.assertEqual((sello.estado, Repuesto.objects.get(codigo="RP-0201").stock), ("usado", 4))
        self.assertTrue(ot.bitacora.filter(texto__contains="entregado").exists())

    def test_h3_stock_insuficiente_se_solicita_y_no_se_reserva(self):
        self.entrar("tecnico@manuandina.cl")
        ot = self.ot1()
        res = RepuestoOT.objects.create(ot=ot, repuesto=Repuesto.objects.get(codigo="RP-0402"), cantidad=5,
                                        registrado_por=Usuario.objects.first())
        self.client.post(reverse("ot_repuesto_accion", args=[res.pk, "reservar"]))
        res.refresh_from_db()
        self.assertEqual((res.estado, Repuesto.objects.get(codigo="RP-0402").stock), ("requerido", 1))
        self.client.post(reverse("ot_repuesto_accion", args=[res.pk, "solicitar"]))
        res.refresh_from_db()
        self.assertEqual(res.estado, "solicitado")
        self.assertContains(self.client.get(reverse("ot_detalle", args=[ot.pk])), "Solicitado")

    def test_h3_consumo_rango(self):
        self.entrar("tecnico@manuandina.cl")
        hoy = timezone.localdate()
        r = self.client.get(reverse("consumo"), {"desde": hoy - timedelta(days=1), "hasta": hoy})
        self.assertContains(r, "Inyectora 3")
        self.assertNotContains(r, "Caldera principal")   # su consumo fue hace 3 días: fuera del rango
        r = self.client.get(reverse("consumo"), {"desde": hoy - timedelta(days=10), "hasta": hoy})
        self.assertContains(r, "Caldera principal")

    def test_h4_bitacora_inalterable(self):
        b = Bitacora.objects.first()
        b.texto = "x"
        with self.assertRaises(PermissionError):
            b.save()
        with self.assertRaises(PermissionError):
            b.delete()

    def test_h4_traspaso_destacado_y_alerta_al_ingeniero(self):
        self.entrar("tecnico@manuandina.cl")
        self.assertContains(self.client.get(reverse("ot_detalle", args=[self.ot1().pk])), "Nota de traspaso")
        self.entrar("ingeniero@manuandina.cl")
        self.assertContains(self.client.get(reverse("inicio")), "horas sin avance")

    def test_h4_ot_equipo_no_critico_o_reciente_no_alerta(self):
        ot = self.ot1()
        Bitacora.objects.create(ot=ot, autor=Usuario.objects.first(), texto="avance")
        self.assertFalse(OrdenTrabajo.objects.get(pk=ot.pk).sin_avance)

    def test_h5_registro_sin_conexion_no_duplica_y_conserva_hora(self):
        self.entrar("tecnico@manuandina.cl")
        ot = self.ot1()
        hecho = (timezone.now() - timedelta(hours=2)).isoformat()
        datos = {"texto": "Diagnóstico sin señal", "horas": "2.5", "uid": "abc-123", "hecho_en": hecho}
        for _ in range(2):   # el mismo registro llega dos veces (respuesta perdida)
            r = self.client.post(reverse("ot_bitacora", args=[ot.pk]), datos, headers={"X-Requested-With": "fetch"})
            self.assertEqual(r.status_code, 200)
        regs = Bitacora.objects.filter(uid="abc-123")
        self.assertEqual(regs.count(), 1)
        self.assertEqual(regs[0].horas, Decimal("2.50"))
        self.assertLess(regs[0].creado, timezone.now() - timedelta(hours=1))

    def test_ot_cerrada_no_admite_registros(self):
        self.entrar("tecnico@manuandina.cl")
        ot = OrdenTrabajo.objects.get(titulo__startswith="Limpieza")
        r = self.client.post(reverse("ot_bitacora", args=[ot.pk]), {"texto": "tarde"}, headers={"X-Requested-With": "fetch"})
        self.assertEqual(r.status_code, 409)

    def test_ingeniero_comparte_informe(self):
        self.entrar("ingeniero@manuandina.cl")
        self.client.post(reverse("informe_nuevo"), {"titulo": "Plan lubricación", "contenido": "d", "compartido": "on"})
        self.entrar("tecnico@manuandina.cl")
        self.assertContains(self.client.get(reverse("informe_lista")), "Plan lubricación")
