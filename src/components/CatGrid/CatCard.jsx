// Ícones de stat idênticos ao jogo Mewgenics
const STAT_ICONS = {
  STR:  '♠',  // Spades   — força
  DEX:  '♣',  // Clubs    — destreza
  CON:  '♥',  // Hearts   — constituição
  INT:  '♦',  // Diamonds — inteligência
  SPD:  '🐾', // Pata     — velocidade
  CHA:  '💋', // Beijo    — carisma
  LUCK: '★',  // Estrela  — sorte
}

const STAT_COLORS = {
  STR:  'text-red-400',
  DEX:  'text-green-400',
  CON:  'text-pink-400',
  INT:  'text-blue-400',
  SPD:  'text-yellow-400',
  CHA:  'text-purple-400',
  LUCK: 'text-amber-400',
}

const STATUS_CONFIG = {
  active:    { label: 'Ativo',      color: 'bg-neon-green/20 text-neon-green border-neon-green/40' },
  retired:   { label: 'Aposent.',   color: 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/40' },
  dead:      { label: 'Morto',      color: 'bg-muted/20 text-muted border-muted/30' },
  donated:   { label: 'Doado',      color: 'bg-neon-blue/20 text-neon-blue border-neon-blue/30' },
}

export default function CatCard({
  cat,
  isFavorite,
  tags,
  isSelected,
  isHighlighted,
  onSelect,
  onClick,
  onToggleFavorite,
}) {
  const status = STATUS_CONFIG[cat.status] || STATUS_CONFIG.active
  const ageDanger = cat.age >= 18
  const stats = cat.stats || {}
  const bonus = cat.bonusStats || {}

  return (
    <div
      onClick={() => onClick(cat)}
      className={`
        relative cursor-pointer animate-fade-in
        transition-all duration-200
        border rounded
        bg-bg-card hover:bg-bg-hover
        ${isSelected
          ? 'border-blood shadow-[0_0_12px_rgba(139,0,0,0.4)]'
          : 'border-purple-dark/60 hover:border-purple-mid/60'}
        ${isHighlighted ? 'ring-1 ring-neon-green/40' : ''}
        ${cat.status === 'dead' ? 'opacity-50' : ''}
      `}
    >
      {/* Topo: nome + classe + gênero */}
      <div className="flex items-start justify-between px-2.5 pt-2 pb-1.5 border-b border-purple-dark/40">
        <div className="min-w-0 flex-1">
          <div className="font-pixel text-base text-white leading-tight truncate">{cat.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-mono text-muted/80">
              {cat.class || 'Unknown'}
              {cat.classLevel > 0 ? ` Lv.${cat.classLevel}` : ''}
            </span>
            {cat.gender && (
              <span className={`text-[11px] font-mono ${cat.gender === 'F' ? 'text-pink-400' : 'text-blue-400'}`}>
                {cat.gender === 'M' ? '♂' : cat.gender === 'F' ? '♀' : '~'}
              </span>
            )}
          </div>
        </div>

        {/* Botões do canto */}
        <div className="flex flex-col items-end gap-0.5 ml-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(cat.id) }}
            className="text-sm opacity-50 hover:opacity-100 transition-opacity leading-none"
            title={isFavorite ? 'Remover favorito' : 'Favoritar'}
          >
            {isFavorite ? '⭐' : '☆'}
          </button>
          {ageDanger && cat.status !== 'dead' && (
            <span className="text-[10px]" title={`Idade ${cat.age}`}>⚠️</span>
          )}
        </div>
      </div>

      {/* Status + idade */}
      <div className="flex items-center gap-1.5 px-2.5 py-1">
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${status.color}`}>
          {status.label}
        </span>
        {cat.age > 0 && (
          <span className={`text-[10px] font-mono ${ageDanger ? 'text-neon-yellow' : 'text-muted/60'}`}>
            Dia {cat.age}
          </span>
        )}
        {cat.room && cat.room !== 'Unknown' && (
          <span className="text-[10px] font-mono text-muted/50 truncate">· {cat.room}</span>
        )}
      </div>

      {/* Stats — grid 7 colunas estilo jogo */}
      <div className="px-2 pb-1.5">
        <div
          className="grid gap-px rounded overflow-hidden border border-purple-dark/30"
          style={{ gridTemplateColumns: `repeat(${Object.keys(stats).length || 7}, 1fr)` }}
        >
          {Object.entries(stats).map(([stat, base]) => {
            const bon = bonus[stat] || 0
            const total = base + bon
            return (
              <div
                key={stat}
                className="bg-bg-deep/80 px-0.5 py-1 text-center"
                title={`${stat}: base ${base}${bon !== 0 ? ` + bônus ${bon}` : ''}`}
              >
                <div className={`text-[11px] leading-none mb-0.5 ${STAT_COLORS[stat] || 'text-white'}`}>
                  {STAT_ICONS[stat] || stat}
                </div>
                <div className="text-[12px] font-mono font-bold text-white leading-none">
                  {total}
                </div>
                {bon !== 0 && (
                  <div className={`text-[9px] font-mono leading-none ${bon > 0 ? 'text-neon-green' : 'text-blood-light'}`}>
                    {bon > 0 ? `+${bon}` : bon}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Abilities */}
      {cat.abilities?.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
          {cat.abilities.slice(0, 3).map((a) => (
            <span
              key={a}
              className="text-[9px] font-mono bg-purple-dark/60 text-purple-light px-1.5 py-0.5 rounded"
            >
              {a}
            </span>
          ))}
          {cat.abilities.length > 3 && (
            <span className="text-[9px] font-mono text-muted/50">+{cat.abilities.length - 3}</span>
          )}
        </div>
      )}

      {/* Mutations */}
      {cat.mutations?.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
          {cat.mutations.slice(0, 2).map((m) => (
            <span
              key={m}
              className="text-[9px] font-mono bg-neon-blue/10 text-neon-blue border border-neon-blue/20 px-1.5 py-0.5 rounded"
            >
              {m}
            </span>
          ))}
          {cat.mutations.length > 2 && (
            <span className="text-[9px] font-mono text-muted/50">+{cat.mutations.length - 2}</span>
          )}
        </div>
      )}

      {/* Tags */}
      {tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pb-2">
          {tags.map((t) => (
            <span
              key={t}
              className="text-[9px] font-mono bg-purple-light/20 text-purple-light border border-purple-light/30 px-1.5 py-0.5 rounded"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Checkbox comparação */}
      <div
        onClick={(e) => { e.stopPropagation(); onSelect(cat.id) }}
        className={`
          absolute bottom-1.5 right-1.5 w-4 h-4 rounded border text-[9px]
          flex items-center justify-center cursor-pointer
          ${isSelected ? 'bg-blood border-blood text-white' : 'border-muted/30 hover:border-muted'}
        `}
      >
        {isSelected && '✓'}
      </div>
    </div>
  )
}
