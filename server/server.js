import { pool } from './db/pool.js'
import { createApp } from './app.js'

// Comma-separated in CORS_ORIGINS. An origin has no path and no trailing slash.
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = createApp(pool, { corsOrigins })

// The host chooses the port and tells you through PORT. Hardcoding 3000 is the
// commonest reason a first deploy is marked unhealthy and killed.
const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
  console.log(`CORS allows: ${corsOrigins.join(', ')}`)
})
