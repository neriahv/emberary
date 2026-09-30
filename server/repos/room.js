// A reader's Library Room: its colours and finishes, and the furniture they
// own, placed or in storage. The books on its shelves come from myBooks.js.

import { catalogEntry, FREE_FINISHES, MAX_OWNED_ITEMS, MAX_PLACED_ITEMS } from '../catalog.js'
import * as ember from './ember.js'

const ROOM_COLUMNS = `
  wall_color  AS "wallColor",
  floor_color AS "floorColor",
  shelf_color AS "shelfColor",
  wallpaper,
  floor`

const ITEM_COLUMNS = 'id, kind, x, z, rotation, placed'

// A reader whose room was never saved gets the defaults from schema.sql,
// rather than a 404 the Library Room would have to handle.
async function ensureRow(db, readerId) {
  await db.query(
    'INSERT INTO room_settings (reader_id) VALUES ($1) ON CONFLICT (reader_id) DO NOTHING',
    [readerId]
  )
}

// Every finish the reader may put on the walls or floor: the free ones and the
// ones they bought.
export async function unlocks(db, readerId) {
  const result = await db.query(
    'SELECT item FROM room_unlocks WHERE reader_id = $1 ORDER BY item',
    [readerId]
  )
  return [...FREE_FINISHES, ...result.rows.map((row) => row.item)]
}

// The whole room in one object, as the Library Room page loads it.
export async function get(db, readerId) {
  await ensureRow(db, readerId)
  const [settings, items, owned] = await Promise.all([
    db.query(`SELECT ${ROOM_COLUMNS} FROM room_settings WHERE reader_id = $1`, [readerId]),
    listItems(db, readerId),
    unlocks(db, readerId),
  ])
  return { ...settings.rows[0], unlocks: owned, items }
}

// Only the fields present in the validated patch change. The route has already
// checked that a wallpaper or floor is one the reader owns.
export async function update(db, readerId, patch) {
  await ensureRow(db, readerId)
  await db.query(
    `UPDATE room_settings SET
       wall_color  = COALESCE($2::text, wall_color),
       floor_color = COALESCE($3::text, floor_color),
       shelf_color = COALESCE($4::text, shelf_color),
       wallpaper   = COALESCE($5::text, wallpaper),
       floor       = COALESCE($6::text, floor)
     WHERE reader_id = $1`,
    [
      readerId,
      patch.wallColor ?? null,
      patch.floorColor ?? null,
      patch.shelfColor ?? null,
      patch.wallpaper ?? null,
      patch.floor ?? null,
    ]
  )
  return get(db, readerId)
}

// ------------------------------------------------------------ items

export async function listItems(db, readerId) {
  const result = await db.query(
    `SELECT ${ITEM_COLUMNS} FROM room_items WHERE reader_id = $1 ORDER BY id`,
    [readerId]
  )
  return result.rows
}

export async function getItem(db, readerId, id) {
  const result = await db.query(
    `SELECT ${ITEM_COLUMNS} FROM room_items WHERE reader_id = $1 AND id = $2`,
    [readerId, id]
  )
  return result.rows[0] ?? null
}

export async function countPlaced(db, readerId) {
  const result = await db.query(
    'SELECT count(*)::int AS n FROM room_items WHERE reader_id = $1 AND placed',
    [readerId]
  )
  return result.rows[0].n
}

// Move, turn, store or place an item. Returns null if it is not this reader's.
export async function updateItem(db, readerId, id, patch) {
  const result = await db.query(
    `UPDATE room_items SET
       x        = COALESCE($3::real, x),
       z        = COALESCE($4::real, z),
       rotation = COALESCE($5::int, rotation),
       placed   = COALESCE($6::boolean, placed)
     WHERE reader_id = $1 AND id = $2
     RETURNING ${ITEM_COLUMNS}`,
    [readerId, id, patch.x ?? null, patch.z ?? null, patch.rotation ?? null, patch.placed ?? null]
  )
  return result.rows[0] ?? null
}

// ------------------------------------------------------------ the shop

// New furniture arrives near the middle of the floor, side by side, where the
// reader can see it and move it. A bookcase goes against the free stretch of
// back wall behind the desk instead, if nothing stands there yet: a tall
// bookcase mid-floor would hide half the room.
const DROP_X = [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]
const dropPoint = (n) => ({ x: DROP_X[n % DROP_X.length], z: n < DROP_X.length ? 0.9 : 1.6 })
export const WALL_SLOT = { x: -0.85, z: -2.2 }
const slotTaken = (items) =>
  items.some((i) => i.placed && Math.abs(i.x - WALL_SLOT.x) < 0.8 && Math.abs(i.z - WALL_SLOT.z) < 0.6)

// Buy everything in the cart, or nothing. `ids` are validated catalogue ids.
// Returns { balance, items, unlocks } on success, or { error, ... } saying why
// not. `db` must be a client inside a transaction: the reader's row is locked
// first, so two checkouts cannot both spend the same Ember.
export async function checkout(db, readerId, ids) {
  await db.query('SELECT id FROM readers WHERE id = $1 FOR UPDATE', [readerId])

  const entries = ids.map(catalogEntry)
  const finishes = entries.filter((entry) => entry.type !== 'item')
  const furniture = entries.filter((entry) => entry.type === 'item')

  const owned = await unlocks(db, readerId)
  const already = finishes.find((entry) => owned.includes(entry.id))
  if (already) return { error: 'owned', entry: already }

  const counts = await db.query(
    `SELECT count(*)::int AS owned, count(*) FILTER (WHERE placed)::int AS placed
     FROM room_items WHERE reader_id = $1`,
    [readerId]
  )
  const { owned: ownedCount, placed: placedCount } = counts.rows[0]
  if (ownedCount + furniture.length > MAX_OWNED_ITEMS) return { error: 'full' }

  const cost = entries.reduce((sum, entry) => sum + entry.price, 0)
  const funds = await ember.balance(db, readerId)
  if (funds < cost) return { error: 'funds', balance: funds, cost }

  await ember.spend(db, readerId, cost, ids.join(', '))

  for (const entry of finishes) {
    await db.query('INSERT INTO room_unlocks (reader_id, item) VALUES ($1, $2)', [readerId, entry.id])
  }

  // Whatever does not fit in a full room goes straight to storage.
  const standing = await listItems(db, readerId)
  let wallFree = !slotTaken(standing)
  const items = []
  for (const [n, entry] of furniture.entries()) {
    const toWall = wallFree && entry.category === 'bookshelves'
    if (toWall) wallFree = false
    const { x, z } = toWall ? WALL_SLOT : dropPoint(n)
    const result = await db.query(
      `INSERT INTO room_items (reader_id, kind, x, z, rotation, placed)
       VALUES ($1, $2, $3, $4, 0, $5)
       RETURNING ${ITEM_COLUMNS}`,
      [readerId, entry.id, x, z, placedCount + n < MAX_PLACED_ITEMS]
    )
    items.push(result.rows[0])
  }

  return { balance: funds - cost, items, unlocks: finishes.map((entry) => entry.id) }
}
