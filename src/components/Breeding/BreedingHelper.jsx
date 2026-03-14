import { useState, useMemo } from 'react'

/**
 * Breeding Helper — prevê habilidades e mutações herdáveis.
 *
 * SUPOSIÇÃO DOCUMENTADA: Como as regras exatas de herança do Mewgenics
 * não são publicamente documentadas, usamos as seguintes heurísticas:
 * - Stats dos filhotes: média dos pais ± 20% de variação aleatória
 * - Abilities: cada habilidade de qualquer dos pais tem chance de herança
 * - Mutations: cada mutação tem chance de ser passada (estimado: ~50%)
 * - Mutações únicas de um pai têm chance menor (~30%)
 * - Mutações compartilhadas têm chance maior (~80%)
 */

export default function BreedingHelper({ cats, onClose }) {
  const [fatherId, setFatherId] = useState('')
  const [motherId, setMotherId] = useState('')

  const activeCats = cats.filter((c) => c.status === 'active')

  const father = activeCats.find((c) => c.id === fatherId)
  const mother = activeCats.find((c) => c.id === motherId)

  const prediction = useMemo(() => {
    if (!father || !mother) return null
    return predictOffspring(father, mother)
  }, [father, mother])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-bg-dark border border-purple-dark rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-dark/60">
          <span className="font-pixel text-xl text-blood">🐾 BREEDING HELPER</span>
          <button onClick={onClose} className="text-muted hover:text-white text-lg">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Seleção de pais */}
          <div className="grid grid-cols-2 gap-4">
            <CatPicker
              label="🐱 Pai"
              cats={activeCats}
              value={fatherId}
              onChange={setFatherId}
              exclude={motherId}
            />
            <CatPicker
              label="🐱 Mãe"
              cats={activeCats}
              value={motherId}
              onChange={setMotherId}
              exclude={fatherId}
            />
          </div>

          {/* Cards dos pais */}
          {(father || mother) && (
            <div className="grid grid-cols-2 gap-4">
              {father && <ParentCard cat={father} label="Pai" />}
              {mother && <ParentCard cat={mother} label="Mãe" />}
            </div>
          )}

          {/* Aviso sobre heurística */}
          <div className="text-[10px] font-mono text-muted/50 bg-bg-card rounded p-2 border border-muted/10">
            ⚠️ As regras de herança do Mewgenics não são documentadas oficialmente.
            Estas previsões são estimativas heurísticas (média de stats, união de abilities/mutations com chances estimadas).
          </div>

          {/* Previsão */}
          {prediction && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-xs font-mono text-muted/70 uppercase tracking-wider border-b border-purple-dark/40 pb-1">
                Filhote Previsto
              </div>

              {/* Stats */}
              <div>
                <div className="text-xs font-mono text-muted/60 mb-1">Stats (média dos pais)</div>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(prediction.stats).map(([stat, val]) => (
                    <div key={stat} className="text-center bg-bg-card rounded p-1.5">
                      <div className="text-white font-bold font-mono">{val}</div>
                      <div className="text-[10px] text-muted/60 font-mono">{stat}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Abilities */}
              <div>
                <div className="text-xs font-mono text-muted/60 mb-1">Habilidades herdáveis</div>
                <div className="flex flex-wrap gap-1">
                  {prediction.abilities.map(({ name, chance, source }) => (
                    <AbilityBadge key={name} name={name} chance={chance} source={source} />
                  ))}
                </div>
              </div>

              {/* Mutations */}
              {prediction.mutations.length > 0 && (
                <div>
                  <div className="text-xs font-mono text-muted/60 mb-1">Mutações herdáveis</div>
                  <div className="flex flex-wrap gap-1">
                    {prediction.mutations.map(({ name, chance, source }) => (
                      <MutationBadge key={name} name={name} chance={chance} source={source} />
                    ))}
                  </div>
                </div>
              )}

              {/* Combinações raras */}
              {prediction.rareCombos.length > 0 && (
                <div className="bg-neon-yellow/10 border border-neon-yellow/30 rounded p-2">
                  <div className="text-xs font-mono text-neon-yellow mb-1">✨ Combinações Raras</div>
                  {prediction.rareCombos.map((combo) => (
                    <div key={combo} className="text-xs font-mono text-neon-yellow/80">• {combo}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!prediction && father && mother && (
            <div className="text-center text-muted font-mono text-sm py-4">
              Selecione pai e mãe para ver a previsão
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Lógica de previsão ───────────────────────────────────────────────────────

function predictOffspring(father, mother) {
  const stats = {}
  for (const stat of ['STR', 'DEX', 'INT', 'VIT', 'LCK']) {
    const avg = Math.round(((father.stats?.[stat] || 0) + (mother.stats?.[stat] || 0)) / 2)
    stats[stat] = avg
  }

  const fAbilities = new Set(father.abilities || [])
  const mAbilities = new Set(mother.abilities || [])
  const allAbilities = new Set([...fAbilities, ...mAbilities])

  const abilities = [...allAbilities].map((name) => {
    const inBoth = fAbilities.has(name) && mAbilities.has(name)
    return {
      name,
      chance: inBoth ? 'Alta' : 'Média',
      source: inBoth ? 'Ambos' : fAbilities.has(name) ? 'Pai' : 'Mãe',
    }
  })

  const fMutations = new Set(father.mutations || [])
  const mMutations = new Set(mother.mutations || [])
  const allMutations = new Set([...fMutations, ...mMutations])

  const mutations = [...allMutations].map((name) => {
    const inBoth = fMutations.has(name) && mMutations.has(name)
    return {
      name,
      chance: inBoth ? 'Alta (~80%)' : 'Baixa (~30%)',
      source: inBoth ? 'Ambos' : fMutations.has(name) ? 'Pai' : 'Mãe',
    }
  })

  // Combos raros: gato com 3+ mutações únicas de origens diferentes
  const rareCombos = []
  if (mutations.length >= 3) {
    rareCombos.push(`Combinação de ${mutations.length} mutações possível — filhote raro!`)
  }
  if (abilities.some((a) => a.source === 'Pai') && abilities.some((a) => a.source === 'Mãe')) {
    const exclusivas = abilities.filter((a) => a.source !== 'Ambos').length
    if (exclusivas >= 3) {
      rareCombos.push(`${exclusivas} habilidades exclusivas combinadas`)
    }
  }

  return { stats, abilities, mutations, rareCombos }
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CatPicker({ label, cats, value, onChange, exclude }) {
  return (
    <div>
      <label className="block text-xs font-mono text-muted/70 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-deep border border-purple-dark/60 rounded px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-purple-mid"
      >
        <option value="">— Selecionar —</option>
        {cats
          .filter((c) => c.id !== exclude)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.class})
            </option>
          ))}
      </select>
    </div>
  )
}

function ParentCard({ cat, label }) {
  return (
    <div className="bg-bg-card border border-purple-dark/40 rounded p-2">
      <div className="text-[10px] font-mono text-muted/60 mb-1">{label}</div>
      <div className="font-pixel text-base text-white">{cat.name}</div>
      <div className="text-xs font-mono text-muted">{cat.class} • Idade {cat.age}</div>
      <div className="flex gap-1 mt-1 flex-wrap">
        {Object.entries(cat.stats || {}).map(([s, v]) => (
          <span key={s} className="text-[10px] font-mono text-white/60">{s}:{v}</span>
        ))}
      </div>
    </div>
  )
}

function AbilityBadge({ name, chance, source }) {
  const color = chance === 'Alta' ? 'bg-neon-green/20 text-neon-green border-neon-green/40' : 'bg-purple-dark/60 text-purple-light border-purple-mid/40'
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${color}`} title={`Fonte: ${source} | Chance: ${chance}`}>
      {name}
    </span>
  )
}

function MutationBadge({ name, chance, source }) {
  const isHigh = chance.includes('80')
  const color = isHigh ? 'bg-neon-blue/20 text-neon-blue border-neon-blue/40' : 'bg-neon-blue/5 text-neon-blue/60 border-neon-blue/20'
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${color}`} title={`Fonte: ${source} | Chance: ${chance}`}>
      {name} <span className="text-[10px] opacity-60">{isHigh ? '~80%' : '~30%'}</span>
    </span>
  )
}
