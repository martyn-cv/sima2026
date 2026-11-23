# Compila SIMA-Desktop.exe y SIMA-PLC-Simulator.exe en Windows (MSVC): un único archivo portable por aplicación.
#
#   cd v4.1 ; npm ci ; ./scripts/construir-exe.ps1
#
# Requisitos: Node 22, Rust (rustup) y «Desktop development with C++» de Visual Studio Build Tools.
# Resultado en dist\windows\: SIMA-Desktop.exe, SIMA-PLC-Simulator.exe y SHA256SUMS.txt.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$dist = Join-Path (Get-Location) "dist\windows"
New-Item -ItemType Directory -Force $dist | Out-Null

function Construir($app, $crate, $nombre) {
  Write-Host "==> $nombre"
  Push-Location $app
  # «tauri build --no-bundle» compila la interfaz (beforeBuildCommand), la incrusta en el ejecutable y no arma instalador
  npx tauri build --no-bundle
  if ($LASTEXITCODE -ne 0) { throw "falló la compilación de $nombre" }
  Copy-Item "src-tauri\target\release\$crate.exe" (Join-Path $dist "$nombre.exe") -Force
  Pop-Location
}

Construir "terreno" "sima-desktop" "SIMA-Desktop"
Construir "plc-sim" "sima-plc-simulator" "SIMA-PLC-Simulator"
Push-Location $dist
Get-FileHash SIMA-*.exe -Algorithm SHA256 | ForEach-Object { "$($_.Hash.ToLower())  $(Split-Path $_.Path -Leaf)" } | Set-Content SHA256SUMS.txt
Get-Content SHA256SUMS.txt
Pop-Location
Write-Host "Listo: $dist"
