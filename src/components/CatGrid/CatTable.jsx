const STATUS_COLORS = {
  active: 'text-neon-green',
  retired: 'text-neon-yellow',
  dead: 'text-muted',
}

const STAT_COLS = ['STR', 'DEX', 'INT', 'VIT', 'LCK']

export default function CatTable({
  cats,
  favorites,
  tags,
  selectedIds,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  onSelect,
  onToggleFavorite,
}) {
  const handleSort = (key) => {
    if (sortKey === key) {
      onSort(key, sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'asc')
    }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="text-muted/30 ml-1">⇅</span>
    return <span className="text-blood ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="border-b border-purple-dark/60 text-muted/70 uppercase tracking-wider">
            <th className="w-8 px-2 py-2"></th>
            <th className="w-8 px-1 py-2"></th>
            <th
              className="px-2 py-2 text-left cursor-pointer hover:text-white"
              onClick={() => handleSort('name')}
            >
              Nome <SortIcon col="name" />
            </th>
            <th
              className="px-2 py-2 text-left cursor-pointer hover:text-white"
              onClick={() => handleSort('class')}
            >
              Classe <SortIcon col="class" />
            </th>
            <th
              className="px-2 py-2 text-left cursor-pointer hover:text-white"
              onClick={() => handleSort('status')}
            >
              Status <SortIcon col="status" />
            </th>
            <th
              className="px-2 py-2 text-left cursor-pointer hover:text-white"
              onClick={() => handleSort('room')}
            >
              Cômodo <SortIcon col="room" />
            </th>
            <th
              className="px-2 py-2 text-center cursor-pointer hover:text-white"
              onClick={() => handleSort('age')}
            >
              Idade <SortIcon col="age" />
            </th>
            {STAT_COLS.map((s) => (
              <th
                key={s}
                className="px-2 py-2 text-center cursor-pointer hover:text-white"
                onClick={() => handleSort(`stats.${s}`)}
              >
                {s} <SortIcon col={`stats.${s}`} />
              </th>
            ))}
            <th className="px-2 py-2 text-left">Habilidades</th>
            <th className="px-2 py-2 text-left">Mutações</th>
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => {
            const isSelected = selectedIds.includes(cat.id)
            const isFavorite = favorites.includes(cat.id)
            const catTags = tags[cat.id] || []
            const ageDanger = cat.age >= 18

            return (
              <tr
                key={cat.id}
                onClick={() => onRowClick(cat)}
                className={`
                  border-b border-purple-dark/20 cursor-pointer
                  transition-colors hover:bg-bg-hover
                  ${isSelected ? 'bg-blood/10' : ''}
                  ${cat.status === 'dead' ? 'opacity-50' : ''}
                  animate-fade-in
                `}
              >
                {/* Checkbox */}
                <td className="px-2 py-1.5 text-center">
                  <div
                    onClick={(e) => { e.stopPropagation(); onSelect(cat.id) }}
                    className={`
                      w-3.5 h-3.5 rounded border mx-auto cursor-pointer flex items-center justify-center
                      ${isSelected ? 'bg-blood border-blood text-white' : 'border-muted/40 hover:border-muted'}
                    `}
                  >
                    {isSelected && <span className="text-[9px]">✓</span>}
                  </div>
                </td>

                {/* Favorito */}
                <td className="px-1 py-1.5 text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(cat.id) }}
                    className="text-xs opacity-50 hover:opacity-100"
                  >
                    {isFavorite ? '⭐' : '☆'}
                  </button>
                </td>

                {/* Nome */}
                <td className="px-2 py-1.5 font-pixel text-base text-white whitespace-nowrap">
                  {ageDanger && cat.status !== 'dead' && <span className="mr-1">⚠️</span>}
                  {cat.name}
                  {catTags.length > 0 && (
                    <span className="ml-1 text-purple-light/70 text-[10px]">
                      #{catTags.join(' #')}
                    </span>
                  )}
                </td>

                {/* Classe */}
                <td className="px-2 py-1.5 text-muted">{cat.class}</td>

                {/* Status */}
                <td className="px-2 py-1.5">
                  <span className={STATUS_COLORS[cat.status] || 'text-muted'}>
                    {cat.status === 'active' ? 'Ativo' : cat.status === 'retired' ? 'Aposent.' : 'Morto'}
                  </span>
                </td>

                {/* Cômodo */}
                <td className="px-2 py-1.5 text-muted/80">{cat.room}</td>

                {/* Idade */}
                <td className={`px-2 py-1.5 text-center ${ageDanger ? 'text-neon-yellow font-bold' : 'text-muted'}`}>
                  {cat.age}
                </td>

                {/* Stats */}
                {STAT_COLS.map((s) => (
                  <td key={s} className="px-2 py-1.5 text-center text-white/80">
                    {(cat.stats || {})[s] ?? '—'}
                  </td>
                ))}

                {/* Habilidades */}
                <td className="px-2 py-1.5 max-w-[150px]">
                  <div className="flex flex-wrap gap-0.5">
                    {(cat.abilities || []).map((a) => (
                      <span key={a} className="bg-purple-dark/60 text-purple-light px-1 rounded text-[10px]">
                        {a}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Mutações */}
                <td className="px-2 py-1.5 max-w-[150px]">
                  <div className="flex flex-wrap gap-0.5">
                    {(cat.mutations || []).map((m) => (
                      <span key={m} className="bg-neon-blue/10 text-neon-blue border border-neon-blue/20 px-1 rounded text-[10px]">
                        {m}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
