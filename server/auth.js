// Compatible scrypt hashes and opaque sessions; no plaintext credentials stored.
import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
const scrypt = promisify(derive)
export const SESSION_COOKIE = 'emberary_session'
export const SESSION_DAYS = 30
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return ['scrypt', salt.toString('base64'), key.toString('base64')].join('$')
}
export async function checkPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 200 || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'base64'),
    expected = Buffer.from(parts[2], 'base64')
  if (
    salt.length !== 16 ||
    expected.length !== 64 ||
    salt.toString('base64') !== parts[1] ||
    expected.toString('base64') !== parts[2]
  )
    return false
  const actual = await scrypt(password, salt, 64)
  return timingSafeEqual(actual, expected)
}
let decoy
export function decoyHash() {
  return (decoy ??= hashPassword(randomBytes(24).toString('hex')))
}
export const newToken = () => randomBytes(32).toString('base64url')
export const tokenHash = (token) => createHash('sha256').update(token).digest('hex')
export function readCookie(request, name) {
  const header = request.get('cookie') ?? ''
  for (const segment of header.split(';')) {
    const separator = segment.indexOf('=')
    if (separator < 1 || segment.slice(0, separator).trim() !== name) continue
    try {
      return decodeURIComponent(segment.slice(separator + 1).trim())
    } catch {
      return null
    }
  }
  return null
}
export function sessionCookie(token, { secure = false } = {}) {
  const fields = [
    `${SESSION_COOKIE}=${token ?? ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${token ? SESSION_DAYS * 86400 : 0}`,
  ]
  if (secure) fields.push('Secure')
  return fields.join('; ')
}
