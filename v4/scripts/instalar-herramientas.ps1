# Instala lo necesario para desarrollar SIMA v4 en Windows 10 u 11 (requiere winget). Ejecutar en PowerShell como administrador.
winget install --id Microsoft.DotNet.SDK.8 -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Rustlang.Rustup -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install --id Docker.DockerDesktop -e
Write-Host "Listo. Cierre y abra la terminal, y luego ejecute iniciar.bat"
