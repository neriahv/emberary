// What web.js has to do: put the gate, the API and the built React client
// behind one address. No database needed: a small stand-in replaces the API.
//
//   node --test test/web.test.js

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import { createWebApp } from '../web.js'

const USERNAME = 'reader'
const PASSWORD = 'test-password'
const GOOD = `Basic ${Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')}`
const BAD = `Basic ${Buffer.from(`${USERNAME}:wrong`).toString('base64')}`

// A stand-in for client/dist after `npm run build`.
const clientDir = mkdtempSync(join(tmpdir(), 'emberary-dist-'))
mkdirSync(join(clientDir, 'assets'))
writeFileSync(join(clientDir, 'index.html'), '<!doctype html><title>Emberary</title><div id="root"></div>')
writeFileSync(join(clientDir, 'assets', 'app.js'), 'console.log("app")')

// A stand-in for createApp(pool): the real one ends with a catch-all JSON 404,
// and so does this, because that is what makes the ordering in web.js matter.
function fakeApi() {
  const api = express()
  api.get('/api/ping', (request, response) => response.json({ pong: true }))
  api.get('/readyz', (request, response) => response.json({ ok: true, db: 'up' }))
  api.use((request, response) => response.status(404).json({ error: 'No such route' }))
  return api
}

// Each test gets its own app, so the login rate limit starts from zero.
const servers = []
async function start() {
  const app = createWebApp({ api: fakeApi(), clientDir, username: USERNAME, password: PASSWORD })
  const server = app.listen(0)
  servers.push(server)
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://localhost:${server.address().port}`
  return (path, authorization) =>
    fetch(base + path, { headers: authorization ? { Authorization: authorization } : {} })
}

let get
before(async () => {
  get = await start()
})

after(() => {
  servers.forEach((server) => server.close())
  rmSync(clientDir, { recursive: true, force: true })
})

test('healthz answers without a password, so the host can check the app is up', async () => {
  const response = await get('/healthz')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
})

test('the website and the API are both behind the gate', async () => {
  for (const path of ['/', '/my-books', '/assets/app.js', '/api/ping', '/readyz']) {
    const response = await get(path)
    assert.equal(response.status, 401, `${path} should need a password`)
    assert.match(response.headers.get('www-authenticate') ?? '', /^Basic /)
  }
})

test('serves the built client with the right password', async () => {
  const page = await get('/', GOOD)
  assert.equal(page.status, 200)
  assert.match(page.headers.get('content-type'), /text\/html/)
  assert.match(await page.text(), /<div id="root">/)

  const script = await get('/assets/app.js', GOOD)
  assert.equal(script.status, 200)
  assert.match(script.headers.get('content-type'), /javascript/)
})

test('a deep link like /my-books gets index.html, so refreshing a page works', async () => {
  const response = await get('/library-room', GOOD)
  assert.equal(response.status, 200)
  assert.match(await response.text(), /<div id="root">/)
})

test('API routes reach the API, and unknown API routes stay JSON 404s', async () => {
  assert.deepEqual(await (await get('/api/ping', GOOD)).json(), { pong: true })
  assert.deepEqual(await (await get('/readyz', GOOD)).json(), { ok: true, db: 'up' })

  const missing = await get('/api/no-such-thing', GOOD)
  assert.equal(missing.status, 404)
  assert.deepEqual(await missing.json(), { error: 'No such route' })
})

test('sends helmet security headers, with covers from Google Books allowed', async () => {
  const response = await get('/', GOOD)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-powered-by'), null)

  const policy = response.headers.get('content-security-policy') ?? ''
  assert.match(policy, /default-src 'self'/)
  const images = policy.split(';').map((part) => part.trim()).find((part) => part.startsWith('img-src')) ?? ''
  assert.match(images, /https:\/\/books\.google\.com/, 'book covers come from books.google.com')
  assert.match(images, /data:/, 'the shop thumbnails are data: URLs')
})

test('too many wrong passwords from one address are slowed down with a 429', async () => {
  const fresh = await start()
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    assert.equal((await fresh('/api/ping', BAD)).status, 401, `attempt ${attempt}`)
  }
  assert.equal((await fresh('/api/ping', BAD)).status, 429)
})

test('the right password is never rate limited by normal use', async () => {
  const fresh = await start()
  for (let request = 0; request < 30; request += 1) {
    assert.equal((await fresh('/api/ping', GOOD)).status, 200)
  }
})
