// A reader's shelves: which books they have, and where they are with each one.
// Every function takes the reader's id, so one reader can never read or change
// another's rows, even once there is more than one.

import { BOOK_JSON } from './books.js'

// A shelf entry joined with its catalogue book, the same shape mockApi.js
// returns. The timestamps come back as Date objects, which Express sends as
// ISO strings.
const ENTRY_COLUMNS = `
  ub.book_id        AS "bookId",
  ub.status,
  ub.current_page   AS "currentPage",
  ub.rating,
  ub.review,
  ub.shelf_position AS "shelfPosition",
  ub.added_at       AS "addedAt",
  ub.updated_at     AS "updatedAt",
  ub.finished_at    AS "finishedAt",
  ${BOOK_JSON}      AS book`

export async function list(pool, readerId) {
  const result = await pool.query(
    `SELECT ${ENTRY_COLUMNS}
     FROM user_books ub JOIN books b ON b.id = ub.book_id
     WHERE ub.reader_id = $1
     ORDER BY ub.updated_at DESC`,
    [readerId]
  )
  return result.rows
}

// The status and page of one entry, locked until the transaction ends, so the
// Ember earned by one save is settled before the next save of the same book
// reads it. `db` must be a client inside a transaction.
export async function lock(db, readerId, bookId) {
  const result = await db.query(
    `SELECT status, current_page AS "currentPage" FROM user_books
     WHERE reader_id = $1 AND book_id = $2 FOR UPDATE`,
    [readerId, bookId]
  )
  return result.rows[0] ?? null
}

export async function get(pool, readerId, bookId) {
  const result = await pool.query(
    `SELECT ${ENTRY_COLUMNS}
     FROM user_books ub JOIN books b ON b.id = ub.book_id
     WHERE ub.reader_id = $1 AND ub.book_id = $2`,
    [readerId, bookId]
  )
  return result.rows[0] ?? null
}

// Returns the new entry, or null if the book was already on the reader's
// shelves. ON CONFLICT makes that check and the insert one atomic step, so two
// quick clicks cannot add the same book twice. A Read book starts on its last
// page, as it does in the mock.
export async function add(pool, readerId, bookId, status) {
  const result = await pool.query(
    `WITH inserted AS (
       INSERT INTO user_books (reader_id, book_id, status, current_page, finished_at)
       SELECT $1, b.id, $3::text,
              CASE WHEN $3::text = 'read' THEN b.pages ELSE 0 END,
              CASE WHEN $3::text = 'read' THEN now() END
       FROM books b WHERE b.id = $2
       ON CONFLICT (reader_id, book_id) DO NOTHING
       RETURNING *
     )
     SELECT ${ENTRY_COLUMNS}
     FROM inserted ub JOIN books b ON b.id = ub.book_id`,
    [readerId, bookId, status]
  )
  return result.rows[0] ?? null
}

// Apply a validated patch. Only the fields present in `patch` change. The two
// boolean parameters say whether rating and shelfPosition were sent, because
// null is a real value for both ("clear my rating").
//
// Two rules live here rather than in the route, so they hold for any caller:
//   - marking a book Read moves it to its last page
//   - finished_at is stamped when a book becomes Read and cleared when it
//     stops being Read, so the activity chart counts it in the right month
//   - a book that joins or leaves the Library Room's shelves (Want to Read is
//     not on them) loses its old shelf_position, so it arrives at the end;
//     moving between Currently Reading, Read and Did Not Finish keeps its place
export async function update(pool, readerId, bookId, patch) {
  const result = await pool.query(
    `WITH updated AS (
       UPDATE user_books ub SET
         status         = COALESCE($3::text, ub.status),
         current_page   = CASE WHEN $3::text = 'read' THEN b.pages
                               ELSE COALESCE($4::int, ub.current_page) END,
         rating         = CASE WHEN $5::boolean THEN $6::int ELSE ub.rating END,
         review         = COALESCE($7::text, ub.review),
         shelf_position = CASE WHEN $8::boolean THEN $9::int
                               WHEN $3::text IS NOT NULL AND $3::text <> ub.status
                                    AND 'want-to-read' IN ($3::text, ub.status) THEN NULL
                               ELSE ub.shelf_position END,
         finished_at    = CASE WHEN $3::text IS NULL OR $3::text = ub.status THEN ub.finished_at
                               WHEN $3::text = 'read' THEN now()
                               ELSE NULL END,
         updated_at     = now()
       FROM books b
       WHERE b.id = ub.book_id AND ub.reader_id = $1 AND ub.book_id = $2
       RETURNING ub.*
     )
     SELECT ${ENTRY_COLUMNS}
     FROM updated ub JOIN books b ON b.id = ub.book_id`,
    [
      readerId,
      bookId,
      patch.status ?? null,
      patch.currentPage ?? null,
      'rating' in patch,
      patch.rating ?? null,
      patch.review ?? null,
      'shelfPosition' in patch,
      patch.shelfPosition ?? null,
    ]
  )
  return result.rows[0] ?? null
}

// Save the left-to-right order of one Library Room shelf: the first id gets
// position 0, the next 1, and so on, in a single statement. Ids that are not on
// this reader's shelves match no row and are ignored. updated_at is left alone
// on purpose: tidying a shelf is not reading activity, and should not reorder
// "recently updated" on the Home dashboard.
export async function reorder(pool, readerId, bookIds) {
  const result = await pool.query(
    `UPDATE user_books ub
     SET shelf_position = o.position - 1
     FROM unnest($2::text[]) WITH ORDINALITY AS o(book_id, position)
     WHERE ub.reader_id = $1 AND ub.book_id = o.book_id`,
    [readerId, bookIds]
  )
  return result.rowCount
}

export async function remove(pool, readerId, bookId) {
  const result = await pool.query(
    'DELETE FROM user_books WHERE reader_id = $1 AND book_id = $2',
    [readerId, bookId]
  )
  return result.rowCount > 0
}
