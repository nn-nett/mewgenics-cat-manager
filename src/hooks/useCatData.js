import { useState, useEffect, useCallback, useRef } from 'react'
import { MOCK_CATS, MOCK_ROOMS } from '../parser/mockData'
import { parseSaveBrowser } from '../parser/savParserBrowser'

const IS_ELECTRON = Boolean(window.electronAPI)

export function useCatData() {
  // Inicia sem dados — mostra a drop zone
  const [cats, setCats] = useState([])
  const [rooms, setRooms] = useState([])
  const [mode, setMode] = useState('manual')           // 'manual' | 'live'
  const [sourceMode, setSourceMode] = useState('none') // 'none' | 'mock' | 'file' | 'live'
  const [currentFile, setCurrentFile] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isFlashing, setIsFlashing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savePath, setSavePath] = useState(null)
  const cleanupRef = useRef(null)

  // ─── Flash ao atualizar ────────────────────────────────────────────────────
  const triggerFlash = useCallback(() => {
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 600)
  }, [])

  // ─── Aplica dados parsed vindos do parser ─────────────────────────────────
  const applyParsed = useCallback((parsed, filePath) => {
    // Mortos e doados nunca aparecem na UI — filtra na fonte
    const visible = (parsed?.cats || []).filter(
      (c) => c.status !== 'dead' && c.status !== 'donated'
    )
    if (visible.length > 0) setCats(visible)
    if (parsed?.rooms?.length > 0) setRooms(parsed.rooms)
    setCurrentFile(filePath)
    setLastUpdate(new Date())
    setError(null)
    triggerFlash()
  }, [triggerFlash])

  // ─── Modo Live: IPC listener (Electron only) ──────────────────────────────
  useEffect(() => {
    if (!IS_ELECTRON) return

    const cleanup1 = window.electronAPI.onSaveUpdated((data) => {
      applyParsed(data.parsed, data.filePath)
    })
    const cleanup2 = window.electronAPI.onWatcherError((data) => {
      setError(data.message)
    })
    cleanupRef.current = () => { cleanup1?.(); cleanup2?.() }
    return () => cleanupRef.current?.()
  }, [applyParsed])

  // ─── Checar save path (Electron only) ─────────────────────────────────────
  useEffect(() => {
    if (!IS_ELECTRON) return
    window.electronAPI.checkSavePath().then(setSavePath)
  }, [])

  // ─── Carregamento no BROWSER via FileReader ───────────────────────────────
  const loadBrowserFile = useCallback(async (arrayBuffer, fileName) => {
    // null = usar mock
    if (arrayBuffer === null) {
      setCats(MOCK_CATS)
      setRooms(MOCK_ROOMS)
      setCurrentFile('mock')
      setLastUpdate(new Date())
      setSourceMode('mock')
      setError(null)
      triggerFlash()
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const parsed = await parseSaveBrowser(arrayBuffer)
      if (parsed.cats.length === 0) {
        setError('Nenhum gato encontrado — verifique se é o arquivo correto.')
        setIsLoading(false)
        return
      }
      applyParsed(parsed, fileName)
      setSourceMode('file')
    } catch (err) {
      console.error('[useCatData] Erro ao parsear:', err)
      setError(`Erro ao ler o save: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [applyParsed, triggerFlash])

  // ─── Ações Electron ───────────────────────────────────────────────────────
  const startLiveMode = useCallback(async () => {
    if (!IS_ELECTRON) return
    const result = await window.electronAPI.startLiveMode()
    if (result.success) { setMode('live'); setSourceMode('live'); setError(null) }
    else setError(result.error)
  }, [])

  const stopLiveMode = useCallback(async () => {
    if (!IS_ELECTRON) return
    await window.electronAPI.stopLiveMode()
    setMode('manual')
    setSourceMode('file')
  }, [])

  const openManualFile = useCallback(async () => {
    if (!IS_ELECTRON) return
    const result = await window.electronAPI.openSaveFile()
    if (result.canceled) return
    if (result.error) { setError(result.error); return }
    applyParsed(result.parsed, result.filePath)
    setMode('manual')
    setSourceMode('file')
  }, [applyParsed])

  const toggleMode = useCallback(() => {
    if (mode === 'live') stopLiveMode()
    else startLiveMode()
  }, [mode, startLiveMode, stopLiveMode])

  // Volta à drop zone (browser only)
  const resetData = useCallback(() => {
    setCats([])
    setRooms([])
    setCurrentFile(null)
    setLastUpdate(null)
    setSourceMode('none')
    setError(null)
  }, [])

  return {
    cats,
    rooms,
    mode,
    sourceMode,       // 'none' | 'mock' | 'file' | 'live'
    currentFile,
    lastUpdate,
    isFlashing,
    isLoading,
    error,
    savePath,
    isElectron: IS_ELECTRON,
    useMock: sourceMode === 'mock',
    hasData: cats.length > 0,
    loadBrowserFile,  // para o SaveDropZone
    resetData,        // volta à drop zone
    startLiveMode,
    stopLiveMode,
    openManualFile,
    toggleMode,
  }
}
