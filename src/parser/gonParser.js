/**
 * Parser para o formato .gon do Mewgenics (Tyler Glaiel's GON format).
 * GON é similar a JSON mas com sintaxe mais relaxada:
 * - Chaves sem aspas
 * - Vírgulas opcionais
 * - Comentários com //
 * - Arrays com [] ou separados por espaço
 *
 * Estratégia: tentar JSON primeiro, depois parser customizado.
 */

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseGon(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') return null

  // Remove BOM se presente
  const content = rawContent.replace(/^\uFEFF/, '').trim()

  // Tentativa 1: JSON puro
  try {
    const data = JSON.parse(content)
    console.log('[GON Parser] Parsed as JSON. Keys:', Object.keys(data))
    return extractCatsFromData(data)
  } catch (_) {}

  // Tentativa 2: GON → JSON conversion
  try {
    const jsonLike = gonToJson(content)
    const data = JSON.parse(jsonLike)
    console.log('[GON Parser] Parsed as GON. Keys:', Object.keys(data))
    return extractCatsFromData(data)
  } catch (err) {
    console.error('[GON Parser] Falha no parse GON:', err.message)
  }

  // Tentativa 3: Extração heurística
  console.warn('[GON Parser] Usando extração heurística.')
  return heuristicExtract(content)
}

// ─── Conversor GON → JSON ─────────────────────────────────────────────────────

function gonToJson(content) {
  let s = content

  // Remove comentários de linha
  s = s.replace(/\/\/[^\n]*/g, '')

  // Remove comentários de bloco
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')

  // Adiciona aspas em chaves sem aspas: word: → "word":
  s = s.replace(/([{,\n\r]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')

  // Adiciona aspas em valores sem aspas (strings)
  // Cuidado: não tocar em números, booleans, null, arrays, objetos
  s = s.replace(/:\s*([a-zA-Z][a-zA-Z0-9_ -]*)(\s*[,}\n\r])/g, (match, val, end) => {
    const trimmed = val.trim()
    if (['true', 'false', 'null'].includes(trimmed)) return match
    return `: "${trimmed}"${end}`
  })

  // Adiciona vírgulas faltando entre elementos
  s = s.replace(/(["\d\]}\w])\s*\n\s*(["{[\w])/g, '$1,\n$2')

  return s
}

// ─── Extração de gatos do objeto parsed ──────────────────────────────────────

function extractCatsFromData(data) {
  const result = { cats: [], rooms: [] }

  // Procurar arrays que pareçam gatos
  const catArrayKeys = ['cats', 'cat_list', 'cats_list', 'animals', 'pets']
  const roomArrayKeys = ['rooms', 'room_list', 'house', 'shelter']

  for (const key of catArrayKeys) {
    if (Array.isArray(data[key])) {
      result.cats = data[key].map(normalizeCat)
      break
    }
  }

  for (const key of roomArrayKeys) {
    if (Array.isArray(data[key])) {
      result.rooms = data[key]
      break
    }
  }

  // Se não encontrou cats diretamente, procurar em sub-objetos
  if (result.cats.length === 0) {
    for (const val of Object.values(data)) {
      if (Array.isArray(val) && val.length > 0 && looksLikeCat(val[0])) {
        result.cats = val.map(normalizeCat)
        break
      }
      if (typeof val === 'object' && val !== null) {
        for (const subVal of Object.values(val)) {
          if (Array.isArray(subVal) && subVal.length > 0 && looksLikeCat(subVal[0])) {
            result.cats = subVal.map(normalizeCat)
            break
          }
        }
      }
    }
  }

  console.log(`[GON Parser] Extraídos: ${result.cats.length} gatos, ${result.rooms.length} cômodos`)
  return result
}

function looksLikeCat(obj) {
  if (typeof obj !== 'object' || obj === null) return false
  const catKeys = ['name', 'stats', 'abilities', 'class', 'collar', 'age', 'status']
  return catKeys.some((k) => k in obj)
}

// ─── Normalização de gato ─────────────────────────────────────────────────────

function normalizeCat(raw, index) {
  return {
    id: String(raw.id || raw.uid || index),
    name: raw.name || raw.cat_name || `Cat ${index + 1}`,
    class: raw.class || raw.collar || raw.type || 'Unknown',
    room: raw.room || raw.location || raw.current_room || 'Unknown',
    status: normalizeStatus(raw.status || raw.state),
    age: Number(raw.age || 0),
    gender: raw.gender || raw.sex || '?',
    stats: normalizeStats(raw.stats || raw),
    abilities: normalizeList(raw.abilities || raw.skills || []),
    mutations: normalizeList(raw.mutations || raw.genes || raw.genetic_mutations || []),
    color: raw.color || raw.sprite_color || null,
  }
}

function normalizeStatus(raw) {
  if (!raw) return 'active'
  const s = String(raw).toLowerCase()
  if (s.includes('dead') || s.includes('morte')) return 'dead'
  if (s.includes('retire') || s.includes('aposent')) return 'retired'
  return 'active'
}

function normalizeStats(raw) {
  const statKeys = {
    STR: ['str', 'strength', 'forca'],
    DEX: ['dex', 'dexterity', 'destreza'],
    INT: ['int', 'intelligence', 'inteligencia'],
    VIT: ['vit', 'vitality', 'vitalidade', 'hp', 'health'],
    LCK: ['lck', 'luck', 'sorte'],
  }
  const stats = {}
  for (const [stat, aliases] of Object.entries(statKeys)) {
    for (const alias of aliases) {
      if (raw[alias] !== undefined) {
        stats[stat] = Number(raw[alias])
        break
      }
    }
    if (stats[stat] === undefined) stats[stat] = 0
  }
  return stats
}

function normalizeList(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

// ─── Extração heurística (fallback) ──────────────────────────────────────────

function heuristicExtract(content) {
  console.warn('[GON Parser] Modo heurístico — resultados podem ser imprecisos.')
  const cats = []
  const nameRegex = /name[:\s]+"?([^",}\n]+)"?/gi
  let match
  let id = 0
  while ((match = nameRegex.exec(content)) !== null) {
    cats.push({ id: String(id++), name: match[1].trim(), class: 'Unknown', room: 'Unknown', status: 'active', age: 0, stats: { STR: 0, DEX: 0, INT: 0, VIT: 0, LCK: 0 }, abilities: [], mutations: [] })
  }
  return { cats, rooms: [] }
}
