// What db/roles.sql has to do: give the deployed API a database role that can
// run the app and nothing more.
//
//   npm run db:local          (in another terminal)
//   node --env-file=.env --test test/roles.test.js
//
// The test creates the role itself, with a throwaway password that only ever
// exists on this machine. On Neon the role is created in the console, which
// generates the real password; roles.sql only hands out permissions.

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { pool as owner } from '../db/pool.js'
import { createApp } from '../app.js'

const ROLE = 'emberary_app'
const LOCAL_ONLY_PASSWORD = 'local-test-only'

const url = new URL(process.env.DATABASE_URL)
if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
  console.error('This test resets the database. Point DATABASE_URL at a local PostgreSQL.')
  process.exit(1)
}

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

let app // a pool that logs in as the app role
let server
let base

before(async () => {
  await owner.query(read('../db/schema.sql'))
  await owner.query(read('../db/seed.sql'))

  // Start from a role with no permissions at all, every run.
  const exists = await owner.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [ROLE])
  if (exists.rowCount > 0) {
    await owner.query(`DROP OWNED BY ${ROLE}`)
    await owner.query(`DROP ROLE ${ROLE}`)
  }
  await owner.query(`CREATE ROLE ${ROLE} LOGIN PASSWORD '${LOCAL_ONLY_PASSWORD}'`)
  await owner.query(read('../db/roles.sql'))

  const appUrl = new URL(process.env.DATABASE_URL)
  appUrl.username = ROLE
  appUrl.password = LOCAL_ONLY_PASSWORD
  app = new pg.Pool({ connectionString: appUrl.toString(), max: 3 })

  server = createApp(app).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://localhost:${server.address().port}`
})

after(async () => {
  server?.close()
  await app?.end()
  await owner.end()
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

// ------------------------------------------------- everything the app does

test('the whole app works when it logs in as the app role', async () => {
  assert.equal((await call('GET', '/readyz')).status, 200)
  assert.equal((await call('GET', '/api/books')).status, 200)
  assert.equal((await call('GET', '/api/stats')).status, 200)
  assert.equal((await call('GET', '/api/recommendations')).status, 200)

  const books = (await call('GET', '/api/books')).body
  const mine = new Set((await call('GET', '/api/my-books')).body.map((entry) => entry.bookId))
  const book = books.find((candidate) => !mine.has(candidate.id))

  // Adding, reading to the end (Ember rewards), and removing a book.
  assert.equal((await call('POST', '/api/my-books', { bookId: book.id, status: 'currently-reading' })).status, 201)
  const finished = await call('PATCH', `/api/my-books/${book.id}`, { status: 'read', currentPage: book.pages })
  assert.equal(finished.status, 200, JSON.stringify(finished.body))
  assert.equal((await call('DELETE', `/api/my-books/${book.id}`)).status, 204)

  // Profile, wallet and the daily check-in.
  const profile = (await call('GET', '/api/profile')).body
  assert.equal((await call('PATCH', '/api/profile', { ...profile, bio: 'Still reading.' })).status, 200)
  assert.equal((await call('GET', '/api/ember')).status, 200)
  assert.equal((await call('POST', '/api/ember/check-in')).status, 201)

  // Buying furniture, then moving it and putting it in storage.
  const bought = await call('POST', '/api/shop/checkout', { items: ['stool', 'wallpaper-stripes'] })
  assert.equal(bought.status, 201, JSON.stringify(bought.body))
  const stool = bought.body.items.find((item) => item.kind === 'stool')
  assert.equal((await call('PATCH', `/api/room/items/${stool.id}`, { x: 0.5, z: 1, rotation: 90, placed: false })).status, 200)
  assert.equal((await call('PATCH', '/api/room', { wallpaper: 'wallpaper-stripes', wallColor: '#c9b79c' })).status, 200)
})

// ------------------------------------------------- and nothing it does not

async function assertDenied(sql) {
  await assert.rejects(app.query(sql), /permission denied|must be owner/, `${sql} should be refused`)
}

test('cannot change the shape of the database', async () => {
  await assertDenied('CREATE TABLE intruder (id int)')
  await assertDenied('DROP TABLE books')
  await assertDenied('ALTER TABLE user_books ADD COLUMN extra text')
  await assertDenied('TRUNCATE user_books')
})

test('can add to the book catalogue, but never rewrite it', async () => {
  // Adding is how a book found on Google joins the catalogue.
  await app.query(`INSERT INTO books (id, title, author, genre, pages, year, color, description)
                   VALUES ('gb-roleTest1', 'x', 'x', 'x', 1, 2000, '#000000', 'x')`)
  await assertDenied(`UPDATE books SET title = 'changed'`)
  await assertDenied('DELETE FROM books')
})

test('cannot rewrite Ember history: the ledger is append-only', async () => {
  await assertDenied('UPDATE ember_ledger SET amount = 1000')
  await assertDenied('DELETE FROM ember_ledger')
})

test('cannot delete readers or furniture, which the app never does', async () => {
  await assertDenied('DELETE FROM readers')
  await assertDenied('DELETE FROM room_items')
})
