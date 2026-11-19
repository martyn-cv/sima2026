const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('simaEscritorio', { reintentar: () => ipcRenderer.send('reintentar') });
