const STAT_KEYS = ['STR', 'DEX', 'INT', 'VIT', 'LCK']

export default function CompareModal({ cats, onClose }) {
  if (!cats || cats.length < 2) return null

  // Para cada stat, encontrar o maior valor
  const maxStats = {}
  for (const stat of STAT_KEYS) {
    maxStats[stat] = Math.max(...cats.map((c) => (c.stats || {})[stat] || 0))
  }

  // Habilidades únicas por gato
  const allAbilities = [...new Set(cats.flatMap((c) => c.abilities || []))]
  const allMutations = [...new Set(cats.flatMap((c) => c.mutations || []))]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-bg-dark border border-purple-dark rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-dark/60">
          <span className="font-pixel text-xl text-blood">COMPARAÇÃO DE GATOS</span>
          <button onClick={onClose} className="text-muted hover:text-white text-lg">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs font-mono">
            {/* Nomes */}
            <thead>
              <tr className="border-b border-purple-dark/40">
                <th className="px-4 py-3 text-left text-muted/70 w-28">Atributo</th>
                {cats.map((cat) => (
                  <th key={cat.id} className="px-4 py-3 text-center">
                    <div className="font-pixel text-lg text-white">{cat.name}</div>
                    <div className="text-muted text-xs">{cat.class}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Info básica */}
              <SectionRow label="Status" cats={cats} getValue={(c) => c.status} />
              <SectionRow label="Cômodo" cats={cats} getValue={(c) => c.room} />
              <SectionRow label="Idade" cats={cats} getValue={(c) => c.age} warnFn={(v) => v >= 18} />

              {/* Divisor Stats */}
              <tr>
                <td colSpan={cats.length + 1} className="px-4 py-2 bg-purple-dark/20">
                  <span className="text-xs font-mono text-muted/70 uppercase tracking-wider">Stats</span>
                </td>
              </tr>

              {/* Cada stat */}
              {STAT_KEYS.map((stat) => (
                <tr key={stat} className="border-b border-purple-dark/20 hover:bg-bg-hover">
                  <td className="px-4 py-2 text-muted/70">{stat}</td>
                  {cats.map((cat) => {
                    const val = (cat.stats || {})[stat] || 0
                    const isBest = val === maxStats[stat] && cats.length > 1
                    return (
                      <td key={cat.id} className="px-4 py-2 text-center">
                        <span className={`font-bold text-sm ${isBest ? 'text-neon-green' : 'text-white/70'}`}>
                          {val}
                          {isBest && <span className="ml-0.5 text-xs">★</span>}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Divisor Habilidades */}
              <tr>
                <td colSpan={cats.length + 1} className="px-4 py-2 bg-purple-dark/20">
                  <span className="text-xs font-mono text-muted/70 uppercase tracking-wider">Habilidades</span>
                </td>
              </tr>

              {allAbilities.map((ability) => (
                <tr key={ability} className="border-b border-purple-dark/10 hover:bg-bg-hover">
                  <td className="px-4 py-1.5 text-white/80">{ability}</td>
                  {cats.map((cat) => {
                    const has = (cat.abilities || []).includes(ability)
                    const isUnique = has && cats.filter((c) => (c.abilities || []).includes(ability)).length === 1
                    return (
                      <td key={cat.id} className="px-4 py-1.5 text-center">
                        {has ? (
                          <span className={isUnique ? 'text-neon-yellow font-bold' : 'text-neon-green'}>
                            {isUnique ? '★' : '✓'}
                          </span>
                        ) : (
                          <span className="text-muted/30">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Divisor Mutações */}
              {allMutations.length > 0 && (
                <>
                  <tr>
                    <td colSpan={cats.length + 1} className="px-4 py-2 bg-purple-dark/20">
                      <span className="text-xs font-mono text-muted/70 uppercase tracking-wider">Mutações Genéticas</span>
                    </td>
                  </tr>
                  {allMutations.map((mut) => (
                    <tr key={mut} className="border-b border-purple-dark/10 hover:bg-bg-hover">
                      <td className="px-4 py-1.5 text-neon-blue/80">{mut}</td>
                      {cats.map((cat) => {
                        const has = (cat.mutations || []).includes(mut)
                        const isUnique = has && cats.filter((c) => (c.mutations || []).includes(mut)).length === 1
                        return (
                          <td key={cat.id} className="px-4 py-1.5 text-center">
                            {has ? (
                              <span className={isUnique ? 'text-neon-yellow font-bold' : 'text-neon-blue'}>
                                {isUnique ? '★' : '✓'}
                              </span>
                            ) : (
                              <span className="text-muted/30">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 border-t border-purple-dark/40 text-xs font-mono text-muted/50">
          ★ = maior valor / único neste gato &nbsp;|&nbsp; ✓ = presente &nbsp;|&nbsp; — = ausente
        </div>
      </div>
    </div>
  )
}

function SectionRow({ label, cats, getValue, warnFn }) {
  return (
    <tr className="border-b border-purple-dark/20 hover:bg-bg-hover">
      <td className="px-4 py-2 text-muted/70">{label}</td>
      {cats.map((cat) => {
        const val = getValue(cat)
        const warn = warnFn?.(val)
        return (
          <td key={cat.id} className={`px-4 py-2 text-center ${warn ? 'text-neon-yellow font-bold' : 'text-white/70'}`}>
            {String(val)}
          </td>
        )
      })}
    </tr>
  )
}
