// SIMA Terreno para escritorio: una ventana que carga la aplicación de terreno (misma interfaz y mismo modo sin conexión).
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

const URL_APP = process.env.SIMA_APP_URL || 'http://localhost:3001';
const origen = new URL(URL_APP).origin;
let ventana;

function crear() {
  ventana = new BrowserWindow({
    width: 1280, height: 820, minWidth: 380, minHeight: 600, title: 'SIMA Terreno', backgroundColor: '#d91f26', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  ventana.once('ready-to-show', () => ventana.show());
  const cargar = () => ventana.loadURL(URL_APP);
  ventana.webContents.on('did-fail-load', (_e, codigo, _d, url, principal) => {
    if (principal && codigo !== -3) ventana.loadFile(path.join(__dirname, 'sin-conexion.html'), { query: { url: URL_APP } });
  });
  ipcMain.removeAllListeners('reintentar'); ipcMain.on('reintentar', cargar);
  // Solo se navega dentro de la aplicación; todo lo demás se abre en el navegador del sistema.
  ventana.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  ventana.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origen) && !url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  cargar();

  // Modo de prueba automática: guarda una captura y sale.
  if (process.env.SIMA_SMOKE) {
    ventana.webContents.once('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, Number(process.env.SIMA_SMOKE_MS || 2500)));
      const t = await ventana.webContents.executeJavaScript('document.title + " | " + (document.querySelector("h1,h2")?.textContent || "")');
      console.log('TITULO:', t);
      require('fs').writeFileSync(process.env.SIMA_SMOKE, (await ventana.webContents.capturePage()).toPNG());
      app.quit();
    });
  }
}

const menu = Menu.buildFromTemplate([
  { label: 'SIMA', submenu: [{ label: 'Recargar', accelerator: 'CmdOrCtrl+R', click: () => ventana?.webContents.reload() }, { label: 'Pantalla completa', role: 'togglefullscreen' }, { type: 'separator' }, { label: 'Salir', role: 'quit' }] },
  { label: 'Ver', submenu: [{ role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }] },
]);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); } });
  app.whenReady().then(() => { Menu.setApplicationMenu(menu); crear(); });
  app.on('window-all-closed', () => app.quit());
}
