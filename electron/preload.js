const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Queries ──────────────────────────────────────────────────────────────
  checkSavePath: () => ipcRenderer.invoke('check-save-path'),
  listSaveFiles: (customPath) => ipcRenderer.invoke('list-save-files', customPath),

  // ─── File watcher (Modo Live) ─────────────────────────────────────────────
  startLiveMode: (customPath) => ipcRenderer.invoke('start-live-mode', customPath),
  stopLiveMode: () => ipcRenderer.invoke('stop-live-mode'),

  // ─── Modo Manual ──────────────────────────────────────────────────────────
  openSaveFile: () => ipcRenderer.invoke('open-save-file'),

  // ─── Eventos recebidos do main ────────────────────────────────────────────
  onSaveUpdated: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('save-updated', handler)
    // Retorna função de cleanup
    return () => ipcRenderer.removeListener('save-updated', handler)
  },

  onWatcherError: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('watcher-error', handler)
    return () => ipcRenderer.removeListener('watcher-error', handler)
  },
})
