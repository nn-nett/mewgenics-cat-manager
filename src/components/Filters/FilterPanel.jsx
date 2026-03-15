import { useState } from 'react'

const STATUS_LABELS = { active: 'Ativo', retired: 'Aposentado', dead: 'Morto' }
const STATUS_COLORS = {
  active: 'text-neon-green border-neon-green/40',
  retired: 'text-neon-yellow border-neon-yellow/40',
  dead: 'text-muted border-muted/40',
}

export default function FilterPanel({ options, filters, onFiltersChange, totalCount, filteredCount, favorites, tags }) {
  const [expandedSections, setExpandedSections] = useState({
    status: true,
    class: true,
    room: true,
    stats: false,
    abilities: false,
    mutations: false,
    tags: false,
  })

  const toggle = (section) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))

  const set = (key, value) => onFiltersChange({ ...filters, [key]: value })

  const toggleArrayItem = (key, item) => {
    const current = filters[key] || []
    const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
    set(key, next)
  }

  const allTags = [...new Set(Object.values(tags).flat())].sort()

  const hasActiveFilters =
    filters.statuses?.length > 0 ||
    filters.classes?.length > 0 ||
    filters.rooms?.length > 0 ||
    filters.abilities?.length > 0 ||
    filters.mutations?.length > 0 ||
    filters.tagFilters?.length > 0 ||
    filters.onlyFavorites

  return (
    <aside className="w-56 flex-shrink-0 bg-bg-dark border-r border-purple-dark/50 flex flex-col overflow-hidden">
      {/* Header da sidebar */}
      <div className="px-3 py-2.5 border-b border-purple-dark/50 flex items-center justify-between">
        <span className="font-pixel text-lg text-muted">FILTROS</span>
        <span className="text-xs font-mono text-muted/60">
          {filteredCount}/{totalCount}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Favoritos */}
        <Section label="⭐ Favoritos" open={true} onToggle={() => {}}>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.onlyFavorites || false}
              onChange={(e) => set('onlyFavorites', e.target.checked)}
              className="accent-neon-yellow"
            />
            <span className="text-xs font-mono text-muted group-hover:text-white transition-colors">
              Apenas favoritos
            </span>
          </label>
        </Section>

        {/* Status — mortos e donated são sempre ocultados */}
        <Section label="Status" open={expandedSections.status} onToggle={() => toggle('status')}>
          {options.statuses
            .filter((s) => s !== 'dead' && s !== 'donated')
            .map((s) => (
              <CheckItem
                key={s}
                label={STATUS_LABELS[s] || s}
                checked={(filters.statuses || []).includes(s)}
                onChange={() => toggleArrayItem('statuses', s)}
                colorClass={STATUS_COLORS[s]}
              />
            ))}
        </Section>

        {/* Classe */}
        <Section label="Classe" open={expandedSections.class} onToggle={() => toggle('class')}>
          {options.classes.map((c) => (
            <CheckItem
              key={c}
              label={c}
              checked={(filters.classes || []).includes(c)}
              onChange={() => toggleArrayItem('classes', c)}
            />
          ))}
        </Section>

        {/* Cômodo */}
        <Section label="Cômodo" open={expandedSections.room} onToggle={() => toggle('room')}>
          {options.rooms.map((r) => (
            <CheckItem
              key={r}
              label={r}
              checked={(filters.rooms || []).includes(r)}
              onChange={() => toggleArrayItem('rooms', r)}
            />
          ))}
        </Section>

        {/* Stats (sliders) */}
        <Section label="Stats" open={expandedSections.stats} onToggle={() => toggle('stats')}>
          {Object.entries(options.statRanges || {}).map(([stat, range]) => (
            <StatSlider
              key={stat}
              stat={stat}
              min={range.min}
              max={range.max}
              value={filters.statRanges?.[stat] || [range.min, range.max]}
              onChange={(val) =>
                set('statRanges', { ...(filters.statRanges || {}), [stat]: val })
              }
            />
          ))}
        </Section>

        {/* Habilidades */}
        <Section label="Habilidades" open={expandedSections.abilities} onToggle={() => toggle('abilities')}>
          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
            {options.abilities.map((a) => (
              <CheckItem
                key={a}
                label={a}
                checked={(filters.abilities || []).includes(a)}
                onChange={() => toggleArrayItem('abilities', a)}
              />
            ))}
          </div>
        </Section>

        {/* Mutações */}
        <Section label="Mutações" open={expandedSections.mutations} onToggle={() => toggle('mutations')}>
          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
            {options.mutations.map((m) => (
              <CheckItem
                key={m}
                label={m}
                checked={(filters.mutations || []).includes(m)}
                onChange={() => toggleArrayItem('mutations', m)}
                colorClass="text-neon-blue"
              />
            ))}
          </div>
        </Section>

        {/* Tags */}
        {allTags.length > 0 && (
          <Section label="Tags" open={expandedSections.tags} onToggle={() => toggle('tags')}>
            {allTags.map((t) => (
              <CheckItem
                key={t}
                label={t}
                checked={(filters.tagFilters || []).includes(t)}
                onChange={() => toggleArrayItem('tagFilters', t)}
                colorClass="text-purple-light"
              />
            ))}
          </Section>
        )}
      </div>

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <div className="p-2 border-t border-purple-dark/50">
          <button
            onClick={() => onFiltersChange({})}
            className="w-full py-1.5 text-xs font-mono text-blood hover:text-blood-light border border-blood/30 hover:border-blood/60 rounded transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </aside>
  )
}

function Section({ label, open, onToggle, children }) {
  return (
    <div className="border-b border-purple-dark/30">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-hover transition-colors"
      >
        <span className="text-xs font-mono text-muted uppercase tracking-wider">{label}</span>
        <span className="text-muted text-xs">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1.5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

function CheckItem({ label, checked, onChange, colorClass = 'text-white/80' }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-blood flex-shrink-0"
      />
      <span className={`text-xs font-mono truncate transition-colors group-hover:text-white ${checked ? colorClass : 'text-muted'}`}>
        {label}
      </span>
    </label>
  )
}

function StatSlider({ stat, min, max, value, onChange }) {
  if (min === max) return null
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono text-muted/70">
        <span>{stat}</span>
        <span>{value[0]}–{value[1]}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value[0]}
        onChange={(e) => onChange([Number(e.target.value), value[1]])}
        className="w-full h-1 accent-blood"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value[1]}
        onChange={(e) => onChange([value[0], Number(e.target.value)])}
        className="w-full h-1 accent-blood"
      />
    </div>
  )
}
