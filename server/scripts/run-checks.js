// Always tests a disposable local database, ignoring any production DATABASE_URL.
import EmbeddedPostgres from 'embedded-postgres'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
if (process.getuid?.() === 0) throw new Error('Run the disposable PostgreSQL tests as a non-root user.')
const socket = createServer()
await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port
await new Promise((resolve) => socket.close(resolve))
const dir = await mkdtemp(join(tmpdir(), 'emberary-test-'))
const postgres = new EmbeddedPostgres({
  databaseDir: join(dir, 'data'),
  port,
  user: 'postgres',
  password: 'test-only',
  persistent: false,
  postgresFlags: [
    '-c',
    'unix_socket_directories=',
    '-c',
    'listen_addresses=127.0.0.1',
    '-c',
    'lc_messages=C',
  ],
  onLog: (message) => {
    if (process.env.PG_DEBUG) console.log(message)
  },
  onError: console.error,
})
let started = false
try {
  await postgres.initialise()
  await postgres.start()
  started = true
  await postgres.createDatabase('emberary_test')
  console.log('Testing against a disposable local PostgreSQL database.')
  const files =
    process.argv.length > 2
      ? process.argv.slice(2)
      : (await readdir(new URL('../test/', import.meta.url)))
          .filter((name) => name.endsWith('.test.js'))
          .map((name) => `test/${name}`)
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files], {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://postgres:test-only@127.0.0.1:${port}/emberary_test`,
      },
    })
    child.on('error', reject)
    child.on('exit', resolve)
  })
  process.exitCode = code ?? 1
} finally {
  if (started) await postgres.stop()
  await rm(dir, { recursive: true, force: true })
}
