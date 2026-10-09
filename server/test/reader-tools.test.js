import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pool } from '../db/pool.js'
import { createApp } from '../app.js'
import { hashPassword, checkPassword, readCookie, sessionCookie } from '../auth.js'
import { inspectDomain, emailDomainStatus } from '../emailDomain.js'
import { validateSignup } from '../validation.js'
const url = new URL(process.env.DATABASE_URL)
if (!['localhost', '127.0.0.1'].includes(url.hostname))
  throw Error('These tests require the disposable local database')
let server, base, cookie, readerId, otherCookie
const password = 'Library-77!'
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
before(async () => {
  server = createApp(pool, {
    authLimit: 1000,
    checkEmailDomain: async (domain) => (domain === 'invalid.test' ? 'none' : 'ok'),
  }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
async function call(method, path, body, session = cookie) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Cookie: session } : {}),
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
beforeEach(async () => {
  await pool.query(read('../db/schema.sql'))
  await pool.query(read('../db/seed.sql'))
  const account = await call(
    'POST',
    '/api/auth/signup',
    { email: 'reader@example.com', displayName: 'Reader', password },
    null
  )
  assert.equal(account.status, 201)
  cookie = account.cookie
  readerId = account.body.id
  const other = await call(
    'POST',
    '/api/auth/signup',
    { email: 'other@example.com', displayName: 'Other', password },
    null
  )
  otherCookie = other.cookie
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await pool.end()
})
const wallet = async () => (await call('GET', '/api/ember')).body.balance
async function addBook(id = 'b01') {
  const result = await call('POST', '/api/my-books', {
    bookId: id,
    status: 'currently-reading',
  })
  assert.equal(result.status, 201)
  return result.body
}

test('rewritten auth retains old hashes, rejects malformed hashes and handles cookies safely', async () => {
  const hash = await hashPassword(password)
  assert.equal(await checkPassword(password, hash), true)
  assert.equal(await checkPassword('wrong', hash), false)
  for (const malformed of [null, 'scrypt$$', 'scrypt$YQ==$YQ==', 'scrypt$%%%$%%%%', hash + '$extra'])
    assert.equal(await checkPassword(password, malformed), false)
  assert.equal(readCookie({ get: () => 'a=1; emberary_session=abc%20def' }, 'emberary_session'), 'abc def')
  assert.equal(readCookie({ get: () => 'emberary_session=%broken' }, 'emberary_session'), null)
  assert.match(sessionCookie('token', { secure: true }), /HttpOnly; SameSite=Lax; Max-Age=2592000; Secure/)
})
test('rewritten email domain handling supports null MX, IPv6, DNS failures and fallback', async () => {
  const fail = (code) => async () => {
    throw Object.assign(Error(code), { code })
  }
  assert.equal(await inspectDomain({ resolveMx: async () => [{ exchange: '.' }] }, 'x'), 'none')
  assert.equal(await inspectDomain({ resolveMx: async () => [{ exchange: 'mail.example.com' }] }, 'x'), 'ok')
  assert.equal(
    await inspectDomain(
      {
        resolveMx: fail('ENODATA'),
        resolve4: fail('ENODATA'),
        resolve6: async () => ['::1'],
      },
      'x'
    ),
    'ok'
  )
  let attempts = 0
  assert.equal(
    await emailDomainStatus('x', {
      makeResolver: () =>
        ++attempts === 1
          ? { resolveMx: fail('ETIMEOUT') }
          : {
              setServers() {},
              resolveMx: async () => [{ exchange: 'mail.x' }],
            },
    }),
    'ok'
  )
  assert.equal(attempts, 2)
})
test('signup validator normalizes text and ignores unexpected properties', () => {
  const checked = validateSignup({
    email: ' Reader@Example.com ',
    password,
    displayName: ' Reader ',
    readerId: 999,
  })
  assert.deepEqual(checked, {
    errors: [],
    value: { email: 'reader@example.com', password, displayName: 'Reader' },
  })
  assert.ok(validateSignup(null).errors.length >= 3)
})
test('sign-in handles unknown accounts, wrong passwords, malformed bodies and expired sessions', async () => {
  for (const email of ['reader@example.com', 'missing@example.com'])
    assert.equal((await call('POST', '/api/auth/login', { email, password: 'wrong' }, null)).status, 401)
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'reader@example.com', password: [] }, null)).status,
    400
  )
  assert.equal(
    (await call('POST', '/api/auth/login', { email: ' READER@example.com ', password }, null)).status,
    200
  )
  assert.equal(
    (
      await call(
        'POST',
        '/api/auth/signup',
        { email: 'reader@example.com', displayName: 'Duplicate', password },
        null
      )
    ).status,
    409
  )
  await pool.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE reader_id=$1", [readerId])
  assert.equal((await call('GET', '/api/settings')).status, 401)
})
test("settings are validated and daily goals use each reader's time zone and target", async () => {
  await addBook()
  for (const patch of [
    { timezone: 'Mars/Sea' },
    { dailyPageGoal: 4 },
    { dailyPageGoal: 501 },
    { dailyPageGoal: 1.5 },
    { theme: 'blue' },
  ])
    assert.equal((await call('PATCH', '/api/settings', patch)).status, 400)
  assert.equal(
    (
      await call('PATCH', '/api/settings', {
        timezone: 'Pacific/Kiritimati',
        dailyPageGoal: 5,
        theme: 'dark',
        readerId: 1,
      })
    ).status,
    200
  )
  const result = await call('PATCH', '/api/my-books/b01', { currentPage: 5 })
  assert.equal(
    result.body.rewards.some((r) => r.reason === 'daily-goal'),
    true
  )
  const summary = (await call('GET', '/api/ember')).body
  assert.equal(summary.dailyPageGoal, 5)
  assert.equal(summary.today, new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Kiritimati' }))
  assert.equal((await call('GET', '/api/settings', undefined, otherCookie)).body.dailyPageGoal, 20)
})
test('profile avatars use a fixed gallery and account changes verify current password', async () => {
  assert.equal((await call('PATCH', '/api/profile', { avatar: 'fox' })).body.avatar, 'fox')
  assert.equal((await call('GET', '/api/auth/me')).body.avatar, 'fox')
  assert.equal((await call('PATCH', '/api/profile', { avatar: 'external-url' })).status, 400)
  assert.equal(
    (
      await call('POST', '/api/account/password', {
        currentPassword: 'wrong',
        password: 'Another-88!',
      })
    ).status,
    403
  )
  assert.equal(
    (
      await call('POST', '/api/account/password', {
        currentPassword: password,
        password: 'short',
      })
    ).status,
    400
  )
  const secondSession = await call('POST', '/api/auth/login', { email: 'reader@example.com', password }, null)
  assert.equal(
    (
      await call('POST', '/api/account/password', {
        currentPassword: password,
        password: 'Another-88!',
      })
    ).status,
    200
  )
  assert.equal((await call('GET', '/api/settings', undefined, secondSession.cookie)).status, 401)
  assert.equal((await call('GET', '/api/settings')).status, 200)
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'reader@example.com', password }, null)).status,
    401
  )
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'reader@example.com', password: 'Another-88!' }, null))
      .status,
    200
  )
})
test('email changes reject duplicate and nonreceiving addresses and normalize valid addresses', async () => {
  assert.equal(
    (
      await call('POST', '/api/account/email', {
        currentPassword: password,
        email: 'other@example.com',
      })
    ).status,
    409
  )
  assert.equal(
    (
      await call('POST', '/api/account/email', {
        currentPassword: password,
        email: 'a@invalid.test',
      })
    ).status,
    400
  )
  assert.equal(
    (
      await call('POST', '/api/account/email', {
        currentPassword: password,
        email: 'not-email',
      })
    ).status,
    400
  )
  assert.equal(
    (
      await call('POST', '/api/account/email', {
        currentPassword: password,
        email: ' NEW@example.com ',
      })
    ).body.email,
    'new@example.com'
  )
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'reader@example.com', password }, null)).status,
    401
  )
  assert.equal(
    (await call('POST', '/api/auth/login', { email: 'new@example.com', password }, null)).status,
    200
  )
})
test('notes and lists stay owned by their reader and cascade when a book is removed', async () => {
  await addBook()
  const note = await call('POST', '/api/my-books/b01/notes', {
    kind: 'quote',
    text: 'A favourite line',
    page: 12,
  })
  assert.equal(note.status, 201)
  assert.equal((await call('POST', '/api/my-books/b01/notes', { text: 'bad', page: 9999 })).status, 400)
  const list = await call('POST', '/api/lists', {
    name: 'Summer reads',
    readerId: 1,
  })
  assert.equal((await call('PUT', `/api/lists/${list.body.id}/books/b01`)).status, 204)
  assert.equal(
    (
      await call('PATCH', `/api/lists/${list.body.id}`, {
        name: 'Re-read someday',
      })
    ).status,
    200
  )
  for (const [method, path, body] of [
    ['DELETE', `/api/my-books/b01/notes/${note.body.id}`],
    ['PUT', `/api/lists/${list.body.id}/books/b01`],
    ['PATCH', `/api/lists/${list.body.id}`, { name: 'Stolen' }],
    ['DELETE', `/api/lists/${list.body.id}`],
  ])
    assert.equal((await call(method, path, body, otherCookie)).status, 404)
  assert.deepEqual((await call('GET', '/api/lists', undefined, otherCookie)).body, [])
  await call('DELETE', '/api/my-books/b01')
  assert.deepEqual((await call('GET', '/api/lists')).body[0].bookIds, [])
  assert.equal((await pool.query('SELECT * FROM book_notes WHERE reader_id=$1', [readerId])).rowCount, 0)
})
test('streaks handle yesterday, gaps and timer days; badges pay exactly once under concurrency', async () => {
  await pool.query(
    `INSERT INTO reading_days(reader_id,day,pages) SELECT $1,(now() AT TIME ZONE 'Asia/Manila')::date - n,10 FROM generate_series(0,6) n`,
    [readerId]
  )
  const results = await Promise.all([call('GET', '/api/reading'), call('GET', '/api/reading')])
  for (const result of results) assert.deepEqual(result.body.streak, { current: 7, best: 7 })
  assert.equal(await wallet(), 25)
  const paid = await pool.query("SELECT * FROM ember_ledger WHERE reader_id=$1 AND reason='achievement'", [
    readerId,
  ])
  assert.equal(paid.rowCount, 1)
  await pool.query('UPDATE reading_days SET day=day-10 WHERE reader_id=$1', [readerId])
  assert.deepEqual((await call('GET', '/api/reading')).body.streak, {
    current: 0,
    best: 7,
  })
})
test('first-book and ten-book achievements pay once even after removing and readding books', async () => {
  for (let i = 1; i <= 10; i++)
    assert.equal(
      (
        await call('POST', '/api/my-books', {
          bookId: `b${String(i).padStart(2, '0')}`,
          status: 'read',
        })
      ).status,
      201
    )
  const milestones = (await call('GET', '/api/reading')).body
  assert.equal(milestones.badges.filter((b) => b.earnedAt).length, 2)
  const before = await wallet()
  await call('DELETE', '/api/my-books/b01')
  await call('POST', '/api/my-books', { bookId: 'b01', status: 'read' })
  assert.equal(await wallet(), before)
  const rewards = await pool.query(
    "SELECT sum(amount)::int AS total FROM ember_ledger WHERE reader_id=$1 AND reason='achievement'",
    [readerId]
  )
  assert.equal(rewards.rows[0].total, 25)
})
test('three daily quests track actions; incomplete and simultaneous repeated claims cannot pay twice', async () => {
  assert.equal((await call('POST', '/api/quests/pages/claim')).status, 409)
  await addBook()
  const today = (await call('GET', '/api/quests')).body
  assert.equal(today.items.length, 3)
  await call('PATCH', '/api/my-books/b01', {
    currentPage: today.items[0].target,
    rating: 4,
  })
  await call('POST', '/api/ember/check-in')
  const complete = (await call('GET', '/api/quests')).body
  assert.ok(complete.items.every((q) => q.progress >= q.target))
  const before = await wallet()
  const results = await Promise.all([
    call('POST', '/api/quests/pages/claim'),
    call('POST', '/api/quests/pages/claim'),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  assert.equal(await wallet(), before + 4)
  assert.equal((await call('GET', '/api/quests', undefined, otherCookie)).body.items[0].progress, 0)
})
test('timers survive reload, allow one active session and split elapsed time across midnight', async () => {
  const started = await call('POST', '/api/timer/start')
  assert.equal(started.status, 200)
  assert.equal((await call('POST', '/api/timer/start')).body.id, started.body.id)
  assert.equal((await call('GET', '/api/timer')).body.id, started.body.id)
  const midnight = await pool.query(
    "SELECT ((now() AT TIME ZONE 'Asia/Manila')::date::timestamp AT TIME ZONE 'Asia/Manila') AS midnight"
  )
  await pool.query(
    "UPDATE reading_timers SET started_at=$2::timestamptz-interval '2 minutes' WHERE reader_id=$1",
    [readerId, midnight.rows[0].midnight]
  )
  assert.equal((await call('POST', '/api/timer/stop')).status, 200)
  assert.equal((await call('POST', '/api/timer/stop')).status, 409)
  const days = await pool.query('SELECT day,seconds FROM reading_minutes WHERE reader_id=$1 ORDER BY day', [
    readerId,
  ])
  assert.ok(days.rowCount >= 1)
  assert.equal(days.rows[0].seconds, 120)
  assert.equal((await call('GET', '/api/timer')).body, null)
  assert.equal((await call('GET', '/api/reading', undefined, otherCookie)).body.minutes, 0)
})
test("year review uses SQL counts and only this reader's activity for their local year", async () => {
  await addBook()
  await call('PATCH', '/api/my-books/b01', { currentPage: 10 })
  await call('PATCH', '/api/my-books/b01', { status: 'read' })
  const result = (await call('GET', '/api/year-review')).body
  assert.equal(result.booksFinished, 1)
  assert.equal(result.pagesRead, 432)
  assert.equal(result.longestBook, 'Pride and Prejudice')
  assert.equal(result.favoriteGenre, 'Romance')
  assert.equal((await call('GET', '/api/year-review', undefined, otherCookie)).body.booksFinished, 0)
})
test("room rules refuse disconnected blocks, overspending and another reader's items; selling pays once", async () => {
  const before = await wallet()
  assert.equal(
    (
      await call('POST', '/api/room/blocks', {
        type: 'add',
        kind: 'floor',
        at: { i: 2, j: 2 },
      })
    ).status,
    409
  )
  assert.equal(await wallet(), before)
  assert.equal(
    (
      await call('POST', '/api/shop/checkout', {
        items: ['ember-reading-bench', 'ember-reading-bench'],
      })
    ).status,
    409
  )
  const bought = await call('POST', '/api/shop/checkout', {
    items: ['ember-teacup-lamp'],
  })
  assert.equal(bought.status, 201)
  const id = bought.body.items[0].id
  assert.equal((await call('PATCH', `/api/room/items/${id}`, { placed: true, x: 9, z: 9 })).status, 400)
  assert.equal((await call('PATCH', `/api/room/items/${id}`, { x: 0 }, otherCookie)).status, 404)
  assert.equal((await call('POST', `/api/room/items/${id}/sell`, undefined, otherCookie)).status, 404)
  assert.equal((await call('POST', `/api/room/items/${id}/sell`)).status, 200)
  assert.equal((await call('POST', `/api/room/items/${id}/sell`)).status, 404)
  assert.equal(await wallet(), before - 3)
})
test('snapshots restore owned layout and finishes, never room blocks or sold items', async () => {
  await pool.query(
    "INSERT INTO ember_ledger(reader_id,amount,reason,ref) VALUES($1,100,'welcome','test-funds')",
    [readerId]
  )
  const bought = await call('POST', '/api/shop/checkout', {
    items: ['ember-star-table'],
  })
  const id = bought.body.items[0].id
  await call('PATCH', `/api/room/items/${id}`, { placed: true, x: 1, z: 1 })
  await call('POST', '/api/room/blocks', {
    type: 'add',
    kind: 'floor',
    at: { i: 1, j: 0 },
  })
  const saved = await call('POST', '/api/room/snapshots', {
    name: 'Cosy winter',
    layout: { blocks: [{ i: 2, j: 2 }] },
  })
  assert.equal(saved.status, 201)
  const stored = await pool.query('SELECT layout FROM room_snapshots WHERE id=$1', [saved.body.id])
  assert.equal('blocks' in stored.rows[0].layout, false)
  await call('POST', '/api/room/blocks', {
    type: 'remove',
    kind: 'floor',
    at: { i: 1, j: 0 },
  })
  await call('PATCH', `/api/room/items/${id}`, { x: 0, z: 0 })
  const before = await wallet(),
    blocks = (await call('GET', '/api/room')).body.blocks
  const restored = await call('POST', `/api/room/snapshots/${saved.body.id}/restore`)
  assert.equal(restored.status, 200, JSON.stringify(restored.body))
  assert.equal(restored.body.room.items.find((i) => i.id === id).x, 1)
  assert.deepEqual(restored.body.room.blocks, blocks)
  assert.equal(await wallet(), before)
  assert.equal(
    (await call('POST', `/api/room/snapshots/${saved.body.id}/restore`, undefined, otherCookie)).status,
    404
  )
  await call('POST', `/api/room/items/${id}/sell`)
  assert.ok((await call('POST', `/api/room/snapshots/${saved.body.id}/restore`)).body.skipped.includes(id))
  assert.equal(
    (await call('GET', '/api/room')).body.items.some((i) => i.id === id),
    false
  )
})
test('the schema can run again without resetting shelves, settings or earned rewards', async () => {
  await addBook()
  await call('PATCH', '/api/settings', { theme: 'dark' })
  await call('PATCH', '/api/my-books/b01', { status: 'read' })
  const before = await wallet()
  for (let i = 0; i < 2; i++) await pool.query(read('../db/schema.sql'))
  assert.equal((await call('GET', '/api/settings')).body.theme, 'dark')
  assert.equal((await call('GET', '/api/my-books')).body.length, 1)
  assert.equal(await wallet(), before)
})

test('snapshot placements on removed floor blocks return to storage', async () => {
  await pool.query(
    "INSERT INTO ember_ledger(reader_id,amount,reason,ref) VALUES($1,100,'welcome','snapshot-funds')",
    [readerId]
  )
  assert.equal(
    (await call('POST', '/api/room/blocks', { type: 'add', kind: 'floor', at: { i: 1, j: 0 } })).status,
    201
  )
  const bought = await call('POST', '/api/shop/checkout', { items: ['ember-star-table'] })
  const id = bought.body.items[0].id
  assert.equal((await call('PATCH', `/api/room/items/${id}`, { x: 5, z: 0, placed: true })).status, 200)
  const saved = await call('POST', '/api/room/snapshots', { name: 'Bigger room' })
  assert.equal(
    (await call('POST', '/api/room/blocks', { type: 'remove', kind: 'floor', at: { i: 1, j: 0 } })).status,
    200
  )
  const restored = await call('POST', `/api/room/snapshots/${saved.body.id}/restore`)
  assert.equal(restored.status, 200)
  assert.equal(restored.body.room.items.find((item) => item.id === id).placed, false)
  assert.ok(restored.body.skipped.includes(id))
  assert.equal(restored.body.room.blocks.filter((block) => block.kind === 'floor').length, 1)
})
