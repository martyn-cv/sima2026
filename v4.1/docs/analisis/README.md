# Análisis funcional de SIMA · 64 cargos de Manufacturas Andina

Este análisis toma la base de datos única (`datos/SIMA_base_de_datos.xlsx`) como fuente y la convierte en requisitos
para SIMA Web, SIMA Desktop y SIMA PLC Simulator. Todos los datos de la empresa son **ficticios** (lo dice la hoja LEEME).

| Entregable | Documento |
|---|---|
| 1 · Análisis de la organización | este archivo, más abajo |
| 2 · Catálogo funcional de los 64 cargos | [CATALOGO_CARGOS.md](CATALOGO_CARGOS.md) (fichas A–I, jornada y flujo de información) |
| 3 · Matriz de permisos | [MATRIZ_PERMISOS.md](MATRIZ_PERMISOS.md) (propuesta, aplicaciones y diferencias con el servidor) |
| 4 · Diseño de dashboards | sección H de cada ficha del catálogo, y [DASHBOARDS.md](DASHBOARDS.md) para los componentes compartidos |
| 5 · Procesos interdepartamentales | [PROCESOS.md](PROCESOS.md) (flujos A a E con estados y aprobaciones) |
| 6 y 7 · Base de datos e integración | [DATOS_E_INTEGRACION.md](DATOS_E_INTEGRACION.md) |
| 8 y 9 · Plan y revisión del código | [PLAN_Y_REVISION.md](PLAN_Y_REVISION.md) |
| 10 · Implementación y pruebas | sección final de [PLAN_Y_REVISION.md](PLAN_Y_REVISION.md) |

## Cómo se construye

```
datos/SIMA_base_de_datos.xlsx ──(hoja Cargos, texto literal [E])──┐
docs/analisis/cargos/f01…f10.yaml ──(lo deducido [D] y lo propuesto [P])──┼─► generar.py ─► CATALOGO_CARGOS.md
api/Sima.Api/Servicios/Permisos.cs ──► matriz_vigente.py ─► datos/matriz_vigente.json ─┘            MATRIZ_PERMISOS.md
                                                                                                    catalogo.json (lo usan las apps)
```

```bash
cd v4.1 && python3 docs/analisis/matriz_vigente.py && python3 docs/analisis/generar.py
```

El generador valida que estén los 64 cargos, que cada ficha tenga todos sus campos y que cada módulo citado exista en el
catálogo de módulos (marcado como *existe*, *parcial* o *propuesto*). Así el documento no puede afirmar que algo existe
cuando no está implementado: el estado de cada módulo y de cada indicador está declarado y se revisa contra el código.

**Convenciones.** **[E]** texto del Excel · **[D]** deducido de las funciones del cargo · **[P]** propuesta nueva ·
**[V]** decisión que debe validar la empresa. Un indicador ⛔ no tiene fuente de datos en SIMA: la interfaz lo muestra
como «sin datos», nunca con un valor de relleno.

---

## Entregable 1 · Cómo funciona la organización

La planta tiene **64 cargos** en **10 familias** y **99 personas activas** (5 desvinculadas). Cada cargo trae del Excel su
**perfil SIMA** (18 perfiles distintos) y su **canal** (app = SIMA Desktop, web = SIMA Web). El perfil agrupa cargos
parecidos, pero no define lo que cada uno puede hacer: `finanzas_adm` reúne 8 cargos que van desde la gerencia
financiera hasta soporte TI y servicios generales; `operador` reúne 7 cargos de piso con tareas muy distintas (CNC,
ensamble, sala de control, grúa horquilla). Por eso los permisos se definen por **id_cargo** y el perfil queda solo como
agrupación.

| # | Familia | Cargos | Dotación (actual/objetivo) | Canal | Cómo contribuye |
|---|---|---|---|---|---|
| 1 | Dirección y gobierno | 5 | 5/5 | web | Fija estrategia, presupuesto, metas y prioridades; aprueba lo que excede a las áreas. |
| 2 | Producción y operación en piso | 10 | 36/40 | 9 app · 1 web | Fabrica: convierte el programa en unidades buenas, turno a turno. Es la familia más numerosa y la que más registra. |
| 3 | Ingeniería, procesos y automatización | 7 | 7/7 | 4 app · 3 web | Define cómo se fabrica y cuida el control de las máquinas (PLC, instrumentos, datos OT). |
| 4 | Mantenimiento y confiabilidad | 8 | 11/11 | app | Mantiene los equipos disponibles y seguros: planifica, ejecuta y verifica intervenciones; custodia repuestos. |
| 5 | Calidad, laboratorio y metrología | 5 | 7/7 | 3 app · 2 web | Decide si lo fabricado cumple y si las mediciones son confiables; retiene o libera lotes. |
| 6 | Planificación, abastecimiento y logística | 8 | 10/11 | 3 app · 5 web | Asegura que haya plan, material y despacho: de la demanda al cliente. |
| 7 | Personas y relaciones laborales | 6 | 6/6 | web | Contrata, forma, habilita, paga y desvincula. Dueña de la información más protegida. |
| 8 | Seguridad, salud y medioambiente | 5 | 7/7 | app | Controla riesgos, investiga eventos y prepara la respuesta a emergencias. |
| 9 | Finanzas, sistemas y apoyo | 6 | 6/6 | web | Controla dinero, pagos, sistemas y servicios auxiliares. |
| 10 | Comercial, cliente y producto | 4 | 4/4 | web | Trae la demanda, define el producto y evalúa proveedores. |

### Cadenas de valor que atraviesan las familias

1. **Demanda → producto despachado:** Comercial (61, 62) → Planificación (36, 37) → Compras y bodega (38–41) →
   Producción (6–15) → Calidad (31–34) → Despacho (42) → Finanzas (55–58). *Hoy SIMA cubre producción, calidad y
   despacho; faltan pedidos, materiales y compras* ([PLAN_Y_REVISION.md](PLAN_Y_REVISION.md)).
2. **Falla → equipo de vuelta en operación:** Operación (9–13) → Supervisión (7, 8) → Mantenimiento (23–30) →
   Automatización (18–20) → Producción. *Es la cadena más completa en SIMA 4.1, con dos brechas de control (H2 y H3).*
3. **Persona → puesto habilitado:** RR. HH. (44–49) → Cuentas (59) → Jefaturas (7, 23, 25) → Trabajador. *Cubierta en
   lo laboral; falta exigir habilitaciones por cargo al asignar trabajo (H5).*
4. **Peligro → control verificado:** Cualquier trabajador → Prevención (50–54) → Jefaturas → Gerencia de planta (3).
5. **Dato de máquina → indicador confiable:** PLC físico o simulado → Sistemas OT (22) → indicadores de todas las áreas.
   *SIMA marca cada lectura y evento con su origen; los indicadores deben mostrar esa marca (H8).*

### Qué significa esto para el diseño

- **Una sola base, muchos puntos de vista.** Las 10 familias trabajan sobre los mismos registros (orden de trabajo,
  orden de producción, lote, equipo, trabajador). Lo que cambia por cargo es qué ve, qué puede hacer y con qué alcance.
- **El canal del Excel es la regla de entrada.** 67 de las 99 cuentas activas usan SIMA Desktop (terreno) y 32 la web.
  Las jefaturas de terreno que necesitan informes usan Desktop como principal y la web como apoyo (propuesta en la matriz).
- **Las aprobaciones separan funciones.** Quien prepara no aprueba: remuneraciones (46 prepara, 55 o 4 aprueban), cambios
  de PLC (18/19 solicitan, 23 o 3 publican), lotes (33 retiene, 31 libera), OT (técnico ejecuta, supervisor verifica y
  libera el equipo).
