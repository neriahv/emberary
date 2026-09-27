// The simulated backend.
//
// Same function names, same return types, and the same shape of failure as
// httpApi.js, so the screens cannot tell the difference. Data lives in the
// visitor's own browser and goes no further.
//
// The Week 2 Express API mirrors these functions one endpoint each, so the
// switch to PostgreSQL is VITE_USE_MOCK_API=false rather than a rewrite.

import seed from './seed.json'

// v3: the Library Room became a larger diorama, so v2 room positions no longer
// fit. A new key means a returning visitor starts again from the seed instead
// of finding their furniture in the walls.
const KEY = 'emberary:v3'

export const STATUSES = ['currently-reading', 'want-to-read', 'read', 'did-not-finish']

export const ROOM_ITEM_KINDS = [
  'rug', 'plant', 'lamp', 'armchair', 'side-table', 'cushion',
  'desk', 'rocking-chair', 'globe', 'dresser', 'lantern',
]

// The floor an item may stand on, in metres. The same limits as the server.
export const ROOM_BOUNDS = { x: [-2.2, 2.2], z: [-2.2, 2.2] }

const MAX_ROOM_ITEMS = 30

// A real network is not instant. Keeping this delay is what forces every screen
// to have a loading state now, rather than the day the real API goes in.
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

const clone = (value) => JSON.parse(JSON.stringify(value))

function read() {
  const stored = localStorage.getItem(KEY)
  if (stored) {
    try {
      // The catalogue always comes from the seed: nothing in the demo edits it,
      // and a returning visitor should see new books and covers without losing
      // their own shelves, profile and room.
      return { ...JSON.parse(stored), books: clone(seed.books) }
    } catch {
      // Corrupted storage. Start again rather than crashing the app.
      localStorage.removeItem(KEY)
    }
  }
  const fresh = clone(seed)
  localStorage.setItem(KEY, JSON.stringify(fresh))
  return fresh
}

function write(db) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

function findBook(db, id) {
  const book = db.books.find((b) => b.id === id)
  if (!book) throw new Error('Book not found')
  return book
}

// A collection entry joined with its catalogue book, the shape the Week 2
// "SELECT ... FROM user_books JOIN books" query will return.
function withBook(db, entry) {
  return { ...entry, shelfPosition: entry.shelfPosition ?? null, book: findBook(db, entry.bookId) }
}

// The same rules the server will enforce. The client is not trusted in
// production, but the demo should fail the same way the real API will.
function validateEntryPatch(patch, book) {
  const errors = []
  if ('status' in patch && !STATUSES.includes(patch.status)) {
    errors.push('status must be one of ' + STATUSES.join(', '))
  }
  if ('currentPage' in patch) {
    const page = Number(patch.currentPage)
    if (!Number.isInteger(page) || page < 0 || page > book.pages) {
      errors.push(`currentPage must be a whole number from 0 to ${book.pages}`)
    }
  }
  if ('rating' in patch && patch.rating !== null) {
    const rating = Number(patch.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.push('rating must be a whole number from 1 to 5')
    }
  }
  if ('review' in patch && String(patch.review).length > 2000) {
    errors.push('review must be 2000 characters or fewer')
  }
  if ('shelfPosition' in patch && patch.shelfPosition !== null) {
    const position = Number(patch.shelfPosition)
    if (!Number.isInteger(position) || position < 0 || position > 999) {
      errors.push('shelfPosition must be a whole number from 0 to 999, or null')
    }
  }
  if (errors.length > 0) throw new Error(errors.join('; '))
}

// ---------------------------------------------------------------- catalogue

export async function listBooks({ query = '', genre = '' } = {}) {
  await delay()
  const q = query.trim().toLowerCase()
  return read().books.filter((book) => {
    const matchesQuery =
      !q || book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q)
    const matchesGenre = !genre || book.genre === genre
    return matchesQuery && matchesGenre
  })
}

export async function getBook(id) {
  await delay()
  return findBook(read(), id)
}

// ---------------------------------------------------------------- my books

export async function listMyBooks() {
  await delay()
  const db = read()
  return db.userBooks
    .map((entry) => withBook(db, entry))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function addToCollection(bookId, status = 'want-to-read') {
  await delay()
  const db = read()
  const book = findBook(db, bookId)
  if (db.userBooks.some((entry) => entry.bookId === bookId)) {
    throw new Error(`"${book.title}" is already in your collection`)
  }
  validateEntryPatch({ status }, book)

  const now = new Date().toISOString()
  const entry = {
    bookId,
    status,
    currentPage: status === 'read' ? book.pages : 0,
    rating: null,
    review: '',
    addedAt: now,
    updatedAt: now,
  }
  db.userBooks.push(entry)
  write(db)
  return withBook(db, entry)
}

export async function updateMyBook(bookId, patch) {
  await delay()
  const db = read()
  const book = findBook(db, bookId)
  const entry = db.userBooks.find((e) => e.bookId === bookId)
  if (!entry) throw new Error('That book is not in your collection')
  validateEntryPatch(patch, book)

  const next = { ...entry, ...patch }
  if ('currentPage' in patch) next.currentPage = Number(patch.currentPage)
  if ('rating' in patch && patch.rating !== null) next.rating = Number(patch.rating)
  if ('shelfPosition' in patch && patch.shelfPosition !== null) {
    next.shelfPosition = Number(patch.shelfPosition)
  }
  // Marking a book read means you reached the last page.
  if (patch.status === 'read') next.currentPage = book.pages
  // A new status is a different Library Room shelf, where the old place along
  // the shelf means nothing. The book goes to the end instead.
  if ('status' in patch && patch.status !== entry.status && !('shelfPosition' in patch)) {
    next.shelfPosition = null
  }
  next.updatedAt = new Date().toISOString()

  Object.assign(entry, next)
  write(db)
  return withBook(db, entry)
}

export async function removeFromCollection(bookId) {
  await delay()
  const db = read()
  if (!db.userBooks.some((entry) => entry.bookId === bookId)) {
    throw new Error('That book is not in your collection')
  }
  db.userBooks = db.userBooks.filter((entry) => entry.bookId !== bookId)
  write(db)
}

// Save the left-to-right order of one Library Room shelf. Like the server, it
// leaves updatedAt alone: tidying a shelf is not reading activity.
export async function reorderShelf(bookIds) {
  await delay()
  if (!Array.isArray(bookIds) || bookIds.length === 0 || bookIds.length > 500) {
    throw new Error('bookIds must be a list of 1 to 500 book ids')
  }
  if (new Set(bookIds).size !== bookIds.length) throw new Error('bookIds must not repeat a book')
  const db = read()
  bookIds.forEach((bookId, position) => {
    const entry = db.userBooks.find((e) => e.bookId === bookId)
    if (entry) entry.shelfPosition = position
  })
  write(db)
}

// ---------------------------------------------------------------- insights

export async function getReadingStats() {
  await delay()
  const db = read()
  const entries = db.userBooks.map((entry) => withBook(db, entry))
  const count = (status) => entries.filter((e) => e.status === status).length

  const rated = entries.filter((e) => e.rating)
  const averageRating = rated.length
    ? Math.round((rated.reduce((sum, e) => sum + e.rating, 0) / rated.length) * 10) / 10
    : null

  // Books you finished or are reading say more about taste than a wishlist.
  const engaged = entries.filter((e) => e.status === 'read' || e.status === 'currently-reading')
  const tally = (key) =>
    Object.entries(
      engaged.reduce((acc, e) => ({ ...acc, [e.book[key]]: (acc[e.book[key]] ?? 0) + 1 }), {})
    )
      .map(([name, books]) => ({ name, books }))
      .sort((a, b) => b.books - a.books || a.name.localeCompare(b.name))

  const pagesRead = entries.reduce((sum, e) => sum + e.currentPage, 0)

  // Books finished per month, for the activity chart.
  const finishedByMonth = entries
    .filter((e) => e.status === 'read')
    .reduce((acc, e) => {
      const month = e.updatedAt.slice(0, 7)
      return { ...acc, [month]: (acc[month] ?? 0) + 1 }
    }, {})

  return {
    total: entries.length,
    read: count('read'),
    currentlyReading: count('currently-reading'),
    wantToRead: count('want-to-read'),
    didNotFinish: count('did-not-finish'),
    averageRating,
    pagesRead,
    favoriteGenres: tally('genre').slice(0, 3),
    favoriteAuthors: tally('author').slice(0, 3),
    finishedByMonth,
  }
}

// Week 1 recommendations: score every book you do not own by how much its
// genre and author overlap with what you rated highly or are reading. Week 2
// moves this into SQL against real history.
export async function getRecommendations(limit = 4) {
  await delay()
  const db = read()
  const owned = new Set(db.userBooks.map((e) => e.bookId))
  const weights = { genre: {}, author: {} }

  for (const entry of db.userBooks) {
    const book = findBook(db, entry.bookId)
    let weight = 0
    if (entry.status === 'currently-reading') weight = 2
    if (entry.status === 'read') weight = entry.rating ? entry.rating - 2 : 1
    if (entry.status === 'did-not-finish') weight = -1
    weights.genre[book.genre] = (weights.genre[book.genre] ?? 0) + weight
    weights.author[book.author] = (weights.author[book.author] ?? 0) + weight * 2
  }

  return db.books
    .filter((book) => !owned.has(book.id))
    .map((book) => {
      const genreScore = weights.genre[book.genre] ?? 0
      const authorScore = weights.author[book.author] ?? 0
      const reason =
        authorScore > 0
          ? `You liked other books by ${book.author}`
          : genreScore > 0
            ? `Because you read ${book.genre}`
            : 'Something different'
      return { book, score: genreScore + authorScore, reason }
    })
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
    .slice(0, limit)
}

// ---------------------------------------------------------------- profile

export async function getProfile() {
  await delay()
  return read().profile
}

export async function updateProfile(patch) {
  await delay()
  const db = read()
  const next = { ...db.profile, ...patch }
  const name = String(next.displayName ?? '').trim()
  const goal = Number(next.yearlyGoal)
  if (!name || name.length > 60) throw new Error('display name must be 1 to 60 characters')
  if (String(next.bio ?? '').length > 280) throw new Error('bio must be 280 characters or fewer')
  if (!Number.isInteger(goal) || goal < 1 || goal > 365) {
    throw new Error('yearly goal must be a whole number from 1 to 365')
  }
  db.profile = { ...next, displayName: name, yearlyGoal: goal }
  write(db)
  return db.profile
}

// ---------------------------------------------------------------- library room

export async function getRoom() {
  await delay()
  return read().room
}

// Colours only. Items have their own functions below.
export async function updateRoom(patch) {
  await delay()
  const db = read()
  const hex = /^#[0-9a-f]{6}$/i
  const colours = {}
  for (const key of ['wallColor', 'floorColor', 'shelfColor']) {
    if (!(key in patch)) continue
    if (!hex.test(patch[key])) throw new Error(`${key} must be a hex colour`)
    colours[key] = patch[key]
  }
  if (Object.keys(colours).length === 0) {
    throw new Error('send at least one of wallColor, floorColor, shelfColor')
  }
  db.room = { ...db.room, ...colours }
  write(db)
  return db.room
}

// The same checks as validateRoomItem on the server. Returns the clean fields.
function validateRoomItem(fields, { creating = false } = {}) {
  const errors = []
  const value = {}
  if (creating) {
    if (!ROOM_ITEM_KINDS.includes(fields.kind)) {
      errors.push('kind must be one of ' + ROOM_ITEM_KINDS.join(', '))
    }
    value.kind = fields.kind
  }
  for (const axis of ['x', 'z']) {
    if (!(axis in fields)) continue
    const [min, max] = ROOM_BOUNDS[axis]
    const n = Number(fields[axis])
    if (fields[axis] === null || !Number.isFinite(n) || n < min || n > max) {
      errors.push(`${axis} must be a number from ${min} to ${max}`)
    }
    value[axis] = Math.round(n * 100) / 100
  }
  if ('rotation' in fields) {
    const rotation = Number(fields.rotation)
    if (fields.rotation === null || !Number.isInteger(rotation) || rotation < 0 || rotation > 359) {
      errors.push('rotation must be a whole number of degrees from 0 to 359')
    }
    value.rotation = rotation
  }
  if (!creating && errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('send at least one of x, z, rotation')
  }
  if (errors.length > 0) throw new Error(errors.join('; '))
  return value
}

function findItem(db, id) {
  const item = db.room.items.find((i) => i.id === id)
  if (!item) throw new Error('Room item not found')
  return item
}

// Placement is optional; without one the item appears mid-floor.
export async function addRoomItem(kind, placement = {}) {
  await delay()
  const db = read()
  const value = validateRoomItem({ ...placement, kind }, { creating: true })
  if (db.room.items.length >= MAX_ROOM_ITEMS) {
    throw new Error(`The room already holds ${MAX_ROOM_ITEMS} items`)
  }
  const id = Math.max(0, ...db.room.items.map((i) => i.id)) + 1
  const item = { id, kind: value.kind, x: value.x ?? 0, z: value.z ?? 0.5, rotation: value.rotation ?? 0 }
  db.room.items.push(item)
  write(db)
  return item
}

// Move and/or turn an item: any of { x, z, rotation }.
export async function updateRoomItem(id, patch) {
  await delay()
  const db = read()
  const item = findItem(db, id)
  const { x, z, rotation } = validateRoomItem(patch)
  if (x !== undefined) item.x = x
  if (z !== undefined) item.z = z
  if (rotation !== undefined) item.rotation = rotation
  write(db)
  return item
}

export async function removeRoomItem(id) {
  await delay()
  const db = read()
  findItem(db, id)
  db.room.items = db.room.items.filter((i) => i.id !== id)
  write(db)
}

// Put the demo back to its seed state. Only the mock has this; there is no
// equivalent endpoint on the real API.
export async function resetDemo() {
  await delay()
  localStorage.removeItem(KEY)
  read()
}
