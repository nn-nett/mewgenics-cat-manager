import { useState, useEffect } from 'react'

function loadFromStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

export function useLocalStore() {
  const [favorites, setFavorites] = useState(() => loadFromStorage('cm_favorites', []))
  const [tags, setTags] = useState(() => loadFromStorage('cm_tags', {}))

  useEffect(() => {
    localStorage.setItem('cm_favorites', JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem('cm_tags', JSON.stringify(tags))
  }, [tags])

  const toggleFavorite = (catId) => {
    setFavorites((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    )
  }

  const addTag = (catId, tag) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    setTags((prev) => {
      const current = prev[catId] || []
      if (current.includes(trimmed)) return prev
      return { ...prev, [catId]: [...current, trimmed] }
    })
  }

  const removeTag = (catId, tag) => {
    setTags((prev) => {
      const current = prev[catId] || []
      const next = current.filter((t) => t !== tag)
      if (next.length === 0) {
        const { [catId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [catId]: next }
    })
  }

  const getTagsForCat = (catId) => tags[catId] || []

  return { favorites, tags, toggleFavorite, addTag, removeTag, getTagsForCat }
}
