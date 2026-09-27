// Find each catalogue book's real cover on Google Books, once.
//
//   npm run covers:fetch            # books that have no cover yet
//   npm run covers:fetch -- --all   # look every book up again
//   npm run covers:fetch -- --db    # also update the database DATABASE_URL names
//
// Needs GOOGLE_BOOKS_API_KEY in server/.env. The key is used here and nowhere
// else: the API never calls Google at run time, and the key never reaches the
// browser or git. What the script saves is each cover's public image link, which
// loads without a key, so covers work in demo mode on GitHub Pages too.
//
// It also works out each cover's main colour and saves it as the book's
// `color`, which the Library Room uses for the book's spine.
//
// The results go into client/src/api/seed.json, and db/seed.sql is rebuilt from
// that. --db also writes them straight into an existing database without
// touching anyone's shelves, which is how a hosted database gets covers.

import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import jpeg from 'jpeg-js'

const key = process.env.GOOGLE_BOOKS_API_KEY
if (!key) {
  console.error(
    'GOOGLE_BOOKS_API_KEY is not set. Add it to server/.env (never to a VITE_ variable or ' +
      'a committed file), then run this again.'
  )
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const seedFile = new URL('../../client/src/api/seed.json', import.meta.url)
const seed = JSON.parse(readFileSync(seedFile, 'utf8'))

const normalise = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Google's links are http and ask for a curled page corner. https is required
// (the database only accepts https), and fife asks for a larger image than the
// 128px thumbnail.
function coverLink(imageLinks) {
  const url = new URL(imageLinks.thumbnail ?? imageLinks.smallThumbnail)
  url.protocol = 'https:'
  url.searchParams.delete('edge')
  url.searchParams.set('fife', 'w400-h600')
  return url.toString()
}

// Download a candidate cover. Old public-domain editions on Google Books often
// show a scanned title page instead of a cover: black-and-white line art,
// served as a small PNG. A real cover is a JPEG of some size, so anything else
// is skipped in favour of the next edition.
async function coverImage(url) {
  const response = await fetch(url)
  if (!response.ok) return null
  const bytes = Buffer.from(await response.arrayBuffer())
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8
  return isJpeg && bytes.length > 12_000 ? bytes : null
}

// The best matching edition with a real cover: the title must match, and the
// author's surname must appear among the authors. Returns the cover's link and
// its image bytes, or null.
async function findCover(book) {
  const surname = book.author.split(' ').at(-1)
  const q = `intitle:"${book.title}" inauthor:"${surname}"`
  const url =
    'https://www.googleapis.com/books/v1/volumes?' +
    new URLSearchParams({ q, printType: 'books', maxResults: '20', key })
  const response = await fetch(url)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(`Google Books said ${response.status}: ${body.error?.message ?? response.statusText}`)
  }
  const { items = [] } = await response.json()
  const wanted = normalise(book.title)
  const matches = items.filter(
    ({ volumeInfo: v }) =>
      v.imageLinks &&
      normalise(v.title ?? '') === wanted &&
      (v.authors ?? []).some((a) => normalise(a).includes(normalise(surname)))
  )
  for (const { volumeInfo } of matches) {
    const url = coverLink(volumeInfo.imageLinks)
    const bytes = await coverImage(url)
    if (bytes) return { url, bytes }
  }
  return null
}

// The cover's main colour, darkened if needed so light text on the spine stays
// readable. A plain average of every pixel comes out a muddy brown-grey, so
// each pixel counts by how colourful it is: the cover's strongest hue wins,
// and white margins, black text and grey backgrounds barely count.
function mainColour(bytes) {
  let image
  try {
    image = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 64 })
  } catch {
    return null // unreadable; keep the hand-picked colour
  }
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < image.data.length; i += 16) {
    const [pr, pg, pb] = [image.data[i], image.data[i + 1], image.data[i + 2]]
    const light = (pr + pg + pb) / 3
    if (light < 25 || light > 235) continue
    const chroma = (Math.max(pr, pg, pb) - Math.min(pr, pg, pb)) / 255
    const weight = chroma * chroma + 0.01
    r += pr * weight
    g += pg * weight
    b += pb * weight
    n += weight
  }
  if (n === 0) return null
  ;[r, g, b] = [r / n, g / n, b / n]
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  const scale = luminance > 0.42 ? 0.42 / luminance : 1
  const hex = (v) => Math.round(v * scale).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

// seed.json keeps one book, shelf entry or room item per line, so a diff
// shows exactly which book changed.
function formatSeed({ books, userBooks, profile, room }) {
  const line = (object) =>
    '{ ' + Object.entries(object).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + ' }'
  const list = (rows, indent) => rows.map((row) => indent + line(row)).join(',\n')
  const { items, ...colours } = room
  const colourLines = Object.entries(colours).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  return [
    '{',
    '  "books": [',
    list(books, '    '),
    '  ],',
    '  "userBooks": [',
    list(userBooks, '    '),
    '  ],',
    '  "profile": ' + JSON.stringify(profile, null, 2).replace(/\n/g, '\n  ') + ',',
    '  "room": {',
    ...colourLines,
    '    "items": [',
    list(items, '      '),
    '    ]',
    '  }',
    '}',
    '',
  ].join('\n')
}

let found = 0
let missing = 0
for (const book of seed.books) {
  if (book.coverUrl && !args.has('--all')) continue
  const cover = await findCover(book)
  if (!cover) {
    // Drop a link from an earlier run that no longer passes the checks.
    delete book.coverUrl
    console.log(`  no cover   ${book.title}`)
    missing++
    continue
  }
  book.coverUrl = cover.url
  book.color = mainColour(cover.bytes) ?? book.color
  console.log(`  cover      ${book.title}  (${book.color})`)
  found++
}

writeFileSync(seedFile, formatSeed(seed))
// fileURLToPath, not .pathname: a pathname keeps "%20" for a space in the folder name.
execFileSync(process.execPath, [fileURLToPath(new URL('./build-seed.js', import.meta.url))], {
  stdio: 'inherit',
})
console.log(`${found} covers found, ${missing} without one. Updated seed.json and seed.sql.`)

if (args.has('--db')) {
  const { pool } = await import('./pool.js')
  for (const book of seed.books) {
    await pool.query('UPDATE books SET cover_url = $2, color = $3 WHERE id = $1', [
      book.id,
      book.coverUrl ?? null,
      book.color,
    ])
  }
  await pool.end()
  console.log('Updated covers and colours in the database.')
}
