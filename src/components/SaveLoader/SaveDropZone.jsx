import { useState, useRef } from 'react'

export default function SaveDropZone({ onLoad, isLoading }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.sav') && !file.name.endsWith('.db')) {
      setError('Arquivo inválido. Selecione um .sav do Mewgenics.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => onLoad(e.target.result, file.name)
    reader.onerror = () => setError('Erro ao ler o arquivo.')
    reader.readAsArrayBuffer(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      {/* Título */}
      <div className="text-center">
        <div className="font-pixel text-4xl text-blood mb-1">MEWGENICS</div>
        <div className="font-pixel text-2xl text-muted">CAT MANAGER</div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          w-full max-w-md border-2 border-dashed rounded-lg p-10
          flex flex-col items-center gap-3 cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-neon-green bg-neon-green/10 shadow-[0_0_20px_rgba(0,255,136,0.2)]'
            : 'border-purple-mid/60 bg-purple-dark/20 hover:border-purple-light/60 hover:bg-purple-dark/40'
          }
        `}
      >
        <span className="text-4xl">{isLoading ? '⏳' : '💾'}</span>
        {isLoading ? (
          <span className="font-mono text-sm text-neon-green animate-pulse">
            Carregando gatos...
          </span>
        ) : (
          <>
            <span className="font-mono text-sm text-white/70 text-center">
              Arraste o arquivo <span className="text-neon-green font-bold">steamcampaign01.sav</span> aqui
            </span>
            <span className="font-mono text-xs text-muted/60 text-center">
              ou clique para selecionar
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".sav,.db"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Caminho do save */}
      <div className="w-full max-w-md bg-bg-card border border-purple-dark/40 rounded p-3">
        <div className="text-xs font-mono text-muted/60 mb-1">📂 Onde fica o save:</div>
        <code className="text-xs text-neon-green/80 break-all">
          %APPDATA%\Roaming\Glaiel Games\Mewgenics\<span className="text-neon-yellow">[SEU_STEAM_ID]</span>\saves\steamcampaign01.sav
        </code>
        <div className="mt-2 text-xs font-mono text-muted/50">
          Cole esse caminho no Windows Explorer para encontrar o arquivo.
        </div>
      </div>

      {error && (
        <div className="text-sm font-mono text-blood-light bg-blood/10 border border-blood/30 rounded px-4 py-2">
          ⚠️ {error}
        </div>
      )}

      {/* Dica: usar mock */}
      <button
        onClick={() => onLoad(null, null)}
        className="text-xs font-mono text-muted/50 hover:text-muted underline"
      >
        Usar dados de demonstração (mock) →
      </button>
    </div>
  )
}
