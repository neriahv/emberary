// Starts the API, with the protected React client in production.
import { fileURLToPath } from 'node:url'
import { pool } from './db/pool.js'
import { createApp } from './app.js'
import { createWebApp } from './web.js'

// Comma-separated in CORS_ORIGINS. An origin has no path and no trailing slash.
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// When "today" starts for the daily Ember check-in and reading goal. An IANA
// name, such as Asia/Manila or Europe/London.
const timezone = process.env.APP_TIMEZONE || 'Asia/Manila'

const api = createApp(pool, { corsOrigins, timezone })

const app = process.env.NODE_ENV === 'production'
  ? createWebApp({
      api,
      clientDir: fileURLToPath(new URL('../client/dist', import.meta.url)),
      username: process.env.BASIC_AUTH_USER,
      password: process.env.BASIC_AUTH_PASSWORD
    })
  : api

// The host chooses the port and tells you through PORT. Hardcoding 3000 is the
// commonest reason a first deploy is marked unhealthy and killed.
const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`Emberary listening on http://localhost:${port}`)
  console.log(`CORS allows: ${corsOrigins.join(', ')}`)
})