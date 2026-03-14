/**
 * savParserBrowser.js — Versão browser do parser de saves do Mewgenics
 *
 * Usa:
 *   - sql.js (SQLite via WASM) — roda 100% no browser, sem backend
 *   - lz4js (pure JS) — descomprime os blobs LZ4
 *
 * Idêntico em lógica ao electron/savParser.js, mas:
 *   - usa import ES modules em vez de require()
 *   - carrega o WASM de /public/sql-wasm.wasm
 *   - recebe um ArrayBuffer (de FileReader) em vez de um path de arquivo
 */

// lz4js é CJS puro — funciona sem ajustes
import lz4 from 'lz4js'

let SQL = null

async function getSql() {
  if (SQL) return SQL
  // sql.js é carregado via <script src="/sql-wasm.js"> no index.html
  // isso registra window.initSqlJs (UMD) sem problemas de ESM
  const initSqlJs = window.initSqlJs
  if (!initSqlJs) throw new Error('sql.js não carregou (window.initSqlJs ausente)')
  SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  })
  return SQL
}

// ─── Helpers binários ─────────────────────────────────────────────────────────

function u32LE(buf, off) {
  if (off + 3 >= buf.length) return 0
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0
}

function u16LE(buf, off) {
  if (off + 1 >= buf.length) return 0
  return (buf[off] | (buf[off + 1] << 8)) >>> 0
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

// ─── Parser de gato ───────────────────────────────────────────────────────────

const NAME_OFFSET = 0x14
const COLLAR_OFFSET = 0x3C

function extractSex(buf) {
  for (const { text } of findAsciiStrings(buf)) {
    if (text.startsWith('female')) return 'F'
    if (text.startsWith('male')) return 'M'
  }
  return '?'
}

function extractSpriteId(buf) {
  for (const { text } of findAsciiStrings(buf)) {
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

  const gender = extractSex(buf)
  const spriteId = extractSpriteId(buf)
  const collar = extractCollar(buf)

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
    _collar: collar,
    _spriteId: spriteId,
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
    const props = db.exec("SELECT key, data FROM properties")
    if (props[0]) {
      for (const [k, v] of props[0].values) result.properties[k] = v
    }
  } catch (_) {}

  // Gatos
  try {
    const catsResult = db.exec("SELECT key, data FROM cats")
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

  // Cômodos (house_state)
  try {
    const filesResult = db.exec("SELECT key, data FROM files WHERE key = 'house_state'")
    if (filesResult[0]?.values?.length) {
      const blobRaw = filesResult[0].values[0][1]
      if (blobRaw instanceof Uint8Array) {
        const strings = findAsciiStrings(blobRaw)
        const roomNames = [...new Set(
          strings.map((s) => s.text).filter((s) =>
            /^(Floor|Room|Garden|Library|Barracks|Chapel|Crypt)\d*/i.test(s)
          )
        )]
        result.rooms = roomNames.map((name, i) => ({ id: String(i), name, capacity: 6, cats: [] }))
      }
    }
  } catch (_) {}

  console.log(`[savParserBrowser] ${result.cats.length} gatos carregados`)
  db.close()
  return result
}
