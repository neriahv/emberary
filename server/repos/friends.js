// Friend requests and accepted friendships.
// Only public reader identity fields are shared.

const READER_COLUMNS = `
  r.id,
  r.display_name AS "displayName",
  r.avatar`

// Search registered readers who have no existing friendship.
// Excludes yourself and relationships that are pending or accepted.
export async function search(db, readerId, query) {
  const term = typeof query === 'string' ? query.trim() : ''
  if (term.length < 2) return []

  const result = await db.query(
    `SELECT ${READER_COLUMNS}
     FROM readers r
     WHERE r.id <> $1
       AND r.email IS NOT NULL
       AND position(lower($2) IN lower(r.display_name)) > 0
       AND NOT EXISTS (
         SELECT 1
         FROM friendships f
         WHERE (f.requester_id = $1 AND f.addressee_id = r.id)
            OR (f.requester_id = r.id AND f.addressee_id = $1)
       )
     ORDER BY lower(r.display_name), r.id
     LIMIT 10`,
    [readerId, term]
  )

  return result.rows
}

// Return accepted friends, incoming requests and outgoing requests.
// Each entry contains only id, displayName and avatar.
export async function list(db, readerId) {
  const result = await db.query(
    `SELECT
       ${READER_COLUMNS},
       f.status,
       CASE
         WHEN f.addressee_id = $1 THEN 'incoming'
         ELSE 'outgoing'
       END AS direction
     FROM friendships f
     JOIN readers r
       ON r.id = CASE
         WHEN f.requester_id = $1 THEN f.addressee_id
         ELSE f.requester_id
       END
     WHERE f.requester_id = $1
        OR f.addressee_id = $1
     ORDER BY f.created_at DESC, r.id`,
    [readerId]
  )

  const lists = {
    friends: [],
    incoming: [],
    outgoing: [],
  }

  for (const row of result.rows) {
    const reader = {
      id: row.id,
      displayName: row.displayName,
      avatar: row.avatar,
    }

    if (row.status === 'accepted') {
      lists.friends.push(reader)
    } else if (row.direction === 'incoming') {
      lists.incoming.push(reader)
    } else {
      lists.outgoing.push(reader)
    }
  }

  return lists
}

// Send a pending friend request.
// Returns an error reason for invalid or existing relationships.
export async function request(db, readerId, otherId) {
  if (readerId === otherId) {
    return { error: 'self' }
  }

  const reader = await db.query(
    `SELECT id
     FROM readers
     WHERE id = $1
       AND email IS NOT NULL`,
    [otherId]
  )

  if (reader.rowCount === 0) {
    return { error: 'missing' }
  }

  const result = await db.query(
    `INSERT INTO friendships
       (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT DO NOTHING
     RETURNING
       requester_id AS "requesterId",
       addressee_id AS "addresseeId",
       status,
       created_at AS "createdAt"`,
    [readerId, otherId]
  )

  return result.rows[0] ?? { error: 'exists' }
}

// Only the recipient of a pending request can accept it.
// Returns true if the request was accepted.
export async function accept(db, readerId, otherId) {
  const result = await db.query(
    `UPDATE friendships
     SET status = 'accepted'
     WHERE requester_id = $2
       AND addressee_id = $1
       AND status = 'pending'`,
    [readerId, otherId]
  )

  return result.rowCount > 0
}

// Decline, cancel or unfriend in either direction.
// Returns true if a relationship was removed.
export async function remove(db, readerId, otherId) {
  const result = await db.query(
    `DELETE FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)`,
    [readerId, otherId]
  )

  return result.rowCount > 0
}

// Verify an accepted friendship before sharing library information.
// Pending requests, strangers and self-visits are not permitted.
export async function areFriends(db, a, b) {
  if (a === b) return false

  const result = await db.query(
    `SELECT 1
     FROM friendships
     WHERE status = 'accepted'
       AND (
         (requester_id = $1 AND addressee_id = $2)
         OR (requester_id = $2 AND addressee_id = $1)
       )
     LIMIT 1`,
    [a, b]
  )

  return result.rowCount > 0
}
