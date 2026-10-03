// What the access gate in basicAuth.js has to do. No database needed.
//
//   node --test test/basicAuth.test.js
//
// HTTP Basic Authentication (RFC 7617): the browser sends
//   Authorization: Basic <base64 of "username:password">
// and the server answers 401 with a WWW-Authenticate header when it is missing
// or wrong, which is what makes the browser show its login box.

import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { basicAuth } from '../basicAuth.js'

const USERNAME = 'reader'
const PASSWORD = 'correct horse: battery staple' // a colon on purpose

const app = express()
app.use(basicAuth({ username: USERNAME, password: PASSWORD }))
app.get('/secret', (request, response) => response.json({ ok: true }))

const server = app.listen(0)
const base = `http://localhost:${server.address().port}`
after(() => server.close())

const encode = (text) => Buffer.from(text, 'utf8').toString('base64')

const get = (authorization) =>
  fetch(`${base}/secret`, { headers: authorization ? { Authorization: authorization } : {} })

async function assertRefused(response) {
  assert.equal(response.status, 401)
  assert.match(response.headers.get('www-authenticate') ?? '', /^Basic realm="[^"]+"/)
  const body = await response.text()
  assert.doesNotMatch(body, /"ok":true/, 'the route behind the gate must not run')
}

test('refuses to be created without a username and password', () => {
  // A gate whose environment variables were never set must not quietly let
  // everyone in. It should stop the server from starting instead.
  assert.throws(() => basicAuth({ username: '', password: PASSWORD }))
  assert.throws(() => basicAuth({ username: USERNAME, password: '' }))
  assert.throws(() => basicAuth({}))
})

test('asks for credentials when none are sent', async () => {
  await assertRefused(await get())
})

test('lets the right username and password through', async () => {
  const response = await get(`Basic ${encode(`${USERNAME}:${PASSWORD}`)}`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
})

test('accepts the scheme name in any case', async () => {
  const response = await get(`basic ${encode(`${USERNAME}:${PASSWORD}`)}`)
  assert.equal(response.status, 200)
})

test('refuses a wrong password', async () => {
  await assertRefused(await get(`Basic ${encode(`${USERNAME}:wrong`)}`))
})

test('refuses a wrong username', async () => {
  await assertRefused(await get(`Basic ${encode(`someone:${PASSWORD}`)}`))
})

test('refuses a password that is only the start of the real one', async () => {
  await assertRefused(await get(`Basic ${encode(`${USERNAME}:correct horse`)}`))
})

test('refuses other schemes and malformed headers without crashing', async () => {
  await assertRefused(await get(`Bearer ${encode(`${USERNAME}:${PASSWORD}`)}`))
  await assertRefused(await get('Basic'))
  await assertRefused(await get('Basic !!!not-base64!!!'))
  await assertRefused(await get(`Basic ${encode('no-colon-at-all')}`))
})
