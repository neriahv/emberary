// The reader's settings, with database columns mapped to API fields.
const SETTINGS_COLUMNS = `
  timezone,
  daily_page_goal AS "dailyPageGoal",
  theme`

export async function get(pool, readerId) {
  const result = await pool.query(
    `SELECT ${SETTINGS_COLUMNS} FROM readers WHERE id = $1`,
    [readerId]
  )

  return result.rows[0] ?? null
}

// Saves the complete validated settings, not a partial patch.
export async function update(
  pool,
  readerId,
  { timezone, dailyPageGoal, theme }
) {
  const result = await pool.query(
    `UPDATE readers
     SET timezone = $2,
         daily_page_goal = $3,
         theme = $4
     WHERE id = $1
     RETURNING ${SETTINGS_COLUMNS}`,
    [readerId, timezone, dailyPageGoal, theme]
  )

  return result.rows[0] ?? null
}
