// End-to-end tests for the Emberary API against a real PostgreSQL.
//
//   npm test
//
// Each test starts from schema.sql + seed.sql, which TRUNCATEs every table, so
// this refuses to run against anything but a database on this machine.

import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pool } from '../db/pool.js'
import { createApp } from '../app.js'

const url = new URL(process.env.DATABASE_URL)
if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
  console.error('npm test resets the database. Point DATABASE_URL at a local PostgreSQL.')
  process.exit(1)
}

const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
const seed = readFileSync(new URL('../db/seed.sql', import.meta.url), 'utf8')

let server
let base

before(async () => {
  server = createApp(pool).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://localhost:${server.address().port}`
})

beforeEach(async () => {
  await pool.query(schema)
  await pool.query(seed)
})

after(async () => {
  server.close()
  await pool.end()
})

async function call(method, path, body) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

// ------------------------------------------------------------ health

test('healthz and readyz report the process and the database', async () => {
  assert.deepEqual((await call('GET', '/healthz')).body, { ok: true })
  assert.deepEqual((await call('GET', '/readyz')).body, { ok: true, db: 'up' })
})

test('responses do not announce the framework', async () => {
  const response = await fetch(base + '/healthz')
  assert.equal(response.headers.get('x-powered-by'), null)
})

test('CORS answers named origins only', async () => {
  const preflight = (origin) =>
    fetch(base + '/api/my-books', {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
    })
  const allowed = await preflight('http://localhost:5173')
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  const refused = await preflight('https://evil.example')
  assert.equal(refused.headers.get('access-control-allow-origin'), null)
})

// ------------------------------------------------------------ catalogue

test('lists the whole catalogue', async () => {
  const { status, body } = await call('GET', '/api/books')
  assert.equal(status, 200)
  assert.equal(body.length, 18)
  assert.deepEqual(Object.keys(body[0]).sort(), [
    'author', 'color', 'coverUrl', 'description', 'genre', 'id', 'pages', 'title', 'year',
  ])
})

test('searches by title or author, case-insensitively, and filters by genre', async () => {
  const byAuthor = await call('GET', '/api/books?q=AUSTEN')
  assert.deepEqual(byAuthor.body.map((b) => b.id), ['b01', 'b12'])

  const byGenre = await call('GET', '/api/books?q=&genre=Mystery')
  assert.equal(byGenre.body.length, 3)

  const both = await call('GET', '/api/books?q=hound&genre=Mystery')
  assert.deepEqual(both.body.map((b) => b.id), ['b14'])
})

test('treats search text literally, including SQL and LIKE wildcards', async () => {
  assert.equal((await call('GET', '/api/books?q=%25')).body.length, 0)
  assert.equal((await call('GET', `/api/books?q=${encodeURIComponent("'; DROP TABLE books; --")}`)).body.length, 0)
  assert.equal((await call('GET', '/api/books')).body.length, 18)
})

test('gets one book, or 404s', async () => {
  assert.equal((await call('GET', '/api/books/b03')).body.title, 'The Hobbit')
  assert.equal((await call('GET', '/api/books/nope')).status, 404)
})

// ------------------------------------------------------------ my books

test('lists the reader\'s books newest first, each with its book', async () => {
  const { body } = await call('GET', '/api/my-books')
  assert.equal(body.length, 11)
  assert.equal(body[0].bookId, 'b08')
  assert.equal(body[0].book.title, 'Dune')
  assert.equal(body[0].updatedAt, '2026-09-20T21:10:00.000Z')
})

test('adds a book, defaulting to Want to Read', async () => {
  const { status, body } = await call('POST', '/api/my-books', { bookId: 'b09' })
  assert.equal(status, 201)
  assert.equal(body.status, 'want-to-read')
  assert.equal(body.currentPage, 0)
  assert.equal(body.rating, null)
  assert.equal(body.book.title, 'Little Women')
})

test('adding a book as Read puts it on its last page and marks it finished', async () => {
  const { body } = await call('POST', '/api/my-books', { bookId: 'b11', status: 'read' })
  assert.equal(body.currentPage, 118)
  assert.ok(body.finishedAt)
})

test('refuses duplicates, unknown books and unknown statuses', async () => {
  assert.equal((await call('POST', '/api/my-books', { bookId: 'b01' })).status, 409)
  assert.equal((await call('POST', '/api/my-books', { bookId: 'zzz' })).status, 404)
  assert.equal((await call('POST', '/api/my-books', { bookId: 'b09', status: 'skimmed' })).status, 400)
  assert.equal((await call('POST', '/api/my-books', {})).status, 400)
})

test('updates progress, rating and review', async () => {
  const { status, body } = await call('PATCH', '/api/my-books/b12', {
    currentPage: 200,
    rating: 4,
    review: 'Emma is a menace and I love her.',
  })
  assert.equal(status, 200)
  assert.equal(body.currentPage, 200)
  assert.equal(body.rating, 4)
  assert.equal(body.review, 'Emma is a menace and I love her.')
  assert.equal(body.status, 'currently-reading')
})

test('a rating can be cleared with null', async () => {
  const { body } = await call('PATCH', '/api/my-books/b01', { rating: null })
  assert.equal(body.rating, null)
  assert.equal(body.review.startsWith('Every re-read'), true)
})

test('marking a book Read moves it to the last page; leaving Read clears finishedAt', async () => {
  const read = await call('PATCH', '/api/my-books/b08', { status: 'read' })
  assert.equal(read.body.currentPage, 612)
  assert.ok(read.body.finishedAt)

  const back = await call('PATCH', '/api/my-books/b08', { status: 'did-not-finish' })
  assert.equal(back.body.finishedAt, null)
})

test('editing a Read book\'s review keeps the month it was finished', async () => {
  const { body } = await call('PATCH', '/api/my-books/b01', { review: 'Still perfect.' })
  assert.equal(body.finishedAt, '2026-06-24T20:00:00.000Z')
})

test('saves and clears a Library Room shelf position', async () => {
  assert.equal((await call('PATCH', '/api/my-books/b06', { shelfPosition: 2 })).body.shelfPosition, 2)
  assert.equal((await call('PATCH', '/api/my-books/b06', { shelfPosition: null })).body.shelfPosition, null)
})

test('rejects invalid patches with every problem at once', async () => {
  const { status, body } = await call('PATCH', '/api/my-books/b12', {
    currentPage: 9999,
    rating: 6,
    status: 'nope',
  })
  assert.equal(status, 400)
  assert.match(body.error, /status/)
  assert.match(body.error, /currentPage must be a whole number from 0 to 474/)
  assert.match(body.error, /rating/)

  assert.equal((await call('PATCH', '/api/my-books/b12', {})).status, 400)
  assert.equal((await call('PATCH', '/api/my-books/b12', { review: 'x'.repeat(2001) })).status, 400)
  assert.equal((await call('PATCH', '/api/my-books/b09', { rating: 3 })).status, 404)
})

test('ignores fields a client should not be able to set', async () => {
  const { body } = await call('PATCH', '/api/my-books/b12', {
    rating: 3,
    bookId: 'b01',
    addedAt: '1999-01-01T00:00:00.000Z',
  })
  assert.equal(body.bookId, 'b12')
  assert.equal(body.addedAt, '2026-09-10T12:00:00.000Z')
})

test('removes a book, then 404s on the second try', async () => {
  assert.equal((await call('DELETE', '/api/my-books/b04')).status, 204)
  assert.equal((await call('GET', '/api/my-books')).body.length, 10)
  assert.equal((await call('DELETE', '/api/my-books/b04')).status, 404)
})

// ------------------------------------------------------------ insights

test('reading stats match the seed shelves', async () => {
  const { body } = await call('GET', '/api/stats')
  assert.deepEqual(body, {
    total: 11,
    read: 5,
    currentlyReading: 2,
    wantToRead: 3,
    didNotFinish: 1,
    averageRating: 3.8,
    pagesRead: 432 + 310 + 418 + 180 + 328 + 240 + 95 + 120,
    favoriteGenres: [
      { name: 'Romance', books: 2 },
      { name: 'Science Fiction', books: 2 },
      { name: 'Classic', books: 1 },
    ],
    favoriteAuthors: [
      { name: 'Jane Austen', books: 2 },
      { name: 'Bram Stoker', books: 1 },
      { name: 'F. Scott Fitzgerald', books: 1 },
    ],
    finishedByMonth: { '2026-06': 1, '2026-07': 1, '2026-08': 3 },
  })
})

test('stats follow changes to the shelves', async () => {
  await call('PATCH', '/api/my-books/b12', { status: 'read', rating: 5 })
  const { body } = await call('GET', '/api/stats')
  assert.equal(body.read, 6)
  assert.equal(body.currentlyReading, 1)
  assert.equal(body.averageRating, 4)
})

test('recommends unowned books, best match first, with a reason', async () => {
  const { body } = await call('GET', '/api/recommendations?limit=3')
  assert.equal(body.length, 3)
  const owned = new Set((await call('GET', '/api/my-books')).body.map((e) => e.bookId))
  for (const rec of body) assert.equal(owned.has(rec.book.id), false)
  assert.equal(body[0].book.title, 'The Time Machine')
  assert.equal(body[0].reason, 'Because you read Science Fiction')
  assert.ok(body[0].score >= body[1].score && body[1].score >= body[2].score)
})

test('recommendation limit defaults to 4 and is clamped', async () => {
  assert.equal((await call('GET', '/api/recommendations')).body.length, 4)
  assert.equal((await call('GET', '/api/recommendations?limit=500')).body.length, 7)
})

// ------------------------------------------------------------ profile

test('reads and updates the profile', async () => {
  assert.equal((await call('GET', '/api/profile')).body.displayName, 'Ember Reader')

  const { body } = await call('PATCH', '/api/profile', { displayName: '  Ash  ', yearlyGoal: 30 })
  assert.equal(body.displayName, 'Ash')
  assert.equal(body.yearlyGoal, 30)
  assert.equal(body.bio.startsWith('Reads classics'), true)
})

test('rejects an invalid profile', async () => {
  assert.equal((await call('PATCH', '/api/profile', { displayName: '' })).status, 400)
  assert.equal((await call('PATCH', '/api/profile', { yearlyGoal: 0 })).status, 400)
  assert.equal((await call('PATCH', '/api/profile', { bio: 'x'.repeat(281) })).status, 400)
})

// ------------------------------------------------------------ library room

test('reads the room with its colours and items', async () => {
  const { body } = await call('GET', '/api/room')
  assert.equal(body.wallColor, '#e3a86b')
  assert.deepEqual(body.items.map((i) => i.kind), [
    'rug', 'desk', 'rocking-chair', 'side-table', 'lantern', 'dresser', 'globe', 'plant',
  ])
  assert.deepEqual(body.items[1], { id: 2, kind: 'desk', x: -0.9, z: -0.7, rotation: 0 })
})

test('updates room colours without touching the items', async () => {
  const { body } = await call('PATCH', '/api/room', { wallColor: '#112233' })
  assert.equal(body.wallColor, '#112233')
  assert.equal(body.floorColor, '#9a5530')
  assert.equal(body.items.length, 8)
})

test('rejects bad room colours and empty patches', async () => {
  assert.equal((await call('PATCH', '/api/room', { floorColor: 'red' })).status, 400)
  assert.equal((await call('PATCH', '/api/room', { rug: false })).status, 400)
})

test('adds a room item, in the middle of the floor unless placed', async () => {
  const plain = await call('POST', '/api/room/items', { kind: 'cushion' })
  assert.equal(plain.status, 201)
  assert.deepEqual(plain.body, { id: 9, kind: 'cushion', x: 0, z: 0.5, rotation: 0 })

  const placed = await call('POST', '/api/room/items', { kind: 'globe', x: 2.1, z: -2.1, rotation: 90 })
  assert.deepEqual(placed.body, { id: 10, kind: 'globe', x: 2.1, z: -2.1, rotation: 90 })

  assert.equal((await call('GET', '/api/room')).body.items.length, 10)
})

test('moves and turns a room item, keeping what was not sent', async () => {
  const { status, body } = await call('PATCH', '/api/room/items/4', { x: -0.333, rotation: 45 })
  assert.equal(status, 200)
  assert.deepEqual(body, { id: 4, kind: 'side-table', x: -0.33, z: 1.5, rotation: 45 })
})

test('an item can stand right against the walls', async () => {
  for (const [x, z] of [[2.2, 2.2], [-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2]]) {
    const { status, body } = await call('PATCH', '/api/room/items/5', { x, z })
    assert.equal(status, 200, `x ${x}, z ${z}`)
    assert.deepEqual([body.x, body.z], [x, z])
  }
})

test('an item cannot change kind, leave the room, or turn past 359', async () => {
  const kept = await call('PATCH', '/api/room/items/1', { kind: 'lamp', x: 0.5 })
  assert.equal(kept.body.kind, 'rug')

  assert.equal((await call('PATCH', '/api/room/items/1', { x: 9 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { z: -2.4 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { rotation: 360 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { x: null })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', {})).status, 400)
  assert.equal((await call('POST', '/api/room/items', { kind: 'piano' })).status, 400)
})

test('removes a room item, then 404s on it', async () => {
  assert.equal((await call('DELETE', '/api/room/items/3')).status, 204)
  assert.equal((await call('DELETE', '/api/room/items/3')).status, 404)
  assert.equal((await call('PATCH', '/api/room/items/3', { x: 0 })).status, 404)
  assert.equal((await call('PATCH', '/api/room/items/abc', { x: 0 })).status, 404)
  assert.equal((await call('DELETE', '/api/room/items/99999999999')).status, 404)
  assert.deepEqual((await call('GET', '/api/room')).body.items.map((i) => i.id), [1, 2, 4, 5, 6, 7, 8])
})

test('a room holds at most 30 items', async () => {
  for (let i = 8; i < 30; i++) await call('POST', '/api/room/items', { kind: 'cushion' })
  const full = await call('POST', '/api/room/items', { kind: 'cushion' })
  assert.equal(full.status, 409)
  assert.equal((await call('GET', '/api/room')).body.items.length, 30)
})

test('saves the order of books along a shelf', async () => {
  const order = ['b04', 'b06', 'b13']
  assert.equal((await call('PUT', '/api/my-books/order', { bookIds: order })).status, 204)

  const shelves = (await call('GET', '/api/my-books')).body
  const positions = Object.fromEntries(shelves.map((e) => [e.bookId, e.shelfPosition]))
  assert.deepEqual([positions.b04, positions.b06, positions.b13], [0, 1, 2])
  assert.equal(positions.b01, null)
})

test('reordering a shelf is not reading activity', async () => {
  await call('PUT', '/api/my-books/order', { bookIds: ['b13', 'b04'] })
  const b13 = (await call('GET', '/api/my-books/b13')).body
  assert.equal(b13.updatedAt, '2026-09-05T10:00:00.000Z')
})

test('a book that changes shelf loses its old position', async () => {
  await call('PUT', '/api/my-books/order', { bookIds: ['b04', 'b06'] })
  const moved = await call('PATCH', '/api/my-books/b04', { status: 'currently-reading' })
  assert.equal(moved.body.shelfPosition, null)

  const reviewed = await call('PATCH', '/api/my-books/b06', { review: 'Soon.' })
  assert.equal(reviewed.body.shelfPosition, 1)
})

test('rejects a bad shelf order', async () => {
  assert.equal((await call('PUT', '/api/my-books/order', { bookIds: [] })).status, 400)
  assert.equal((await call('PUT', '/api/my-books/order', { bookIds: ['b04', 'b04'] })).status, 400)
  assert.equal((await call('PUT', '/api/my-books/order', { bookIds: [4] })).status, 400)
  assert.equal((await call('PUT', '/api/my-books/order', {})).status, 400)
})

// ------------------------------------------------------------ errors

test('unknown routes and broken JSON get JSON errors, not stack traces', async () => {
  assert.equal((await call('GET', '/api/nope')).status, 404)

  const response = await fetch(base + '/api/room', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'Request body is not valid JSON' })
})
