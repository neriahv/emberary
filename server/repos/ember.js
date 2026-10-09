// Ember: earned by reading, spent in the Library Room shop. Every change is a
// row in ember_ledger, and the balance is their sum.
//
// "Today" is the reader's calendar day, not the server's: a check-in resets at
// midnight where the reader lives. `timezone` is an IANA name such as
// "Asia/Manila", passed to PostgreSQL as a parameter.

import { EMBER_RULES } from '../catalog.js'

// A one-off reward that is already in the ledger inserts nothing. The WHERE
// clause matches the partial unique index ember_ledger_once_idx.
const ONCE = `ON CONFLICT (reader_id, reason, ref)
  WHERE reason IN ('welcome', 'daily-check-in', 'daily-goal', 'book-finished') DO NOTHING`

async function today(db, timezone) {
  const result = await db.query('SELECT (now() AT TIME ZONE $1)::date::text AS day', [timezone])
  return result.rows[0].day
}

export async function balance(db, readerId) {
  const result = await db.query(
    'SELECT COALESCE(SUM(amount), 0)::int AS balance FROM ember_ledger WHERE reader_id = $1',
    [readerId]
  )
  return result.rows[0].balance
}

// Add a row and return it, or null when a one-off reward was already given.
async function record(db, readerId, amount, reason, ref) {
  const result = await db.query(
    `INSERT INTO ember_ledger (reader_id, amount, reason, ref) VALUES ($1, $2, $3, $4)
     ${ONCE}
     RETURNING amount, reason, ref`,
    [readerId, amount, reason, ref]
  )
  return result.rows[0] ?? null
}

// Everything the wallet shows: the balance, today's progress and the most
// recent changes.
export async function summary(db, readerId, timezone, goal) {
  const day = await today(db, timezone)
  const [total, checkedIn, reading, history] = await Promise.all([
    balance(db, readerId),
    db.query(
      `SELECT 1 FROM ember_ledger WHERE reader_id = $1 AND reason = 'daily-check-in' AND ref = $2`,
      [readerId, day]
    ),
    db.query('SELECT pages FROM reading_days WHERE reader_id = $1 AND day = $2::date', [readerId, day]),
    db.query(
      `SELECT id, amount, reason, ref, created_at AS "createdAt"
       FROM ember_ledger WHERE reader_id = $1 ORDER BY id DESC LIMIT 8`,
      [readerId]
    ),
  ])
  const pagesToday = reading.rows[0]?.pages ?? 0
  return {
    balance: total,
    today: day,
    checkedInToday: checkedIn.rowCount > 0,
    pagesToday,
    dailyPageGoal: goal,
    rules: EMBER_RULES,
    history: history.rows,
  }
}

// The daily check-in. Returns null if the reader already checked in today.
export async function checkIn(db, readerId, timezone) {
  const day = await today(db, timezone)
  return record(db, readerId, EMBER_RULES.dailyCheckIn, 'daily-check-in', day)
}

// Rewards for a change to a book on the reader's shelves, and the list of what
// was earned (often empty). `before` is null for a book just added. Call this
// inside the same transaction as the change, with the entry's row locked, so
// two saves of one book cannot both earn the same milestone.
//
//   - finishing a book: once per book, ever. Taking it off the shelves and
//     adding it again does not earn it twice; the ledger remembers.
//   - pages: 1 Ember per 50 pages reached, counted against what this book has
//     already earned, so paging back and forth earns nothing new.
//   - the daily goal: pages read today (forward only) reaching the goal.
export async function rewardReading(db, readerId, bookId, before, after, timezone, goal) {
  const earned = []

  if (after.status === 'read' && before?.status !== 'read') {
    const row = await record(db, readerId, EMBER_RULES.bookFinished, 'book-finished', bookId)
    if (row) earned.push(row)
  }

  const paid = await db.query(
    `SELECT COALESCE(SUM(amount), 0)::int AS paid FROM ember_ledger
     WHERE reader_id = $1 AND reason = 'pages-read' AND ref = $2`,
    [readerId, bookId]
  )
  const due = Math.floor(after.currentPage / EMBER_RULES.pagesPerEmber) - paid.rows[0].paid
  if (due > 0) earned.push(await record(db, readerId, due, 'pages-read', bookId))

  const forward = after.currentPage - (before?.currentPage ?? 0)
  if (forward > 0) {
    const day = await db.query(
      `INSERT INTO reading_days (reader_id, day, pages)
       VALUES ($1, (now() AT TIME ZONE $2)::date, $3)
       ON CONFLICT (reader_id, day) DO UPDATE SET pages = reading_days.pages + EXCLUDED.pages
       RETURNING pages, day::text AS day`,
      [readerId, timezone, forward]
    )
      const { pages, day: date } = day.rows[0]

      // A changed goal earns its reward on the next reading that crosses
      // the new target, not immediately when settings are saved.
      // The ledger prevents the same daily reward from being earned twice.
      if (pages - forward < goal && pages >= goal) {
        const row = await record(
          db,
          readerId,
          EMBER_RULES.dailyGoalReward,
          'daily-goal',
          date
        )

        if (row) earned.push(row)
      }

  }

  return earned
}

// Spend Ember. The caller has already checked the balance inside the same
// transaction, with the reader's row locked.
// Ember coming back to the reader, such as for furniture sold.
export async function earn(db, readerId, amount, reason, ref) {
  await db.query(
    'INSERT INTO ember_ledger (reader_id, amount, reason, ref) VALUES ($1, $2, $3, $4)',
    [readerId, amount, reason, ref]
  )
}

export async function spend(db, readerId, amount, ref) {
  await db.query(
    `INSERT INTO ember_ledger (reader_id, amount, reason, ref) VALUES ($1, $2, 'purchase', $3)`,
    [readerId, -amount, ref]
  )
}
