// Rebuild db/seed.sql from the demo data in client/src/api/seed.json, so demo
// mode and the database always start with the same books, shelves and room.
//
//   npm run db:seed:build
//
// Run it after changing seed.json, then commit both files. It only writes a
// file; it never touches a database.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { EMBER_RULES, catalogEntry } from '../catalog.js'

const seedJson = new URL('../../client/src/api/seed.json', import.meta.url)
const seedSql = new URL('./seed.sql', import.meta.url)
const seed = JSON.parse(readFileSync(seedJson, 'utf8'))

// A SQL literal. Only ever used on our own seed file, never on user input:
// everything the API receives goes through query parameters instead.
function literal(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return `'${String(value).replace(/'/g, "''")}'`
}

const { profile, books, userBooks, room } = seed

const bookRows = books.map(
  (b) =>
    `  (${[b.id, b.title, b.author, b.genre].map(literal).join(', ')}, ${b.pages}, ${b.year}, ${literal(b.color)},\n` +
    `   ${literal(b.description)},\n` +
    `   ${literal(b.coverUrl)})`
)

// finished_at is set for Read books only, to the moment they were marked Read.
const entryRows = userBooks.map(
  (e) =>
    `  (1, ${[e.bookId, e.status].map(literal).join(', ')}, ${e.currentPage}, ${literal(e.rating)}, ${literal(e.review)},\n` +
    `   ${literal(e.shelfPosition)}, ${literal(e.addedAt)}, ${literal(e.updatedAt)}, ` +
    `${e.status === 'read' ? literal(e.updatedAt) : 'NULL'})`
)

const itemRows = room.items.map(
  (i) => `  (${i.id}, 1, ${literal(i.kind)}, ${i.x}, ${i.z}, ${i.rotation}, ${i.placed ?? true})`
)

// The demo reader's Ember history, worked out from their reading so it obeys
// the same rules as live play: the welcome gift, then what each book earned,
// then what their furniture and finishes cost. The same derivation is
// seedLedger() in client/src/api/mockApi.js.
function seedLedger() {
  const rows = [{ amount: EMBER_RULES.welcome, reason: 'welcome', ref: '', at: profile.joinedAt }]
  const byDate = [...userBooks].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  for (const e of byDate) {
    const pages = Math.floor(e.currentPage / EMBER_RULES.pagesPerEmber)
    if (pages > 0) rows.push({ amount: pages, reason: 'pages-read', ref: e.bookId, at: e.updatedAt })
    if (e.status === 'read') {
      rows.push({ amount: EMBER_RULES.bookFinished, reason: 'book-finished', ref: e.bookId, at: e.updatedAt })
    }
  }
  const bought = [...room.items.map((i) => i.kind), ...(room.unlocks ?? [])]
  const cost = bought.reduce((sum, id) => sum + catalogEntry(id).price, 0)
  if (cost > 0) {
    const last = rows.map((r) => r.at).sort().at(-1)
    rows.push({ amount: -cost, reason: 'purchase', ref: bought.join(', '), at: last })
  }
  return rows
}

const ledgerRows = seedLedger().map(
  (r) => `  (1, ${r.amount}, ${literal(r.reason)}, ${literal(r.ref)}, ${literal(r.at)})`
)
const unlockSql = (room.unlocks ?? []).length
  ? `\nINSERT INTO room_unlocks (reader_id, item) VALUES\n${room.unlocks
      .map((id) => `  (1, ${literal(id)})`)
      .join(',\n')};\n`
  : ''

const sql = `-- Sample data for development: the same books, shelves, profile and room as
-- demo mode. GENERATED from client/src/api/seed.json by db/build-seed.js, so
-- change that file and run "npm run db:seed:build" rather than editing this.
--
-- This starts with TRUNCATE. That is correct on your laptop and catastrophic
-- against the database your live demo depends on. Check which DATABASE_URL is
-- loaded before you run it.

TRUNCATE TABLE ember_ledger, reading_days, room_unlocks, room_items, user_books, room_settings,
  books, readers RESTART IDENTITY CASCADE;

INSERT INTO readers (id, display_name, bio, yearly_goal, joined_at) VALUES
  (1, ${literal(profile.displayName)},
   ${literal(profile.bio)},
   ${profile.yearlyGoal}, ${literal(profile.joinedAt)});

INSERT INTO books (id, title, author, genre, pages, year, color, description, cover_url) VALUES
${bookRows.join(',\n')};

INSERT INTO user_books
  (reader_id, book_id, status, current_page, rating, review,
   shelf_position, added_at, updated_at, finished_at)
VALUES
${entryRows.join(',\n')};

INSERT INTO room_settings (reader_id, wall_color, floor_color, shelf_color, wallpaper, floor) VALUES
  (1, ${[room.wallColor, room.floorColor, room.shelfColor, room.wallpaper, room.floor].map(literal).join(', ')});
${unlockSql}
INSERT INTO room_items (id, reader_id, kind, x, z, rotation, placed) VALUES
${itemRows.join(',\n')};

INSERT INTO ember_ledger (reader_id, amount, reason, ref, created_at) VALUES
${ledgerRows.join(',\n')};

-- The rows above chose their own ids, so move each sequence past them.
SELECT setval(pg_get_serial_sequence('readers', 'id'), (SELECT max(id) FROM readers));
SELECT setval(pg_get_serial_sequence('room_items', 'id'), (SELECT max(id) FROM room_items));
`

writeFileSync(seedSql, sql)
console.log(`wrote ${fileURLToPath(seedSql)}`)
