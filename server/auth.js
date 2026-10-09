// Accounts: a reader signs up with an email and a password and stays signed
// in with a session cookie. Passwords are kept only as scrypt hashes, each
// with its own salt; sessions only as a SHA-256 hash of their token, so a
// copy of the database lets nobody sign in as anyone.

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

export const SESSION_COOKIE = 'emberary_session'
export const SESSION_DAYS = 30

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

// Whether a password matches a stored hash. Compared in constant time.
export async function checkPassword(password, stored) {
  const [scheme, salt, key] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'base64')
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}

// A hash to check against when there is no such account, so a wrong email
// takes as long to refuse as a wrong password and says nothing about who
// has signed up.
let decoy = null
export async function decoyHash() {
  decoy ??= await hashPassword(randomBytes(12).toString('hex'))
  return decoy
}

export const newToken = () => randomBytes(32).toString('base64url')
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex')

// One cookie from the request's Cookie header, or null.
export function readCookie(request, name) {
  for (const part of (request.get('cookie') ?? '').split(';')) {
    const at = part.indexOf('=')
    if (at > 0 && part.slice(0, at).trim() === name) {
      try {
        return decodeURIComponent(part.slice(at + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

// The session cookie: unreadable by the page's JavaScript (HttpOnly), not
// sent with other sites' requests (SameSite=Lax), and only over HTTPS when
// `secure`. An empty token with no age clears it.
export function sessionCookie(token, { secure = false } = {}) {
  return [
    `${SESSION_COOKIE}=${token ?? ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${token ? SESSION_DAYS * 24 * 60 * 60 : 0}`,
    secure && 'Secure',
  ]
    .filter(Boolean)
    .join('; ')
}
