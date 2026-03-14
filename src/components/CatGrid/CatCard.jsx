const STATUS_CONFIG = {
  active: { label: 'Ativo', color: 'bg-neon-green/20 text-neon-green border-neon-green/40' },
  retired: { label: 'Aposent.', color: 'bg-neon-yellow/20 text-neon-yellow border-neon-yellow/40' },
  dead: { label: 'Morto', color: 'bg-muted/20 text-muted border-muted/30' },
}

const CLASS_ICONS = {
  Mage: '🔮', Warrior: '⚔️', Rogue: '🗡️', Cleric: '✨',
  Necromancer: '💀', Ranger: '🏹', Warlock: '🌑',
}

const STAT_COLORS = {
  STR: 'text-red-400', DEX: 'text-green-400', INT: 'text-blue-400',
  VIT: 'text-orange-400', LCK: 'text-purple-400',
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
  const classIcon = CLASS_ICONS[cat.class] || '🐱'
  const ageDanger = cat.age >= 18

  return (
    <div
      onClick={() => onClick(cat)}
      className={`
        relative p-3 rounded border cursor-pointer
        transition-all duration-200 animate-fade-in
        bg-bg-card hover:bg-bg-hover
        ${isSelected ? 'border-blood shadow-[0_0_12px_rgba(139,0,0,0.4)]' : 'border-purple-dark/60 hover:border-purple-mid/60'}
        ${isHighlighted ? 'ring-1 ring-neon-green/40' : ''}
        ${cat.status === 'dead' ? 'opacity-50' : ''}
      `}
    >
      {/* Indicador de idade perigosa */}
      {ageDanger && cat.status !== 'dead' && (
        <div className="absolute top-1.5 left-1.5 text-xs" title={`Idade ${cat.age} — em risco`}>
          ⚠️
        </div>
      )}

      {/* Favorito */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(cat.id) }}
        className="absolute top-1.5 right-1.5 text-sm opacity-50 hover:opacity-100 transition-opacity"
        title={isFavorite ? 'Remover favorito' : 'Favoritar'}
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

      {/* Checkbox de comparação */}
      <div
        onClick={(e) => { e.stopPropagation(); onSelect(cat.id) }}
        className={`
          absolute bottom-1.5 right-1.5 w-4 h-4 rounded border text-xs
          flex items-center justify-center cursor-pointer
          ${isSelected ? 'bg-blood border-blood text-white' : 'border-muted/40 hover:border-muted'}
        `}
      >
        {isSelected && '✓'}
      </div>

      {/* Sprite / Ícone */}
      <div className="flex items-center gap-2 mb-2 mt-1">
        <div
          className="w-10 h-10 rounded flex items-center justify-center text-2xl border border-purple-dark/40"
          style={{ backgroundColor: cat.color ? `${cat.color}22` : 'transparent' }}
        >
          {classIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-lg text-white truncate leading-tight">{cat.name}</div>
          <div className="text-xs font-mono text-muted">{cat.class}</div>
        </div>
      </div>

      {/* Status + Cômodo */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${status.color}`}>
          {status.label}
        </span>
        <span className="text-xs font-mono text-muted/70 truncate">📍 {cat.room}</span>
        {ageDanger && <span className="text-xs font-mono text-neon-yellow">Idade {cat.age}</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-0.5 mb-2">
        {Object.entries(cat.stats || {}).map(([stat, val]) => (
          <div key={stat} className="text-center">
            <div className={`text-xs font-mono font-bold ${STAT_COLORS[stat] || 'text-white'}`}>
              {val}
            </div>
            <div className="text-[10px] font-mono text-muted/60">{stat}</div>
          </div>
        ))}
      </div>

      {/* Abilities */}
      {cat.abilities?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {cat.abilities.slice(0, 3).map((a) => (
            <span key={a} className="text-[10px] font-mono bg-purple-dark/60 text-purple-light px-1.5 py-0.5 rounded">
              {a}
            </span>
          ))}
          {cat.abilities.length > 3 && (
            <span className="text-[10px] font-mono text-muted/50">+{cat.abilities.length - 3}</span>
          )}
        </div>
      )}

      {/* Mutações */}
      {cat.mutations?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cat.mutations.slice(0, 2).map((m) => (
            <span key={m} className="text-[10px] font-mono bg-neon-blue/10 text-neon-blue border border-neon-blue/20 px-1.5 py-0.5 rounded">
              {m}
            </span>
          ))}
          {cat.mutations.length > 2 && (
            <span className="text-[10px] font-mono text-muted/50">+{cat.mutations.length - 2}</span>
          )}
        </div>
      )}

      {/* Tags locais */}
      {tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map((t) => (
            <span key={t} className="text-[10px] font-mono bg-purple-light/20 text-purple-light border border-purple-light/30 px-1.5 py-0.5 rounded">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
