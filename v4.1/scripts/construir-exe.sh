#!/usr/bin/env bash
# Compila SIMA-Desktop.exe y SIMA-PLC-Simulator.exe para Windows desde Linux (MinGW).
#
#   bash scripts/construir-exe.sh
#
# Resultado en dist/windows/: una carpeta portable por aplicación (el .exe más WebView2Loader.dll, 160 KB),
# un .zip de cada carpeta y SHA256SUMS.txt. Para un único .exe sin DLL al lado use la compilación de Windows
# (scripts/construir-exe.ps1 o el flujo de GitHub Actions «v41-ejecutables»): con MSVC el cargador de WebView2
# queda dentro del ejecutable.
#
# Requisitos (una vez): rustup target add x86_64-pc-windows-gnu ; apt-get install mingw-w64 ; npm install en v4.1/
set -euo pipefail
cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
OBJ="${CARGO_TARGET_DIR:-/tmp/sima-target-win}"
DIST="$RAIZ/dist/windows"
VERSION="$(node -p "require('./package.json').version")"
mkdir -p "$DIST"

construir() {   # carpeta-app  crate  nombre-final
  local app="$1" crate="$2" nombre="$3"
  echo "==> $nombre: interfaz"
  (cd "$app" && npx vite build --logLevel warn)
  echo "==> $nombre: ejecutable de Windows"
  (cd "$app/src-tauri" && CARGO_TARGET_DIR="$OBJ" cargo build --release --target x86_64-pc-windows-gnu --features tauri/custom-protocol)
  local carpeta="$DIST/$nombre"
  rm -rf "$carpeta" && mkdir -p "$carpeta"
  cp "$OBJ/x86_64-pc-windows-gnu/release/$crate.exe" "$carpeta/$nombre.exe"
  cp "$(find ~/.cargo/registry/src -path '*webview2-com-sys-*/x64/WebView2Loader.dll' | head -1)" "$carpeta/"
  cat > "$carpeta/LEAME.txt" <<EOF
$nombre $VERSION (Windows 10 y 11, 64 bits)

1. Copie esta carpeta completa donde quiera (escritorio, pendrive, Archivos de programa).
2. Abra $nombre.exe con doble clic. No necesita instalar Node, Python ni herramientas de desarrollo.
3. WebView2Loader.dll debe quedar junto al .exe.

Usa Microsoft Edge WebView2, que viene con Windows 11 y con Windows 10 actualizado.
Si no lo tiene: https://developer.microsoft.com/microsoft-edge/webview2/
Para conectarse a SIMA, el servidor debe estar encendido (Iniciar SIMA.bat en el equipo servidor).
La dirección se cambia desde la propia aplicación.
EOF
  (cd "$DIST" && rm -f "$nombre-$VERSION-windows-x64.zip" && zip -qr "$nombre-$VERSION-windows-x64.zip" "$nombre")
}

construir terreno sima-desktop SIMA-Desktop
construir plc-sim sima-plc-simulator SIMA-PLC-Simulator
(cd "$DIST" && sha256sum SIMA-Desktop/SIMA-Desktop.exe SIMA-PLC-Simulator/SIMA-PLC-Simulator.exe ./*.zip > SHA256SUMS.txt && cat SHA256SUMS.txt)
echo "Listo: $DIST"
