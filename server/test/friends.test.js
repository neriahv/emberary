import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pool } from '../db/pool.js'
import { createApp } from '../app.js'

// These tests create and modify readers. Never run against Neon.
const databaseUrl = new URL(process.env.DATABASE_URL)

if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) {
  throw new Error('Friends tests require the disposable local database')
}

const password = 'Library-77!'
const read = (path) =>
  readFileSync(new URL(path, import.meta.url), 'utf8')

let server
let base
let alice
let ben

before(async () => {
  server = createApp(pool, {
    authLimit: 1000,
    checkEmailDomain: async () => 'ok',
  }).listen(0)

  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

async function call(method, path, body, cookie = alice?.cookie) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  }
}

async function signup(email, displayName) {
  const response = await call(
    'POST',
    '/api/auth/signup',
    { email, displayName, password },
    null
  )

  assert.equal(response.status, 201, JSON.stringify(response.body))

  return {
    id: response.body.id,
    cookie: response.cookie,
    displayName,
  }
}

beforeEach(async () => {
  await pool.query(read('../db/schema.sql'))
  await pool.query(read('../db/seed.sql'))

  alice = await signup('friends-alice@example.com', 'Alice')
  ben = await signup('friends-ben@example.com', 'Ben')
})

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }

  await pool.end()
})

async function becomeFriends() {
  const request = await call(
    'POST',
    `/api/friends/${ben.id}`
  )

  assert.equal(
    request.status,
    201,
    JSON.stringify(request.body)
  )

  const accepted = await call(
    'POST',
    `/api/friends/${alice.id}/accept`,
    undefined,
    ben.cookie
  )

  assert.equal(
    accepted.status,
    200,
    JSON.stringify(accepted.body)
  )
}

// ------------------------------------------------------------ search

test('search requires at least two characters', async () => {
  assert.equal(
    (await call('GET', '/api/readers/search?q=B')).status,
    400
  )

  assert.equal(
    (await call('GET', '/api/readers/search?q=')).status,
    400
  )
})

test('search returns public reader fields, never email or yourself', async () => {
  const result = await call('GET', '/api/readers/search?q=Ben')

  assert.equal(result.status, 200)
  assert.ok(Array.isArray(result.body))

  const found = result.body.find(
    (reader) => reader.id === ben.id
  )

  assert.ok(found)

  assert.deepEqual(
    Object.keys(found).sort(),
    ['avatar', 'displayName', 'id'].sort()
  )

  assert.equal(found.displayName, 'Ben')

  assert.ok(
    !result.body.some((reader) => reader.id === alice.id)
  )

  assert.ok(
    !JSON.stringify(result.body).includes('email')
  )
})

test('search excludes readers with pending or accepted relationships', async () => {
  const initial = await call(
    'GET',
    '/api/readers/search?q=Ben'
  )

  assert.equal(initial.status, 200)

  assert.equal(
    initial.body.some((reader) => reader.id === ben.id),
    true
  )

  assert.equal(
    (await call('POST', `/api/friends/${ben.id}`)).status,
    201
  )

  const pending = await call(
    'GET',
    '/api/readers/search?q=Ben'
  )

  assert.equal(pending.status, 200)

  assert.equal(
    pending.body.some((reader) => reader.id === ben.id),
    false
  )

  assert.equal(
    (await call(
      'POST',
      `/api/friends/${alice.id}/accept`,
      undefined,
      ben.cookie
    )).status,
    200
  )

  const accepted = await call(
    'GET',
    '/api/readers/search?q=Ben'
  )

  assert.equal(accepted.status, 200)

  assert.equal(
    accepted.body.some((reader) => reader.id === ben.id),
    false
  )
})

test('search excludes seeded readers without a login', async () => {
  const result = await call(
    'GET',
    '/api/readers/search?q=Reader'
  )

  assert.equal(result.status, 200)

  const seeded = await pool.query(
    'SELECT id FROM readers WHERE email IS NULL'
  )

  const seededIds = new Set(
    seeded.rows.map((row) => row.id)
  )

  assert.ok(
    result.body.every(
      (reader) => !seededIds.has(reader.id)
    )
  )
})

// ------------------------------------------------------------ requests

test('friend requests appear in the correct lists', async () => {
  const request = await call(
    'POST',
    `/api/friends/${ben.id}`
  )

  assert.equal(request.status, 201)

  const mine = await call(
    'GET',
    '/api/friends'
  )

  const his = await call(
    'GET',
    '/api/friends',
    undefined,
    ben.cookie
  )

  assert.equal(mine.status, 200)
  assert.equal(his.status, 200)

  assert.deepEqual(
    Object.keys(mine.body).sort(),
    ['friends', 'incoming', 'outgoing'].sort()
  )

  assert.ok(
    mine.body.outgoing.some(
      (reader) => reader.id === ben.id
    )
  )

  assert.ok(
    his.body.incoming.some(
      (reader) => reader.id === alice.id
    )
  )

  for (const entry of [
    ...mine.body.friends,
    ...mine.body.incoming,
    ...mine.body.outgoing,
    ...his.body.friends,
    ...his.body.incoming,
    ...his.body.outgoing,
  ]) {
    assert.deepEqual(
      Object.keys(entry).sort(),
      ['avatar', 'displayName', 'id'].sort()
    )
  }

  assert.ok(
    !JSON.stringify(mine.body).includes('email')
  )

  assert.ok(
    !JSON.stringify(his.body).includes('email')
  )
})

test('cannot friend yourself, an unknown reader or a duplicate', async () => {
  assert.equal(
    (await call(
      'POST',
      `/api/friends/${alice.id}`
    )).status,
    400
  )

  assert.equal(
    (await call(
      'POST',
      '/api/friends/2147483647'
    )).status,
    404
  )

  assert.equal(
    (await call(
      'POST',
      '/api/friends/abc'
    )).status,
    404
  )

  assert.equal(
    (await call(
      'POST',
      `/api/friends/${ben.id}`
    )).status,
    201
  )

  // Alice cannot send the same request twice.
  assert.equal(
    (await call(
      'POST',
      `/api/friends/${ben.id}`
    )).status,
    409
  )

  // Ben cannot create a duplicate relationship in reverse.
  assert.equal(
    (await call(
      'POST',
      `/api/friends/${alice.id}`,
      undefined,
      ben.cookie
    )).status,
    409
  )
})

test('only the addressee can accept a pending request', async () => {
  await call('POST', `/api/friends/${ben.id}`)

  // Alice sent the request and cannot accept it herself.
  assert.equal(
    (await call(
      'POST',
      `/api/friends/${ben.id}/accept`
    )).status,
    404
  )

  // Ben can accept the request addressed to him.
  assert.equal(
    (await call(
      'POST',
      `/api/friends/${alice.id}/accept`,
      undefined,
      ben.cookie
    )).status,
    200
  )

  const result = await call('GET', '/api/friends')

  assert.equal(result.status, 200)

  assert.ok(
    result.body.friends.some(
      (reader) => reader.id === ben.id
    )
  )

  assert.equal(result.body.outgoing.length, 0)
})

// ------------------------------------------------------------ library privacy

test('strangers and pending friends cannot visit a library', async () => {
  const libraryPath = `/api/friends/${ben.id}/library`
  const notesPath = `/api/friends/${ben.id}/books/b01/notes`

  // Alice and Ben are initially strangers.
  assert.equal(
    (await call('GET', libraryPath)).status,
    404
  )

  assert.equal(
    (await call('GET', notesPath)).status,
    404
  )

  // A pending request does not grant library access.
  assert.equal(
    (await call(
      'POST',
      `/api/friends/${ben.id}`
    )).status,
    201
  )

  assert.equal(
    (await call('GET', libraryPath)).status,
    404
  )

  assert.equal(
    (await call('GET', notesPath)).status,
    404
  )
})

test('accepted friends can visit without seeing private data', async () => {
  await becomeFriends()

  const result = await call(
    'GET',
    `/api/friends/${ben.id}/library`
  )

  assert.equal(
    result.status,
    200,
    JSON.stringify(result.body)
  )

  assert.deepEqual(
    Object.keys(result.body).sort(),
    ['reader', 'room', 'books'].sort()
  )

  assert.deepEqual(
    Object.keys(result.body.reader).sort(),
    ['avatar', 'displayName'].sort()
  )

  const serialized = JSON.stringify(result.body).toLowerCase()

  for (const privateField of [
    'email',
    'password',
    'balance',
    'ledger',
    'settings',
    'storeditems',
    'inventory',
    'booklists',
  ]) {
    assert.ok(
      !serialized.includes(`"${privateField}"`),
      `Private field was shared: ${privateField}`
    )
  }
})

test('only eligible shelf books and their notes are shared', async () => {
  const readBook = 'b01'
  const privateBook = 'b02'

  // Ben adds one Read book and one Want to Read book.
  const addedRead = await call(
    'POST',
    '/api/my-books',
    { bookId: readBook, status: 'read' },
    ben.cookie
  )

  assert.equal(
    addedRead.status,
    201,
    JSON.stringify(addedRead.body)
  )

  const addedPrivate = await call(
    'POST',
    '/api/my-books',
    { bookId: privateBook, status: 'want-to-read' },
    ben.cookie
  )

  assert.equal(
    addedPrivate.status,
    201,
    JSON.stringify(addedPrivate.body)
  )

  // Create a quote on the visible Read book.
  const quote = await call(
    'POST',
    `/api/my-books/${readBook}/notes`,
    {
      text: 'A favorite passage',
      kind: 'quote',
      page: 12,
    },
    ben.cookie
  )

  assert.equal(
    quote.status,
    201,
    JSON.stringify(quote.body)
  )

  // Create a private note on the Want to Read book.
  const hiddenNote = await call(
    'POST',
    `/api/my-books/${privateBook}/notes`,
    {
      text: 'Private reading note',
      kind: 'note',
    },
    ben.cookie
  )

  assert.equal(
    hiddenNote.status,
    201,
    JSON.stringify(hiddenNote.body)
  )

  await becomeFriends()

  const library = await call(
    'GET',
    `/api/friends/${ben.id}/library`
  )

  assert.equal(
    library.status,
    200,
    JSON.stringify(library.body)
  )

  const bookIds = library.body.books.map(
    (entry) => entry.bookId
  )

  assert.ok(
    bookIds.includes(readBook),
    'Ben\'s Read book should appear in the visited library'
  )

  assert.ok(
    !bookIds.includes(privateBook),
    'Want to Read books must remain private'
  )

  // Alice can view Ben's quote because its book is shelved.
  const notes = await call(
    'GET',
    `/api/friends/${ben.id}/books/${readBook}/notes`
  )

  assert.equal(
    notes.status,
    200,
    JSON.stringify(notes.body)
  )

  assert.ok(
    notes.body.some(
      (note) =>
        note.kind === 'quote' &&
        note.text === 'A favorite passage'
    )
  )

  // Alice cannot access notes on Ben's Want to Read book.
  assert.equal(
    (await call(
      'GET',
      `/api/friends/${ben.id}/books/${privateBook}/notes`
    )).status,
    404
  )
})

test('visiting does not allow editing another reader library', async () => {
  const bookId = 'b01'

  // Ben owns the book and has marked it as Read.
  const added = await call(
    'POST',
    '/api/my-books',
    { bookId, status: 'read' },
    ben.cookie
  )

  assert.equal(
    added.status,
    201,
    JSON.stringify(added.body)
  )

  // Alice and Ben become accepted friends.
  await becomeFriends()

  // Alice is authorized to visit Ben's library.
  const visit = await call(
    'GET',
    `/api/friends/${ben.id}/library`
  )

  assert.equal(
    visit.status,
    200,
    JSON.stringify(visit.body)
  )

  assert.ok(
    visit.body.books.some((entry) => entry.bookId === bookId),
    'Ben\'s Read book should be visible during the visit'
  )

  // Alice attempts to change Ben's book rating.
  // The normal endpoint only modifies the signed-in reader's books.
  const attemptedEdit = await call(
    'PATCH',
    `/api/my-books/${bookId}`,
    { rating: 1 }
  )

  assert.equal(
    attemptedEdit.status,
    404,
    JSON.stringify(attemptedEdit.body)
  )

  // Read Ben's own book using his authenticated session.
  const benBook = await call(
    'GET',
    `/api/my-books/${bookId}`,
    undefined,
    ben.cookie
  )

  assert.equal(
    benBook.status,
    200,
    JSON.stringify(benBook.body)
  )

  // The visitor's attempt must not have changed Ben's rating.
  assert.notEqual(
    benBook.body.rating,
    1,
    'A visitor must not be able to change the owner\'s book rating'
  )
})

test('unfriending immediately revokes library and notes access', async () => {
  const added = await call(
    'POST',
    '/api/my-books',
    {
      bookId: 'b01',
      status: 'read',
    },
    ben.cookie
  )

  assert.equal(
    added.status,
    201,
    JSON.stringify(added.body)
  )

  await becomeFriends()

  const libraryPath = `/api/friends/${ben.id}/library`
  const notesPath = `/api/friends/${ben.id}/books/b01/notes`

  assert.equal(
    (await call('GET', libraryPath)).status,
    200
  )

  assert.equal(
    (await call('GET', notesPath)).status,
    200
  )

  assert.equal(
    (await call(
      'DELETE',
      `/api/friends/${ben.id}`
    )).status,
    204
  )

  assert.equal(
    (await call('GET', libraryPath)).status,
    404
  )

  assert.equal(
    (await call('GET', notesPath)).status,
    404
  )
})

test('either reader can cancel or decline a request', async () => {
  assert.equal(
    (await call(
      'POST',
      `/api/friends/${ben.id}`
    )).status,
    201
  )

  // Ben declines Alice's incoming request.
  assert.equal(
    (await call(
      'DELETE',
      `/api/friends/${alice.id}`,
      undefined,
      ben.cookie
    )).status,
    204
  )

  const afterDecline = await call('GET', '/api/friends')

  assert.equal(afterDecline.status, 200)
  assert.equal(afterDecline.body.outgoing.length, 0)

  // Alice sends another request.
  assert.equal(
    (await call(
      'POST',
      `/api/friends/${ben.id}`
    )).status,
    201
  )

  // Alice cancels her outgoing request.
  assert.equal(
    (await call(
      'DELETE',
      `/api/friends/${ben.id}`
    )).status,
    204
  )

  const afterCancel = await call('GET', '/api/friends')

  assert.equal(afterCancel.status, 200)
  assert.equal(afterCancel.body.outgoing.length, 0)
})