import { useState } from 'react'

const STAT_COLORS = {
  STR: 'bg-red-500', DEX: 'bg-green-500', INT: 'bg-blue-500',
  VIT: 'bg-orange-500', LCK: 'bg-purple-500',
}

const STATUS_CONFIG = {
  active: { label: 'Ativo', cls: 'text-neon-green border-neon-green/40 bg-neon-green/10' },
  retired: { label: 'Aposentado', cls: 'text-neon-yellow border-neon-yellow/40 bg-neon-yellow/10' },
  dead: { label: 'Morto', cls: 'text-muted border-muted/30 bg-muted/10' },
}

export default function DetailSidebar({ cat, isFavorite, tags, onToggleFavorite, onAddTag, onRemoveTag, onClose }) {
  const [newTag, setNewTag] = useState('')

  if (!cat) {
    return (
      <aside className="w-64 flex-shrink-0 bg-bg-dark border-l border-purple-dark/50 flex items-center justify-center">
        <p className="text-muted/50 font-mono text-xs text-center px-4">
          Clique em um gato para ver detalhes
        </p>
      </aside>
    )
  }

  const status = STATUS_CONFIG[cat.status] || STATUS_CONFIG.active
  const maxStat = Math.max(...Object.values(cat.stats || {}))

  const handleAddTag = (e) => {
    e.preventDefault()
    if (!newTag.trim()) return
    onAddTag(cat.id, newTag.trim())
    setNewTag('')
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-bg-dark border-l border-purple-dark/50 flex flex-col overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-purple-dark/50 flex items-center justify-between">
        <span className="font-pixel text-lg text-muted">FICHA</span>
        <button onClick={onClose} className="text-muted/50 hover:text-white text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Cabeçalho do gato */}
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-lg mx-auto mb-2 flex items-center justify-center text-4xl border border-purple-dark/60"
            style={{ backgroundColor: cat.color ? `${cat.color}22` : '#1a0a2e55' }}
          >
            🐱
          </div>
          <div className="font-pixel text-2xl text-white">{cat.name}</div>
          <div className="text-sm font-mono text-muted mb-1">{cat.class}</div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${status.cls}`}>
            {status.label}
          </span>
        </div>

        {/* Info básica */}
        <div className="bg-bg-card rounded p-2 space-y-1 text-xs font-mono">
          <InfoRow label="Cômodo" value={cat.room} />
          <InfoRow label="Idade" value={cat.age} warn={cat.age >= 18} />
          {cat.gender && <InfoRow label="Gênero" value={cat.gender === 'M' ? 'Macho' : cat.gender === 'F' ? 'Fêmea' : cat.gender} />}
        </div>

        {/* Stats com barras */}
        <div>
          <div className="text-xs font-mono text-muted/70 uppercase tracking-wider mb-2">Stats</div>
          <div className="space-y-1.5">
            {Object.entries(cat.stats || {}).map(([stat, val]) => (
              <div key={stat} className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted/70 w-8">{stat}</span>
                <div className="flex-1 h-1.5 bg-bg-deep rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STAT_COLORS[stat] || 'bg-white'} transition-all`}
                    style={{ width: `${(val / Math.max(maxStat, 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white w-5 text-right">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Habilidades */}
        {cat.abilities?.length > 0 && (
          <div>
            <div className="text-xs font-mono text-muted/70 uppercase tracking-wider mb-2">Habilidades</div>
            <div className="flex flex-wrap gap-1">
              {cat.abilities.map((a) => (
                <span key={a} className="text-xs font-mono bg-purple-dark/80 text-purple-light px-2 py-1 rounded border border-purple-mid/40">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mutações */}
        {cat.mutations?.length > 0 && (
          <div>
            <div className="text-xs font-mono text-muted/70 uppercase tracking-wider mb-2">
              Mutações Genéticas
            </div>
            <div className="flex flex-wrap gap-1">
              {cat.mutations.map((m) => (
                <span key={m} className="text-xs font-mono bg-neon-blue/10 text-neon-blue border border-neon-blue/30 px-2 py-1 rounded">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Favorito */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted/70">Favorito</span>
          <button
            onClick={() => onToggleFavorite(cat.id)}
            className="text-xl transition-transform hover:scale-110"
          >
            {isFavorite ? '⭐' : '☆'}
          </button>
        </div>

        {/* Tags */}
        <div>
          <div className="text-xs font-mono text-muted/70 uppercase tracking-wider mb-2">Tags</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {tags?.map((t) => (
              <span
                key={t}
                className="text-xs font-mono bg-purple-light/20 text-purple-light border border-purple-light/30 px-2 py-0.5 rounded flex items-center gap-1"
              >
                #{t}
                <button
                  onClick={() => onRemoveTag(cat.id, t)}
                  className="text-purple-light/50 hover:text-blood text-xs"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddTag} className="flex gap-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="nova tag..."
              className="flex-1 bg-bg-deep border border-purple-dark/60 rounded px-2 py-1 text-xs font-mono text-white placeholder-muted/40 focus:outline-none focus:border-purple-mid"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-purple-dark hover:bg-purple-mid text-white text-xs rounded transition-colors"
            >
              +
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}

function InfoRow({ label, value, warn }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted/70">{label}</span>
      <span className={warn ? 'text-neon-yellow font-bold' : 'text-white/80'}>{value}</span>
    </div>
  )
}
