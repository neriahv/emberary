// A real PostgreSQL for development, with nothing to install.
//
//   npm run db:local      # leave it running in its own terminal
//
// embedded-postgres downloads the official PostgreSQL binaries into
// node_modules, so this is the same database server you would get from Docker
// or an installer, not an imitation like pg-mem. The data lives in
// server/.pgdata (git-ignored) and survives restarts; delete that folder to
// start from nothing.
//
// It listens on localhost:5432 with the user, password and database name from
// .env.example, so the default DATABASE_URL works unchanged. Only for your own
// machine: the password is in this file.

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import EmbeddedPostgres from 'embedded-postgres'

const dataDir = fileURLToPath(new URL('../.pgdata', import.meta.url))
const port = 5432

const postgres = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'devpassword',
  port,
  persistent: true,
  onLog: () => {},
  onError: (message) => console.error(String(message).trim()),
})

const firstRun = !existsSync(dataDir)

try {
  if (firstRun) {
    console.log('First run: creating the database cluster in server/.pgdata ...')
    await postgres.initialise()
  }
  await postgres.start()
  if (firstRun) await postgres.createDatabase('emberary')
} catch (error) {
  console.error(`Could not start PostgreSQL on port ${port}: ${error.message ?? error}`)
  console.error('Is another PostgreSQL (or a previous "npm run db:local") already using that port?')
  process.exit(1)
}

console.log(`PostgreSQL is running on localhost:${port}, database "emberary".`)
if (firstRun) console.log('The database is empty. In another terminal: npm run db:reset')
console.log('Press Ctrl+C to stop it.')

// Stop the server cleanly, or the next start finds a stale lock file.
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await postgres.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
