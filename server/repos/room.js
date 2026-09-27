// A reader's Library Room: its colours, and the furniture standing in it. The
// books on its shelves come from myBooks.js.

const ROOM_COLUMNS = `
  wall_color  AS "wallColor",
  floor_color AS "floorColor",
  shelf_color AS "shelfColor"`

const ITEM_COLUMNS = 'id, kind, x, z, rotation'

// A reader whose room was never saved gets the defaults from schema.sql,
// rather than a 404 the Library Room would have to handle.
async function ensureRow(pool, readerId) {
  await pool.query(
    'INSERT INTO room_settings (reader_id) VALUES ($1) ON CONFLICT (reader_id) DO NOTHING',
    [readerId]
  )
}

// The whole room in one object, as the Library Room page loads it.
export async function get(pool, readerId) {
  await ensureRow(pool, readerId)
  const [settings, items] = await Promise.all([
    pool.query(`SELECT ${ROOM_COLUMNS} FROM room_settings WHERE reader_id = $1`, [readerId]),
    listItems(pool, readerId),
  ])
  return { ...settings.rows[0], items }
}

// Only the colours present in the validated patch change.
export async function update(pool, readerId, patch) {
  await ensureRow(pool, readerId)
  await pool.query(
    `UPDATE room_settings SET
       wall_color  = COALESCE($2::text, wall_color),
       floor_color = COALESCE($3::text, floor_color),
       shelf_color = COALESCE($4::text, shelf_color)
     WHERE reader_id = $1`,
    [readerId, patch.wallColor ?? null, patch.floorColor ?? null, patch.shelfColor ?? null]
  )
  return get(pool, readerId)
}

// ------------------------------------------------------------ items

export async function listItems(pool, readerId) {
  const result = await pool.query(
    `SELECT ${ITEM_COLUMNS} FROM room_items WHERE reader_id = $1 ORDER BY id`,
    [readerId]
  )
  return result.rows
}

// Placement is optional: an item added without one appears in the middle of
// the floor, where the reader can see it and move it. Returns null when the
// room already holds `limit` items; the count and the insert are one statement.
export async function addItem(pool, readerId, { kind, x, z, rotation }, limit) {
  const result = await pool.query(
    `INSERT INTO room_items (reader_id, kind, x, z, rotation)
     SELECT $1, $2, COALESCE($3::real, 0), COALESCE($4::real, 0.5), COALESCE($5::int, 0)
     WHERE (SELECT count(*) FROM room_items WHERE reader_id = $1) < $6
     RETURNING ${ITEM_COLUMNS}`,
    [readerId, kind, x ?? null, z ?? null, rotation ?? null, limit]
  )
  return result.rows[0] ?? null
}

// Move and/or turn an item. Returns null if it is not this reader's item.
export async function updateItem(pool, readerId, id, patch) {
  const result = await pool.query(
    `UPDATE room_items SET
       x        = COALESCE($3::real, x),
       z        = COALESCE($4::real, z),
       rotation = COALESCE($5::int, rotation)
     WHERE reader_id = $1 AND id = $2
     RETURNING ${ITEM_COLUMNS}`,
    [readerId, id, patch.x ?? null, patch.z ?? null, patch.rotation ?? null]
  )
  return result.rows[0] ?? null
}

export async function removeItem(pool, readerId, id) {
  const result = await pool.query(
    'DELETE FROM room_items WHERE reader_id = $1 AND id = $2',
    [readerId, id]
  )
  return result.rowCount > 0
}
