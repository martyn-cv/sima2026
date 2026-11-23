# SIMA-Desktop.exe y SIMA-PLC-Simulator.exe

Dos programas de Windows que se abren con doble clic. No necesitan Node, Python, Visual Studio Code ni un servidor de desarrollo.

## Tecnología elegida: Tauri 2

Las dos aplicaciones ya estaban hechas con React y Tauri, así que se empaquetan con la misma tecnología sin reescribirlas.

| Criterio | Tauri 2 (elegido) | Electron |
|---|---|---|
| Tamaño del ejecutable | 8 a 12 MB | 90 a 150 MB |
| Memoria al abrir | 80 a 150 MB (usa WebView2 de Windows) | 200 MB o más (trae su propio Chromium) |
| Un solo archivo portable | Sí, compilado con MSVC | Requiere herramientas adicionales |
| Animaciones y CSS moderno | Iguales a la web (WebView2 es Chromium) | Iguales |
| Seguridad | Sin Node.js en la ventana; solo los permisos declarados | Node.js disponible en la ventana si se configura mal |

**Dependencia del sistema:** Microsoft Edge WebView2 Runtime. Viene con Windows 11 y con Windows 10 actualizado (desde 2021). Si falta, Windows avisa y se instala gratis desde Microsoft.

## Cómo se generan

### Opción A · Un único `.exe` por aplicación (recomendada)

El flujo de GitHub Actions [`v41-ejecutables`](../../.github/workflows/v41-ejecutables.yml) se ejecuta en Windows con MSVC. El cargador de WebView2 queda dentro del ejecutable y la interfaz (HTML, CSS, fuentes, íconos y escenarios) va comprimida dentro del binario.

1. Se ejecuta solo al subir cambios de `v4.1/terreno`, `v4.1/plc-sim` o `v4.1/paquetes`. También se puede lanzar a mano en GitHub (**Actions → SIMA 4.1 · ejecutables de Windows → Run workflow**).
2. Al terminar, el artefacto **sima-4.1-windows** contiene `SIMA-Desktop.exe`, `SIMA-PLC-Simulator.exe` y `SHA256SUMS.txt`.
3. Si se publica una etiqueta `v4.1.0`, además los deja en **Releases**.

En un PC con Windows, Rust y Visual Studio Build Tools se puede obtener lo mismo sin GitHub:

```powershell
cd v4.1 ; npm ci ; ./scripts/construir-exe.ps1
```

### Opción B · Compilación cruzada desde Linux (carpeta portable)

```bash
bash v4.1/scripts/construir-exe.sh
```

Usa MinGW. Con ese compilador, WebView2 solo se puede enlazar como DLL, así que cada aplicación queda en una carpeta con su `.exe` y `WebView2Loader.dll` (160 KB), más un `.zip` y `SHA256SUMS.txt`. La carpeta se copia completa a cualquier PC con Windows 10 u 11 y se abre con doble clic.

## Comportamiento en Windows

- Ventana propia con el nombre y el ícono de SIMA en la barra de tareas; se puede redimensionar, minimizar y maximizar, y tiene un tamaño mínimo (1100 × 700 en Desktop, 1200 × 720 en el simulador).
- Sin consola: el binario se compila con el subsistema GUI de Windows.
- Las preferencias (dirección del servidor, escenario, velocidad, modo, vista) se guardan en `%LOCALAPPDATA%\cl.manuandina.sima.desktop` y `%LOCALAPPDATA%\cl.manuandina.sima.plcsimulator`.
- **Credenciales:** ninguno de los dos ejecutables lleva credenciales de PostgreSQL ni se conecta a la base. Desktop entra con la cuenta de SIMA de cada persona (token JWT que vence y que el servidor revoca si la cuenta se cierra). El simulador usa una clave de dispositivo que solo sirve para alimentar PLC simulados.

## Conexión con el resto de SIMA

```
SIMA Web             ─┐
SIMA-Desktop.exe     ─┼─► Backend central (.NET) ─► PostgreSQL
SIMA-PLC-Simulator   ─┘
```

- **Desktop** abre con una pantalla de arranque que comprueba el servidor. Si no responde, ofrece reintentar, cambiar la dirección o seguir sin conexión. Sin conexión muestra lo último consultado. Las intervenciones y los avisos de falla quedan en una cola con identificador único y se envían al volver la red. Tomar una orden sí exige conexión, para que dos técnicos no tomen la misma.
- **Simulador** funciona solo, sin red (modo local). En modo sincronizado envía telemetría y eventos a SIMA. Si la conexión se corta, sigue simulando y guarda hasta 2.000 eventos para enviarlos después; el servidor descarta los repetidos.

## Firma digital

Sin firma, Windows SmartScreen puede mostrar «Windows protegió su PC» la primera vez (se continúa con **Más información → Ejecutar de todas formas**). Para evitarlo:

1. Conseguir un certificado de firma de código: OV (más barato, la reputación se gana con descargas) o EV (SmartScreen confía desde el primer día).
2. Guardarlo en GitHub como secreto `WINDOWS_CERT_PFX` (archivo .pfx en base64) y su clave en `WINDOWS_CERT_CLAVE`.
3. El flujo firma los dos `.exe` con `signtool`, con sello de tiempo, y recalcula las sumas SHA-256.

Para verificar la integridad de un archivo recibido: `Get-FileHash SIMA-Desktop.exe -Algorithm SHA256` y comparar con `SHA256SUMS.txt`.

## Pruebas

| Comprobación | Dónde se hizo | Resultado |
|---|---|---|
| Las dos interfaces compilan sin errores de tipos | Linux (`tsc`) | ✓ |
| Flujo completo de Desktop (arranque, ingreso, panel, explorador, OT con LOTO, intervención, cierre) contra la API real | Chromium (Playwright) | ✓ |
| Simulador: tres escenarios, pausa que congela, velocidad, fallas, modo sincronizado, «reparar» desde SIMA | Chromium (Playwright) | ✓ |
| Ejecutables de Windows: PE de 64 bits, subsistema GUI (sin consola), ícono y versión, interfaz incrustada | Compilación cruzada (MinGW) | ✓ |
| Los `.exe` se abren 8 s sin cerrarse en Windows limpio, sin herramientas de desarrollo | GitHub Actions `windows-latest` | se ejecuta en cada compilación |
| Prueba manual en un PC con Windows 10/11 sin entorno de desarrollo | pendiente (lista abajo) | — |

**Lista para la prueba en un PC con Windows:**

1. Copiar los dos `.exe` (o las carpetas portables) a un PC que no tenga nada instalado.
2. Abrir `SIMA-PLC-Simulator.exe` → elegir «Cinta transportadora» → **Iniciar**. La banda y las piezas se mueven. **Pausa** lo congela; ×4 lo acelera.
3. Con SIMA encendido en otro equipo: en el simulador, «Simulación local» → escribir la dirección (`http://IP-del-servidor:5080`) → **Conectar y sincronizar**.
4. Abrir `SIMA-Desktop.exe` → la pantalla de arranque encuentra el servidor → entrar con `tecnico@manuandina.cl` / `Tecnico2026`.
5. En el simulador activar «Falla de CPU del PLC». En Desktop aparece la alarma y una orden automática. Tomarla con LOTO, registrar la intervención y cerrarla. El simulador se recupera solo.
6. Desconectar la red: Desktop muestra «Sin conexión · datos guardados» y el simulador sigue en local con eventos en cola. Al reconectar se envían sin duplicarse.
