// The catalogue: every book Emberary knows about, shared by all readers.
//
// Every query is parameterised: values go in the array, never into the string.
// This is the single most important habit in database code, and it is what
// stops "'; DROP TABLE books; --" in the search box from being a real problem.

// A catalogue row as the client expects it. Other repositories reuse this to
// nest the book inside a shelf entry, so every endpoint sends the same shape.
// It expects the books table to be aliased as b.
export const BOOK_JSON = `json_build_object(
  'id', b.id, 'title', b.title, 'author', b.author, 'genre', b.genre,
  'pages', b.pages, 'year', b.year, 'color', b.color, 'description', b.description,
  'coverUrl', b.cover_url
)`

// Search by title or author, and optionally one genre. position() rather than
// ILIKE, because a % or _ typed into the search box would be a wildcard in a
// LIKE pattern.
export async function search(pool, { query = '', genre = '' } = {}) {
  const result = await pool.query(
    `SELECT ${BOOK_JSON} AS book
     FROM books b
     WHERE ($1 = '' OR position(lower($1) IN lower(b.title)) > 0
                    OR position(lower($1) IN lower(b.author)) > 0)
       AND ($2 = '' OR b.genre = $2)
     ORDER BY b.id`,
    [query.trim(), genre]
  )
  return result.rows.map((row) => row.book)
}

export async function getById(pool, id) {
  const result = await pool.query(`SELECT ${BOOK_JSON} AS book FROM books b WHERE b.id = $1`, [id])
  return result.rows[0]?.book ?? null
}

// Every catalogue book, for matching Google results against books Emberary
// already has. The catalogue is small: the seed plus books readers added.
export async function all(pool) {
  const result = await pool.query(`SELECT ${BOOK_JSON} AS book FROM books b ORDER BY b.id`)
  return result.rows.map((row) => row.book)
}

// Save a book found on Google, the first time any reader adds it. An existing
// row is never changed, which is also all the app's database role may do: it
// can add to the catalogue, not rewrite it.
export async function insertIfMissing(db, book) {
  await db.query(
    `INSERT INTO books (id, title, author, genre, pages, year, color, description, cover_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    [book.id, book.title, book.author, book.genre, book.pages, book.year, book.color, book.description, book.coverUrl]
  )
}
