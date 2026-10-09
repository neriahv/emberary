// Streaks use persisted calendar days. A streak stays current until yesterday
// stops connecting to today; changing zones does not relabel past records.
export const BADGES = [
  { id: 'first-book', label: 'First book finished', reward: 5 },
  { id: 'ten-books', label: '10 books read', reward: 20 },
  { id: 'seven-days', label: '7-day streak', reward: 15 },
]
export async function streaks(db, readerId, timezone) {
  const result = await db.query(
    `WITH days AS (
  SELECT day FROM reading_days WHERE reader_id=$1 AND pages>0
  UNION SELECT day FROM reading_minutes WHERE reader_id=$1 AND seconds>=60
 ), runs AS (SELECT day, day - (row_number() OVER(ORDER BY day))::int AS run FROM days),
 lengths AS (SELECT min(day) AS first, max(day) AS last, count(*)::int AS length FROM runs GROUP BY run)
 SELECT COALESCE(max(length) FILTER (WHERE last >= (now() AT TIME ZONE $2)::date - 1 AND last <= (now() AT TIME ZONE $2)::date),0)::int AS current,
 COALESCE(max(length),0)::int AS best FROM lengths`,
    [readerId, timezone]
  )
  return result.rows[0]
}
export async function settleAchievements(db, readerId, timezone) {
  const counts = await db.query(
    `SELECT count(*)::int AS finished FROM ember_ledger WHERE reader_id=$1 AND reason='book-finished'`,
    [readerId]
  )
  const streak = await streaks(db, readerId, timezone)
  const eligible = [counts.rows[0].finished >= 1, counts.rows[0].finished >= 10, streak.best >= 7]
  const rewards = []
  for (const [index, badge] of BADGES.entries()) {
    if (!eligible[index]) continue
    const earned = await db.query(
      'INSERT INTO reader_badges(reader_id,badge) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING badge',
      [readerId, badge.id]
    )
    if (!earned.rowCount) continue
    const reward = await db.query(
      `INSERT INTO ember_ledger(reader_id,amount,reason,ref) VALUES($1,$2,'achievement',$3)
   ON CONFLICT(reader_id,reason,ref) WHERE reason IN ('achievement','daily-quest') DO NOTHING RETURNING amount,reason,ref`,
      [readerId, badge.reward, badge.id]
    )
    rewards.push(...reward.rows)
  }
  return rewards
}
export async function readingSummary(db, readerId, timezone) {
  const streak = await streaks(db, readerId, timezone)
  const minutes = await db.query(
    'SELECT COALESCE(sum(seconds),0)::int AS seconds FROM reading_minutes WHERE reader_id=$1',
    [readerId]
  )
  const badges = await db.query(
    'SELECT badge,earned_at AS "earnedAt" FROM reader_badges WHERE reader_id=$1',
    [readerId]
  )
  return {
    streak,
    minutes: Math.floor(minutes.rows[0].seconds / 60),
    badges: BADGES.map((b) => ({
      ...b,
      earnedAt: badges.rows.find((row) => row.badge === b.id)?.earnedAt ?? null,
    })),
  }
}
export async function quests(db, readerId, timezone) {
  const result = await db.query(
    `SELECT (now() AT TIME ZONE $2)::date::text AS day,
 COALESCE((SELECT pages FROM reading_days WHERE reader_id=$1 AND day=(now() AT TIME ZONE $2)::date),0) AS pages,
 EXISTS(SELECT 1 FROM daily_activity WHERE reader_id=$1 AND day=(now() AT TIME ZONE $2)::date AND rated) AS rated,
 EXISTS(SELECT 1 FROM ember_ledger WHERE reader_id=$1 AND reason='daily-check-in' AND ref=(now() AT TIME ZONE $2)::date::text) AS checked`,
    [readerId, timezone]
  )
  const row = result.rows[0]
  const paid = await db.query(
    "SELECT ref FROM ember_ledger WHERE reader_id=$1 AND reason='daily-quest' AND ref LIKE $2",
    [readerId, row.day + ':%']
  )
  // A deterministic daily target: stable through refreshes and different each day.
  const target = 15 + (Math.floor(Date.parse(row.day) / 86400000) % 3) * 5
  return {
    day: row.day,
    items: [
      {
        id: 'pages',
        label: `Read ${target} pages today`,
        target,
        progress: row.pages,
        reward: 4,
      },
      {
        id: 'rating',
        label: 'Rate a book today',
        target: 1,
        progress: Number(row.rated),
        reward: 2,
      },
      {
        id: 'check-in',
        label: 'Check in today',
        target: 1,
        progress: Number(row.checked),
        reward: 2,
      },
    ].map((q) => ({
      ...q,
      claimed: paid.rows.some((p) => p.ref === `${row.day}:${q.id}`),
    })),
  }
}
export async function claimQuest(db, readerId, timezone, id) {
  const day = await quests(db, readerId, timezone)
  const quest = day.items.find((q) => q.id === id)
  if (!quest || quest.progress < quest.target || quest.claimed) return null
  const result = await db.query(
    `INSERT INTO ember_ledger(reader_id,amount,reason,ref) VALUES($1,$2,'daily-quest',$3)
 ON CONFLICT(reader_id,reason,ref) WHERE reason IN ('achievement','daily-quest') DO NOTHING RETURNING amount,reason,ref`,
    [readerId, quest.reward, `${day.day}:${id}`]
  )
  return result.rows[0] ?? null
}
export async function timer(db, readerId) {
  const result = await db.query(
    'SELECT id,started_at AS "startedAt" FROM reading_timers WHERE reader_id=$1 AND stopped_at IS NULL',
    [readerId]
  )
  return result.rows[0] ?? null
}
export async function startTimer(db, readerId) {
  await db.query('INSERT INTO reading_timers(reader_id) VALUES($1) ON CONFLICT DO NOTHING', [readerId])
  return timer(db, readerId)
}
export async function stopTimer(db, readerId, timezone) {
  const result = await db.query(
    'UPDATE reading_timers SET stopped_at=now() WHERE reader_id=$1 AND stopped_at IS NULL RETURNING started_at,stopped_at',
    [readerId]
  )
  if (!result.rowCount) return null
  // Split the measured interval at the reader's local midnights, including DST.
  // Limit a forgotten timer to 12 hours; the browser never supplies the duration.
  const { started_at: start, stopped_at: stop } = result.rows[0]
  await db.query(
    `WITH bounds AS (SELECT $2::timestamptz AS start, LEAST($3::timestamptz,$2::timestamptz+interval '12 hours') AS stop),
 days AS (SELECT d::date AS day, d::timestamp AT TIME ZONE $4 AS low, (d::date+1)::timestamp AT TIME ZONE $4 AS high, start,stop
 FROM bounds, LATERAL generate_series((start AT TIME ZONE $4)::date::timestamp, (stop AT TIME ZONE $4)::date::timestamp, interval '1 day') d),
 elapsed AS (SELECT day, floor(extract(epoch FROM (LEAST(stop,high)-GREATEST(start,low))))::int AS seconds FROM days)
 INSERT INTO reading_minutes(reader_id,day,seconds) SELECT $1,day,seconds FROM elapsed WHERE seconds>0
 ON CONFLICT(reader_id,day) DO UPDATE SET seconds=reading_minutes.seconds+EXCLUDED.seconds`,
    [readerId, start, stop, timezone]
  )
  return {
    stopped: true,
    rewards: await settleAchievements(db, readerId, timezone),
  }
}
export async function yearReview(db, readerId, timezone) {
  const result = await db.query(
    `WITH year AS (SELECT extract(year FROM now() AT TIME ZONE $2)::int AS y),
 finished AS (SELECT b.*, ub.finished_at AT TIME ZONE $2 AS finished FROM user_books ub JOIN books b ON b.id=ub.book_id, year
  WHERE ub.reader_id=$1 AND ub.status='read' AND extract(year FROM ub.finished_at AT TIME ZONE $2)=year.y),
 months AS (SELECT to_char(finished,'FMMonth') AS name,count(*) AS n, min(finished) AS first FROM finished GROUP BY name),
 genres AS (SELECT genre,count(*) AS n FROM finished GROUP BY genre)
 SELECT (SELECT y FROM year) AS year, (SELECT count(*)::int FROM finished) AS "booksFinished",
 (SELECT COALESCE(sum(pages),0)::int FROM reading_events,year WHERE reader_id=$1 AND extract(year FROM created_at AT TIME ZONE $2)=year.y) AS "pagesRead",
 (SELECT title FROM finished ORDER BY pages DESC,title LIMIT 1) AS "longestBook",
 (SELECT name FROM months ORDER BY n DESC,first LIMIT 1) AS "busiestMonth",
 (SELECT genre FROM genres ORDER BY n DESC,genre LIMIT 1) AS "favoriteGenre"`,
    [readerId, timezone]
  )
  return result.rows[0]
}
