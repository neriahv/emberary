// Numbers worked out from a reader's shelves, for the Home dashboard and the
// Profile page. The database does the counting and grouping, which is what it
// is for; the Week 1 mock did the same work in JavaScript.

import { BOOK_JSON } from './books.js'

// Books you finished or are reading say more about taste than a wishlist.
const ENGAGED = `ub.status IN ('read', 'currently-reading')`

// A column name cannot be a query parameter, so the two tallies each get their
// own fixed query rather than one built from a string.
const TALLY = {
  genre: `SELECT b.genre AS name, count(*)::int AS books
          FROM user_books ub JOIN books b ON b.id = ub.book_id
          WHERE ub.reader_id = $1 AND ${ENGAGED}
          GROUP BY b.genre ORDER BY books DESC, name LIMIT 3`,
  author: `SELECT b.author AS name, count(*)::int AS books
           FROM user_books ub JOIN books b ON b.id = ub.book_id
           WHERE ub.reader_id = $1 AND ${ENGAGED}
           GROUP BY b.author ORDER BY books DESC, name LIMIT 3`,
}

export async function readingStats(pool, readerId) {
  const [totals, genres, authors, months] = await Promise.all([
    // count() is a bigint, which pg hands back as a string; ::int keeps the
    // JSON numeric. avg() is numeric for the same reason, hence ::float8.
    pool.query(
      `SELECT
         count(*)::int                                              AS total,
         count(*) FILTER (WHERE status = 'read')::int              AS read,
         count(*) FILTER (WHERE status = 'currently-reading')::int AS "currentlyReading",
         count(*) FILTER (WHERE status = 'want-to-read')::int      AS "wantToRead",
         count(*) FILTER (WHERE status = 'did-not-finish')::int    AS "didNotFinish",
         round(avg(rating), 1)::float8                             AS "averageRating",
         COALESCE(sum(current_page), 0)::int                       AS "pagesRead"
       FROM user_books
       WHERE reader_id = $1`,
      [readerId]
    ),
    pool.query(TALLY.genre, [readerId]),
    pool.query(TALLY.author, [readerId]),
    // Books finished per month ("2026-08"), for the activity chart. In UTC, so
    // the month does not depend on where the server happens to run.
    pool.query(
      `SELECT to_char(COALESCE(finished_at, updated_at) AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
              count(*)::int AS books
       FROM user_books
       WHERE reader_id = $1 AND status = 'read'
       GROUP BY month
       ORDER BY month`,
      [readerId]
    ),
  ])

  return {
    ...totals.rows[0],
    favoriteGenres: genres.rows,
    favoriteAuthors: authors.rows,
    finishedByMonth: Object.fromEntries(months.rows.map((row) => [row.month, row.books])),
  }
}

// Score every book the reader does not own by how much its genre and author
// overlap with what they rated highly or are reading. The same weights as the
// Week 1 mock: reading counts 2, a finished book counts its rating minus 2 (1
// if unrated), a book you gave up on counts -1, and an author match counts
// double a genre match.
export async function recommendations(pool, readerId, limit) {
  const result = await pool.query(
    `WITH weighted AS (
       SELECT b.genre, b.author,
              CASE ub.status
                WHEN 'currently-reading' THEN 2
                WHEN 'read'              THEN COALESCE(ub.rating - 2, 1)
                WHEN 'did-not-finish'    THEN -1
                ELSE 0
              END AS weight
       FROM user_books ub JOIN books b ON b.id = ub.book_id
       WHERE ub.reader_id = $1
     ),
     genre_scores  AS (SELECT genre,  sum(weight)     AS score FROM weighted GROUP BY genre),
     author_scores AS (SELECT author, sum(weight) * 2 AS score FROM weighted GROUP BY author),
     scored AS (
       SELECT books.*,
              COALESCE(g.score, 0)::int AS genre_score,
              COALESCE(a.score, 0)::int AS author_score
       FROM books
       LEFT JOIN genre_scores  g ON g.genre  = books.genre
       LEFT JOIN author_scores a ON a.author = books.author
       WHERE NOT EXISTS (
         SELECT 1 FROM user_books owned WHERE owned.reader_id = $1 AND owned.book_id = books.id
       )
     )
     SELECT ${BOOK_JSON} AS book,
            b.genre_score + b.author_score AS score,
            CASE WHEN b.author_score > 0 THEN 'You liked other books by ' || b.author
                 WHEN b.genre_score  > 0 THEN 'Because you read ' || b.genre
                 ELSE 'Something different'
            END AS reason
     FROM scored b
     ORDER BY score DESC, b.title
     LIMIT $2`,
    [readerId, limit]
  )
  return result.rows
}
