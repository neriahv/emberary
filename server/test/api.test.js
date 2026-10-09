// End-to-end tests for the Emberary API against a real PostgreSQL.
//
//   npm test
//
// Each test starts from schema.sql + seed.sql, which TRUNCATEs every table, so
// this refuses to run against anything but a database on this machine.

import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pool } from '../db/pool.js'
import { settleAchievements } from '../repos/reading.js'
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

// A stand-in for DNS, so the tests never touch the internet: example.com and
// example.org take mail, nowhere.invalid does not exist, and anything else
// does not answer, which lets a sign-up through.
const DOMAINS = {
  'example.com': 'ok',
  'example.org': 'ok',
  'nowhere.invalid': 'none',
}
const fakeDomains = async (domain) => DOMAINS[domain] ?? 'unknown'

before(async () => {
  // Many failed sign-ups are tested on purpose, so the limit on them is raised.
  server = createApp(pool, { fetch: fakeGoogle, checkEmailDomain: fakeDomains, authLimit: 1000 }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://localhost:${server.address().port}`
})

beforeEach(async () => {
  googleCalls = []
  googleDown = false
  await pool.query(schema)
  await pool.query(seed)
  // Seeded finished books qualify for the new one-time first-book badge.
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    await settleAchievements(db, 1, 'Asia/Manila')
    await db.query('COMMIT')
  } finally {
    db.release()
  }
  // The seeded reader, signed in: a session made straight in the database,
  // so no password has to exist anywhere.
  await pool.query(
    "INSERT INTO sessions (token_hash, reader_id, expires_at) VALUES ($1, 1, now() + interval '1 day')",
    [createHash('sha256').update(SESSION).digest('hex')]
  )
})

after(async () => {
  server.close()
  await pool.end()
})

const SESSION = 'test-session-for-the-seeded-reader'

// A request as the signed-in seeded reader, or as whoever `cookie` says
// (null: nobody).
async function call(method, path, body, cookie = `emberary_session=${SESSION}`) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null, setCookie: response.headers.get('set-cookie') }
}

// The session cookie a sign-in or sign-up answered with, to send back.
const cookieFrom = (result) => result.setCookie?.split(';')[0]

// ------------------------------------------------------------ accounts

test('a new reader signs up, is signed in, and starts with their own empty library', async () => {
  const signedUp = await call('POST', '/api/auth/signup', { email: ' New.Reader@Example.com ', password: 'Long-pass-77', displayName: 'New Reader' }, null)
  assert.equal(signedUp.status, 201)
  assert.equal(signedUp.body.email, 'new.reader@example.com')
  assert.match(signedUp.setCookie, /^emberary_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/)
  const cookie = cookieFrom(signedUp)

  assert.deepEqual((await call('GET', '/api/auth/me', undefined, cookie)).body, signedUp.body)
  assert.deepEqual((await call('GET', '/api/my-books', undefined, cookie)).body, [])
  assert.equal((await call('GET', '/api/ember', undefined, cookie)).body.balance, 10)
  const room = (await call('GET', '/api/room', undefined, cookie)).body
  assert.ok(room.items.some((item) => item.kind === 'built-in-bookcase'), 'a fresh room')
  assert.equal((await call('GET', '/api/profile', undefined, cookie)).body.displayName, 'New Reader')

  // The seeded reader's things are not theirs to see or change.
  assert.equal((await call('PATCH', '/api/room/items/5', { x: 0 }, cookie)).status, 404)
  assert.ok((await call('GET', '/api/my-books')).body.length > 0, 'the seeded reader still has theirs')

  const again = await call('POST', '/api/auth/signup', { email: 'new.reader@example.com', password: 'Another-one-8', displayName: 'Copy' }, null)
  assert.equal(again.status, 409)
  const bad = await call('POST', '/api/auth/signup', { email: 'not-an-email', password: 'short', displayName: '' }, null)
  assert.equal(bad.status, 400)
  assert.match(bad.body.error, /email.*password.*display name/)
})

test('a new password has to meet every rule, and the email has to be a real domain', async () => {
  const signUp = (email, password) => call('POST', '/api/auth/signup', { email, password, displayName: 'Tester' }, null)
  for (const [password, missing] of [
    ['Sh0rt!', /at least 8 characters/],
    ['alllowercase-9', /an uppercase letter/],
    ['ALLUPPERCASE-9', /a lowercase letter/],
    ['No-Numbers-Here', /a number/],
    ['NoSymbols123', /a symbol/],
    ['Password-123', /not a common password/],
    ['Tester-Mail-1', /not your email/],
  ]) {
    const refused = await signUp('tester@example.com', password)
    assert.equal(refused.status, 400, password)
    assert.match(refused.body.error, missing, password)
  }
  // Everything the form says is wrong, at once.
  assert.match((await signUp('tester@example.com', 'abc')).body.error, /8 characters.*uppercase.*number.*symbol/)

  const nowhere = await signUp('tester@nowhere.invalid', 'Good-Pass-9')
  assert.equal(nowhere.status, 400)
  assert.match(nowhere.body.error, /domain does not receive email/)
  assert.equal((await signUp('tester@example', 'Good-Pass-9')).status, 400, 'no dot in the domain')
  assert.equal((await signUp('tester@example.c', 'Good-Pass-9')).status, 400, 'a one-letter ending')

  // The form asks as the email is typed.
  const check = async (email) => (await call('POST', '/api/auth/check-email', { email }, null)).body.status
  assert.equal(await check('tester@example.com'), 'ok')
  assert.equal(await check('tester@nowhere.invalid'), 'none')
  assert.equal(await check('tester@quiet-dns.net'), 'unknown')
  assert.equal(await check('tester@exam'), 'invalid')

  // DNS not answering does not stop anyone signing up.
  assert.equal((await signUp('tester@quiet-dns.net', 'Good-Pass-9')).status, 201)
  assert.equal((await signUp('tester@example.org', 'Good-Pass-9')).status, 201)
})

test('signing in needs the right email and password, and signing out ends the session', async () => {
  await call('POST', '/api/auth/signup', { email: 'reader@example.com', password: 'Correct-Horse-4', displayName: 'Reader' }, null)

  const wrong = await call('POST', '/api/auth/login', { email: 'reader@example.com', password: 'Wrong-Horse-4' }, null)
  assert.equal(wrong.status, 401)
  const nobody = await call('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'Correct-Horse-4' }, null)
  assert.equal(nobody.status, 401)
  assert.equal(nobody.body.error, wrong.body.error, 'the same answer either way')
  assert.equal(wrong.setCookie, null)

  const signedIn = await call('POST', '/api/auth/login', { email: 'READER@example.com', password: 'Correct-Horse-4' }, null)
  assert.equal(signedIn.status, 200)
  const cookie = cookieFrom(signedIn)
  assert.equal((await call('GET', '/api/auth/me', undefined, cookie)).body.email, 'reader@example.com')

  const out = await call('POST', '/api/auth/logout', undefined, cookie)
  assert.equal(out.status, 204)
  assert.match(out.setCookie, /Max-Age=0/)
  assert.equal((await call('GET', '/api/auth/me', undefined, cookie)).status, 401)
  assert.equal((await call('GET', '/api/my-books', undefined, cookie)).status, 401)

  // Passwords are kept only as hashes.
  const row = (await pool.query("SELECT password_hash FROM readers WHERE email = 'reader@example.com'")).rows[0]
  assert.match(row.password_hash, /^scrypt\$/)
  assert.ok(!row.password_hash.includes('Correct-Horse-4'))
})

test('without a session, every reader route answers 401 and changes nothing', async () => {
  for (const [method, path, body] of [
    ['GET', '/api/my-books'],
    ['GET', '/api/books'],
    ['GET', '/api/room'],
    ['PATCH', '/api/room/items/5', { x: 0 }],
    ['POST', '/api/shop/checkout', { items: ['stool'] }],
    ['GET', '/api/ember'],
    ['GET', '/api/no-such-route'],
  ]) {
    assert.equal((await call(method, path, body, null)).status, 401, `${method} ${path}`)
    assert.equal((await call(method, path, body, 'emberary_session=made-up')).status, 401, `${method} ${path} with a made-up session`)
  }
  assert.equal(await balance(), SEED_BALANCE, 'nothing was bought')
})

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
// less 21 for furniture, plus 5 for the first-book achievement.
const SEED_BALANCE = 107

const balance = async () => (await call('GET', '/api/ember')).body.balance

test('the wallet shows the balance worked out from the reading history', async () => {
  const { status, body } = await call('GET', '/api/ember')
  assert.equal(status, 200)
  assert.equal(body.balance, SEED_BALANCE)
  assert.equal(body.checkedInToday, false)
  assert.equal(body.pagesToday, 0)
  assert.equal(body.dailyPageGoal, 20)
  assert.match(body.today, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(body.history[0].reason, 'achievement')
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
  assert.equal(client.MAX_OWNED_ITEMS, server.MAX_OWNED_ITEMS)
})

// ------------------------------------------------------------ library room

test('reads the room with its colours, finishes and items', async () => {
  const { body } = await call('GET', '/api/room')
  assert.equal(body.wallColor, '#e3a86b')
  assert.equal(body.wallpaper, 'wallpaper-plain')
  assert.equal(body.floor, 'floor-planks')
  assert.deepEqual(body.blocks, [
    { kind: 'floor', side: '', i: 0, j: 0, level: 0 },
    { kind: 'wall', side: 'x', i: 0, j: 0, level: 0 },
    { kind: 'wall', side: 'z', i: 0, j: 0, level: 0 },
  ])
  assert.equal(body.wallShape, 'shape-straight')
  assert.equal(body.roof, 'roof-open')
  assert.equal(body.loft, 'loft-none')
  assert.deepEqual(body.unlocks, ['loft-none', 'shape-straight', 'roof-open', 'wallpaper-plain', 'floor-planks'])
  // The seed's furniture, then the built-in bookcase and shelf every room has.
  assert.deepEqual(body.items.map((i) => i.kind), [
    'rug', 'desk', 'rocking-chair', 'side-table', 'lantern', 'dresser', 'globe', 'plant',
    'built-in-bookcase', 'built-in-shelf',
  ])
  assert.deepEqual(body.items[1], {
    id: 2, kind: 'desk', x: -0.9, z: -0.7, rotation: 0, placed: true, level: 0, lit: true, y: 0, size: 1,
    color: null, sx: 1, sy: 1, on: null,
  })
})

test('updates room colours without touching the items', async () => {
  const { body } = await call('PATCH', '/api/room', { wallColor: '#112233' })
  assert.equal(body.wallColor, '#112233')
  assert.equal(body.floorColor, '#9a5530')
  assert.equal(body.items.length, 10)
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

test('checkout buys the whole cart, pays for it, and puts it in storage', async () => {
  const { status, body } = await call('POST', '/api/shop/checkout', {
    items: ['bookcase-tall', 'chair', 'chair', 'floor-checker'],
  })
  assert.equal(status, 201)
  assert.equal(body.balance, SEED_BALANCE - 10 - 1 - 1 - 3)
  assert.deepEqual(body.unlocks, ['floor-checker'])
  assert.deepEqual(body.items.map((i) => [i.id, i.kind, i.placed]), [
    [11, 'bookcase-tall', false],
    [12, 'chair', false],
    [13, 'chair', false],
  ])
  // Each keeps a first spot for when it is placed: the bookcase against the
  // back wall, the chairs mid-floor, side by side.
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
  const { status, body } = await call('POST', '/api/shop/checkout', {
    items: cart,
  })
  assert.equal(status, 409)
  assert.match(body.error, /costs 110 Ember and you have 107/)
  assert.equal(await balance(), SEED_BALANCE)
  assert.equal((await call('GET', '/api/room')).body.items.length, 10)
})

test('checkout refuses unknown things, empty carts and finishes already owned', async () => {
  assert.equal((await call('POST', '/api/shop/checkout', { items: ['piano'] })).status, 400)
  assert.equal((await call('POST', '/api/shop/checkout', { items: [] })).status, 400)
  assert.equal((await call('POST', '/api/shop/checkout', {})).status, 400)
  assert.equal(
    (await call('POST', '/api/shop/checkout', { items: ['floor-stone', 'floor-stone'] })).status,
    400
  )
  assert.equal((await call('POST', '/api/shop/checkout', { items: ['built-in-bookcase'] })).status, 400, 'not for sale')
  const free = await call('POST', '/api/shop/checkout', { items: ['wallpaper-plain'] })
  assert.equal(free.status, 409)
  assert.match(free.body.error, /already own Plain paint/)
  assert.equal(await balance(), SEED_BALANCE)
})

test('moves and turns a room item, keeping what was not sent', async () => {
  const { status, body } = await call('PATCH', '/api/room/items/4', { x: -0.333, rotation: 45 })
  assert.equal(status, 200)
  assert.deepEqual(body, {
    id: 4, kind: 'side-table', x: -0.33, z: 1.5, rotation: 45, placed: true, level: 0, lit: true, y: 0, size: 1,
    color: null, sx: 1, sy: 1, on: null,
  })
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
  assert.equal(room.items.length, 10)

  const placed = await call('PATCH', '/api/room/items/3', { placed: true })
  assert.equal(placed.body.placed, true)
})

test('there is no limit to how many things stand in the room at once', async () => {
  // A cart holds 20 things at most.
  const first = await call('POST', '/api/shop/checkout', { items: Array(20).fill('vase') })
  const second = await call('POST', '/api/shop/checkout', { items: Array(20).fill('vase') })
  // 10 in the room already: 40 more is 50, more than the room once held.
  for (const item of [...first.body.items, ...second.body.items]) {
    assert.equal((await call('PATCH', `/api/room/items/${item.id}`, { placed: true })).status, 200)
  }
  const { items } = (await call('GET', '/api/room')).body
  assert.equal(items.filter((i) => i.placed).length, 50)
})

test('an item cannot change kind, leave the room, or turn past 359', async () => {
  const kept = await call('PATCH', '/api/room/items/1', { kind: 'lamp', x: 0.5 })
  assert.equal(kept.body.kind, 'rug')

  assert.equal((await call('PATCH', '/api/room/items/1', { x: 9 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { z: -2.4 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { rotation: 360 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { x: null })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { placed: 'yes' })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { lit: 'on' })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', { level: 2 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/1', {})).status, 400)
})

const add = (kind, at) => call('POST', '/api/room/blocks', { type: 'add', kind, at })
const move = (kind, from, to) => call('POST', '/api/room/blocks', { type: 'move', kind, from, to })
const remove = (kind, at) => call('POST', '/api/room/blocks', { type: 'remove', kind, at })

test('a floor block is paid for when it is put down, where the reader chose', async () => {
  // Not yet: there is no floor to the right of the first block.
  assert.equal((await call('PATCH', '/api/room/items/5', { x: 4 })).status, 400)

  // To the right, the open side of the room. One floor block is only floor.
  const laid = await add('floor', { i: 1, j: 0 })
  assert.equal(laid.status, 201)
  assert.equal(laid.body.balance, SEED_BALANCE - 25)
  const { blocks } = laid.body.room
  assert.deepEqual(blocks.filter((b) => b.kind === 'floor').map((b) => [b.i, b.j]), [[0, 0], [1, 0]])
  assert.equal(blocks.filter((b) => b.kind === 'wall').length, 2)

  // Furniture can stand there now, but not past it.
  assert.equal((await call('PATCH', '/api/room/items/5', { x: 4 })).status, 200)
  assert.equal((await call('PATCH', '/api/room/items/5', { x: 7.4 })).status, 400)

  const history = (await call('GET', '/api/ember')).body.history
  assert.deepEqual([history[0].amount, history[0].ref], [-25, 'block:floor'])
})

test('a block goes only where it may, and nothing is paid when it cannot', async () => {
  const apart = await add('floor', { i: 2, j: 2 })
  assert.equal(apart.status, 409)
  assert.match(apart.body.error, /beside the floor/)
  assert.equal((await add('floor', { i: 0, j: 0 })).status, 409, 'already floor')
  assert.equal((await add('floor', { i: 9, j: 0 })).status, 400)
  assert.equal((await add('wall', { i: 0, j: 0 })).status, 400, 'a wall needs a side')
  assert.equal((await call('POST', '/api/room/blocks', { type: 'paint', kind: 'floor', at: { i: 1, j: 0 } })).status, 400)
  assert.equal(await balance(), SEED_BALANCE)
})

test('no floor is laid behind a wall, and no wall closes off the front of the room', async () => {
  // Behind the window wall, and behind the back wall: both walled off.
  assert.equal((await add('floor', { i: -1, j: 0 })).status, 409)
  assert.equal((await add('floor', { i: 0, j: -1 })).status, 409)
  // The front edges, between the reader and the room.
  assert.equal((await add('wall', { side: 'z', i: 1, j: 0 })).status, 409)
  assert.equal((await add('wall', { side: 'x', i: 0, j: 1 })).status, 409)
  assert.equal(await balance(), SEED_BALANCE)

  // With floor to the right, the back edge of that square takes a wall.
  await add('floor', { i: 1, j: 0 })
  assert.equal((await add('wall', { side: 'x', i: 1, j: 0 })).status, 201)
  // Between the two squares is inside the room: no wall there.
  assert.equal((await add('wall', { side: 'z', i: 1, j: 0 })).status, 409)
})

test('an upstairs floor needs stairs and a tall wall, leaves an opening for them, and has its own finish', async () => {
  // Enough Ember for a staircase, a wall, a floor block and two upstairs squares.
  await pool.query("INSERT INTO ember_ledger (reader_id, amount, reason, ref) VALUES ((SELECT min(id) FROM readers), 200, 'welcome', 'test')")
  assert.equal((await add('upper', { i: 0, j: 0 })).status, 409, 'no staircase yet')

  const { body } = await call('POST', '/api/shop/checkout', { items: ['stairs-straight'] })
  const stairs = body.items[0].id
  assert.equal((await call('PATCH', `/api/room/items/${stairs}`, { placed: true, x: 0, z: 0, rotation: 0 })).status, 200)
  const low = await add('upper', { i: 0, j: 0 })
  assert.equal(low.status, 409, 'the walls are only one block high')
  assert.match(low.body.error, /staircase/)

  assert.equal((await add('wall', { side: 'z', i: 0, j: 0 })).status, 201)
  const before = await balance()
  const laid = await add('upper', { i: 0, j: 0 })
  assert.equal(laid.status, 201)
  assert.equal(laid.body.balance, before - 30)
  assert.ok(laid.body.room.blocks.some((b) => b.kind === 'upper' && b.i === 0 && b.j === 0))
  const history = (await call('GET', '/api/ember')).body.history
  assert.deepEqual([history[0].amount, history[0].ref], [-30, 'block:upper'])

  // Things stand upstairs, but not over the opening for the stairs.
  assert.equal((await call('PATCH', '/api/room/items/5', { level: 1, x: 0, z: 0 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/5', { level: 1, x: -1.8, z: -1.8 })).status, 200)

  // A second square beside the first needs no tall wall of its own; the
  // floor under it cannot go while it is there.
  assert.equal((await add('floor', { i: 1, j: 0 })).status, 201)
  assert.equal((await add('upper', { i: 1, j: 0 })).status, 201)
  const under = await remove('floor', { i: 1, j: 0 })
  assert.equal(under.status, 409)
  assert.match(under.body.error, /upstairs floor above it/)
  assert.equal((await move('upper', { i: 1, j: 0 }, { i: 0, j: 1 })).status, 409, 'never moved')
  const sold = await remove('upper', { i: 1, j: 0 })
  assert.equal(sold.status, 200)
  assert.equal(sold.body.refund, 15)

  // Its own floor finish and colour, from the floors the reader owns.
  const finish = await call('PATCH', '/api/room', { upperFloor: 'floor-planks', upperFloorColor: '#223344' })
  assert.equal(finish.status, 200)
  assert.deepEqual([finish.body.upperFloor, finish.body.upperFloorColor], ['floor-planks', '#223344'])
  assert.equal((await call('PATCH', '/api/room', { upperFloor: 'floor-marble' })).status, 409, 'not bought')
  assert.equal((await call('PATCH', '/api/room', { upperFloor: 'wallpaper-plain' })).status, 400)

  // With the last upstairs square gone, what stood up there comes down.
  const gone = await remove('upper', { i: 0, j: 0 })
  assert.equal(gone.status, 200)
  assert.equal(gone.body.room.items.find((i) => i.id === 5).level, 0)
})

test('wall blocks stack one at a time on an edge of the floor, three high at most', async () => {
  assert.equal((await add('wall', { side: 'z', i: 0, j: 0 })).status, 201)
  const third = await add('wall', { side: 'z', i: 0, j: 0 })
  assert.deepEqual(
    third.body.room.blocks.filter((b) => b.kind === 'wall' && b.side === 'z').map((b) => b.level),
    [0, 1, 2]
  )
  const fourth = await add('wall', { side: 'z', i: 0, j: 0 })
  assert.equal(fourth.status, 409)
  assert.match(fourth.body.error, /up to 3 high/)
  assert.equal((await add('wall', { side: 'x', i: 2, j: 0 })).status, 409, 'off the floor')
  assert.equal(await balance(), SEED_BALANCE - 24)
})

test('a floor block moves, and the furniture on it goes with it', async () => {
  await add('floor', { i: 1, j: 0 })
  // A rug on the new block.
  await call('PATCH', '/api/room/items/1', { x: 3, z: 0 })
  const moved = await move('floor', { i: 1, j: 0 }, { i: 0, j: 1 })
  assert.equal(moved.status, 200)
  assert.equal(moved.body.balance, SEED_BALANCE - 25, 'moving is free')
  const { room } = moved.body
  assert.deepEqual(room.blocks.filter((b) => b.kind === 'floor').map((b) => [b.i, b.j]), [[0, 0], [0, 1]])
  const rug = room.items.find((i) => i.id === 1)
  assert.deepEqual([rug.x, rug.z], [-2, 5])

  // The first block holds up the starting walls, so it stays.
  const stuck = await move('floor', { i: 0, j: 0 }, { i: 1, j: 1 })
  assert.equal(stuck.status, 409)
  assert.match(stuck.body.error, /walls standing on that floor block/)
})

test('a wall moves to another edge, and its windows go with it', async () => {
  const { body } = await call('POST', '/api/shop/checkout', { items: ['window-round'] })
  const id = body.items[0].id
  await call('PATCH', `/api/room/items/${id}`, { placed: true })
  // Never to the open front of the room.
  assert.equal((await move('wall', { side: 'z', i: 0, j: 0 }, { side: 'z', i: 1, j: 0 })).status, 409)
  // To the back of a new square to the right.
  await add('floor', { i: 1, j: 0 })
  const moved = await move('wall', { side: 'z', i: 0, j: 0 }, { side: 'x', i: 1, j: 0 })
  assert.equal(moved.status, 200)
  const window = moved.body.room.items.find((i) => i.id === id)
  // Now on the back wall of that square, facing into the room.
  // As far along it as it was along the old one.
  assert.deepEqual([window.x, window.z, window.rotation, window.placed], [4.65, -2.2, 0, true])
  assert.equal((await move('wall', { side: 'x', i: 1, j: 0 }, { side: 'x', i: 0, j: 0 })).status, 409, 'a wall already stands there')
})

test('a block taken away gives half its price back, and its windows go to storage', async () => {
  await add('floor', { i: 1, j: 0 })
  const back = await remove('floor', { i: 1, j: 0 })
  assert.equal(back.status, 200)
  assert.equal(back.body.refund, 12)
  assert.equal(back.body.balance, SEED_BALANCE - 25 + 12)

  const { body } = await call('POST', '/api/shop/checkout', { items: ['window-round'] })
  await call('PATCH', `/api/room/items/${body.items[0].id}`, { placed: true })
  const gone = await remove('wall', { side: 'z', i: 0, j: 0 })
  assert.equal(gone.body.refund, 6)
  assert.equal(gone.body.room.items.find((i) => i.id === body.items[0].id).placed, false)
  assert.equal(gone.body.room.blocks.filter((b) => b.kind === 'wall').length, 1)

  // The last floor block stays, whatever else goes.
  await remove('wall', { side: 'x', i: 0, j: 0 })
  const last = await remove('floor', { i: 0, j: 0 })
  assert.equal(last.status, 409)
  assert.match(last.body.error, /at least one floor block/)
  assert.equal((await remove('wall', { side: 'x', i: 0, j: 0 })).status, 409, 'nothing there')

  const history = (await call('GET', '/api/ember')).body.history
  assert.deepEqual([history[0].amount, history[0].reason, history[0].ref], [6, 'sale', 'block:wall'])
})

test('the built-in bookcase and shelf are room items: moved, stored, and sold', async () => {
  const items = (await call('GET', '/api/room')).body.items
  const bookcase = items.find((i) => i.kind === 'built-in-bookcase')
  const shelf = items.find((i) => i.kind === 'built-in-shelf')
  assert.deepEqual([bookcase.x, bookcase.z, bookcase.rotation], [1.05, -2.27, 0])

  // Built against the wall, they may stand closer to it than furniture.
  assert.equal((await call('PATCH', `/api/room/items/${shelf.id}`, { x: -2.35 })).status, 200)
  assert.equal((await call('PATCH', `/api/room/items/${bookcase.id}`, { x: 9 })).status, 400)

  assert.equal((await call('PATCH', `/api/room/items/${shelf.id}`, { placed: false })).body.placed, false)
  const sold = await call('POST', `/api/room/items/${bookcase.id}/sell`)
  assert.deepEqual(sold.body, { balance: SEED_BALANCE + 8, refund: 8 })
  // Sold and gone, and not given back.
  const after = (await call('GET', '/api/room')).body.items
  assert.equal(after.some((i) => i.kind === 'built-in-bookcase'), false)
})

test('a small thing stands on a table, and comes down when the table is stored', async () => {
  const { body } = await call('POST', '/api/shop/checkout', { items: ['matcha', 'sofa'] })
  const [cup, sofa] = body.items
  // On the writing desk (item 2), 0.77 up.
  const up = await call('PATCH', `/api/room/items/${cup.id}`, { placed: true, on: 2, x: -0.9, z: -0.7, y: 0.77 })
  assert.equal(up.status, 200)
  assert.deepEqual([up.body.on, up.body.y], [2, 0.77])

  // Only small things stand on furniture, and only on furniture in the room.
  assert.equal((await call('PATCH', `/api/room/items/${sofa.id}`, { on: 2 })).status, 400)
  assert.equal((await call('PATCH', `/api/room/items/${cup.id}`, { on: sofa.id })).status, 400)
  assert.equal((await call('PATCH', `/api/room/items/${cup.id}`, { on: cup.id })).status, 400)

  await call('PATCH', '/api/room/items/2', { placed: false })
  const down = (await call('GET', '/api/room')).body.items.find((i) => i.id === cup.id)
  assert.deepEqual([down.on, down.y], [null, 0])

  // Out of storage onto the floor, and a small thing taken off a table: both
  // stand at height 0.
  const back = await call('PATCH', '/api/room/items/2', { placed: true, x: -0.9, z: -0.7, y: 0, on: null })
  assert.equal(back.status, 200)
  await call('PATCH', `/api/room/items/${cup.id}`, { on: 2, x: -0.9, z: -0.7, y: 0.77 })
  const off = await call('PATCH', `/api/room/items/${cup.id}`, { on: null, x: 0, z: 1, y: 0 })
  assert.equal(off.status, 200)
  assert.equal((await call('PATCH', `/api/room/items/${cup.id}`, { y: -0.5 })).status, 400)
})

test('anything can be painted, and bookcases and windows made wider and taller', async () => {
  const painted = await call('PATCH', '/api/room/items/3', { color: '#7fb3a0' })
  assert.equal(painted.body.color, '#7fb3a0')
  assert.equal((await call('PATCH', '/api/room/items/3', { color: null })).body.color, null)
  assert.equal((await call('PATCH', '/api/room/items/3', { color: 'teal' })).status, 400)

  const bookcase = (await call('GET', '/api/room')).body.items.find((i) => i.kind === 'built-in-bookcase')
  const wider = await call('PATCH', `/api/room/items/${bookcase.id}`, { sx: 1.3, sy: 0.8 })
  assert.deepEqual([wider.body.sx, wider.body.sy], [1.3, 0.8])
  assert.equal((await call('PATCH', `/api/room/items/${bookcase.id}`, { sx: 2 })).status, 400)
  assert.equal((await call('PATCH', '/api/room/items/3', { sx: 1.2 })).status, 400, 'a rocking chair keeps its size')
})

test('wall shapes, roofs and floors are finishes like any other', async () => {
  assert.equal((await call('PATCH', '/api/room', { roof: 'roof-ivy' })).status, 409)
  assert.equal((await call('PATCH', '/api/room', { roof: 'floor-stone' })).status, 400)
  assert.equal((await call('PATCH', '/api/room', { size: 'size-long' })).status, 400, 'size is built, not chosen')
  await call('POST', '/api/shop/checkout', { items: ['roof-ivy', 'shape-gable'] })
  const { status, body } = await call('PATCH', '/api/room', { roof: 'roof-ivy', wallShape: 'shape-gable' })
  assert.equal(status, 200)
  assert.deepEqual([body.roof, body.wallShape], ['roof-ivy', 'shape-gable'])
})

test('a loft needs a window wall two blocks high, and furniture can go up to it', async () => {
  const early = await call('PATCH', '/api/room/items/8', { level: 1 })
  assert.equal(early.status, 400)
  assert.match(early.body.error, /build an upstairs floor first/)

  await call('POST', '/api/shop/checkout', { items: ['loft-gallery'] })
  const tooLow = await call('PATCH', '/api/room', { loft: 'loft-gallery' })
  assert.equal(tooLow.status, 409)
  assert.match(tooLow.body.error, /2 blocks high/)

  await add('wall', { side: 'z', i: 0, j: 0 })
  assert.equal((await call('PATCH', '/api/room', { loft: 'loft-gallery' })).status, 200)
  // The plant stands at x 1.95: on the loft it is pulled back to the gallery.
  const up = await call('PATCH', '/api/room/items/8', { level: 1 })
  assert.equal(up.status, 200)
  assert.deepEqual([up.body.level, up.body.x, up.body.z], [1, -1.3, 1.9])
  assert.equal((await call('PATCH', '/api/room/items/8', { x: 0 })).status, 400, 'off the edge of the loft')

  // Taking the wall back down takes the loft with it; the plant comes down.
  const lower = await remove('wall', { side: 'z', i: 0, j: 0 })
  assert.equal(lower.body.room.items.find((i) => i.id === 8).level, 0)
})

test('a light is switched off and on, and stays that way', async () => {
  const off = await call('PATCH', '/api/room/items/5', { lit: false })
  assert.equal(off.status, 200)
  assert.equal(off.body.lit, false)
  assert.equal((await call('GET', '/api/room')).body.items.find((i) => i.id === 5).lit, false)
  assert.equal((await call('PATCH', '/api/room/items/5', { lit: true })).body.lit, true)
})

test('a window is bought one at a time, goes on the window wall, and can be sized', async () => {
  const { body } = await call('POST', '/api/shop/checkout', { items: ['window-round', 'window-paned'] })
  const [first, second] = body.items
  assert.deepEqual([first.x, first.rotation, first.y, first.size], [-2.2, 90, 1.75, 1])
  assert.notEqual(first.z, second.z)

  const moved = await call('PATCH', `/api/room/items/${first.id}`, { y: 2.1, size: 1.4 })
  assert.deepEqual([moved.body.y, moved.body.size], [2.1, 1.4])
  assert.equal((await call('PATCH', `/api/room/items/${first.id}`, { size: 3 })).status, 400)
  assert.equal((await call('PATCH', `/api/room/items/${first.id}`, { y: -1 })).status, 400)
})

test('furniture sells back for half its price, rounded down', async () => {
  // Item 2 is the writing desk (4 Ember), with a book laid on it.
  await call('PATCH', '/api/my-books/b08', { shelfSpot: { bookcase: '2', row: 0, x: 0 } })
  const sold = await call('POST', '/api/room/items/2/sell')
  assert.equal(sold.status, 200)
  assert.deepEqual(sold.body, { balance: SEED_BALANCE + 2, refund: 2 })

  const room = (await call('GET', '/api/room')).body
  assert.equal(room.items.some((i) => i.id === 2), false)
  assert.equal((await call('PATCH', '/api/room/items/2', { x: 0 })).status, 404)
  assert.equal((await call('POST', '/api/room/items/2/sell')).status, 404, 'not twice')
  // The book on it goes back to the shelves.
  const book = (await call('GET', '/api/my-books')).body.find((e) => e.bookId === 'b08')
  assert.equal(book.shelfSpot, null)

  const history = (await call('GET', '/api/ember')).body.history
  assert.deepEqual([history[0].amount, history[0].reason, history[0].ref], [2, 'sale', 'desk'])
})

test('something that cost 1 Ember sells for nothing, but still goes', async () => {
  const { body } = await call('POST', '/api/shop/checkout', { items: ['stool'] })
  const sold = await call('POST', `/api/room/items/${body.items[0].id}/sell`)
  assert.deepEqual(sold.body, { balance: SEED_BALANCE - 1, refund: 0 })
  assert.equal((await call('POST', '/api/room/items/abc/sell')).status, 404)
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
  const response = await fetch(`${base}/api/covers/b08`, { headers: { Cookie: `emberary_session=${SESSION}` } })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'image/jpeg')
  assert.equal((await response.arrayBuffer()).byteLength, 4)
  assert.equal(googleCalls.at(-1).hostname, 'books.google.com')

  assert.equal((await fetch(`${base}/api/covers/no-such-book`, { headers: { Cookie: `emberary_session=${SESSION}` } })).status, 404)
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
    { bookcase: 'main', row: 1, x: 3 },
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

test('a book can be laid on a table, but not on a chair', async () => {
  // Item 2 is the writing desk, item 3 the rocking chair.
  const onDesk = await call('PATCH', '/api/my-books/b08', { shelfSpot: { bookcase: '2', row: 0, x: 0 } })
  assert.equal(onDesk.status, 200)
  assert.deepEqual(onDesk.body.shelfSpot, { bookcase: '2', row: 0, x: 0 })
  assert.equal((await call('PATCH', '/api/my-books/b08', { shelfSpot: { bookcase: '3', row: 0, x: 0 } })).status, 400)
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
