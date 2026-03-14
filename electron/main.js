const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const chokidar = require('chokidar')
const { parseSave } = require('./savParser')

const isDev = process.env.NODE_ENV !== 'production'

// Pasta base: %APPDATA%\Roaming\Glaiel Games\Mewgenics
const MEW_BASE = path.join(os.homedir(), 'AppData', 'Roaming', 'Glaiel Games', 'Mewgenics')

/**
 * Detecta automaticamente o diretório de saves (busca pela pasta com Steam ID numérico).
 * Retorna o caminho da pasta saves ou null se não encontrado.
 */
function detectSavesDir() {
  if (!fs.existsSync(MEW_BASE)) return null
  const entries = fs.readdirSync(MEW_BASE)
  for (const entry of entries) {
    if (/^\d+$/.test(entry)) {
      const savesDir = path.join(MEW_BASE, entry, 'saves')
      if (fs.existsSync(savesDir)) return savesDir
    }
  }
  return null
}

const SAVE_PATH = detectSavesDir() || MEW_BASE

let mainWindow = null
let watcher = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    stopWatcher()
  })
}

// ─── File Watcher ────────────────────────────────────────────────────────────

function startWatcher(targetPath) {
  stopWatcher()

  const watchGlob = path.join(targetPath, '*.sav')

  console.log('[Watcher] Monitorando:', watchGlob)

  watcher = chokidar.watch(watchGlob, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  })

  watcher.on('add', (filePath) => {
    console.log('[Watcher] Arquivo detectado:', filePath)
    sendFileUpdate(filePath, 'add')
  })

  watcher.on('change', (filePath) => {
    console.log('[Watcher] Arquivo alterado:', filePath)
    sendFileUpdate(filePath, 'change')
  })

  watcher.on('error', (err) => {
    console.error('[Watcher] Erro:', err)
    if (mainWindow) {
      mainWindow.webContents.send('watcher-error', { message: err.message })
    }
  })

  return true
}

function stopWatcher() {
  if (watcher) {
    watcher.close()
    watcher = null
    console.log('[Watcher] Parado.')
  }
}

async function sendFileUpdate(filePath, event) {
  try {
    // Parseia o SQLite + LZ4 no processo principal
    const parsed = await parseSave(filePath)
    if (mainWindow) {
      mainWindow.webContents.send('save-updated', {
        filePath,
        parsed,
        event,
        timestamp: Date.now(),
      })
    }
  } catch (err) {
    console.error('[Watcher] Erro ao processar arquivo:', err)
    if (mainWindow) {
      mainWindow.webContents.send('watcher-error', {
        message: `Erro ao processar ${path.basename(filePath)}: ${err.message}`,
      })
    }
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Checar se a pasta de saves existe
ipcMain.handle('check-save-path', () => {
  const exists = fs.existsSync(SAVE_PATH)
  const files = exists
    ? fs.readdirSync(SAVE_PATH).filter((f) => f.endsWith('.sav'))
    : []
  return { exists, path: SAVE_PATH, files }
})

// Iniciar modo live
ipcMain.handle('start-live-mode', (_, customPath) => {
  const targetPath = customPath || SAVE_PATH
  if (!fs.existsSync(targetPath)) {
    return { success: false, error: `Pasta não encontrada: ${targetPath}` }
  }
  startWatcher(targetPath)
  return { success: true, path: targetPath }
})

// Parar modo live
ipcMain.handle('stop-live-mode', () => {
  stopWatcher()
  return { success: true }
})

// Abrir arquivo manualmente — parseia o SQLite no main process
ipcMain.handle('open-save-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir save do Mewgenics',
    defaultPath: fs.existsSync(SAVE_PATH) ? SAVE_PATH : os.homedir(),
    filters: [
      { name: 'Mewgenics Save', extensions: ['sav'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const filePath = result.filePaths[0]
  try {
    const parsed = await parseSave(filePath)
    return { canceled: false, filePath, parsed }
  } catch (err) {
    return { canceled: false, error: err.message }
  }
})

// Listar arquivos .sav na pasta de saves
ipcMain.handle('list-save-files', (_, customPath) => {
  const targetPath = customPath || SAVE_PATH
  if (!fs.existsSync(targetPath)) {
    return { exists: false, files: [] }
  }
  const files = fs
    .readdirSync(targetPath)
    .filter((f) => f.endsWith('.sav'))
    .map((f) => ({
      name: f,
      path: path.join(targetPath, f),
      mtime: fs.statSync(path.join(targetPath, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime)
  return { exists: true, path: targetPath, files }
})

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopWatcher()
  if (process.platform !== 'darwin') app.quit()
})
