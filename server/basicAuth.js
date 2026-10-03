// The access gate: HTTP Basic Authentication in front of the whole app.
// Spec: test/basicAuth.test.js. Task 1 in FINISHING-GUIDE.md.

import { createHash, timingSafeEqual } from 'node:crypto'

function same(a, b) {
  const hash = (text) =>
    createHash('sha256').update(text).digest()

  return timingSafeEqual(hash(a), hash(b))
}

export function basicAuth({ username, password, realm = 'Emberary' } = {}) {
  if (!username || !password) {
    throw new Error(
      'BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must both be set and non-empty.'
    )
  }

  return (request, response, next) => {
    const authorization = request.get('authorization') ?? ''
    const [scheme, encoded] = authorization.split(' ')

    if (scheme.toLowerCase() === 'basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8')
      const i = decoded.indexOf(':')

      if (i !== -1) {
        const u = decoded.slice(0, i)
        const p = decoded.slice(i + 1)

        const userOk = same(u, username)
        const passOk = same(p, password)

        if (userOk && passOk) return next()
      }
    }

    response.set('WWW-Authenticate', `Basic realm="${realm}"`)
    response.status(401).send('Login required')
  }
}
