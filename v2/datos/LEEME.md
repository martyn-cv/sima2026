# SIMA · base de datos única (Excel)

`SIMA_base_de_datos.xlsx` es el modelo de datos único para la web de administración y la app de terreno (móvil y escritorio). Está pensado para importarse después a PostgreSQL a través de la API de Django.

**Todos los datos de personas son ficticios** (nombres, RUT con dígito verificador válido pero inventados, domicilios, correos y cuentas bancarias).

## Contenido

| Hoja | Filas | Qué contiene |
|---|---|---|
| `Trabajadores` | 104 (99 activos + 5 desvinculados) | Datos personales, AFP, salud, banco, cargo, turno, jefe directo y estado (calculado) |
| `Cargos` | 64 | Los 64 cargos del informe con perfil de SIMA, canal, banda de sueldo, dotación objetivo y brecha |
| `Contratos` | 128 | Contrato actual e historial (indefinido, plazo fijo, honorarios): fechas, jornada, sueldo, colación, movilización |
| `Terminos_Contrato` | 5 | Desvinculaciones con fecha, causal, aviso previo, finiquito y responsable |
| `Cuentas_SIMA` | 104 | Una cuenta por trabajador: estado y accesos (todo calculado) |
| `Remuneraciones` | 296 | Liquidaciones de 3 meses con fórmulas (AFP, salud, cesantía, impuesto único, honorarios) |
| `Asistencia`, `Conceptos_Variables`, `Catalogo_Conceptos` | | Días trabajados, licencias, horas extra, bonos y descuentos |
| `Habilitaciones` | 48 | LOTO, trabajo eléctrico, altura, grúa, etc., con vencimiento |
| `Permisos` | | Quién ve y quién edita cada dato (web y app) |
| `Parametros`, `Listas` | | IMM, UF, UTM, topes, comisiones de AFP, tabla de impuesto único; listas de validación |
| `LEEME`, `Diccionario` | | Reglas de la base y descripción de cada columna (ingresada o calculada, dónde se muestra) |

## Reglas que enlazan web y app

- `Trabajadores.estado_laboral` es **Desvinculado** si existe una fila en `Terminos_Contrato` con fecha de término menor o igual a hoy.
- `Cuentas_SIMA.estado_cuenta`: **CERRADA** si el trabajador está desvinculado; **ACTIVA** si está activo y su contrato actual está vigente; **SUSPENDIDA** si el contrato actual venció sin renovarse.
- `acceso_web` y `acceso_app` solo valen SÍ con la cuenta ACTIVA y según el canal del cargo (`Cargos.canal`).
- El cargo decide el perfil de SIMA (`perfil_sima`), igual que `api/sima/perfiles.py`.

Se comprobó recalculando con LibreOffice: al agregar una fila en `Terminos_Contrato` la cuenta pasa a CERRADA, y al vencer un contrato pasa a SUSPENDIDA.

## Qué ve la app de terreno

Solo nombre, cargo, turno, jefe directo, habilitaciones y la cuenta propia. Los contratos, sueldos, descuentos y datos personales son solo para la web (RR. HH., finanzas y gerencia), según la hoja `Permisos`.

## Advertencias

- Los valores de `Parametros` (IMM, UF, UTM, topes, tasas, comisiones de AFP, tabla de impuesto único, jornada de 42 horas) son de referencia: hay que actualizarlos con los vigentes y validarlos con un contador.
- El cálculo de remuneraciones es una aproximación para pruebas, no una liquidación oficial. No modela planes de Isapre en UF, APV, asignación familiar, licencias pagadas por la Isapre ni gratificación convenida.
- Las bandas de sueldo, las dotaciones y los datos de asistencia y bonos son supuestos de demostración.
- Las fórmulas usan `TODAY()`; se puede fijar otra fecha en `Parametros!B4`.

## Regenerar

```bash
pip install openpyxl
python generar_base_excel.py
soffice --headless --calc --convert-to xlsx --outdir salida SIMA_base_de_datos.xlsx   # guarda los valores calculados
```

El generador es determinista (semilla fija) salvo por la fecha de hoy.

## Pendiente (siguiente etapa)

Importar el Excel a la API: un comando `manage.py importar_excel` que cree `Cargo`, `Usuario` (login = correo corporativo), contratos, términos y remuneraciones; que cerrar una cuenta desde la web (o por una fila en `Terminos_Contrato`) desactive el usuario y revoque su sesión en la app; y las pantallas de contratos y remuneraciones en la web con los permisos de la hoja `Permisos`.
