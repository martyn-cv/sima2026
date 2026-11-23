# SIMA 4.1 · ecosistema industrial integrado

Sistema de Información Manufacturero Andino de Manufacturas Andina S.A. La versión 3 reemplaza el backend de Django por **C# y .NET 8**, reescribe la web de administración con **Next.js, React, TypeScript y Tailwind**, y pasa las aplicaciones de escritorio a **Tauri**. Tiene **una sola base de datos PostgreSQL** que comparten la web, la app de terreno y el simulador de PLC.

**Es una aplicación de demostración, experimental.** Todos los datos (personas, RUT, domicilios, cuentas bancarias, sueldos y los valores de las remuneraciones) son **ficticios o de ejemplo**. Si una empresa la adopta, revisa los temas legales y de datos reales por su cuenta; al final hay una lista corta para eso.

## Qué trae la 4.1

Tres aplicaciones con distinta interfaz y distinto público, sobre **un solo backend y una sola base PostgreSQL**:

| Aplicación | Para quién | Qué se ve |
|---|---|---|
| **SIMA Web** (`web/`) | Administración y supervisión | Inicio por cargo, planta en vivo con máquinas animadas, estructura Planta → Área → Línea → Máquina, mantenimiento, producción, calidad, seguridad, permisos por cargo, consola de eventos |
| **SIMA-Desktop.exe** (`terreno/`) | Operadores y técnicos | Panel operativo, explorador de planta, centro de mantenimiento con flujo guiado (LOTO, diagnóstico, intervención, repuestos, cierre), modo sin conexión |
| **SIMA-PLC-Simulator.exe** (`plc-sim/`) | Automatización y formación | Laboratorio con tres escenarios animados (cinta, llenado, máquina), fallas simuladas, consola, inspector; modo local o sincronizado con SIMA. Conserva la estación de ingeniería (rack y escalera) |

- Arquitectura de integración, matriz de datos y evaluación de MQTT/OPC UA: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).
- Cómo se generan y distribuyen los dos `.exe`: [`docs/EJECUTABLES.md`](docs/EJECUTABLES.md).
- Identidad visual compartida: índigo con violeta y cian en la web, grafito con cian en Desktop y azul casi negro con rejilla técnica en el simulador. Los colores de estado son los mismos en las tres.
- 39 pruebas automáticas, entre ellas el ciclo completo entre las tres aplicaciones: falla en el simulador → orden en Desktop → cierre → el simulador se recupera.

| Pieza | Tecnología | Carpeta | Puerto |
|---|---|---|---|
| API y reglas del negocio | C#, .NET 8, EF Core, SignalR, JWT | `api/` | 5080 |
| Base de datos | PostgreSQL 16 | (`docker-compose.yml`) | 5432 |
| Web de administración | Next.js 16, React 19, TypeScript, Tailwind 4, Motion | `web/` | 3000 |
| App de terreno (escritorio y navegador) | Tauri 2, React, TypeScript, Tailwind | `terreno/` | 1421 |
| Simulador de PLC (escritorio), **funciona solo** | Tauri 2, React, TypeScript, Tailwind | `plc-sim/` | 1420 |
| Cliente de la API, tiempo real y motor de PLC | TypeScript | `paquetes/cliente/` | |
| Componentes y tema compartidos | React, Tailwind | `paquetes/ui/` | |
| Datos de partida | Excel y su generador | `datos/` | |

## Cómo arrancarlo

**En Windows, a un clic:** instale Docker Desktop, abra la carpeta `v4.1` (fuera de `C:\Windows`) y haga doble clic en **`Iniciar SIMA.bat`**. Levanta la base de datos, la API, la web, la app de terreno y el simulador de PLC, y abre el navegador con las tres. **`Detener SIMA.bat`** lo apaga. Para que arranque solo con el equipo: en Docker Desktop, *Settings → General → Start Docker Desktop when you sign in*; los contenedores se reinician solos y basta con abrir el navegador. Conviene crear un acceso directo de `Iniciar SIMA.bat` en el escritorio (clic derecho → *Enviar a → Escritorio*).

Un solo comando levanta todo; la base se crea sola y el Excel de `datos/` se importa en el primer arranque.

| Equipo | Comando |
|---|---|
| Con Docker (base de datos, API, web, app de terreno y simulador) | `docker compose up --build` |
| Linux o macOS, sin Docker para la API | `./iniciar.sh` |
| Windows | doble clic en `Iniciar SIMA.bat`, o `iniciar.bat` (con `iniciar.bat local` usa .NET y Node) |
| Instalar las herramientas | `scripts/instalar-herramientas.sh` (Ubuntu o Debian) o `scripts/instalar-herramientas.ps1` (Windows) |

Después abra http://localhost:3000. Para las aplicaciones de escritorio:

```bash
npm install                     # una vez, en esta carpeta
npm run plc:escritorio          # simulador de PLC en su propia ventana (no necesita la API ni la base de datos)
npm run terreno:escritorio      # app de terreno en su propia ventana
npm run plc                     # el simulador en el navegador (puerto 1420), para probar
```

Para generar `SIMA-Desktop.exe` y `SIMA-PLC-Simulator.exe` vea [`docs/EJECUTABLES.md`](docs/EJECUTABLES.md): el flujo de GitHub *SIMA 4.1 · ejecutables de Windows* los genera como archivo único, y `scripts/construir-exe.sh` los compila desde Linux como carpeta portable.

## Accesos de demostración

Las pantallas de ingreso listan las cuentas de demostración y entran con un clic. Cada perfil ingresa solo por su canal.

| Canal | Usuario (`@manuandina.cl`) | Clave | Cargo |
|---|---|---|---|
| Web | rrhh | Rrhh2026 | Jefe de personas: contratos, desvinculaciones, cuentas |
| Web | finanzas | Finanzas2026 | Administración de planta: remuneraciones y parámetros |
| Web | gerencia | Gerencia2026 | Gerente de planta: ve todo |
| Web | produccion, jefe.calidad, logistica, comercial | Produccion2026, Jefecalidad2026, Logistica2026, Comercial2026 | Jefaturas de área |
| Terreno | tecnico | Tecnico2026 | Técnico electromecánico: toma y cierra órdenes con LOTO |
| Terreno | automatizacion | Automatizacion2026 | Ingeniero de automatización: mandos a los PLC |
| Terreno | operador, supervisor.turno, jefe.mantenimiento, panol, calidad, prevencion… | ver `api/Sima.Api/Datos/ImportadorExcel.cs` | Resto del personal de terreno |

Los otros 81 trabajadores activos entran con su correo corporativo (el de la hoja *Trabajadores*) y la clave inicial `Sima2026!`.

## Una sola base de datos

El Excel `datos/SIMA_base_de_datos.xlsx` tiene 104 trabajadores (99 activos y 5 desvinculados) en los 64 cargos del informe, con contratos, remuneraciones, asistencia, habilitaciones y parámetros legales. Al arrancar, la API lo importa a PostgreSQL. Para volver a importarlo: `dotnet run --project api/Sima.Api -- importar datos/SIMA_base_de_datos.xlsx`.

**La cuenta de acceso sale de los contratos, no se administra a mano:**

| Situación | Cuenta de SIMA |
|---|---|
| Hay una desvinculación con fecha de término de hoy o anterior | **Cerrada**: no entra ni a la web ni a la app, y las sesiones abiertas terminan |
| Está activo y su contrato actual está vigente | **Activa**, por el canal que le corresponde a su cargo |
| Está activo pero su contrato venció sin renovarse | **Suspendida** hasta que Personas registre el contrato nuevo |

Cuando RR. HH. desvincula a alguien en la web, el servidor sube la versión de su sesión, descarta el token en la siguiente petición y avisa por SignalR: la app de terreno de esa persona muestra «Su cuenta fue cerrada» y vuelve al ingreso sin que haga nada. Revertir la desvinculación reabre la cuenta.

Las **remuneraciones** (gratificación, horas extra, AFP, salud, cesantía, impuesto único, retención de honorarios) se calculan en el servidor con los contratos, la asistencia y los conceptos del mes. Una prueba automática compara las 296 liquidaciones del Excel con las del servidor, con una tolerancia de un peso.

**Los PLC también están en la base:** 4 controladores (`plc`), sus módulos (`plc_modulos`), entre 17 y 51 puntos de entrada y salida cada uno (126 en total) (`plc_puntos`, enlazados a su equipo y a su sensor) y su programa en escalera.

**El simulador de PLC no necesita nada más para funcionar.** Trae la misma planta incluida (4 PLC, 15 equipos, módulos, puntos y programas): se abre, los equipos arrancan y se puede jugar con él. Ejecuta el programa en escalera como un PLC real, mueve el proceso físico de cada equipo, permite inyectar fallas o activar las **fallas aleatorias** para practicar el diagnóstico, editar el programa (se guarda en el equipo) y observar variables y tendencias. Es una herramienta de entrenamiento y de ingeniería, no un juego de un tema en particular.

**Conectarlo a SIMA es opcional** (botón *Conectar con SIMA*). Entonces usa los PLC y programas de la base de datos y publica lecturas: la API abre alarmas, crea la orden de trabajo automática y avisa en vivo a la web y a la app. Cerrar la orden en la app envía una orden de reparación de vuelta al simulador.

## Permisos

La hoja *Permisos* del Excel es la matriz de `api/Sima.Api/Servicios/Permisos.cs`. El servidor valida cada petición; ocultar un botón no protege nada. Por ejemplo: solo Personas edita datos personales, contratos y desvinculaciones; solo Finanzas edita parámetros y bonos; las jefaturas ven la asistencia y las habilitaciones de su propio equipo; el personal de terreno solo ve el directorio, su cargo y sus habilitaciones. Todo cambio queda en la auditoría.

## Operación de planta

Todo esto viene de la v2 y ahora vive en la API de .NET, con permisos por perfil y registro en la auditoría:

- **Pañol:** herramientas que se retiran y se devuelven (una con la calibración vencida no se puede retirar; instrumentación o el pañol registran la calibración) y repuestos con stock, mínimo, críticos y movimientos.
- **Rutinas preventivas** por turno, semana, mes y trimestre, con lista de verificación por equipo. Si algo está mal, se crea una orden de trabajo sola.
- **Traspaso de turno** armado con el estado real de la planta (equipos fuera de servicio, alarmas, órdenes, repuestos críticos) y las seis revisiones del informe.
- **Logística:** despachos con estado y compromiso de entrega.
- **Indicadores:** los diez del informe (cumplimiento del plan, OEE, defectos, MTTR, MTBF, OTIF, exactitud de inventario, ausentismo, costo unitario, cierre de acciones). Las paradas se registran solas cuando un equipo deja de operar. Los que esta base no puede calcular (exactitud de inventario y costo unitario) dicen «sin datos» en vez de inventarse.

## App de terreno sin conexión

Lo que se envía sin señal (reportar una falla, hacer una rutina, entregar el turno) queda en una cola en el equipo y se reenvía solo al volver la conexión, sin duplicarse: cada envío lleva un identificador único que el servidor reconoce. Las consultas se guardan para verlas sin señal. Arriba aparece «N envíos pendientes». Lo que necesita señal es cambiar el estado de una orden (bloqueo y cierre), mover repuestos y herramientas y reconocer alarmas, para no pisar a otras personas.

## Seguridad y respaldos

- **Segundo factor** (código de 6 dígitos de Google Authenticator, Microsoft Authenticator o Authy): cada persona lo activa desde el botón del escudo (web) o desde *Mi cargo* (terreno). Con `Seguridad:Exigir2fa=true` se vuelve obligatorio para los perfiles de la web. Personas puede quitarlo si alguien pierde el teléfono.
- **Clave propia:** las cuentas nuevas y las claves restablecidas por Personas obligan a elegir una clave antes de usar el sistema (`Seed:ForzarCambioClave=true` lo exige también a las cuentas importadas del Excel; en la demostración está apagado para entrar con un clic).
- **Bloqueo** de la cuenta por 5 intentos fallidos, sesiones que se revocan al instante y cabeceras de seguridad en la API.
- **HTTPS:** `docker compose --profile https up --build` agrega un proxy Caddy en https://localhost, o en su dominio con `SIMA_DOMINIO`.
- **Respaldos:** el servicio `respaldos` de Docker guarda un respaldo diario en `respaldos/` y conserva 14 días. A mano: `scripts/respaldo.sh` y `scripts/restaurar.sh archivo.dump base_nueva` (la restauración se probó: 104 trabajadores, 128 contratos y 126 puntos de PLC idénticos).

## Pruebas

```bash
./iniciar.sh pruebas            # o por separado:
dotnet test api/Sima.Api.Tests  # 20 pruebas de integración contra PostgreSQL (usan una base desechable)
npm run tipos                   # revisión de tipos de las tres interfaces
```

Las pruebas de la API cubren la importación completa, el ingreso por canal y por estado de cuenta, el bloqueo por intentos, los permisos, el cierre de cuenta al desvincular (con revocación de la sesión), la suspensión por contrato vencido, la validación de RUT, la equivalencia con las fórmulas del Excel, y la telemetría de PLC con alarmas, órdenes automáticas, bloqueo y etiquetado y mandos, el segundo factor (con el vector de prueba oficial del RFC 6238), la clave obligatoria tras un restablecimiento, y los módulos de operación (pañol con bloqueo por calibración vencida, repuestos, logística, rutinas con hallazgos, traspaso de turno e indicadores). Las interfaces se probaron con navegador real (flujos de la web, del simulador y de la app de terreno).

## Qué se probó y qué no

- **Probado aquí:** API con PostgreSQL, importación del Excel, las 10 pruebas, web (producción y desarrollo), simulador y app de terreno en el navegador, binarios de Tauri compilados en Linux y abiertos en una pantalla virtual, y `./iniciar.sh` desde una base vacía.
- **No probado aquí:** las imágenes de Docker (no había servicio de Docker; el archivo `docker-compose.yml` se validó solo en su sintaxis), los instaladores de Windows y macOS (se arman en GitHub con el flujo de instaladores) y la actualización de la clave de firma en un entorno real.

## Si una empresa quiere adoptarla

Es una demostración; esto es lo que ella tendría que resolver:

- **Datos y valores legales:** cargar sus trabajadores reales, y que su contador revise los parámetros de remuneraciones (hoy de ejemplo) y el cálculo, que no modela Isapre en UF, APV, asignación familiar ni licencias. Revisar también la política de datos personales.
- **Producción:** cambiar `Jwt:Clave` y `Ingesta:ApiKey`, apagar las cuentas de demostración (`Demo:Habilitado=false`), usar HTTPS y definir dónde se hospeda.
- **Escala:** base de series de tiempo para la telemetría (hoy el historial dura 6 horas) y pruebas de carga. Los reportes de seguridad (condiciones inseguras, incidentes) de la v2 no se portaron.
- **PLC reales:** el simulador es independiente y no los necesita; conectar equipos reales requeriría un puente (OPC UA o MQTT) que no está incluido.
