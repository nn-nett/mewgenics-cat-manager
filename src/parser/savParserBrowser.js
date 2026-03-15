/**
 * savParserBrowser.js — Versão browser do parser de saves do Mewgenics
 *
 * Usa:
 *   - sql.js (SQLite via WASM) — roda 100% no browser, sem backend
 *   - lz4js (pure JS) — descomprime os blobs LZ4
 *
 * Estrutura do blob (buffer DESCOMPRIMIDO):
 *   0x00:            u32  → magic (0x13 = 19)
 *   0x04–0x0B:       8B   → UUID
 *   0x0C:            u32  → comprimento do nome (chars UTF-16)
 *   0x10:            u32  → padding
 *   0x14:            str  → nome UTF-16 LE (nameLen chars × 2 bytes)
 *   nameEnd + 0x08:  u16  → sexo (0=M, 1=F, 2=Ditto)
 *   nameEnd + 0x10:  u16  → flags de status (0x0002=retired, 0x0020=dead, 0x4000=donated)
 *   0x8C–0x30C:      7×i32 → stats base (STR DEX CON INT SPD CHA LUCK)
 *   statsOffset+28:  7×i32 → bônus de nível
 *   near-end:        [u64 len][ASCII class][u32 classLevel]
 *   abilities:       sequência de [u64 len][ASCII] iniciando em "DefaultMove"
 */

import lz4 from 'lz4js'

let SQL = null

async function getSql() {
  if (SQL) return SQL
  const initSqlJs = window.initSqlJs
  if (!initSqlJs) throw new Error('sql.js não carregou (window.initSqlJs ausente)')
  SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' })
  return SQL
}

// ─── Helpers binários ─────────────────────────────────────────────────────────

function u16LE(buf, off) {
  if (off + 1 >= buf.length) return 0
  return (buf[off] | (buf[off + 1] << 8)) >>> 0
}

function u32LE(buf, off) {
  if (off + 3 >= buf.length) return 0
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0
}

function i32LE(buf, off) {
  if (off + 3 >= buf.length) return 0
  return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)
}

function readUtf16LE(buf, offset, charCount) {
  let result = ''
  for (let i = 0; i < charCount; i++) {
    const pos = offset + i * 2
    if (pos + 1 >= buf.length) break
    const code = u16LE(buf, pos)
    if (code === 0) break
    result += String.fromCharCode(code)
  }
  return result
}

function readLenString(buf, offset) {
  if (offset + 8 >= buf.length) return null
  const lenLo = u32LE(buf, offset)
  const lenHi = u32LE(buf, offset + 4)
  if (lenHi !== 0 || lenLo === 0 || lenLo > 128) return null
  const end = offset + 8 + lenLo
  if (end > buf.length) return null
  let str = ''
  for (let i = 0; i < lenLo; i++) {
    const c = buf[offset + 8 + i]
    if (c < 0x20 || c > 0x7E) return null
    str += String.fromCharCode(c)
  }
  return { str, end }
}

function findAsciiStrings(buf) {
  const strings = []
  let run = ''
  let start = -1
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i]
    if (c >= 0x20 && c <= 0x7E) {
      if (run.length === 0) start = i
      run += String.fromCharCode(c)
    } else {
      if (run.length >= 3) strings.push({ offset: start, text: run })
      run = ''
    }
  }
  if (run.length >= 3) strings.push({ offset: start, text: run })
  return strings
}

// ─── LZ4 Decompressão ────────────────────────────────────────────────────────

function decompressBlob(wrapped) {
  const buf = wrapped instanceof Uint8Array ? wrapped : new Uint8Array(wrapped)
  if (buf.length < 4) return null

  const uncomLen = u32LE(buf, 0)
  if (uncomLen === 0) return new Uint8Array(0)
  if (uncomLen > 64 * 1024 * 1024) return null

  const out = new Uint8Array(uncomLen)

  // Variant B: [u32 uncomp][u32 comp][raw_lz4_block]
  if (buf.length >= 8) {
    const compLen = u32LE(buf, 4)
    if (compLen > 0 && compLen <= buf.length - 8) {
      try {
        const compressed = buf.slice(8, 8 + compLen)
        const written = lz4.decompressBlock(compressed, out, 0, compressed.length, 0)
        if (written > 0) return out.slice(0, Math.min(written, uncomLen))
      } catch (_) {}
    }
  }

  // Variant A: [u32 uncomp][raw_lz4_block]
  try {
    const compressed = buf.slice(4)
    const written = lz4.decompressBlock(compressed, out, 0, compressed.length, 0)
    if (written > 0) return out.slice(0, Math.min(written, uncomLen))
  } catch (_) {}

  return null
}

// ─── Extração de campos do blob ───────────────────────────────────────────────

const STAT_NAMES = ['STR', 'DEX', 'CON', 'INT', 'SPD', 'CHA', 'LUCK']
const SEX_MAP = { 0: 'M', 1: 'F', 2: 'Ditto' }

function parseName(buf) {
  const nameLen = u32LE(buf, 0x0C)
  if (nameLen === 0 || nameLen > 64) return null
  const name = readUtf16LE(buf, 0x14, nameLen)
  if (!name) return null
  return { name, nameLen }
}

function parseSex(buf, nameLen) {
  const nameEnd = 0x14 + nameLen * 2
  const sexVal = u16LE(buf, nameEnd + 0x08)
  return SEX_MAP[sexVal] || 'M'
}

function parseStatus(buf, nameLen) {
  const nameEnd = 0x14 + nameLen * 2
  const flags = u16LE(buf, nameEnd + 0x10)
  if (flags & 0x0020) return 'dead'
  if (flags & 0x4000) return 'donated'
  if (flags & 0x0002) return 'retired'
  return 'active'
}

function findStats(buf) {
  const emptyStats = {}
  STAT_NAMES.forEach((n) => (emptyStats[n] = 0))

  const MIN_OFF = 0x8C
  const MAX_OFF = Math.min(buf.length - 28, 0x30C)

  // Tentativa 1: todos os 7 valores em 1–25
  for (let off = MIN_OFF; off <= MAX_OFF; off += 4) {
    let valid = true
    const vals = []
    for (let i = 0; i < 7; i++) {
      const v = i32LE(buf, off + i * 4)
      if (v < 1 || v > 25) { valid = false; break }
      vals.push(v)
    }
    if (valid) {
      const stats = {}
      const bonusStats = {}
      STAT_NAMES.forEach((n, i) => {
        stats[n] = vals[i]
        bonusStats[n] = i32LE(buf, off + 28 + i * 4)
      })
      return { stats, bonusStats }
    }
  }

  // Tentativa 2: intervalo mais relaxado (0–30, ao menos 3 não-zero)
  for (let off = MIN_OFF; off <= MAX_OFF; off += 4) {
    let valid = true
    let nonZero = 0
    const vals = []
    for (let i = 0; i < 7; i++) {
      const v = i32LE(buf, off + i * 4)
      if (v < 0 || v > 30) { valid = false; break }
      if (v > 0) nonZero++
      vals.push(v)
    }
    if (valid && nonZero >= 3) {
      const stats = {}
      STAT_NAMES.forEach((n, i) => (stats[n] = vals[i]))
      return { stats, bonusStats: {} }
    }
  }

  return { stats: emptyStats, bonusStats: {} }
}

// Abilities que são apenas placeholders — não mostrar
const ABILITY_EXCLUDE = new Set(['None', 'DefaultMove'])

// Classes reais do Mewgenics (determinadas pelo collar do gato)
const MEWGENICS_CLASSES = new Set([
  'Collarless', 'Fighter', 'Hunter', 'Mage', 'Tank', 'Cleric',
  'Thief', 'Necromancer', 'Tinkerer', 'Butcher', 'Druid',
])

function findAbilities(buf) {
  const abilities = []
  for (let i = 0x60; i < buf.length - 20; i++) {
    const r = readLenString(buf, i)
    if (r && r.str === 'DefaultMove') {
      let pos = i
      while (pos < buf.length - 8) {
        const a = readLenString(buf, pos)
        if (!a || !/^[A-Z][a-zA-Z0-9]+$/.test(a.str)) break
        if (!ABILITY_EXCLUDE.has(a.str)) abilities.push(a.str)
        pos = a.end
      }
      break
    }
  }
  return abilities
}

function findClass(buf) {
  // Método 1: busca [u64 len][ASCII class] onde class é nome exato conhecido
  for (let i = 0; i < buf.length - 12; i++) {
    const r = readLenString(buf, i)
    if (r && MEWGENICS_CLASSES.has(r.str)) {
      const level = u32LE(buf, r.end)
      return { className: r.str, classLevel: level <= 50 ? level : 0 }
    }
  }
  // Método 2: busca como ASCII puro (null-terminated ou run de chars)
  const strings = findAsciiStrings(buf)
  for (const { text } of strings) {
    if (MEWGENICS_CLASSES.has(text)) {
      return { className: text, classLevel: 0 }
    }
  }
  return { className: 'Collarless', classLevel: 0 }
}

function findAbilitiesAndClass(buf) {
  const abilities = findAbilities(buf)
  const { className, classLevel } = findClass(buf)
  return { abilities, className, classLevel }
}

function extractSpriteId(buf) {
  const strings = findAsciiStrings(buf)
  for (const { text } of strings) {
    if (/^(male|female)\d+/.test(text)) return text
  }
  return null
}

// ─── Parser principal de blob ─────────────────────────────────────────────────

function parseCatBlob(buf, key) {
  if (!buf || buf.length < 0x60) return null

  const parsed = parseName(buf)
  if (!parsed) return null
  const { name, nameLen } = parsed

  if (!/^[\x20-\x7E\u00C0-\u024F\u0100-\u024F]+$/.test(name)) return null

  const gender = parseSex(buf, nameLen)
  const status = parseStatus(buf, nameLen)
  const { stats, bonusStats } = findStats(buf)
  const { abilities, className, classLevel } = findAbilitiesAndClass(buf)
  const spriteId = extractSpriteId(buf)

  return {
    id: String(key),
    name,
    class: className,
    classLevel,
    room: 'Unknown',
    status,
    age: 0,
    gender,
    spriteId,
    stats,
    bonusStats,
    abilities: abilities.filter((a) => a !== 'DefaultMove'),
    mutations: [],
    _blobSize: buf.length,
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Parseia um save do Mewgenics no browser.
 * @param {ArrayBuffer} arrayBuffer — conteúdo do arquivo .sav
 * @returns {{ cats: Cat[], rooms: Room[], properties: object }}
 */
export async function parseSaveBrowser(arrayBuffer) {
  const sql = await getSql()
  const db = new sql.Database(new Uint8Array(arrayBuffer))

  const result = { cats: [], rooms: [], properties: {} }

  // Propriedades
  try {
    const props = db.exec('SELECT key, data FROM properties')
    if (props[0]) {
      for (const [k, v] of props[0].values) result.properties[k] = v
    }
  } catch (_) {}

  // Gatos
  try {
    const catsResult = db.exec('SELECT key, data FROM cats')
    if (catsResult[0]) {
      for (const [key, blobRaw] of catsResult[0].values) {
        if (!(blobRaw instanceof Uint8Array)) continue
        const decompressed = decompressBlob(blobRaw)
        if (!decompressed) continue
        const cat = parseCatBlob(decompressed, key)
        if (cat) result.cats.push(cat)
      }
    }
  } catch (e) {
    console.error('[savParserBrowser] Erro ao ler gatos:', e)
  }

  // Cômodos (house_state) — parseia e tenta mapear gatos aos cômodos
  try {
    const filesResult = db.exec("SELECT key, data FROM files WHERE key = 'house_state'")
    if (filesResult[0]?.values?.length) {
      const blobRaw = filesResult[0].values[0][1]
      if (blobRaw instanceof Uint8Array) {
        // Tenta descomprimir (house_state também pode ser LZ4)
        const decompressed = decompressBlob(blobRaw)
        const buf = decompressed && decompressed.length > 100 ? decompressed : blobRaw

        const ROOM_PAT = /^(Garden|Library|Barracks|Chapel|Crypt|Floor|Room|Hall|Vault|Study|Training|Dormitory|Stable|Workshop|Shrine|Tower|Dungeon)\d*$/i
        const strings = findAsciiStrings(buf)
        const roomNames = [...new Set(strings.map((s) => s.text).filter((s) => ROOM_PAT.test(s)))]
        result.rooms = roomNames.map((name, i) => ({ id: String(i), name, capacity: 6, cats: [] }))

        // Tenta montar mapa catKey → roomName heurístico
        // Cada nome de cômodo no buffer pode ser seguido ou precedido de cat keys (u32)
        const catToRoom = {}
        for (const { offset, text } of strings) {
          if (!ROOM_PAT.test(text)) continue
          // Scan até 512 bytes após o nome do cômodo procurando u32 que sejam cat keys válidos
          const catKeys = new Set(result.cats.map((c) => Number(c.id)))
          const end = Math.min(buf.length - 4, offset + text.length + 512)
          for (let p = offset + text.length; p < end; p += 4) {
            const v = u32LE(buf, p)
            if (catKeys.has(v)) catToRoom[String(v)] = text
          }
        }
        // Aplica o mapa
        for (const cat of result.cats) {
          if (catToRoom[cat.id]) cat.room = catToRoom[cat.id]
        }
      }
    }
  } catch (_) {}

  console.log(`[savParserBrowser] ${result.cats.length} gatos carregados`)
  db.close()
  return result
}
