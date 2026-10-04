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
let googleCalls = []
let googleDown = false

// A stand-in for Google, so the tests never touch the internet. It knows a
// search, two volumes, and one cover image.
const VOLUMES = {
  fakeVol001: {
    id: 'fakeVol001',
    volumeInfo: {
      title: 'The Night Library',
      authors: ['Ada Quill'],
      categories: ['Fiction / Fantasy / Epic'],
      pageCount: 384,
      publishedDate: '2019-05-02',
      description: '<p>A library that only opens <b>at night</b>.</p>',
      imageLinks: { thumbnail: 'http://books.google.com/books/content?id=fakeVol001&printsec=frontcover&img=1&zoom=1&edge=curl' },
    },
  },
  fakeDune01: {
    id: 'fakeDune01',
    volumeInfo: { title: 'Dune', authors: ['Frank Herbert'], pageCount: 604, publishedDate: '1990' },
  },
  noPages001: { id: 'noPages001', volumeInfo: { title: 'A Pamphlet', authors: ['Nobody'] } },
}
async function fakeGoogle(url) {
  url = new URL(url)
  googleCalls.push(url)
  if (googleDown) throw new Error('offline')
  if (url.hostname === 'books.google.com') {
    return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { headers: { 'Content-Type': 'image/jpeg' } })
  }
  const id = url.pathname.split('/volumes/')[1]
  if (id) {
    const volume = VOLUMES[decodeURIComponent(id)]
    return volume ? Response.json(volume) : new Response('{}', { status: 404 })
  }
  return Response.json({ items: Object.values(VOLUMES) })
}
let base

before(async () => {
  server = createApp(pool, { fetch: fakeGoogle }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://localhost:${server.address().port}`
})

beforeEach(async () => {
  googleCalls = []
  googleDown = false
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

// ------------------------------------------------------------ ember

// The seed reader: 10 welcome + 38 for pages + 75 for five finished books,
// less 21 for the furniture already in the room.
const SEED_BALANCE = 102

const balance = async () => (await call('GET', '/api/ember')).body.balance

test('the wallet shows the balance worked out from the reading history', async () => {
  const { status, body } = await call('GET', '/api/ember')
  assert.equal(status, 200)
  assert.equal(body.balance, SEED_BALANCE)
  assert.equal(body.checkedInToday, false)
  assert.equal(body.pagesToday, 0)
  assert.equal(body.dailyPageGoal, 20)
  assert.match(body.today, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(body.history[0].reason, 'purchase')
})

test('the daily check-in pays 3 Ember, once a day', async () => {
  const first = await call('POST', '/api/ember/check-in')
  assert.equal(first.status, 201)
  assert.equal(first.body.reward.amount, 3)
  assert.equal(first.body.balance, SEED_BALANCE + 3)
  assert.equal(first.body.checkedInToday, true)

  assert.equal((await call('POST', '/api/ember/check-in')).status, 409)
  assert.equal(await balance(), SEED_BALANCE + 3)
})

test('finishing a book pays for the book, the pages and the daily goal', async () => {
  // Emma: 95 of 474 pages, which has already earned 1 Ember for its first 50.
  const { body } = await call('PATCH', '/api/my-books/b12', { status: 'read' })
  const earned = Object.fromEntries(body.rewards.map((r) => [r.reason, r.amount]))
  assert.deepEqual(earned, { 'book-finished': 15, 'pages-read': 8, 'daily-goal': 5 })
  assert.equal(await balance(), SEED_BALANCE + 28)
  assert.equal((await call('GET', '/api/ember')).body.pagesToday, 474 - 95)
})

test('a book is only ever paid for finishing once', async () => {
  await call('PATCH', '/api/my-books/b12', { status: 'read' })
  const after = await balance()

  await call('PATCH', '/api/my-books/b12', { status: 'currently-reading' })
  const again = await call('PATCH', '/api/my-books/b12', { status: 'read' })
  assert.equal(again.body.rewards.some((r) => r.reason === 'book-finished'), false)

  // Nor by taking it off the shelves and adding it back as Read.
  await call('DELETE', '/api/my-books/b01')
  const readded = await call('POST', '/api/my-books', { bookId: 'b01', status: 'read' })
  assert.equal(readded.status, 201)
  assert.equal(readded.body.rewards.some((r) => r.reason === 'book-finished'), false)
  assert.equal(readded.body.rewards.some((r) => r.reason === 'pages-read'), false)
  assert.ok((await balance()) <= after + 5, 'at most the daily goal, which was already paid today')
})

test('pages earn 1 Ember per 50, and paging back and forth earns nothing new', async () => {
  // Dune: 240 pages read, 4 Ember already earned.
  assert.deepEqual((await call('PATCH', '/api/my-books/b08', { currentPage: 249 })).body.rewards, [])

  const next = await call('PATCH', '/api/my-books/b08', { currentPage: 250 })
  assert.deepEqual(next.body.rewards, [{ amount: 1, reason: 'pages-read', ref: 'b08' }])

  await call('PATCH', '/api/my-books/b08', { currentPage: 10 })
  const back = await call('PATCH', '/api/my-books/b08', { currentPage: 250 })
  assert.equal(back.body.rewards.some((r) => r.reason === 'pages-read'), false)
})

test('the daily reading goal pays once, when today\'s pages reach 20', async () => {
  const first = await call('PATCH', '/api/my-books/b08', { currentPage: 255 })
  assert.deepEqual(first.body.rewards.map((r) => r.reason), ['pages-read'])
  const goal = await call('PATCH', '/api/my-books/b08', { currentPage: 260 })
  assert.deepEqual(goal.body.rewards, [{ amount: 5, reason: 'daily-goal', ref: goal.body.rewards[0].ref }])
  const more = await call('PATCH', '/api/my-books/b08', { currentPage: 300 })
  assert.equal(more.body.rewards.some((r) => r.reason === 'daily-goal'), false)
})

test('saving a book that earns nothing says so', async () => {
  const { body } = await call('PATCH', '/api/my-books/b01', { review: 'Still perfect.' })
  assert.deepEqual(body.rewards, [])
})

test('the catalogue and its prices are the same on the client and the server', async () => {
  const server = await import('../catalog.js')
  const client = await import(new URL('../../client/src/api/catalog.js', import.meta.url))
  assert.deepEqual(client.CATALOG, server.CATALOG)
  assert.deepEqual(client.SHOP_CATEGORIES, server.SHOP_CATEGORIES)
  assert.deepEqual(client.EMBER_RULES, server.EMBER_RULES)
  assert.equal(client.MAX_PLACED_ITEMS, server.MAX_PLACED_ITEMS)
  assert.equal(client.MAX_OWNED_ITEMS, server.MAX_OWNED_ITEMS)
})

// ------------------------------------------------------------ library room

test('reads the room with its colours, finishes and items', async () => {
  const { body } = await call('GET', '/api/room')
  assert.equal(body.wallColor, '#e3a86b')
  assert.equal(body.wallpaper, 'wallpaper-plain')
  assert.equal(body.floor, 'floor-planks')
  assert.deepEqual(body.unlocks, ['wallpaper-plain', 'floor-planks'])
  assert.deepEqual(body.items.map((i) => i.kind), [
    'rug', 'desk', 'rocking-chair', 'side-table', 'lantern', 'dresser', 'globe', 'plant',
  ])
  assert.deepEqual(body.items[1], { id: 2, kind: 'desk', x: -0.9, z: -0.7, rotation: 0, placed: true })
})

test('updates room colours without touching the items', async () => {
  const { body } = await call('PATCH', '/api/room', { wallColor: '#112233' })
  assert.equal(body.wallColor, '#112233')
  assert.equal(body.floorColor, '#9a5530')
  assert.equal(body.items.length, 8)
})

test('rejects bad room colours, unknown finishes and empty patches', async () => {
  assert.equal((await call('PATCH', '/api/room', { floorColor: 'red' })).status, 400)
  assert.equal((await call('PATCH', '/api/room', { rug: false })).status, 400)
  assert.equal((await call('PATCH', '/api/room', { wallpaper: 'floor-stone' })).status, 400)
  assert.equal((await call('PATCH', '/api/room', { floor: 'lino' })).status, 400)
})

test('a wallpaper or floor has to be bought before it goes on the room', async () => {
  const locked = await call('PATCH', '/api/room', { wallpaper: 'wallpaper-stripes' })
  assert.equal(locked.status, 409)

  await call('POST', '/api/shop/checkout', { items: ['wallpaper-stripes'] })
  const { status, body } = await call('PATCH', '/api/room', { wallpaper: 'wallpaper-stripes' })
  assert.equal(status, 200)
  assert.equal(body.wallpaper, 'wallpaper-stripes')
  assert.ok(body.unlocks.includes('wallpaper-stripes'))
})

test('checkout buys the whole cart, pays for it, and puts it in the room', async () => {
  const { status, body } = await call('POST', '/api/shop/checkout', {
    items: ['bookcase-tall', 'chair', 'chair', 'floor-checker'],
  })
  assert.equal(status, 201)
  assert.equal(body.balance, SEED_BALANCE - 10 - 1 - 1 - 3)
  assert.deepEqual(body.unlocks, ['floor-checker'])
  assert.deepEqual(body.items.map((i) => [i.id, i.kind, i.placed]), [
    [9, 'bookcase-tall', true],
    [10, 'chair', true],
    [11, 'chair', true],
  ])
  // The bookcase goes against the back wall; the chairs mid-floor, side by side.
  assert.deepEqual([body.items[0].x, body.items[0].z], [-0.85, -2.2])
  assert.notDeepEqual([body.items[1].x, body.items[1].z], [body.items[2].x, body.items[2].z])
  assert.equal(await balance(), body.balance)

  const history = (await call('GET', '/api/ember')).body.history
  assert.deepEqual(history[0], { ...history[0], amount: -15, reason: 'purchase' })
})

test('a second bookcase does not land on top of the first', async () => {
  const first = await call('POST', '/api/shop/checkout', { items: ['bookcase-small'] })
  const second = await call('POST', '/api/shop/checkout', { items: ['bookcase-small'] })
  assert.deepEqual([first.body.items[0].x, first.body.items[0].z], [-0.85, -2.2])
  assert.notDeepEqual([second.body.items[0].x, second.body.items[0].z], [-0.85, -2.2])
})

test('checkout refuses what the reader cannot afford, and changes nothing', async () => {
  const cart = Array(11).fill('bookcase-tall')
  const { status, body } = await call('POST', '/api/shop/checkout', { items: cart })
  assert.equal(status, 409)
  assert.match(body.error, /costs 110 Ember and you have 102/)
  assert.equal(await balance(), SEED_BALANCE)
  assert.equal((await call('GET', '/api/room')).body.items.length, 8)
})

test('checkout refuses unknown things, empty carts and finishes already owned', async () => {
  assert.equal((await call('POST', '/api/shop/checkout', { items: ['piano'] })).status, 400)
  assert.equal((await call('POST', '/api/shop/checkout', { items: [] })).status, 400)
  assert.equal((await call('POST', '/api/shop/checkout', {})).status, 400)
  assert.equal(
    (await call('POST', '/api/shop/checkout', { items: ['floor-stone', 'floor-stone'] })).status,
    400
  )
  const free = await call('POST', '/api/shop/checkout', { items: ['wallpaper-plain'] })
  assert.equal(free.status, 409)
  assert.match(free.body.error, /already own Plain paint/)
  assert.equal(await balance(), SEED_BALANCE)
})

test('moves and turns a room item, keeping what was not sent', async () => {
  const { status, body } = await call('PATCH', '/api/room/items/4', { x: -0.333, rotation: 45 })
  assert.equal(status, 200)
  assert.deepEqual(body, { id: 4, kind: 'side-table', x: -0.33, z: 1.5, rotation: 45, placed: true })
})

test('an item can stand right against the walls', async () => {
  for (const [x, z] of [[2.2, 2.2], [-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2]]) {
    const { status, body } = await call('PATCH', '/api/room/items/5', { x, z })
    assert.equal(status, 200, `x ${x}, z ${z}`)
    assert.deepEqual([body.x, body.z], [x, z])
  }
})

test('an item goes into storage and comes back out, never lost', async () => {
  const stored = await call('PATCH', '/api/room/items/3', { placed: false })
  assert.equal(stored.body.placed, false)
  const room = (await call('GET', '/api/room')).body
  assert.equal(room.items.find((i) => i.id === 3).placed, false)
  assert.equal(room.items.length, 8)

  const placed = await call('PATCH', '/api/room/items/3', { placed: true })
  assert.equal(placed.body.placed, true)
})

test('a room holds 30 things at once; more go to storage', async () => {
  const cart = Array(20).fill('vase')
  await call('POST', '/api/shop/checkout', { items: cart })
  const { body } = await call('POST', '/api/shop/checkout', { items: Array(4).fill('vase') })
  assert.deepEqual(body.items.map((i) => i.placed), [true, true, false, false])

  const blocked = await call('PATCH', `/api/room/items/${body.items[2].id}`, { placed: true })
  assert.equal(blocked.status, 409)
  await call('PATCH', '/api/room/items/1', { placed: false })
  assert.equal((await call('PATCH', `/api/room/items/${body.items[2].id}`, { placed: true })).status, 200)
})

test('an item cannot change kind, leave the room, or turn past 359', async () => {
  const kept = await call('PATCH', '/api/room/items/1', { kind: 'lamp', x: 0.5 })
  assert.equal(kept.body.kind, 'rug')

  assert.equal((await call('PATCH', '/api/room/items/1', { x: 9 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { z: -2.4 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { rotation: 360 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { x: null })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { placed: 'yes' })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', {})).status, 400)
})

test('unknown room items are 404s, and furniture is never deleted', async () => {
  assert.equal((await call('PATCH', '/api/room/items/99', { x: 0 })).status, 404)
  assert.equal((await call('PATCH', '/api/room/items/abc', { x: 0 })).status, 404)
  assert.equal((await call('PATCH', '/api/room/items/99999999999', { x: 0 })).status, 404)
  assert.equal((await call('DELETE', '/api/room/items/3')).status, 404)
  assert.equal((await call('POST', '/api/room/items', { kind: 'rug' })).status, 404)
})

test('saves the order of books along the shelves', async () => {
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

test('a book joining the shelves from Want to Read arrives at the end', async () => {
  await call('PUT', '/api/my-books/order', { bookIds: ['b04', 'b06'] })
  const moved = await call('PATCH', '/api/my-books/b04', { status: 'currently-reading' })
  assert.equal(moved.body.shelfPosition, null)

  const reviewed = await call('PATCH', '/api/my-books/b06', { review: 'Soon.' })
  assert.equal(reviewed.body.shelfPosition, 1)
})

test('a book keeps its place when it moves between Reading, Read and Did Not Finish', async () => {
  await call('PUT', '/api/my-books/order', { bookIds: ['b08', 'b01'] })
  const read = await call('PATCH', '/api/my-books/b08', { status: 'read' })
  assert.equal(read.body.shelfPosition, 0)
  const dnf = await call('PATCH', '/api/my-books/b01', { status: 'did-not-finish' })
  assert.equal(dnf.body.shelfPosition, 1)
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

// ------------------------------------------------------------ Google Books

test('search goes to Google Books, and keeps only books with a page count', async () => {
  const { status, body } = await call('GET', '/api/books/search?q=library')
  assert.equal(status, 200)
  assert.equal(googleCalls[0].searchParams.get('q'), 'library')

  const night = body.find((b) => b.id === 'gb-fakeVol001')
  assert.equal(night.title, 'The Night Library')
  assert.equal(night.author, 'Ada Quill')
  assert.equal(night.genre, 'Fantasy')
  assert.equal(night.year, 2019)
  assert.equal(night.description, 'A library that only opens at night .')
  assert.match(night.coverUrl, /^https:\/\/books\.google\.com\//)
  assert.doesNotMatch(night.coverUrl, /edge=/)
  assert.ok(!body.some((b) => b.id === 'gb-noPages001'))
})

test('a Google result that is already in the catalogue comes back as the catalogue book', async () => {
  const { body } = await call('GET', '/api/books/search?q=dune')
  assert.ok(body.some((b) => b.id === 'b08'))
  assert.ok(!body.some((b) => b.id === 'gb-fakeDune01'))
})

test('a genre chip searches Google by subject', async () => {
  await call('GET', '/api/books/search?genre=Science%20Fiction')
  assert.equal(googleCalls[0].searchParams.get('q'), 'subject:"science fiction"')
})

test('search needs something to search for, and says so when Google is down', async () => {
  assert.equal((await call('GET', '/api/books/search')).status, 400)
  assert.equal((await call('GET', `/api/books/search?q=${'x'.repeat(101)}`)).status, 400)
  googleDown = true
  const down = await call('GET', '/api/books/search?q=nothing-cached-yet')
  assert.equal(down.status, 502)
  assert.match(down.body.error, /Google Books/)
})

test('adding a book found on Google saves it to the catalogue from Google itself', async () => {
  // The title in the body is ignored: the server asks Google.
  const added = await call('POST', '/api/my-books', { bookId: 'gb-fakeVol001', status: 'currently-reading', title: 'Fake' })
  assert.equal(added.status, 201)
  assert.equal(added.body.book.title, 'The Night Library')
  assert.ok(googleCalls.some((u) => u.pathname.endsWith('/volumes/fakeVol001')))

  assert.equal((await call('GET', '/api/books/gb-fakeVol001')).body.pages, 384)
  assert.equal((await call('POST', '/api/my-books', { bookId: 'gb-fakeVol001' })).status, 409)
})

test('a Google id Google does not know, or any other unknown id, is not found', async () => {
  assert.equal((await call('POST', '/api/my-books', { bookId: 'gb-missing999' })).status, 404)
  googleCalls = []
  assert.equal((await call('POST', '/api/my-books', { bookId: 'not-a-book' })).status, 404)
  assert.equal(googleCalls.length, 0, 'only gb- ids are looked up on Google')
})

test('a cover is passed through from Google for the Library Room', async () => {
  const response = await fetch(`${base}/api/covers/b08`)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/jpeg')
  assert.equal((await response.arrayBuffer()).byteLength, 4)
  assert.equal(googleCalls.at(-1).hostname, 'books.google.com')

  assert.equal((await fetch(`${base}/api/covers/no-such-book`)).status, 404)
})

// ------------------------------------------------------------ shelf spots

test('a book can be put anywhere on the shelves, and taken back', async () => {
  const spot = { bookcase: 'main', row: 2, x: -0.4 }
  const moved = await call('PATCH', '/api/my-books/b08', { shelfSpot: spot })
  assert.equal(moved.status, 200)
  assert.equal(moved.body.shelfSpot.bookcase, 'main')
  assert.equal(moved.body.shelfSpot.row, 2)
  assert.ok(Math.abs(moved.body.shelfSpot.x + 0.4) < 1e-6)

  const cleared = await call('PATCH', '/api/my-books/b08', { shelfSpot: null })
  assert.equal(cleared.body.shelfSpot, null)
})

test('a spot must be on a real shelf of a bookcase the reader owns', async () => {
  for (const shelfSpot of [
    { bookcase: 'main', row: 10, x: 0 },
    { bookcase: 'main', row: 1, x: 2 },
    { bookcase: 'attic', row: 1, x: 0 },
    { bookcase: 'main', row: 1.5, x: 0 },
    'main',
  ]) {
    assert.equal((await call('PATCH', '/api/my-books/b08', { shelfSpot })).status, 400, JSON.stringify(shelfSpot))
  }
  assert.equal((await call('PATCH', '/api/my-books/b08', { shelfSpot: { bookcase: '999', row: 0, x: 0 } })).status, 400)

  const bought = await call('POST', '/api/shop/checkout', { items: ['bookcase-small'] })
  const id = String(bought.body.items.find((i) => i.kind === 'bookcase-small').id)
  const onIt = await call('PATCH', '/api/my-books/b08', { shelfSpot: { bookcase: id, row: 1, x: 0.1 } })
  assert.equal(onIt.status, 200)
  assert.equal(onIt.body.shelfSpot.bookcase, id)
})

test('a book that leaves the shelves for Want to Read loses its spot', async () => {
  await call('PATCH', '/api/my-books/b08', { shelfSpot: { bookcase: 'main', row: 0, x: 0 } })
  const wanted = await call('PATCH', '/api/my-books/b08', { status: 'want-to-read' })
  assert.equal(wanted.body.shelfSpot, null)
})

test('the Google Books mapping is the same file on the client and the server', () => {
  const server = readFileSync(new URL('../bookFromGoogle.js', import.meta.url), 'utf8')
  const client = readFileSync(new URL('../../client/src/api/bookFromGoogle.js', import.meta.url), 'utf8')
  assert.equal(client, server)
})
