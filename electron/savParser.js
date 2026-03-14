/**
 * savParser.js — Parser para saves do Mewgenics
 *
 * Formato: SQLite 3 (.sav) com blobs binários comprimidos em LZ4
 * Referência: https://github.com/michael-trinity/mewgenics-savegame-editor
 *
 * Estrutura do blob de gato (offset no buffer DESCOMPRIMIDO):
 *   0x00: u32  → versão / magic (0x13 = 19)
 *   0x04: 8B   → UUID do gato
 *   0x0C: u32  → comprimento do nome (chars UTF-16)
 *   0x10: u32  → 0 (padding)
 *   0x14: str  → nome em UTF-16 LE (máx 20 chars = 40 bytes fixos)
 *   0x3C: str  → collar/classe em ASCII (null-terminated)
 *   ~0x1B8: str → sprite string com sexo ("male18h", "female41~", etc.)
 *
 * NOTA: stats, age, abilities, mutations serão mapeados conforme calibração.
 */

const fs = require('fs')
const path = require('path')

// ─── Helpers binários (little-endian) ────────────────────────────────────────

function u32LE(buf, off) {
  if (off + 3 >= buf.length) return 0
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0
}

function u16LE(buf, off) {
  if (off + 1 >= buf.length) return 0
  return (buf[off] | (buf[off + 1] << 8)) >>> 0
}

function u8(buf, off) {
  return buf[off] ?? 0
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

function findAsciiStrings(buf, maxOffset) {
  const strings = []
  let run = ''
  let start = -1
  const end = Math.min(buf.length, maxOffset || buf.length)
  for (let i = 0; i < end; i++) {
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
  if (!wrapped || wrapped.length < 4) return null
  const lz4 = require('lz4js')
  const buf = Buffer.isBuffer(wrapped) ? wrapped : Buffer.from(wrapped)

  const uncomLen = u32LE(buf, 0)
  if (uncomLen === 0) return Buffer.alloc(0)
  if (uncomLen > 64 * 1024 * 1024) return null

  const out = Buffer.alloc(uncomLen)

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

// ─── Parser de gato ───────────────────────────────────────────────────────────

const NAME_OFFSET = 0x14
const COLLAR_OFFSET = 0x3C

function extractSexFromSprite(buf) {
  const strings = findAsciiStrings(buf)
  for (const { text } of strings) {
    if (text.startsWith('female')) return 'F'
    if (text.startsWith('male')) return 'M'
  }
  return '?'
}

function extractSpriteId(buf) {
  const strings = findAsciiStrings(buf)
  for (const { text } of strings) {
    if (/^(male|female)\d+/.test(text)) return text
  }
  return null
}

function extractCollar(buf) {
  if (COLLAR_OFFSET >= buf.length) return 'None'
  let result = ''
  for (let i = COLLAR_OFFSET; i < Math.min(buf.length, COLLAR_OFFSET + 32); i++) {
    const c = buf[i]
    if (c === 0) break
    if (c >= 0x20 && c <= 0x7E) result += String.fromCharCode(c)
    else if (result.length > 0) break
  }
  return result || 'None'
}

function parseCatBlob(buf, key) {
  if (!buf || buf.length < 0x40) return null

  const nameLen = u32LE(buf, 0x0C)
  if (nameLen === 0 || nameLen > 64) return null

  const name = readUtf16LE(buf, NAME_OFFSET, nameLen)
  if (!name || !/^[\x20-\x7E\u00C0-\u024F]+$/.test(name)) return null

  const gender = extractSexFromSprite(buf)
  const spriteId = extractSpriteId(buf)
  const collar = extractCollar(buf)
  const uuid = buf.slice(0x04, 0x0C).toString('hex')

  // Candidatos a stats (u32 em range 0-100, offsets 0x40..0xFF)
  const statCandidates = {}
  for (let off = 0x40; off < Math.min(buf.length - 4, 0x100); off += 4) {
    const v = u32LE(buf, off)
    if (v <= 100) statCandidates[`0x${off.toString(16)}`] = v
  }

  return {
    id: String(key),
    name,
    class: collar !== 'None' ? collar : 'Unknown',
    room: 'Unknown',
    status: 'active',
    age: 0,
    gender,
    spriteId,
    stats: { STR: 0, DEX: 0, INT: 0, VIT: 0, LCK: 0 },
    abilities: [],
    mutations: [],
    _uuid: uuid,
    _collar: collar,
    _statCandidates: statCandidates,
    _asciiStrings: findAsciiStrings(buf).map((s) => s.text),
    _blobSize: buf.length,
  }
}

// ─── Abertura do banco SQLite ─────────────────────────────────────────────────

async function openSqlite(filePath) {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()
  const fileBuffer = fs.readFileSync(filePath)
  return new SQL.Database(fileBuffer)
}

// ─── Função principal: parseia o save completo ────────────────────────────────

async function parseSave(filePath) {
  console.log(`[savParser] Abrindo: ${path.basename(filePath)}`)

  const db = await openSqlite(filePath)
  const result = { cats: [], rooms: [], properties: {} }

  // Propriedades gerais
  try {
    const props = db.exec("SELECT key, data FROM properties")
    if (props[0]) {
      for (const [k, v] of props[0].values) result.properties[k] = v
    }
  } catch (_) {}

  // Gatos
  const catsResult = db.exec("SELECT key, data FROM cats")
  if (catsResult[0]) {
    for (const [key, blobRaw] of catsResult[0].values) {
      if (!(blobRaw instanceof Uint8Array)) continue
      const decompressed = decompressBlob(Buffer.from(blobRaw))
      if (!decompressed) continue
      const cat = parseCatBlob(decompressed, key)
      if (cat) result.cats.push(cat)
    }
  }

  // house_state — extrai nomes de cômodos
  try {
    const filesResult = db.exec("SELECT key, data FROM files WHERE key = 'house_state'")
    if (filesResult[0]?.[0]) {
      const [, blobRaw] = filesResult[0].values[0]
      if (blobRaw instanceof Uint8Array) {
        const raw = Buffer.from(blobRaw)
        const strings = findAsciiStrings(raw)
        const roomNames = [...new Set(
          strings.map((s) => s.text).filter((s) => /^(Floor|Room|Garden|Library|Barracks|Chapel|Crypt)\d*/i.test(s))
        )]
        result.rooms = roomNames.map((name, i) => ({ id: String(i), name, capacity: 6, cats: [] }))
      }
    }
  } catch (_) {}

  console.log(`[savParser] ${result.cats.length} gatos lidos`)
  db.close()
  return result
}

/**
 * inspectCats — debug: loga todos os gatos encontrados.
 */
async function inspectCats(filePath) {
  const db = await openSqlite(filePath)
  const catsResult = db.exec("SELECT key, data FROM cats")
  if (!catsResult[0]) { db.close(); return }

  let parsed = 0
  for (const [key, blobRaw] of catsResult[0].values) {
    if (!(blobRaw instanceof Uint8Array)) continue
    const decompressed = decompressBlob(Buffer.from(blobRaw))
    if (!decompressed) continue
    const cat = parseCatBlob(decompressed, key)
    if (cat) {
      console.log(`  [${key}] "${cat.name}" gender=${cat.gender} sprite="${cat.spriteId}" collar="${cat._collar}"`)
      parsed++
    }
  }
  console.log(`\nTotal parseado: ${parsed}/${catsResult[0].values.length}`)
  db.close()
}

module.exports = { parseSave, inspectCats, decompressBlob, openSqlite }
