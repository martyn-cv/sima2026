#!/usr/bin/env bash
# Instala lo necesario para desarrollar SIMA v4 en Ubuntu o Debian: .NET 8, Node.js 22, Rust y las bibliotecas de Tauri.
set -euo pipefail
[ "$(id -u)" -eq 0 ] || SUDO=sudo
${SUDO:-} apt-get update
${SUDO:-} apt-get install -y dotnet-sdk-8.0 build-essential curl pkg-config libssl-dev libwebkit2gtk-4.1-dev libxdo-dev libayatana-appindicator3-dev librsvg2-dev postgresql
command -v node >/dev/null || { curl -fsSL https://deb.nodesource.com/setup_22.x | ${SUDO:-} bash - && ${SUDO:-} apt-get install -y nodejs; }
command -v cargo >/dev/null || { curl -fsSL https://sh.rustup.rs | sh -s -- -y && . "$HOME/.cargo/env"; }
echo "Listo. Cree la base con:  sudo -u postgres psql -c \"create role sima login password 'sima' createdb\" -c 'create database sima_v41 owner sima'"
