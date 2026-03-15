import { useState } from 'react'

// Ícones e cores de stat idênticos ao jogo
const STAT_META = {
  STR:  { icon: '♠', color: 'text-red-400',    bg: 'bg-red-500',    label: 'STR' },
  DEX:  { icon: '♣', color: 'text-green-400',  bg: 'bg-green-500',  label: 'DEX' },
  CON:  { icon: '♥', color: 'text-pink-400',   bg: 'bg-pink-500',   label: 'CON' },
  INT:  { icon: '♦', color: 'text-blue-400',   bg: 'bg-blue-500',   label: 'INT' },
  SPD:  { icon: '🐾', color: 'text-yellow-400', bg: 'bg-yellow-500', label: 'SPD' },
  CHA:  { icon: '💋', color: 'text-purple-400', bg: 'bg-purple-500', label: 'CHA' },
  LUCK: { icon: '★', color: 'text-amber-400',  bg: 'bg-amber-500',  label: 'LCK' },
}

const STATUS_CONFIG = {
  active:  { label: 'Ativo',    cls: 'text-neon-green  border-neon-green/40  bg-neon-green/10' },
  retired: { label: 'Aposent.', cls: 'text-neon-yellow border-neon-yellow/40 bg-neon-yellow/10' },
  dead:    { label: 'Morto',    cls: 'text-muted       border-muted/30       bg-muted/10' },
  donated: { label: 'Doado',    cls: 'text-neon-blue   border-neon-blue/30   bg-neon-blue/10' },
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
  const stats = cat.stats || {}
  const bonus = cat.bonusStats || {}
  const maxBase = Math.max(...Object.values(stats), 1)

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
        <span className="font-pixel text-base text-muted tracking-wider">FICHA</span>
        <button onClick={onClose} className="text-muted/50 hover:text-white text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Nome + classe — estilo título do jogo */}
        <div className="px-3 pt-3 pb-2 border-b border-purple-dark/30">
          <div className="font-pixel text-xl text-white leading-tight">{cat.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono text-muted">
              {cat.class || 'Unknown'}
              {cat.classLevel > 0 ? ` Lv.${cat.classLevel}` : ''}
            </span>
            {cat.gender && (
              <span className={`text-sm font-mono ${cat.gender === 'F' ? 'text-pink-400' : 'text-blue-400'}`}>
                {cat.gender === 'M' ? '♂ Macho' : cat.gender === 'F' ? '♀ Fêmea' : cat.gender}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${status.cls}`}>
              {status.label}
            </span>
            {cat.age > 0 && (
              <span className={`text-xs font-mono ${cat.age >= 18 ? 'text-neon-yellow font-bold' : 'text-muted/70'}`}>
                Dia {cat.age}{cat.age >= 18 ? ' ⚠' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Stats — layout 3 colunas: ícone | barra+base | bônus */}
        <div className="px-3 py-2 border-b border-purple-dark/30">
          <div className="text-[10px] font-mono text-muted/60 uppercase tracking-widest mb-2 flex justify-between">
            <span>Stat</span>
            <span>Base</span>
            <span>Bônus</span>
            <span>Total</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(stats).map(([stat, base]) => {
              const bon = bonus[stat] || 0
              const total = base + bon
              const meta = STAT_META[stat] || { icon: stat, color: 'text-white', bg: 'bg-white', label: stat }
              return (
                <div key={stat} className="flex items-center gap-1.5">
                  {/* Ícone + label */}
                  <div className="flex items-center gap-1 w-10 shrink-0">
                    <span className={`text-sm leading-none ${meta.color}`}>{meta.icon}</span>
                    <span className="text-[10px] font-mono text-muted/70">{meta.label}</span>
                  </div>

                  {/* Barra */}
                  <div className="flex-1 h-1.5 bg-bg-deep rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${meta.bg} transition-all opacity-80`}
                      style={{ width: `${(base / maxBase) * 100}%` }}
                    />
                  </div>

                  {/* Valores: base | bônus | total */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-mono text-white/80 w-4 text-right">{base}</span>
                    <span className={`text-[10px] font-mono w-6 text-center ${bon > 0 ? 'text-neon-green' : bon < 0 ? 'text-blood-light' : 'text-muted/30'}`}>
                      {bon !== 0 ? (bon > 0 ? `+${bon}` : bon) : '—'}
                    </span>
                    <span className={`text-xs font-mono font-bold w-4 text-right ${total !== base ? 'text-neon-yellow' : 'text-white/60'}`}>
                      {total}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Room */}
        {cat.room && cat.room !== 'Unknown' && (
          <div className="px-3 py-1.5 border-b border-purple-dark/30">
            <span className="text-[10px] font-mono text-muted/60 uppercase tracking-wider">Cômodo</span>
            <div className="text-xs font-mono text-white/80 mt-0.5">📍 {cat.room}</div>
          </div>
        )}

        {/* Habilidades */}
        {cat.abilities?.length > 0 && (
          <div className="px-3 py-2 border-b border-purple-dark/30">
            <div className="text-[10px] font-mono text-muted/60 uppercase tracking-wider mb-1.5">Habilidades</div>
            <div className="flex flex-wrap gap-1">
              {cat.abilities.map((a) => (
                <span
                  key={a}
                  className="text-[10px] font-mono bg-purple-dark/80 text-purple-light px-2 py-0.5 rounded border border-purple-mid/30"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mutações */}
        {cat.mutations?.length > 0 && (
          <div className="px-3 py-2 border-b border-purple-dark/30">
            <div className="text-[10px] font-mono text-muted/60 uppercase tracking-wider mb-1.5">Mutações</div>
            <div className="flex flex-wrap gap-1">
              {cat.mutations.map((m) => (
                <span
                  key={m}
                  className="text-[10px] font-mono bg-neon-blue/10 text-neon-blue border border-neon-blue/30 px-2 py-0.5 rounded"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Favorito + Tags */}
        <div className="px-3 py-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted/60 uppercase tracking-wider">Favorito</span>
            <button onClick={() => onToggleFavorite(cat.id)} className="text-xl hover:scale-110 transition-transform">
              {isFavorite ? '⭐' : '☆'}
            </button>
          </div>

          <div>
            <div className="text-[10px] font-mono text-muted/60 uppercase tracking-wider mb-1.5">Tags</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags?.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-mono bg-purple-light/20 text-purple-light border border-purple-light/30 px-1.5 py-0.5 rounded flex items-center gap-1"
                >
                  #{t}
                  <button
                    onClick={() => onRemoveTag(cat.id, t)}
                    className="text-purple-light/50 hover:text-blood leading-none"
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
      </div>
    </aside>
  )
}
