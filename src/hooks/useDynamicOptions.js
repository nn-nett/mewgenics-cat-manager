import { useMemo } from 'react'

/**
 * Extrai opções únicas presentes nos dados reais dos gatos.
 * Filtros mostram APENAS o que existe nos seus gatos.
 */
export function useDynamicOptions(cats) {
  return useMemo(() => {
    if (!cats || cats.length === 0) {
      return {
        classes: [],
        rooms: [],
        statuses: [],
        abilities: [],
        mutations: [],
        statRanges: {},
        allTags: [],
      }
    }

    const classes = [...new Set(cats.map((c) => c.class).filter(Boolean))].sort()
    const rooms = [...new Set(cats.map((c) => c.room).filter(Boolean))].sort()
    const statuses = [...new Set(cats.map((c) => c.status).filter(Boolean))]
    const abilities = [...new Set(cats.flatMap((c) => c.abilities || []))].sort()
    const mutations = [...new Set(cats.flatMap((c) => c.mutations || []))].sort()

    // Range de stats baseado nos dados reais
    const statKeys = ['STR', 'DEX', 'CON', 'INT', 'SPD', 'CHA', 'LUCK']
    const statRanges = {}
    for (const stat of statKeys) {
      const values = cats.map((c) => (c.stats || {})[stat] || 0).filter((v) => !isNaN(v))
      statRanges[stat] = {
        min: Math.min(...values),
        max: Math.max(...values),
      }
    }

    return { classes, rooms, statuses, abilities, mutations, statRanges }
  }, [cats])
}
