// The reader's profile, shaped like the profile object in mockApi.js.

const PROFILE_COLUMNS = `
  display_name AS "displayName",
  bio, avatar, email,
  yearly_goal  AS "yearlyGoal",
  joined_at    AS "joinedAt"`

export async function get(pool, readerId) {
  const result = await pool.query(
    `SELECT ${PROFILE_COLUMNS} FROM readers WHERE id = $1`,
    [readerId]
  )
  return result.rows[0] ?? null
}

// Takes the whole validated profile, not a patch: the route merges and checks
// it first, so this only has to write it.
export async function update(pool, readerId, { displayName, bio, yearlyGoal, avatar }) {
  const result = await pool.query(
    `UPDATE readers SET display_name = $2, bio = $3, yearly_goal = $4, avatar = $5
     WHERE id = $1
     RETURNING ${PROFILE_COLUMNS}`,
    [readerId, displayName, bio, yearlyGoal, avatar]
  )
  return result.rows[0] ?? null
}
