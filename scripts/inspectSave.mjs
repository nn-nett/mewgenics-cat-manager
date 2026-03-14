/**
 * inspectSave.mjs — Script de inspeção do save do Mewgenics
 * Uso: node scripts/inspectSave.mjs [path/to/save.sav]
 *
 * Roda diretamente com Node.js (sem Electron).
 * npm install primeiro.
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import os from 'os'
import fs from 'fs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Path do save ─────────────────────────────────────────────────────────────

function findSavePath(arg) {
  if (arg && fs.existsSync(arg)) return arg

  // Save de exemplo no projeto
  const example = path.join(__dirname, '..', 'saveexample', 'steamcampaign01.sav')
  if (fs.existsSync(example)) return example

  // Save real do jogo — detecta Steam ID automaticamente
  const mewDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Glaiel Games', 'Mewgenics')
  if (fs.existsSync(mewDir)) {
    const entries = fs.readdirSync(mewDir)
    for (const entry of entries) {
      if (/^\d+$/.test(entry)) {
        const savePath = path.join(mewDir, entry, 'saves', 'steamcampaign01.sav')
        if (fs.existsSync(savePath)) return savePath
      }
    }
  }

  return null
}

// ─── Helpers binários ─────────────────────────────────────────────────────────

function u32LE(buf, off) {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0
}

function u16LE(buf, off) {
  return (buf[off] | (buf[off + 1] << 8)) >>> 0
}

function hexDump(buf, len = 64) {
  return Buffer.from(buf).slice(0, len).toString('hex').match(/.{1,2}/g).join(' ')
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

// ─── LZ4 Decompressão ────────────────────────────────────────────────────────

function decompressBlob(wrapped) {
  const lz4 = require('lz4js')
  const buf = Buffer.isBuffer(wrapped) ? wrapped : Buffer.from(wrapped)

  if (buf.length < 4) return null
  const uncomLen = u32LE(buf, 0)
  if (uncomLen === 0) return Buffer.alloc(0)
  if (uncomLen > 50 * 1024 * 1024) return null // sanity check: máx 50MB

  const out = Buffer.alloc(uncomLen)

  // Variant B: [u32 uncomp][u32 comp][data]
  if (buf.length >= 8) {
    const compLen = u32LE(buf, 4)
    if (compLen > 0 && compLen <= buf.length - 8) {
      try {
        const compressed = buf.slice(8, 8 + compLen)
        const written = lz4.decompressBlock(compressed, out, 0, compressed.length, 0)
        if (written > 0) {
          console.log(`    LZ4 Variant B: ${buf.length}B → ${written}B (esperado ${uncomLen}B)`)
          return out.slice(0, written)
        }
      } catch (e) {
        console.log(`    Variant B falhou: ${e.message}`)
      }
    }
  }

  // Variant A: [u32 uncomp][data]
  try {
    const compressed = buf.slice(4)
    const written = lz4.decompressBlock(compressed, out, 0, compressed.length, 0)
    if (written > 0) {
      console.log(`    LZ4 Variant A: ${buf.length}B → ${written}B (esperado ${uncomLen}B)`)
      return out.slice(0, written)
    }
  } catch (e) {
    console.log(`    Variant A falhou: ${e.message}`)
  }

  return null
}

// ─── Análise profunda do blob ─────────────────────────────────────────────────

function analyzeBlobStructure(buf, label = '') {
  console.log(`\n  ── Análise profunda: ${label} (${buf.length} bytes) ──`)
  console.log(`  hex[00..64]: ${hexDump(buf, 64)}`)

  // Procura padrões de string UTF-16 LE
  for (let off = 0; off < Math.min(buf.length - 4, 0x40); off += 4) {
    const len = u32LE(buf, off)
    if (len >= 1 && len <= 64) {
      const strStart = off + 4
      const strEnd = strStart + len * 2
      if (strEnd <= buf.length) {
        const str = readUtf16LE(buf, strStart, len)
        if (str && /^[\x20-\x7E\u00C0-\u024F]{2,}$/.test(str)) {
          console.log(`  ✓ String UTF-16 em offset 0x${off.toString(16).padStart(2,'0')}: len=${len} → "${str}"`)
        }
      }
    }
    // Também testa offsets não alinhados em 4 para len
    if (off % 4 !== 0) continue
  }

  // Varre byte a byte para strings legíveis (ASCII)
  let asciiRun = ''
  let asciiStart = -1
  for (let i = 0; i < Math.min(buf.length, 512); i++) {
    const c = buf[i]
    if (c >= 0x20 && c <= 0x7E) {
      if (asciiRun.length === 0) asciiStart = i
      asciiRun += String.fromCharCode(c)
    } else {
      if (asciiRun.length >= 4) {
        console.log(`  ASCII[0x${asciiStart.toString(16).padStart(3,'0')}]: "${asciiRun}"`)
      }
      asciiRun = ''
    }
  }

  // Valores u32 nos primeiros 64 bytes
  console.log(`  u32 values:`, [...Array(Math.min(16, Math.floor(buf.length / 4)))].map((_, i) => {
    const v = u32LE(buf, i * 4)
    return `[${(i*4).toString(16)}]=${v}`
  }).join(' '))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const savePath = findSavePath(process.argv[2])

  if (!savePath) {
    console.error('❌ Save não encontrado. Coloque steamcampaign01.sav em saveexample/')
    process.exit(1)
  }

  console.log(`\n🐾 MEWGENICS SAVE INSPECTOR`)
  console.log(`📁 Arquivo: ${savePath}`)
  console.log(`📏 Tamanho: ${(fs.statSync(savePath).size / 1024).toFixed(1)} KB`)

  // Verifica magic bytes do SQLite
  const header = Buffer.alloc(16)
  const fd = fs.openSync(savePath, 'r')
  fs.readSync(fd, header, 0, 16, 0)
  fs.closeSync(fd)
  console.log(`🔍 Header: ${hexDump(header, 16)}`)
  console.log(`   Magic: "${header.slice(0, 15).toString('ascii').replace(/\0/g, '\\0')}"`)

  const isSqlite = header.slice(0, 6).toString('ascii') === 'SQLite'
  console.log(`   SQLite válido: ${isSqlite ? '✓ SIM' : '✗ NÃO (formato inesperado)'}`)

  // Abre com sql.js
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()
  const fileBuffer = fs.readFileSync(savePath)
  const db = new SQL.Database(fileBuffer)

  // Lista tabelas
  const tablesResult = db.exec("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name")
  const tables = tablesResult[0]?.values ?? []

  console.log(`\n📋 TABELAS (${tables.length}):`)
  for (const [name, sql] of tables) {
    console.log(`  • ${name}`)
    if (sql) console.log(`    ${sql.replace(/\n/g, ' ').slice(0, 120)}`)
  }

  // Inspeção detalhada de cada tabela
  for (const [tName] of tables) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`TABELA: ${tName}`)

    const schemaRes = db.exec(`PRAGMA table_info("${tName}")`)
    const cols = schemaRes[0]?.values?.map((r) => ({ name: r[1], type: r[2] })) ?? []
    console.log(`Colunas: ${cols.map((c) => `${c.name}(${c.type})`).join(', ')}`)

    const countRes = db.exec(`SELECT COUNT(*) FROM "${tName}"`)
    const total = countRes[0]?.values?.[0]?.[0] ?? 0
    console.log(`Total de linhas: ${total}`)

    if (total === 0) continue

    // Lê até 5 linhas
    const rowsRes = db.exec(`SELECT * FROM "${tName}" LIMIT 5`)
    if (!rowsRes[0]) continue

    const colNames = rowsRes[0].columns

    for (let ri = 0; ri < rowsRes[0].values.length; ri++) {
      const row = rowsRes[0].values[ri]
      console.log(`\n  ── Linha ${ri + 1} ──`)

      for (let ci = 0; ci < colNames.length; ci++) {
        const val = row[ci]
        const col = colNames[ci]

        if (val instanceof Uint8Array) {
          const blob = Buffer.from(val)
          console.log(`  ${col}: <blob ${blob.length} bytes>`)
          console.log(`  hex[0..32]: ${hexDump(blob, 32)}`)

          // Tenta descomprimir
          const decompressed = decompressBlob(blob)
          if (decompressed && decompressed.length > 0) {
            console.log(`  → Descomprimido: ${decompressed.length} bytes`)
            analyzeBlobStructure(decompressed, `${tName}.${col}[${ri}]`)
          } else {
            console.log(`  → Não é LZ4 ou falha`)
            analyzeBlobStructure(blob, `${tName}.${col}[${ri}] (raw)`)
          }
        } else if (typeof val === 'string' && val.length > 80) {
          console.log(`  ${col}: "${val.slice(0, 80)}..." (${val.length} chars)`)
        } else {
          console.log(`  ${col}: ${JSON.stringify(val)}`)
        }
      }
    }
  }

  db.close()
  console.log('\n✅ Inspeção concluída.')
}

main().catch((e) => {
  console.error('Erro fatal:', e)
  process.exit(1)
})
