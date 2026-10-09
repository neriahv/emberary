// Give an existing reader an email and password, so they can sign in. For the
// reader your seed or your live database already has, with their books and
// room:
//
//   LOGIN_PASSWORD='a long password' npm run login:set -- 1 you@example.com
//
// The password comes from an environment variable rather than the command
// line, so it does not land in your shell history, and it is never written
// anywhere but the database, as a hash.

import { pool } from './pool.js'
import { hashPassword } from '../auth.js'
import { EMAIL_PATTERN, passwordProblems } from '../catalog.js'

const [readerId, email] = process.argv.slice(2)
const password = process.env.LOGIN_PASSWORD ?? ''

if (!/^[0-9]+$/.test(readerId ?? '') || !EMAIL_PATTERN.test(email ?? '')) {
  console.error('Usage: LOGIN_PASSWORD=... npm run login:set -- <reader id> <email>')
  process.exit(1)
}
const problems = passwordProblems(password, email)
if (problems.length > 0) {
  console.error(`LOGIN_PASSWORD needs: ${problems.join('; ')}.`)
  process.exit(1)
}

try {
  const result = await pool.query(
    'UPDATE readers SET email = $2, password_hash = $3 WHERE id = $1 RETURNING display_name',
    [Number(readerId), email.trim().toLowerCase(), await hashPassword(password)]
  )
  if (result.rowCount === 0) {
    console.error(`There is no reader ${readerId}.`)
    process.exitCode = 1
  } else {
    console.log(`${result.rows[0].display_name} (reader ${readerId}) can now sign in as ${email.trim().toLowerCase()}.`)
  }
} catch (error) {
  console.error(error.code === '23505' ? 'Another reader already has that email.' : error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
