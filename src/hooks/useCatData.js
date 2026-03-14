import { useState, useEffect, useCallback, useRef } from 'react'
import { MOCK_CATS, MOCK_ROOMS } from '../parser/mockData'

const IS_ELECTRON = Boolean(window.electronAPI)
const USE_MOCK = !IS_ELECTRON // usa mock quando fora do Electron

export function useCatData() {
  const [cats, setCats] = useState(USE_MOCK ? MOCK_CATS : [])
  const [rooms, setRooms] = useState(USE_MOCK ? MOCK_ROOMS : [])
  const [mode, setMode] = useState('manual') // 'manual' | 'live'
  const [currentFile, setCurrentFile] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(USE_MOCK ? new Date() : null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [error, setError] = useState(null)
  const [savePath, setSavePath] = useState(null)
  const cleanupRef = useRef(null)

  // ─── Flash ao atualizar ────────────────────────────────────────────────────
  const triggerFlash = useCallback(() => {
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 600)
  }, [])

  // ─── Aplica dados parsed vindos do main process ───────────────────────────
  const applyParsed = useCallback((parsed, filePath) => {
    try {
      if (parsed?.cats?.length > 0) setCats(parsed.cats)
      if (parsed?.rooms?.length > 0) setRooms(parsed.rooms)
      setCurrentFile(filePath)
      setLastUpdate(new Date())
      setError(null)
      triggerFlash()
    } catch (err) {
      setError(`Erro ao aplicar dados: ${err.message}`)
    }
  }, [triggerFlash])

  // ─── Modo Live: IPC listener ───────────────────────────────────────────────
  useEffect(() => {
    if (!IS_ELECTRON) return

    const cleanup1 = window.electronAPI.onSaveUpdated((data) => {
      // data.parsed vem do main process após parsear o SQLite + LZ4
      applyParsed(data.parsed, data.filePath)
    })

    const cleanup2 = window.electronAPI.onWatcherError((data) => {
      setError(data.message)
    })

    cleanupRef.current = () => {
      cleanup1?.()
      cleanup2?.()
    }

    return () => cleanupRef.current?.()
  }, [applyParsed])

  // ─── Checar save path ao iniciar ──────────────────────────────────────────
  useEffect(() => {
    if (!IS_ELECTRON) return
    window.electronAPI.checkSavePath().then((result) => {
      setSavePath(result)
    })
  }, [])

  // ─── Ações expostas ───────────────────────────────────────────────────────

  const startLiveMode = useCallback(async () => {
    if (!IS_ELECTRON) return
    const result = await window.electronAPI.startLiveMode()
    if (result.success) {
      setMode('live')
      setError(null)
    } else {
      setError(result.error)
    }
  }, [])

  const stopLiveMode = useCallback(async () => {
    if (!IS_ELECTRON) return
    await window.electronAPI.stopLiveMode()
    setMode('manual')
  }, [])

  const openManualFile = useCallback(async () => {
    if (!IS_ELECTRON) return
    const result = await window.electronAPI.openSaveFile()
    if (result.canceled) return
    if (result.error) {
      setError(result.error)
      return
    }
    applyParsed(result.parsed, result.filePath)
    setMode('manual')
  }, [applyParsed])

  const toggleMode = useCallback(() => {
    if (mode === 'live') {
      stopLiveMode()
    } else {
      startLiveMode()
    }
  }, [mode, startLiveMode, stopLiveMode])

  return {
    cats,
    rooms,
    mode,
    currentFile,
    lastUpdate,
    isFlashing,
    error,
    savePath,
    isElectron: IS_ELECTRON,
    useMock: USE_MOCK,
    startLiveMode,
    stopLiveMode,
    openManualFile,
    toggleMode,
  }
}
