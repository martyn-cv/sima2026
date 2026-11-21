# SIMA v3 · prototipo a escala profesional

Sistema de Información Manufacturero Andino de Manufacturas Andina S.A. La versión 3 reemplaza el backend de Django por **C# y .NET 8**, reescribe la web de administración con **Next.js, React, TypeScript y Tailwind**, y pasa las aplicaciones de escritorio a **Tauri**. Tiene **una sola base de datos PostgreSQL** que comparten la web, la app de terreno y el simulador de PLC.

Todos los datos de personas (nombres, RUT, domicilios, cuentas bancarias) son **ficticios**.

| Pieza | Tecnología | Carpeta | Puerto |
|---|---|---|---|
| API y reglas del negocio | C#, .NET 8, EF Core, SignalR, JWT | `api/` | 5080 |
| Base de datos | PostgreSQL 16 | (`docker-compose.yml`) | 5432 |
| Web de administración | Next.js 16, React 19, TypeScript, Tailwind 4, Motion | `web/` | 3000 |
| App de terreno (escritorio y navegador) | Tauri 2, React, TypeScript, Tailwind | `terreno/` | 1421 |
| Simulador de PLC (escritorio) | Tauri 2, React, TypeScript, Tailwind | `plc-sim/` | 1420 |
| Cliente de la API, tiempo real y motor de PLC | TypeScript | `paquetes/cliente/` | |
| Componentes y tema compartidos | React, Tailwind | `paquetes/ui/` | |
| Datos de partida | Excel y su generador | `datos/` | |

## Cómo arrancarlo

Un solo comando levanta todo; la base se crea sola y el Excel de `datos/` se importa en el primer arranque.

| Equipo | Comando |
|---|---|
| Con Docker (base de datos, API y web) | `docker compose up --build` |
| Linux o macOS, sin Docker para la API | `./iniciar.sh` |
| Windows | `iniciar.bat` (usa Docker Desktop si está; con `iniciar.bat local` usa .NET y Node) |
| Instalar las herramientas | `scripts/instalar-herramientas.sh` (Ubuntu o Debian) o `scripts/instalar-herramientas.ps1` (Windows) |

Después abra http://localhost:3000. Para las aplicaciones de escritorio:

```bash
npm install                     # una vez, en esta carpeta
npm run plc:escritorio          # simulador de PLC en su propia ventana
npm run terreno:escritorio      # app de terreno en su propia ventana
npm run plc                     # el simulador en el navegador (puerto 1420), para probar
```

Para generar los instaladores (`.msi` y `.exe` en Windows) use `npm run empaquetar:plc` y `npm run empaquetar:terreno` **en el sistema operativo de destino**, o ejecute en GitHub el flujo *SIMA v3 · instaladores de escritorio*, que los arma para Windows, macOS y Linux.

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

**Los PLC también están en la base:** 4 controladores (`plc`), sus módulos (`plc_modulos`), entre 17 y 51 puntos de entrada y salida cada uno (126 en total) (`plc_puntos`, enlazados a su equipo y a su sensor) y su programa en escalera. El simulador de PLC los lee de ahí, ejecuta el programa, mueve el proceso de cada equipo y publica lecturas; la API abre alarmas, crea la orden de trabajo automática y avisa en vivo a la web y a la app. Cerrar la orden en la app envía una orden de reparación de vuelta al PLC.

## Permisos

La hoja *Permisos* del Excel es la matriz de `api/Sima.Api/Servicios/Permisos.cs`. El servidor valida cada petición; ocultar un botón no protege nada. Por ejemplo: solo Personas edita datos personales, contratos y desvinculaciones; solo Finanzas edita parámetros y bonos; las jefaturas ven la asistencia y las habilitaciones de su propio equipo; el personal de terreno solo ve el directorio, su cargo y sus habilitaciones. Todo cambio queda en la auditoría.

## Pruebas

```bash
./iniciar.sh pruebas            # o por separado:
dotnet test api/Sima.Api.Tests  # 10 pruebas de integración contra PostgreSQL (usan una base desechable)
npm run tipos                   # revisión de tipos de las tres interfaces
```

Las pruebas de la API cubren la importación completa, el ingreso por canal y por estado de cuenta, el bloqueo por intentos, los permisos, el cierre de cuenta al desvincular (con revocación de la sesión), la suspensión por contrato vencido, la validación de RUT, la equivalencia con las fórmulas del Excel, y la telemetría de PLC con alarmas, órdenes automáticas, bloqueo y etiquetado y mandos. Las interfaces se probaron con navegador real (flujos de la web, del simulador y de la app de terreno).

## Qué se probó y qué no

- **Probado aquí:** API con PostgreSQL, importación del Excel, las 10 pruebas, web (producción y desarrollo), simulador y app de terreno en el navegador, binarios de Tauri compilados en Linux y abiertos en una pantalla virtual, y `./iniciar.sh` desde una base vacía.
- **No probado aquí:** las imágenes de Docker (no había servicio de Docker; el archivo `docker-compose.yml` se validó solo en su sintaxis), los instaladores de Windows y macOS (se arman en GitHub con el flujo de instaladores) y la actualización de la clave de firma en un entorno real.

## Qué falta para operar con datos reales

Es un prototipo avanzado, no un sistema listo para producción. Lo que sigue de [`../v2/HOJA_DE_RUTA_2.1.md`](../v2/HOJA_DE_RUTA_2.1.md):

- **Seguridad:** HTTPS con proxy inverso, segundo factor para los perfiles de gestión, recuperación de clave, quitar las cuentas y claves de demostración (`Demo:Habilitado=false`), cambiar `Jwt:Clave` y `Ingesta:ApiKey`, protección de datos personales con asesoría legal (permisos por campo y registro de accesos).
- **Operación:** respaldos probados de PostgreSQL, observabilidad, pruebas de carga con 500 activos y 30 usuarios.
- **Telemetría a escala:** base de series de tiempo (TimescaleDB) y puente OPC UA o MQTT hacia PLC reales; hoy el simulador publica por HTTP y el historial dura 6 horas.
- **App de terreno sin conexión:** la v2 la tenía como PWA con cola de envíos; en la v3 falta portarla.
- **Cálculo de remuneraciones:** los valores legales (IMM, UF, UTM, topes, comisiones, tramos) son de referencia y el cálculo no modela Isapre en UF, APV, asignación familiar ni licencias. Debe validarlo un contador.
- **Módulos de la v2 aún no portados a .NET:** rutinas preventivas, herramientas y calibraciones, traspaso de turno, indicadores OEE y MTBF, repuestos y despachos.
