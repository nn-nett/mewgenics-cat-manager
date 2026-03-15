import { useState, useMemo } from 'react'
import LiveStatus from './components/Header/LiveStatus'
import FilterPanel from './components/Filters/FilterPanel'
import CatCard from './components/CatGrid/CatCard'
import CatTable from './components/CatGrid/CatTable'
import DetailSidebar from './components/CatDetail/DetailSidebar'
import CompareModal from './components/Compare/CompareModal'
import BreedingHelper from './components/Breeding/BreedingHelper'
import SaveDropZone from './components/SaveLoader/SaveDropZone'
import { useCatData } from './hooks/useCatData'
import { useDynamicOptions } from './hooks/useDynamicOptions'
import { useLocalStore } from './hooks/useLocalStore'

export default function App() {
  const {
    cats, rooms, mode, sourceMode, currentFile, lastUpdate,
    isFlashing, isLoading, error, savePath, isElectron, useMock, hasData,
    loadBrowserFile, resetData, startLiveMode, stopLiveMode, openManualFile, toggleMode,
  } = useCatData()

  const { favorites, tags, toggleFavorite, addTag, removeTag, getTagsForCat } = useLocalStore()
  const options = useDynamicOptions(cats)

  const [filters, setFilters] = useState({ statuses: ['active'] })
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [selectedCat, setSelectedCat] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  const [showBreeding, setShowBreeding] = useState(false)

  // ─── Filtros ────────────────────────────────────────────────────────────────
  const filteredCats = useMemo(() => {
    let result = [...cats]

    if (filters.onlyFavorites) {
      result = result.filter((c) => favorites.includes(c.id))
    }
    if (filters.statuses?.length) {
      result = result.filter((c) => filters.statuses.includes(c.status))
    }
    if (filters.classes?.length) {
      result = result.filter((c) => filters.classes.includes(c.class))
    }
    if (filters.rooms?.length) {
      result = result.filter((c) => filters.rooms.includes(c.room))
    }
    if (filters.abilities?.length) {
      result = result.filter((c) =>
        filters.abilities.every((a) => (c.abilities || []).includes(a))
      )
    }
    if (filters.mutations?.length) {
      result = result.filter((c) =>
        filters.mutations.every((m) => (c.mutations || []).includes(m))
      )
    }
    if (filters.tagFilters?.length) {
      result = result.filter((c) => {
        const catTags = getTagsForCat(c.id)
        return filters.tagFilters.every((t) => catTags.includes(t))
      })
    }
    if (filters.statRanges) {
      result = result.filter((c) => {
        return Object.entries(filters.statRanges).every(([stat, [min, max]]) => {
          const val = (c.stats || {})[stat] ?? 0
          return val >= min && val <= max
        })
      })
    }

    // Ordenação
    result.sort((a, b) => {
      let aVal, bVal
      if (sortKey.startsWith('stats.')) {
        const stat = sortKey.split('.')[1]
        aVal = (a.stats || {})[stat] ?? 0
        bVal = (b.stats || {})[stat] ?? 0
      } else {
        aVal = a[sortKey] ?? ''
        bVal = b[sortKey] ?? ''
      }
      if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })

    return result
  }, [cats, filters, sortKey, sortDir, favorites, tags])

  // ─── Comparação ────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev // máximo 4
      return [...prev, id]
    })
  }

  const selectedCatsForCompare = cats.filter((c) => selectedIds.includes(c.id))

  // ─── Alertas ───────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const result = []
    const agingCats = cats.filter((c) => c.status === 'active' && c.age >= 18)
    if (agingCats.length) result.push(`⚠️ ${agingCats.length} gato(s) em idade crítica`)

    const fullRooms = rooms.filter((r) => r.cats?.length >= r.capacity)
    if (fullRooms.length) result.push(`🏠 ${fullRooms.length} cômodo(s) cheio(s)`)

    const multiMut = cats.filter((c) => c.status === 'active' && (c.mutations || []).length >= 3)
    if (multiMut.length) result.push(`✨ ${multiMut.length} gato(s) com mutações raras (3+)`)

    return result
  }, [cats, rooms])

  // ─── Drop zone (browser sem dados) ──────────────────────────────────────────
  if (!hasData && !isElectron) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-bg-deep">
        <div className="px-4 py-2 border-b border-purple-dark/50 flex items-center gap-3">
          <span className="font-pixel text-2xl text-blood tracking-wider">MEWGENICS</span>
          <span className="font-pixel text-xl text-muted">CAT MANAGER</span>
        </div>
        <SaveDropZone onLoad={loadBrowserFile} isLoading={isLoading} />
        {error && (
          <div className="px-4 py-2 bg-red-950/60 border-t border-red-900/60 text-red-300 text-xs font-mono">
            ⚠️ {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-deep">
      {/* Header */}
      <LiveStatus
        mode={mode}
        currentFile={currentFile}
        lastUpdate={lastUpdate}
        isFlashing={isFlashing}
        isElectron={isElectron}
        useMock={useMock}
        onToggleMode={toggleMode}
        onOpenFile={openManualFile}
        onReload={!isElectron ? resetData : null}
        sourceMode={sourceMode}
      />

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="flex gap-3 px-4 py-1.5 bg-blood/10 border-b border-blood/30 overflow-x-auto">
          {alerts.map((a) => (
            <span key={a} className="text-xs font-mono text-blood-light whitespace-nowrap">{a}</span>
          ))}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="px-4 py-2 bg-red-950/60 border-b border-red-900/60 text-red-300 text-xs font-mono">
          ⚠️ {error}
        </div>
      )}

      {/* Aviso: save path não existe */}
      {isElectron && savePath && !savePath.exists && (
        <div className="px-4 py-2 bg-neon-yellow/10 border-b border-neon-yellow/30 text-neon-yellow text-xs font-mono">
          ℹ️ Pasta de saves não encontrada em <code>{savePath.path}</code> — inicie o Mewgenics pelo menos uma vez.
        </div>
      )}

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar esquerda — Filtros */}
        <FilterPanel
          options={options}
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={cats.length}
          filteredCount={filteredCats.length}
          favorites={favorites}
          tags={tags}
        />

        {/* Área central */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-purple-dark/40 bg-bg-dark">
            <div className="flex items-center gap-3">
              {/* Toggle grid/lista */}
              <div className="flex border border-purple-dark/60 rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 text-xs font-mono transition-colors ${viewMode === 'grid' ? 'bg-purple-dark text-white' : 'text-muted hover:text-white'}`}
                >
                  ▦ Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 text-xs font-mono transition-colors ${viewMode === 'list' ? 'bg-purple-dark text-white' : 'text-muted hover:text-white'}`}
                >
                  ☰ Lista
                </button>
              </div>

              <span className="text-xs font-mono text-muted/60">
                {filteredCats.length} exibindo
                <span className="text-muted/40 ml-1">
                  ({cats.filter(c => c.status === 'active').length} ativos / {cats.length} total no save)
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Comparação */}
              {selectedIds.length >= 2 && (
                <button
                  onClick={() => setShowCompare(true)}
                  className="px-3 py-1 text-xs font-mono bg-blood/20 hover:bg-blood/30 border border-blood/50 text-blood-light rounded transition-colors"
                >
                  Comparar ({selectedIds.length})
                </button>
              )}
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-mono text-muted hover:text-white"
                >
                  Limpar seleção
                </button>
              )}

              {/* Breeding */}
              <button
                onClick={() => setShowBreeding(true)}
                className="px-3 py-1 text-xs font-mono bg-purple-dark/60 hover:bg-purple-mid/60 border border-purple-mid/40 text-purple-light rounded transition-colors"
              >
                🐾 Breeding
              </button>
            </div>
          </div>

          {/* Gatos */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredCats.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted/40 font-mono text-sm">
                Nenhum gato encontrado com os filtros atuais.
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {filteredCats.map((cat) => (
                  <CatCard
                    key={cat.id}
                    cat={cat}
                    isFavorite={favorites.includes(cat.id)}
                    tags={getTagsForCat(cat.id)}
                    isSelected={selectedIds.includes(cat.id)}
                    isHighlighted={false}
                    onSelect={toggleSelect}
                    onClick={(c) => setSelectedCat(c)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <CatTable
                cats={filteredCats}
                favorites={favorites}
                tags={tags}
                selectedIds={selectedIds}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={(key, dir) => { setSortKey(key); setSortDir(dir) }}
                onRowClick={(c) => setSelectedCat(c)}
                onSelect={toggleSelect}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </div>
        </main>

        {/* Sidebar direita — Detalhes */}
        <DetailSidebar
          cat={selectedCat}
          isFavorite={selectedCat ? favorites.includes(selectedCat.id) : false}
          tags={selectedCat ? getTagsForCat(selectedCat.id) : []}
          onToggleFavorite={toggleFavorite}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onClose={() => setSelectedCat(null)}
        />
      </div>

      {/* Modais */}
      {showCompare && selectedCatsForCompare.length >= 2 && (
        <CompareModal cats={selectedCatsForCompare} onClose={() => setShowCompare(false)} />
      )}

      {showBreeding && (
        <BreedingHelper cats={cats} onClose={() => setShowBreeding(false)} />
      )}
    </div>
  )
}
