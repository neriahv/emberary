// The simulated backend.
//
// Same function names, same return types, and the same shape of failure as
// httpApi.js, so the screens cannot tell the difference. Data lives in the
// visitor's own browser and goes no further.
//
// The Week 2 Express API mirrors these functions one endpoint each, so the
// switch to PostgreSQL is VITE_USE_MOCK_API=false rather than a rewrite.

import seed from './seed.json'
import {
  BLOCKS,
  BLOCK_KINDS,
  DEFAULT_BLOCKS,
  EMBER_RULES,
  FINISH_TYPES,
  BUILT_INS,
  SIZE_LIMITS,
  FREE_FINISHES,
  LOFT,
  MAX_OWNED_ITEMS,
  ROOM_DEFAULTS,
  WINDOW_LIMITS,
  blockCount,
  blockPrice,
  blockRefund,
  catalogEntry,
  changeBlocks,
  clearanceOf,
  forSale,
  isSmall,
  resizable,
  hasLoft,
  hasUpstairs,
  itemFits,
  nearestSpot,
  sellPrice,
} from './catalog.js'
import { bookKey, isGoogleId, searchUrl, volumeIdOf, volumeToBook, volumeUrl } from './bookFromGoogle.js'

// v4: Ember and the Library Room shop arrived, and a v3 room has no wallet,
// finishes or storage. A new key means a returning visitor starts again from
// the seed rather than loading a room shape the app no longer reads.
const KEY = 'emberary:v4'

export const STATUSES = ['currently-reading', 'want-to-read', 'read', 'did-not-finish']

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
      const db = withRoomDefaults({ ...JSON.parse(stored), books: clone(seed.books) })
      const changed = withBuiltIns(db)
      if (withDemoGift(db) || changed) localStorage.setItem(KEY, JSON.stringify(db))
      return db
    } catch {
      // Corrupted storage. Start again rather than crashing the app.
      localStorage.removeItem(KEY)
    }
  }
  const fresh = freshDb()
  localStorage.setItem(KEY, JSON.stringify(fresh))
  return fresh
}

// The demo reader's Ember history, worked out from their reading exactly as
// seedLedger() in server/db/build-seed.js does, so both modes start with the
// same balance.
function seedLedger() {
  const rows = [{ amount: EMBER_RULES.welcome, reason: 'welcome', ref: '', createdAt: seed.profile.joinedAt }]
  const byDate = [...seed.userBooks].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  for (const e of byDate) {
    const pages = Math.floor(e.currentPage / EMBER_RULES.pagesPerEmber)
    if (pages > 0) rows.push({ amount: pages, reason: 'pages-read', ref: e.bookId, createdAt: e.updatedAt })
    if (e.status === 'read') {
      rows.push({ amount: EMBER_RULES.bookFinished, reason: 'book-finished', ref: e.bookId, createdAt: e.updatedAt })
    }
  }
  const bought = [...seed.room.items.map((i) => i.kind), ...(seed.room.unlocks ?? [])]
  const cost = bought.reduce((sum, id) => sum + catalogEntry(id).price, 0)
  if (cost > 0) {
    const last = rows.map((r) => r.createdAt).sort().at(-1)
    rows.push({ amount: -cost, reason: 'purchase', ref: bought.join(', '), createdAt: last })
  }
  return rows.map((row, index) => ({ id: index + 1, ...row }))
}

// The demo reader is given plenty of Ember to try building their dream
// library with, once: in a new demo's history from the start, and added to a
// returning visitor's. Only the demo has it; the live app's Ember is earned.
const DEMO_GIFT = 1000

// Adds the gift if it is not there yet; true if it was added.
function withDemoGift(db) {
  if (db.ledger.some((r) => r.reason === 'demo-gift')) return false
  const id = Math.max(0, ...db.ledger.map((r) => r.id)) + 1
  db.ledger.push({ id, amount: DEMO_GIFT, reason: 'demo-gift', ref: '', createdAt: new Date().toISOString() })
  return true
}

// A room saved before the room could be built bigger has none of the new
// settings; it gets what the database's column defaults would give it.
function withRoomDefaults(db) {
  db.room = { ...ROOM_DEFAULTS, upperFloorColor: '#3a2a1e', blocks: DEFAULT_BLOCKS, ...db.room }
  db.room.unlocks = db.room.unlocks ?? []
  db.room.items = db.room.items.map((item) => ({
    placed: true, level: 0, lit: true, y: 0, size: 1, color: null, sx: 1, sy: 1, on: null, ...item,
  }))
  return db
}

// The built-in bookcase and shelf, given to a room once (where the reader had
// moved them, if they had), like the server does. True if they were added.
function withBuiltIns(db) {
  if (db.room.builtInsGiven) return false
  const moved = db.room.fixtures ?? {}
  let id = Math.max(0, ...db.room.items.map((i) => i.id))
  BUILT_INS.forEach((piece, n) => {
    const at = { ...piece, ...moved[['main', 'decor'][n]] }
    db.room.items.push({
      id: ++id, kind: piece.kind, x: at.x, z: at.z, rotation: at.rotation, placed: true, level: 0, lit: true,
      y: 0, size: 1, color: null, sx: 1, sy: 1, on: null,
    })
  })
  db.room.builtInsGiven = true
  return true
}

// Whatever stood on an item that has left the room comes down to the floor.
function bringDown(db, id) {
  for (const item of db.room.items) if (item.on === id) Object.assign(item, { on: null, y: 0 })
}

function freshDb() {
  const db = withRoomDefaults(clone(seed))
  withBuiltIns(db)
  db.ledger = seedLedger()
  withDemoGift(db)
  db.readingDays = {}
  return db
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
  return {
    ...entry,
    shelfPosition: entry.shelfPosition ?? null,
    shelfSpot: entry.shelfSpot ?? null,
    book: findBook(db, entry.bookId),
  }
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
  if ('shelfSpot' in patch && patch.shelfSpot !== null) {
    const spot = patch.shelfSpot
    if (
      typeof spot !== 'object' ||
      typeof spot.bookcase !== 'string' ||
      !/^(main|[0-9]{1,9})$/.test(spot.bookcase) ||
      !Number.isInteger(spot.row) || spot.row < 0 || spot.row > 9 ||
      typeof spot.x !== 'number' || !Number.isFinite(spot.x) || spot.x < -2.5 || spot.x > 2.5
    ) {
      errors.push('shelfSpot must be { bookcase: "main" or the id of a bookcase or table, row: 0 to 9, x: -2.5 to 2.5 }, or null')
    }
  }
  if (errors.length > 0) throw new Error(errors.join('; '))
}

// ---------------------------------------------------------------- Google Books

// The demo has no server, so it asks Google directly. Google answers browsers
// without a key, with a small quota per visitor, which suits a demo.
async function fromGoogle(url) {
  let response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('Google Books did not answer')
  }
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Google Books answered ${response.status}`)
  return response.json()
}

// The same as GET /api/books/search: every book on Google, with any that are
// already in the catalogue shown as the catalogue's own book.
//
// Without a key Google shares one small daily quota among everyone, and it is
// often used up. The demo then searches its own shelf instead and says so
// (source: 'catalogue'); the key lives only on the live app's server.
export async function searchBooks({ query = '', genre = '' } = {}) {
  if (!query.trim() && !genre) throw new Error('send a search (q), a genre, or both')
  let body
  try {
    body = await fromGoogle(searchUrl(query, genre))
  } catch {
    const fallback = await listBooks({ query, genre })
    fallback.source = 'catalogue'
    return fallback
  }
  const known = new Map(read().books.map((book) => [bookKey(book), book]))
  const seen = new Set()
  const results = []
  for (const book of (body?.items ?? []).map(volumeToBook).filter(Boolean)) {
    const key = bookKey(book)
    const shown = known.get(key) ?? book
    if (seen.has(key) || seen.has(shown.id)) continue
    seen.add(key)
    seen.add(shown.id)
    results.push(shown)
  }
  return results
}

// The demo has no server to pass covers through, and the 3D room may not read
// Google's images directly, so demo spines are drawn rather than photographed.
export const coverImageUrl = () => null

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
  // A book found on Google joins the catalogue the first time it is added,
  // fetched from Google again rather than trusted from the page.
  if (!db.books.some((b) => b.id === bookId) && isGoogleId(bookId)) {
    const found = volumeToBook(await fromGoogle(volumeUrl(volumeIdOf(bookId))))
    if (found) db.books.push(found)
  }
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
  const rewards = rewardReading(db, bookId, null, entry)
  write(db)
  return { ...withBook(db, entry), rewards }
}

export async function updateMyBook(bookId, patch) {
  await delay()
  const db = read()
  const book = findBook(db, bookId)
  const entry = db.userBooks.find((e) => e.bookId === bookId)
  if (!entry) throw new Error('That book is not in your collection')
  validateEntryPatch(patch, book)
  const bookcase = patch.shelfSpot?.bookcase
  if (bookcase && bookcase !== 'main') {
    const item = db.room.items.find((i) => String(i.id) === bookcase)
    if (!catalogEntry(item?.kind)?.holds) throw new Error('That bookcase or table is not in your room')
  }

  const before = { status: entry.status, currentPage: entry.currentPage }
  const next = { ...entry, ...patch }
  if ('currentPage' in patch) next.currentPage = Number(patch.currentPage)
  if ('rating' in patch && patch.rating !== null) next.rating = Number(patch.rating)
  if ('shelfPosition' in patch && patch.shelfPosition !== null) {
    next.shelfPosition = Number(patch.shelfPosition)
  }
  // Marking a book read means you reached the last page.
  if (patch.status === 'read') next.currentPage = book.pages
  // A book joining or leaving the Library Room shelves (Want to Read is not
  // on them) arrives at the end; moving between the started statuses keeps
  // its place.
  const joinsOrLeaves = [patch.status, entry.status].includes('want-to-read')
  if ('status' in patch && patch.status !== entry.status && joinsOrLeaves) {
    if (!('shelfPosition' in patch)) next.shelfPosition = null
    if (!('shelfSpot' in patch)) next.shelfSpot = null
  }
  next.updatedAt = new Date().toISOString()

  Object.assign(entry, next)
  const rewards = rewardReading(db, bookId, before, entry)
  write(db)
  return { ...withBook(db, entry), rewards }
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

// ------------------------------------------------------------ accounts
//
// Demo mode has one reader, kept in this browser. Signing out shows the
// sign-in page, and any email with a password of 8 characters or more signs
// back in to the same demo library, so the screens can be tried without a
// server.

const SIGNED_OUT = 'emberary:demo-signed-out'

function demoAccount(db, email) {
  return { id: 1, displayName: db.profile.displayName, email: email ?? 'demo@emberary.app' }
}

export async function getMe() {
  await delay()
  if (localStorage.getItem(SIGNED_OUT)) {
    const error = new Error('Sign in first')
    error.status = 401
    throw error
  }
  return demoAccount(read())
}

function checkAccount({ email, password }) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('email must be an email address')
  if (typeof password !== 'string' || password.length < 8) throw new Error('password must be 8 to 200 characters')
}

export async function logIn(credentials) {
  await delay()
  checkAccount(credentials)
  localStorage.removeItem(SIGNED_OUT)
  return demoAccount(read(), credentials.email.trim().toLowerCase())
}

export async function signUp(details) {
  await delay()
  checkAccount(details)
  if (!details.displayName?.trim()) throw new Error('display name must be 1 to 60 characters')
  localStorage.removeItem(SIGNED_OUT)
  return demoAccount(read(), details.email.trim().toLowerCase())
}

export async function logOut() {
  await delay()
  localStorage.setItem(SIGNED_OUT, 'yes')
  return null
}

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

// ---------------------------------------------------------------- ember

// The visitor's own calendar day, as YYYY-MM-DD.
const localDay = () => new Date().toLocaleDateString('en-CA')

// One-off rewards, recorded at most once each, like the server's unique index.
const ONCE = ['welcome', 'daily-check-in', 'daily-goal', 'book-finished']

const emberBalance = (db) => db.ledger.reduce((sum, row) => sum + row.amount, 0)

function record(db, amount, reason, ref) {
  if (ONCE.includes(reason) && db.ledger.some((r) => r.reason === reason && r.ref === ref)) return null
  const id = Math.max(0, ...db.ledger.map((r) => r.id)) + 1
  db.ledger.push({ id, amount, reason, ref, createdAt: new Date().toISOString() })
  return { amount, reason, ref }
}

// The same rules as rewardReading() in server/repos/ember.js.
function rewardReading(db, bookId, before, after) {
  const earned = []

  if (after.status === 'read' && before?.status !== 'read') {
    const row = record(db, EMBER_RULES.bookFinished, 'book-finished', bookId)
    if (row) earned.push(row)
  }

  const paid = db.ledger
    .filter((r) => r.reason === 'pages-read' && r.ref === bookId)
    .reduce((sum, r) => sum + r.amount, 0)
  const due = Math.floor(after.currentPage / EMBER_RULES.pagesPerEmber) - paid
  if (due > 0) earned.push(record(db, due, 'pages-read', bookId))

  const forward = after.currentPage - (before?.currentPage ?? 0)
  if (forward > 0) {
    const day = localDay()
    const pages = (db.readingDays[day] ?? 0) + forward
    db.readingDays[day] = pages
    const goal = EMBER_RULES.dailyPageGoal
    if (pages - forward < goal && pages >= goal) {
      const row = record(db, EMBER_RULES.dailyGoalReward, 'daily-goal', day)
      if (row) earned.push(row)
    }
  }

  return earned
}

function emberSummary(db) {
  const day = localDay()
  return {
    balance: emberBalance(db),
    today: day,
    checkedInToday: db.ledger.some((r) => r.reason === 'daily-check-in' && r.ref === day),
    pagesToday: db.readingDays[day] ?? 0,
    dailyPageGoal: EMBER_RULES.dailyPageGoal,
    rules: EMBER_RULES,
    history: [...db.ledger].sort((a, b) => b.id - a.id).slice(0, 8),
  }
}

export async function getEmber() {
  await delay()
  return emberSummary(read())
}

export async function checkIn() {
  await delay()
  const db = read()
  const reward = record(db, EMBER_RULES.dailyCheckIn, 'daily-check-in', localDay())
  if (!reward) throw new Error('You already checked in today')
  write(db)
  return { reward, ...emberSummary(db) }
}

// ---------------------------------------------------------------- library room

// The room as the server sends it: the free finishes count as owned, and the
// built-in pieces stand where they were put, or where they always have.
function roomView(db) {
  const { builtInsGiven, fixtures, ...room } = db.room
  return { ...room, unlocks: [...FREE_FINISHES, ...db.room.unlocks] }
}

export async function getRoom() {
  await delay()
  return roomView(read())
}

// Colours and finishes. A wallpaper or floor has to be owned first.
export async function updateRoom(patch) {
  await delay()
  const db = read()
  const hex = /^#[0-9a-f]{6}$/i
  const errors = []
  const value = {}
  for (const key of ['wallColor', 'floorColor', 'shelfColor', 'upperFloorColor']) {
    if (!(key in patch)) continue
    if (!hex.test(patch[key])) errors.push(`${key} must be a hex colour`)
    value[key] = patch[key]
  }
  for (const key of FINISH_TYPES) {
    if (!(key in patch)) continue
    if (catalogEntry(patch[key])?.type !== key) errors.push(`${key} must be one of the shop's ${key} finishes`)
    value[key] = patch[key]
  }
  if ('upperFloor' in patch) {
    if (catalogEntry(patch.upperFloor)?.type !== 'floor') errors.push("upperFloor must be one of the shop's floor finishes")
    value.upperFloor = patch.upperFloor
  }
  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push(`send at least one of wallColor, floorColor, shelfColor, upperFloorColor, ${FINISH_TYPES.join(', ')}, upperFloor`)
  }
  if (errors.length > 0) throw new Error(errors.join('; '))

  const owned = roomView(db).unlocks
  if ([...FINISH_TYPES, 'upperFloor'].some((key) => value[key] && !owned.includes(value[key]))) {
    throw new Error('Buy that in the shop first')
  }
  if (value.loft === 'loft-gallery' && !hasLoft({ ...db.room, loft: value.loft })) {
    throw new Error(`Build the window wall ${LOFT.wallBlocks} blocks high for a loft`)
  }
  db.room = { ...db.room, ...value }
  // Without its loft, whatever stood up there comes down. The same as the server.
  if (value.loft === 'loft-none') for (const item of db.room.items) item.level = 0
  write(db)
  return roomView(db)
}

// Add, move or take away a room block: { type, kind, at } or { type: 'move',
// kind, from, to }. The same checks and messages as room.changeRoomBlocks()
// on the server.
export async function changeRoomBlocks(change) {
  await delay()
  const { type, kind } = change
  if (!['add', 'move', 'remove'].includes(type)) throw new Error('type must be one of add, move, remove')
  if (!BLOCK_KINDS.includes(kind)) throw new Error(`kind must be one of ${BLOCK_KINDS.join(', ')}`)
  const db = read()
  let cost = 0
  if (type === 'add') {
    if (kind === 'floor' && blockCount(db.room, 'floor') >= BLOCKS.maxFloor) {
      throw new Error(`A room can have ${BLOCKS.maxFloor} floor blocks`)
    }
    cost = blockPrice(kind)
    const funds = emberBalance(db)
    if (funds < cost) throw new Error(`That costs ${cost} Ember and you have ${funds}`)
  }
  const result = changeBlocks(db.room, db.room.items, change)
  if (result.error) {
    throw new Error(
      {
        spot: {
          floor: 'A floor block goes on an empty square beside the floor, not behind a wall',
          wall: `A wall block goes on a back edge of the floor, up to ${BLOCKS.maxLevels} high`,
          upper: `An upstairs floor needs a staircase in the room, and goes over a floor square with a wall ${BLOCKS.upperWalls} blocks high behind it, or beside another upstairs square`,
        }[kind],
        none: kind === 'upper' ? 'There is no upstairs floor there' : `There is no ${kind} block there`,
        upper: 'Take away the upstairs floor above it first',
        last: 'A room needs at least one floor block',
        apart: 'The floor has to stay in one piece',
        walls: 'Take away the walls standing on that floor block first',
      }[result.error]
    )
  }
  if (cost > 0) record(db, -cost, 'purchase', `block:${kind}`)
  const refund = type === 'remove' ? blockRefund(kind) : 0
  if (refund > 0) record(db, refund, 'sale', `block:${kind}`)
  db.room.blocks = result.blocks
  for (const { id, ...patch } of result.items) Object.assign(db.room.items.find((i) => i.id === id), patch)
  write(db)
  return { balance: emberBalance(db), refund, room: roomView(db) }
}

// Sell an item back for half its price, rounded down; books on it go back to
// the shelves. The same as room.sell() on the server.
export async function sellRoomItem(id) {
  await delay()
  const db = read()
  const item = db.room.items.find((i) => i.id === id)
  if (!item) throw new Error('Room item not found')
  db.room.items = db.room.items.filter((i) => i.id !== id)
  bringDown(db, id)
  for (const entry of db.userBooks) {
    if (entry.shelfSpot?.bookcase === String(id)) entry.shelfSpot = null
  }
  const refund = sellPrice(item.kind)
  if (refund > 0) record(db, refund, 'sale', item.kind)
  write(db)
  return { balance: emberBalance(db), refund }
}

// Everything bought goes into storage, keeping a first spot for when it is
// placed: near the middle of the floor, side by side; a bookcase against the
// back wall behind the desk, if that spot is free. The same as the server.
const DROP_X = [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]
const dropPoint = (n) => ({ x: DROP_X[n % DROP_X.length], z: n < DROP_X.length ? 0.9 : 1.6 })
const WALL_SLOT = { x: -0.85, z: -2.2 }
const slotTaken = (items) =>
  items.some((i) => Math.abs(i.x - WALL_SLOT.x) < 0.8 && Math.abs(i.z - WALL_SLOT.z) < 0.6)
const windowSpot = (n) => ({ x: -2.2, z: Math.min(2.2, -0.35 + n * 1.5), rotation: 90, y: 1.75 })

// Buy everything in the cart, or nothing. The same checks, in the same order
// and with the same messages, as room.checkout() on the server.
export async function checkout(ids) {
  await delay()
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 20 ||
    !ids.every((id) => typeof id === 'string' && forSale(catalogEntry(id)))
  ) {
    throw new Error('items must be a list of 1 to 20 things from the shop')
  }
  const entries = ids.map(catalogEntry)
  const finishes = entries.filter((e) => e.type !== 'item')
  const furniture = entries.filter((e) => e.type === 'item')
  if (new Set(finishes.map((e) => e.id)).size !== finishes.length) {
    throw new Error('a wallpaper or floor can only be bought once')
  }

  const db = read()
  const owned = roomView(db).unlocks
  const already = finishes.find((e) => owned.includes(e.id))
  if (already) throw new Error(`You already own ${already.name}`)
  if (db.room.items.length + furniture.length > MAX_OWNED_ITEMS) {
    throw new Error('You own as much furniture as a room can keep')
  }
  const cost = entries.reduce((sum, e) => sum + e.price, 0)
  const funds = emberBalance(db)
  if (funds < cost) throw new Error(`That costs ${cost} Ember and you have ${funds}`)

  record(db, -cost, 'purchase', ids.join(', '))
  db.room.unlocks.push(...finishes.map((e) => e.id))
  let id = Math.max(0, ...db.room.items.map((i) => i.id))
  let wallFree = !slotTaken(db.room.items)
  let windows = db.room.items.filter((i) => catalogEntry(i.kind)?.category === 'windows').length
  const items = furniture.map((entry, n) => {
    let spot
    if (entry.category === 'windows') spot = windowSpot(windows++)
    else if (wallFree && entry.category === 'bookshelves') {
      spot = { ...WALL_SLOT, rotation: 0 }
      wallFree = false
    } else spot = { ...dropPoint(n), rotation: 0 }
    return {
      id: ++id,
      kind: entry.id,
      x: spot.x,
      z: spot.z,
      rotation: spot.rotation,
      placed: false,
      level: 0,
      lit: true,
      y: spot.y ?? 0,
      size: 1,
      color: null,
      sx: 1,
      sy: 1,
      on: null,
    }
  })
  db.room.items.push(...items)
  write(db)
  return { balance: funds - cost, items, unlocks: finishes.map((e) => e.id) }
}

// The same checks as validateRoomItem on the server. Returns the clean fields.
function validateRoomItem(fields, room, current) {
  const errors = []
  const value = {}
  if ('level' in fields) {
    if (fields.level !== 0 && fields.level !== 1) errors.push('level must be 0 (the floor) or 1 (upstairs)')
    else if (fields.level === 1 && !hasUpstairs(room)) errors.push('level 1 is upstairs: build an upstairs floor first')
    value.level = fields.level
  }
  for (const axis of ['x', 'z']) {
    if (!(axis in fields)) continue
    const n = Number(fields[axis])
    if (fields[axis] === null || !Number.isFinite(n)) errors.push(`${axis} must be a number`)
    else value[axis] = Math.round(n * 100) / 100
  }
  if ('on' in fields) {
    if (fields.on !== null && (!Number.isInteger(fields.on) || fields.on < 1 || fields.on === current.id)) {
      errors.push('on must be the id of another item in the room, or null')
    } else if (fields.on !== null && !isSmall(current.kind)) {
      errors.push('only small things stand on other furniture')
    }
    value.on = fields.on
  }
  const standsOn = 'on' in value ? value.on : current.on
  if (errors.length === 0 && !standsOn && ('x' in fields || 'z' in fields || 'level' in value || 'on' in value)) {
    const level = 'level' in value ? value.level : current.level
    const x = value.x ?? current.x
    const z = value.z ?? current.z
    const clearance = clearanceOf(current.kind)
    if (!itemFits(room, level, x, z, clearance)) {
      const moved = 'level' in value && !('x' in fields) && !('z' in fields) && nearestSpot(room, level, x, z, clearance)
      if (moved) Object.assign(value, moved)
      else errors.push(level === 1 ? 'x and z must be a spot upstairs' : "x and z must be a spot on the room's floor")
    }
  }
  if ('rotation' in fields) {
    const rotation = Number(fields.rotation)
    if (fields.rotation === null || !Number.isInteger(rotation) || rotation < 0 || rotation > 359) {
      errors.push('rotation must be a whole number of degrees from 0 to 359')
    }
    value.rotation = rotation
  }
  for (const key of ['placed', 'lit']) {
    if (!(key in fields)) continue
    if (typeof fields[key] !== 'boolean') errors.push(`${key} must be true or false`)
    value[key] = fields[key]
  }
  // Furniture on the floor stands at height 0; only a window keeps clear of
  // the floor, which the room sees to when it hangs one.
  const limits = { ...WINDOW_LIMITS, y: [0, WINDOW_LIMITS.y[1]], ...SIZE_LIMITS }
  for (const key of ['y', 'size', 'sx', 'sy']) {
    if (!(key in fields)) continue
    if ((key === 'sx' || key === 'sy') && !resizable(current.kind)) {
      errors.push('only bookcases and windows can be made wider or taller')
      continue
    }
    const [min, max] = limits[key]
    const n = Number(fields[key])
    if (fields[key] === null || !Number.isFinite(n) || n < min || n > max) {
      errors.push(`${key} must be a number from ${min} to ${max}`)
    }
    value[key] = Math.round(n * 100) / 100
  }
  if ('color' in fields) {
    if (fields.color !== null && (typeof fields.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(fields.color))) {
      errors.push('color must be a hex colour, or null')
    }
    value.color = fields.color
  }
  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('send at least one of x, z, rotation, level, placed, lit, y, size, sx, sy, color, on')
  }
  if (errors.length > 0) throw new Error(errors.join('; '))
  return value
}

// Move, turn, switch, store or place an item: any of
// { x, z, rotation, level, placed, lit }.
export async function updateRoomItem(id, patch) {
  await delay()
  const db = read()
  const item = db.room.items.find((i) => i.id === id)
  if (!item) throw new Error('Room item not found')
  const value = validateRoomItem(patch, db.room, item)
  if (value.on) {
    const under = db.room.items.find((i) => i.id === value.on)
    if (!under?.placed) throw new Error('on must be the id of another item in the room, or null')
  }
  Object.assign(item, value)
  if (value.placed === false) bringDown(db, id)
  write(db)
  return item
}

// Put the demo back to its seed state. Only the mock has this; there is no
// equivalent endpoint on the real API.
export async function resetDemo() {
  await delay()
  localStorage.removeItem(KEY)
  read()
}
