import { useState, useEffect } from 'react'
import { formatDistanceToNow } from '../../utils/time'

export default function LiveStatus({
  mode,
  currentFile,
  lastUpdate,
  isFlashing,
  isElectron,
  useMock,
  onToggleMode,
  onOpenFile,
}) {
  const [tick, setTick] = useState(0)

  // Atualiza o "há X segundos" a cada 5s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const isLive = mode === 'live'
  const fileName = currentFile ? currentFile.split(/[\\/]/).pop() : null

  return (
    <header
      className={`
        flex items-center justify-between px-4 py-2.5
        border-b border-purple-dark
        bg-bg-dark
        transition-colors duration-300
        ${isFlashing ? 'animate-flash' : ''}
      `}
    >
      {/* Logo / título */}
      <div className="flex items-center gap-3">
        <span className="font-pixel text-2xl text-blood tracking-wider">MEWGENICS</span>
        <span className="font-pixel text-xl text-muted">CAT MANAGER</span>
        {useMock && (
          <span className="text-xs bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/40 px-2 py-0.5 rounded font-mono">
            MOCK DATA
          </span>
        )}
      </div>

      {/* Status central */}
      <div className="flex items-center gap-4">
        {/* Modo badge */}
        <div
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded border font-mono text-sm
            ${isLive
              ? 'border-neon-green/50 bg-neon-green/10 text-neon-green'
              : 'border-muted/50 bg-bg-card text-muted'
            }
          `}
        >
          {isLive ? (
            <>
              <span
                className="w-2 h-2 rounded-full bg-neon-green animate-pulse-green"
                style={{ boxShadow: '0 0 6px #00ff88' }}
              />
              <span>LIVE — monitorando</span>
            </>
          ) : (
            <>
              <span className="text-base">📁</span>
              <span>Save Manual</span>
            </>
          )}
        </div>

        {/* Info do arquivo */}
        {fileName && (
          <div className="text-xs font-mono text-muted truncate max-w-[200px]">
            {fileName}
          </div>
        )}

        {/* Última atualização */}
        {lastUpdate && (
          <div className="text-xs font-mono text-muted/70">
            {/* tick força re-render periódico */}
            {tick >= 0 && `Atualizado ${formatDistanceToNow(lastUpdate)}`}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2">
        {isElectron && (
          <>
            <button
              onClick={onOpenFile}
              className="
                px-3 py-1.5 text-sm font-mono border border-muted/40
                bg-bg-card hover:bg-bg-hover text-muted hover:text-white
                rounded transition-colors
              "
            >
              Abrir Save
            </button>
            <button
              onClick={onToggleMode}
              className={`
                px-3 py-1.5 text-sm font-mono border rounded transition-colors
                ${isLive
                  ? 'border-blood/60 bg-blood/20 hover:bg-blood/30 text-blood-light'
                  : 'border-neon-green/50 bg-neon-green/10 hover:bg-neon-green/20 text-neon-green'
                }
              `}
            >
              {isLive ? '⏹ Parar Live' : '▶ Modo Live'}
            </button>
          </>
        )}
      </div>
    </header>
  )
}
