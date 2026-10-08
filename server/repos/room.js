// A reader's Library Room: how much of it they have built, its colours and
// finishes, and the furniture they own, placed or in storage. The books on its
// shelves come from myBooks.js.

import {
  BLOCKS,
  BUILT_INS,
  blockCount,
  blockPrice,
  blockRefund,
  catalogEntry,
  changeBlocks,
  DEFAULT_BLOCKS,
  FREE_FINISHES,
  MAX_OWNED_ITEMS,
  sellPrice,
} from '../catalog.js'
import * as ember from './ember.js'

const ROOM_COLUMNS = `
  wall_color  AS "wallColor",
  floor_color AS "floorColor",
  shelf_color AS "shelfColor",
  wallpaper,
  floor,
  wall_shape  AS "wallShape",
  roof,
  loft,
  upper_floor       AS "upperFloor",
  upper_floor_color AS "upperFloorColor"`

const ITEM_COLUMNS = 'id, kind, x, z, rotation, placed, level, lit, y, size, color, sx, sy, on_item AS "on"'

// A reader whose room was never saved gets the defaults from schema.sql,
// rather than a 404 the Library Room would have to handle, and the blocks
// every room starts with: one floor block and two walls.
async function ensureRow(db, readerId) {
  await db.query(
    'INSERT INTO room_settings (reader_id) VALUES ($1) ON CONFLICT (reader_id) DO NOTHING',
    [readerId]
  )
  await db.query(
    `INSERT INTO room_blocks (reader_id, kind, side, i, j, level)
     SELECT $1, d.kind, d.side, d.i, d.j, d.level
     FROM jsonb_to_recordset($2::jsonb) AS d(kind text, side text, i int, j int, level int)
     WHERE NOT EXISTS (SELECT 1 FROM room_blocks WHERE reader_id = $1)
     ON CONFLICT DO NOTHING`,
    [readerId, JSON.stringify(DEFAULT_BLOCKS)]
  )
  // The built-in bookcase and shelf, once: a reader who stored or sold them
  // still has their rows. Where they were moved before they were items is in
  // the old fixtures setting.
  const fixtures = (await db.query('SELECT fixtures FROM room_settings WHERE reader_id = $1', [readerId])).rows[0]?.fixtures ?? {}
  const pieces = BUILT_INS.map((piece, n) => ({ ...piece, ...fixtures[['main', 'decor'][n]] }))
  await db.query(
    `INSERT INTO room_items (reader_id, kind, x, z, rotation, placed)
     SELECT $1, p.kind, p.x, p.z, p.rotation, true
     FROM jsonb_to_recordset($2::jsonb) AS p(kind text, x real, z real, rotation int)
     WHERE NOT EXISTS (SELECT 1 FROM room_items WHERE reader_id = $1 AND kind = ANY($3::text[]))`,
    [readerId, JSON.stringify(pieces), BUILT_INS.map((piece) => piece.kind)]
  )
}

// The blocks the room is built of, in the order they were laid.
async function listBlocks(db, readerId) {
  const result = await db.query(
    'SELECT kind, side, i, j, level FROM room_blocks WHERE reader_id = $1 ORDER BY id',
    [readerId]
  )
  return result.rows
}

// Every finish the reader may put on the room: the free ones and the ones
// they bought.
export async function unlocks(db, readerId) {
  const result = await db.query(
    'SELECT item FROM room_unlocks WHERE reader_id = $1 ORDER BY item',
    [readerId]
  )
  return [...FREE_FINISHES, ...result.rows.map((row) => row.item)]
}

// The whole room in one object, as the Library Room page loads it.
export async function get(db, readerId) {
  // The settings first: reading them gives a new room its starting pieces.
  const room = await settings(db, readerId)
  const [items, owned] = await Promise.all([listItems(db, readerId), unlocks(db, readerId)])
  return { ...room, unlocks: owned, items }
}

// The room's settings and blocks, without its items.
export async function settings(db, readerId) {
  await ensureRow(db, readerId)
  const [result, blocks] = await Promise.all([
    db.query(`SELECT ${ROOM_COLUMNS} FROM room_settings WHERE reader_id = $1`, [readerId]),
    listBlocks(db, readerId),
  ])
  return { ...result.rows[0], blocks }
}

// Only the fields present in the validated patch change. The route has already
// checked that every finish is one the reader owns, and that a loft has a
// wall tall enough for it.
export async function update(db, readerId, patch) {
  await ensureRow(db, readerId)
  await db.query(
    `UPDATE room_settings SET
       wall_color  = COALESCE($2::text, wall_color),
       floor_color = COALESCE($3::text, floor_color),
       shelf_color = COALESCE($4::text, shelf_color),
       wallpaper   = COALESCE($5::text, wallpaper),
       floor       = COALESCE($6::text, floor),
       wall_shape  = COALESCE($7::text, wall_shape),
       roof        = COALESCE($8::text, roof),
       loft        = COALESCE($9::text, loft),
       upper_floor = COALESCE($10::text, upper_floor),
       upper_floor_color = COALESCE($11::text, upper_floor_color)
     WHERE reader_id = $1`,
    [
      readerId,
      ...['wallColor', 'floorColor', 'shelfColor', 'wallpaper', 'floor', 'wallShape', 'roof', 'loft', 'upperFloor', 'upperFloorColor']
        .map((key) => patch[key] ?? null),
    ]
  )
  // Without its loft, whatever stood up there comes down to the floor.
  if (patch.loft === 'loft-none') {
    await db.query('UPDATE room_items SET level = 0 WHERE reader_id = $1', [readerId])
  }
  return get(db, readerId)
}

// Change the room's blocks (see changeBlocks in catalog.js): put a new block
// down, which is when it is paid for, move one, or take one away for half its
// price back. Furniture the change leaves somewhere it cannot stand moves too.
// Returns { balance, room }, or { error, ... } saying why not. `db` must be a
// client inside a transaction: the reader's row is locked first, so two
// changes cannot both spend the same Ember or build on the same spot.
export async function changeRoomBlocks(db, readerId, change) {
  await db.query('SELECT id FROM readers WHERE id = $1 FOR UPDATE', [readerId])
  const room = await settings(db, readerId)

  let cost = 0
  if (change.type === 'add') {
    if (change.kind === 'floor' && blockCount(room, 'floor') >= BLOCKS.maxFloor) return { error: 'max' }
    cost = blockPrice(change.kind)
    const funds = await ember.balance(db, readerId)
    if (funds < cost) return { error: 'funds', balance: funds, cost }
  }

  const result = changeBlocks(room, await listItems(db, readerId), change)
  if (result.error) return { error: result.error }

  if (cost > 0) await ember.spend(db, readerId, cost, `block:${change.kind}`)
  const refund = change.type === 'remove' ? blockRefund(change.kind) : 0
  if (refund > 0) await ember.earn(db, readerId, refund, 'sale', `block:${change.kind}`)

  await db.query('DELETE FROM room_blocks WHERE reader_id = $1', [readerId])
  await db.query(
    `INSERT INTO room_blocks (reader_id, kind, side, i, j, level)
     SELECT $1, b.kind, b.side, b.i, b.j, b.level
     FROM jsonb_to_recordset($2::jsonb) AS b(kind text, side text, i int, j int, level int)`,
    [readerId, JSON.stringify(result.blocks)]
  )
  for (const { id, ...patch } of result.items) await updateItem(db, readerId, id, patch)
  return { balance: await ember.balance(db, readerId), refund, room: await get(db, readerId) }
}

// ------------------------------------------------------------ items
//
// A sold item keeps its row, marked sold, rather than being deleted: the
// database does not let the app delete furniture (see roles.sql), and the
// ledger's sale row still says what it was.

export async function listItems(db, readerId) {
  const result = await db.query(
    `SELECT ${ITEM_COLUMNS} FROM room_items WHERE reader_id = $1 AND NOT sold ORDER BY id`,
    [readerId]
  )
  return result.rows
}

export async function getItem(db, readerId, id) {
  const result = await db.query(
    `SELECT ${ITEM_COLUMNS} FROM room_items WHERE reader_id = $1 AND id = $2 AND NOT sold`,
    [readerId, id]
  )
  return result.rows[0] ?? null
}

export async function countPlaced(db, readerId) {
  const result = await db.query(
    'SELECT count(*)::int AS n FROM room_items WHERE reader_id = $1 AND placed AND NOT sold',
    [readerId]
  )
  return result.rows[0].n
}

// Move, turn, switch, store or place an item, size or paint it, or stand it
// on something. Returns null if it is not this reader's. Whatever stood on
// an item that goes into storage comes down to the floor where it was.
export async function updateItem(db, readerId, id, patch) {
  const has = (key) => Object.prototype.hasOwnProperty.call(patch, key)
  const result = await db.query(
    `UPDATE room_items SET
       x        = COALESCE($3::real, x),
       z        = COALESCE($4::real, z),
       rotation = COALESCE($5::int, rotation),
       placed   = COALESCE($6::boolean, placed),
       level    = COALESCE($7::smallint, level),
       lit      = COALESCE($8::boolean, lit),
       y        = COALESCE($9::real, y),
       size     = COALESCE($10::real, size),
       sx       = COALESCE($11::real, sx),
       sy       = COALESCE($12::real, sy),
       color    = CASE WHEN $13 THEN $14::text ELSE color END,
       on_item  = CASE WHEN $15 THEN $16::int ELSE on_item END
     WHERE reader_id = $1 AND id = $2 AND NOT sold
     RETURNING ${ITEM_COLUMNS}`,
    [
      readerId,
      id,
      ...['x', 'z', 'rotation', 'placed', 'level', 'lit', 'y', 'size', 'sx', 'sy'].map((key) => patch[key] ?? null),
      has('color'),
      patch.color ?? null,
      has('on'),
      patch.on ?? null,
    ]
  )
  if (patch.placed === false) await bringDown(db, readerId, id)
  return result.rows[0] ?? null
}

// Whatever stood on an item that has left the room comes down to the floor.
async function bringDown(db, readerId, id) {
  await db.query('UPDATE room_items SET on_item = NULL, y = 0 WHERE reader_id = $1 AND on_item = $2', [readerId, id])
}

// Sell an item back for half what it cost (rounded down). Any of the reader's
// books standing on it go back to the shelves. Returns { balance, refund }, or
// null if there is no such item. Inside a transaction, like checkout.
export async function sell(db, readerId, id) {
  await db.query('SELECT id FROM readers WHERE id = $1 FOR UPDATE', [readerId])
  const result = await db.query(
    `UPDATE room_items SET sold = true, placed = false
     WHERE reader_id = $1 AND id = $2 AND NOT sold
     RETURNING kind`,
    [readerId, id]
  )
  const item = result.rows[0]
  if (!item) return null
  await bringDown(db, readerId, id)
  await db.query(
    `UPDATE user_books SET shelf_case = NULL, shelf_row = NULL, shelf_x = NULL
     WHERE reader_id = $1 AND shelf_case = $2`,
    [readerId, String(id)]
  )
  const refund = sellPrice(item.kind)
  if (refund > 0) await ember.earn(db, readerId, refund, 'sale', item.kind)
  return { balance: await ember.balance(db, readerId), refund }
}

// ------------------------------------------------------------ the shop

// Everything bought goes into storage, to be put in the room from there. It
// keeps a sensible first spot for when it is: near the middle of the floor,
// side by side, where the reader can see it and move it. A bookcase goes against the free stretch of
// back wall behind the desk instead, if nothing stands there yet: a tall
// bookcase mid-floor would hide half the room. A window goes up on the
// window wall, one after another along it.
const DROP_X = [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]
const dropPoint = (n) => ({ x: DROP_X[n % DROP_X.length], z: n < DROP_X.length ? 0.9 : 1.6 })
export const WALL_SLOT = { x: -0.85, z: -2.2 }
const slotTaken = (items) =>
  items.some((i) => Math.abs(i.x - WALL_SLOT.x) < 0.8 && Math.abs(i.z - WALL_SLOT.z) < 0.6)
// New windows go on the first window wall, which every room has.
export const windowSpot = (n) => ({ x: -2.2, z: Math.min(2.2, -0.35 + n * 1.5), rotation: 90, y: 1.75 })

// Buy everything in the cart, or nothing. `ids` are validated catalogue ids.
// Returns { balance, items, unlocks } on success, or { error, ... } saying why
// not. `db` must be a client inside a transaction: the reader's row is locked
// first, so two checkouts cannot both spend the same Ember.
export async function checkout(db, readerId, ids) {
  await db.query('SELECT id FROM readers WHERE id = $1 FOR UPDATE', [readerId])
  await ensureRow(db, readerId)

  const entries = ids.map(catalogEntry)
  const finishes = entries.filter((entry) => entry.type !== 'item')
  const furniture = entries.filter((entry) => entry.type === 'item')

  const owned = await unlocks(db, readerId)
  const already = finishes.find((entry) => owned.includes(entry.id))
  if (already) return { error: 'owned', entry: already }

  const counts = await db.query(
    'SELECT count(*)::int AS owned FROM room_items WHERE reader_id = $1 AND NOT sold',
    [readerId]
  )
  const { owned: ownedCount } = counts.rows[0]
  if (ownedCount + furniture.length > MAX_OWNED_ITEMS) return { error: 'full' }

  const cost = entries.reduce((sum, entry) => sum + entry.price, 0)
  const funds = await ember.balance(db, readerId)
  if (funds < cost) return { error: 'funds', balance: funds, cost }

  await ember.spend(db, readerId, cost, ids.join(', '))

  for (const entry of finishes) {
    await db.query('INSERT INTO room_unlocks (reader_id, item) VALUES ($1, $2)', [readerId, entry.id])
  }

  const standing = await listItems(db, readerId)
  let wallFree = !slotTaken(standing)
  let windows = standing.filter((i) => catalogEntry(i.kind)?.category === 'windows').length
  const items = []
  for (const [n, entry] of furniture.entries()) {
    let spot
    if (entry.category === 'windows') {
      spot = windowSpot(windows)
      windows += 1
    } else if (wallFree && entry.category === 'bookshelves') {
      spot = { ...WALL_SLOT, rotation: 0 }
      wallFree = false
    } else {
      spot = { ...dropPoint(n), rotation: 0 }
    }
    const result = await db.query(
      `INSERT INTO room_items (reader_id, kind, x, z, rotation, placed, y)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${ITEM_COLUMNS}`,
      [readerId, entry.id, spot.x, spot.z, spot.rotation, false, spot.y ?? 0]
    )
    items.push(result.rows[0])
  }

  return { balance: funds - cost, items, unlocks: finishes.map((entry) => entry.id) }
}
