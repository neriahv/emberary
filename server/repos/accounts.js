// Readers' accounts and their sessions. See auth.js for how passwords and
// session tokens are kept.

import { newToken, SESSION_DAYS, tokenHash } from '../auth.js'

const ACCOUNT_COLUMNS = 'id, display_name AS "displayName", email'

// A new reader with an account. Returns the account, or null if that email
// already has one.
export async function createReader(db, { email, displayName, passwordHash }) {
  try {
    const result = await db.query(
      `INSERT INTO readers (display_name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING ${ACCOUNT_COLUMNS}`,
      [displayName, email, passwordHash]
    )
    return result.rows[0]
  } catch (error) {
    if (error.code === '23505') return null // the email is taken
    throw error
  }
}

export async function findByEmail(db, email) {
  const result = await db.query(
    `SELECT ${ACCOUNT_COLUMNS}, password_hash AS "passwordHash" FROM readers WHERE lower(email) = lower($1)`,
    [email]
  )
  return result.rows[0] ?? null
}

export async function getAccount(db, readerId) {
  const result = await db.query(`SELECT ${ACCOUNT_COLUMNS} FROM readers WHERE id = $1`, [readerId])
  return result.rows[0] ?? null
}

// Start a session; returns its token, which only the reader's cookie holds.
// Their sessions that have run out are cleared on the way.
export async function createSession(db, readerId) {
  const token = newToken()
  await db.query('DELETE FROM sessions WHERE reader_id = $1 AND expires_at < now()', [readerId])
  await db.query(
    `INSERT INTO sessions (token_hash, reader_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [tokenHash(token), readerId, SESSION_DAYS]
  )
  return token
}

// The account a session token belongs to, if the session is still good.
export async function readerForToken(db, token) {
  const result = await db.query(
    `SELECT r.id, r.display_name AS "displayName", r.email
     FROM sessions s JOIN readers r ON r.id = s.reader_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash(token)]
  )
  return result.rows[0] ?? null
}

export async function deleteSession(db, token) {
  await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash(token)])
}
