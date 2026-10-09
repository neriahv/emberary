import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import * as accounts from './repos/accounts.js'
import { SESSION_COOKIE, checkPassword, decoyHash, hashPassword, readCookie, sessionCookie } from './auth.js'
import * as books from './repos/books.js'
import * as myBooks from './repos/myBooks.js'
import * as insights from './repos/insights.js'
import * as profile from './repos/profile.js'
import * as room from './repos/room.js'
import * as ember from './repos/ember.js'
import { BLOCKS, EMAIL_PATTERN, EMBER_RULES, FINISH_TYPES, LOFT, catalogEntry, hasLoft } from './catalog.js'
import { bookKey, isGoogleId, volumeIdOf } from './bookFromGoogle.js'
import { createGoogleBooks, GoogleBooksError } from './googleBooks.js'
import { emailDomainStatus } from './emailDomain.js'
import {
  validateCheckout,
  validateStatus,
  validateEntryPatch,
  validateProfile,
  validateSettings,
  validateRoom,
  validateRoomItem,
  validateBlockChange,
  validateShelfOrder,
  validateSignup,
  validateLogin,
} from './validation.js'
import * as settings from './repos/settings.js'

// Express 4 does not pass a rejected promise to the error handler by itself.
// Without this, a failed query leaves the request hanging until it times out.
const route = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response)).catch(next)

const badRequest = (response, errors) => response.status(400).json({ error: errors.join('; ') })

// Run `work` on one connection inside BEGIN ... COMMIT, rolling back if it
// throws. Used wherever Ember changes hands, so a reward or a purchase is
// recorded together with the change that caused it, or not at all.
async function transaction(pool, work) {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')
    const result = await work(db)
    await db.query('COMMIT')
    return result
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
}

// Build the app without starting it, so the tests can run it on a spare port.
// timezone decides when "today" starts for the daily check-in and reading goal.
// googleKey is the Google Books API key, and fetch is how the server reaches
// Google; tests pass their own instead of going to the internet.
// secureCookies sends the session cookie over HTTPS only (true in
// production). authLimit is how many failed sign-ins or sign-ups one address
// gets in 15 minutes. checkEmailDomain says whether an email's domain takes
// mail; tests pass their own instead of asking DNS.
export function createApp(
  pool,
  {
    corsOrigins = ['http://localhost:5173'],
    timezone = 'Asia/Manila',
    googleKey = '',
    fetch: fetchImpl = globalThis.fetch,
    secureCookies = false,
    authLimit = 10,
    checkEmailDomain = emailDomainStatus,
  } = {}
) {
  const app = express()
  const google = createGoogleBooks({ key: googleKey, fetch: fetchImpl })

  // Express announces itself in an X-Powered-By header on every response. It
  // helps nobody but someone looking for a known Express vulnerability.
  app.disable('x-powered-by')

  // CORS before the routes. Middleware registered after a route never sees
  // that route's requests.
  //
  // Name your origins. app.use(cors()) with no options sends
  // Access-Control-Allow-Origin: *, which lets any site on the internet call
  // this API from a visitor's browser.
  // credentials: the session cookie may come with requests from these origins.
  app.use(cors({ origin: corsOrigins, credentials: true }))
  app.use(express.json({ limit: '100kb' }))

  // Is the process alive?
  app.get('/healthz', (request, response) => {
    response.json({ ok: true })
  })

  // Is the database reachable? A different question, and the one that tells
  // you in two seconds which half of a problem you have.
  app.get('/readyz', async (request, response) => {
    try {
      await pool.query('SELECT 1')
      response.json({ ok: true, db: 'up' })
    } catch (error) {
      console.error('readyz failed:', error.message)
      response.status(503).json({ ok: false, db: 'down' })
    }
  })

  // ------------------------------------------------------------ accounts

  // Guessing passwords is slowed down: after authLimit failed tries from one
  // address, sign-in and sign-up answer 429 for 15 minutes. Successful ones
  // do not count.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authLimit,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many tries. Wait a few minutes and try again' },
  })

  const signIn = async (response, account, status) => {
    const token = await accounts.createSession(pool, account.id)
    response.set('Set-Cookie', sessionCookie(token, { secure: secureCookies }))
    response.status(status).json(account)
  }

  // Body: { email, password, displayName }. A new reader starts with the
  // welcome Ember, an empty shelf and a fresh room, and is signed in.
  app.post('/api/auth/signup', authLimiter, route(async (request, response) => {
    const { errors, value } = validateSignup(request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)
    // A domain that does not exist, or takes no mail, is a typo or made up.
    // If DNS does not answer, the sign-up goes ahead rather than wait on it.
    if ((await checkEmailDomain(value.email.split('@')[1])) === 'none') {
      return badRequest(response, ["that email's domain does not receive email. Check it for a typo"])
    }
    const passwordHash = await hashPassword(value.password)
    const account = await transaction(pool, async (db) => {
      const created = await accounts.createReader(db, { email: value.email, displayName: value.displayName, passwordHash })
      if (created) await ember.earn(db, created.id, EMBER_RULES.welcome, 'welcome', '')
      return created
    })
    if (!account) return response.status(409).json({ error: 'That email already has an account. Sign in instead' })
    await signIn(response, account, 201)
  }))

  // Body: { email, password }. The same answer whether the email or the
  // password was wrong, so it says nothing about who has an account.
  app.post('/api/auth/login', authLimiter, route(async (request, response) => {
    const { errors, value } = validateLogin(request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)
    const found = await accounts.findByEmail(pool, value.email)
    const matches = await checkPassword(value.password, found?.passwordHash ?? (await decoyHash()))
    if (!found || !matches) return response.status(401).json({ error: 'That email and password do not match an account' })
    await signIn(response, { id: found.id, displayName: found.displayName, email: found.email }, 200)
  }))

  app.post('/api/auth/logout', route(async (request, response) => {
    const token = readCookie(request, SESSION_COOKIE)
    if (token) await accounts.deleteSession(pool, token)
    response.set('Set-Cookie', sessionCookie(null, { secure: secureCookies }))
    response.status(204).end()
  }))

  // Body: { email }. Whether the email looks like one and its domain takes
  // mail, for the sign-up form to show while it is typed: { status: 'invalid'
  // | 'ok' | 'none' | 'unknown' }. Says nothing about who has an account.
  // Limited, since each one asks DNS.
  const emailCheckLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many checks. Wait a moment' },
  })
  app.post('/api/auth/check-email', emailCheckLimiter, route(async (request, response) => {
    const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) return response.json({ status: 'invalid' })
    response.json({ status: await checkEmailDomain(email.split('@')[1]) })
  }))

  // Who is signed in, or 401.
  app.get('/api/auth/me', route(async (request, response) => {
    const token = readCookie(request, SESSION_COOKIE)
    const account = token && (await accounts.readerForToken(pool, token))
    if (!account) return response.status(401).json({ error: 'Sign in first' })
    response.json(account)
  }))

  // Everything else under /api needs a signed-in reader, and acts only on
  // that reader's own books, room and Ember: the id comes from the session,
  // never from the request.
  app.use('/api', (request, response, next) => {
    const token = readCookie(request, SESSION_COOKIE)
    if (!token) return response.status(401).json({ error: 'Sign in first' })
    accounts.readerForToken(pool, token).then((account) => {
      if (!account) return response.status(401).json({ error: 'Your session has ended. Sign in again' })
      request.readerId = account.id
      request.timezone = account.timezone
      request.pageGoal = account.dailyPageGoal
      next()
    }, next)
  })

  // ------------------------------------------------------------ catalogue

  // GET /api/books?q=austen&genre=Romance
  app.get('/api/books', route(async (request, response) => {
    const query = typeof request.query.q === 'string' ? request.query.q : ''
    const genre = typeof request.query.genre === 'string' ? request.query.genre : ''
    response.json(await books.search(pool, { query, genre }))
  }))

  // GET /api/books/search?q=dune&genre=Fantasy searches every book on Google
  // Books, not only the catalogue. A result that is already in the catalogue
  // comes back as the catalogue's book, so it keeps its id, colour and cover.
  // Registered before /:id so "search" is never read as a book id.
  app.get('/api/books/search', route(async (request, response) => {
    const query = typeof request.query.q === 'string' ? request.query.q.trim() : ''
    const genre = typeof request.query.genre === 'string' ? request.query.genre : ''
    if (!query && !genre) return badRequest(response, ['send a search (q), a genre, or both'])
    if (query.length > 100 || genre.length > 40) return badRequest(response, ['that search is too long'])

    let found
    try {
      found = await google.search(query, genre)
    } catch (error) {
      if (error instanceof GoogleBooksError) return response.status(502).json({ error: error.message })
      throw error
    }

    const known = new Map((await books.all(pool)).map((book) => [bookKey(book), book]))
    const seen = new Set()
    const results = []
    for (const book of found) {
      const key = bookKey(book)
      const shown = known.get(key) ?? book
      if (seen.has(key) || seen.has(shown.id)) continue
      seen.add(key)
      seen.add(shown.id)
      results.push(shown)
    }
    response.json(results)
  }))

  // A book's cover, fetched from Google by the server and passed through, so
  // the Library Room can paint it onto a spine: WebGL may only read images from
  // the page's own address. Only covers already saved in the catalogue, and
  // only from Google's cover host, are ever fetched.
  app.get('/api/covers/:id', route(async (request, response) => {
    const book = await books.getById(pool, request.params.id)
    const url = book?.coverUrl ? new URL(book.coverUrl) : null
    if (!url || url.protocol !== 'https:' || url.hostname !== 'books.google.com') {
      return response.status(404).json({ error: 'No cover for that book' })
    }

    let upstream
    try {
      upstream = await fetchImpl(url, { signal: AbortSignal.timeout(6000) })
    } catch {
      return response.status(502).json({ error: 'Google Books did not answer' })
    }
    const type = upstream.headers.get('content-type') ?? ''
    if (!upstream.ok || !type.startsWith('image/')) {
      return response.status(502).json({ error: 'Google Books did not send a cover' })
    }
    const image = Buffer.from(await upstream.arrayBuffer())
    if (image.length > 2_000_000) return response.status(502).json({ error: 'That cover is too large' })

    response.set('Content-Type', type)
    response.set('Cache-Control', 'private, max-age=604800')
    response.send(image)
  }))

  app.get('/api/books/:id', route(async (request, response) => {
    const book = await books.getById(pool, request.params.id)
    if (!book) return response.status(404).json({ error: 'Book not found' })
    response.json(book)
  }))

  // ------------------------------------------------------------ my books

  app.get('/api/my-books', route(async (request, response) => {
    response.json(await myBooks.list(pool, request.readerId))
  }))

  app.get('/api/my-books/:bookId', route(async (request, response) => {
    const entry = await myBooks.get(pool, request.readerId, request.params.bookId)
    if (!entry) return response.status(404).json({ error: 'That book is not in your collection' })
    response.json(entry)
  }))

  // Body: { bookId, status }. status defaults to want-to-read, as in the mock.
  app.post('/api/my-books', route(async (request, response) => {
    const { bookId, status = 'want-to-read' } = request.body ?? {}
    if (typeof bookId !== 'string' || !bookId) return badRequest(response, ['bookId is required'])
    const errors = validateStatus(status)
    if (errors.length > 0) return badRequest(response, errors)

    // A book found on Google joins the catalogue the first time anyone adds it.
    // The server fetches it from Google itself rather than trusting a title or
    // cover sent by the browser.
    let book = await books.getById(pool, bookId)
    let fromGoogle = null
    if (!book && isGoogleId(bookId)) {
      try {
        fromGoogle = await google.volume(volumeIdOf(bookId))
      } catch (error) {
        if (error instanceof GoogleBooksError) return response.status(502).json({ error: error.message })
        throw error
      }
      book = fromGoogle
    }
    if (!book) return response.status(404).json({ error: 'Book not found' })

    // A book added as Read has been finished, and earns what finishing earns.
    const entry = await transaction(pool, async (db) => {
      if (fromGoogle) await books.insertIfMissing(db, fromGoogle)
      const added = await myBooks.add(db, request.readerId, bookId, status)
      if (!added) return null
      const rewards = await ember.rewardReading(db, request.readerId, bookId, null, added, request.timezone, request.pageGoal)
      return { ...added, rewards }
    })
    if (!entry) {
      return response.status(409).json({ error: `"${book.title}" is already in your collection` })
    }
    response.status(201).json(entry)
  }))

  // Body: { bookIds: [...] }, one Library Room shelf from left to right.
  // Registered before /:bookId so "order" is never read as a book id.
  app.put('/api/my-books/order', route(async (request, response) => {
    const { errors, value } = validateShelfOrder(request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)
    await myBooks.reorder(pool, request.readerId, value)
    response.status(204).end()
  }))

  // Body: any of { status, currentPage, rating, review, shelfPosition, shelfSpot }.
  app.patch('/api/my-books/:bookId', route(async (request, response) => {
    const existing = await myBooks.get(pool, request.readerId, request.params.bookId)
    if (!existing) return response.status(404).json({ error: 'That book is not in your collection' })

    const { errors, value } = validateEntryPatch(request.body ?? {}, existing.book.pages)
    if (errors.length > 0) return badRequest(response, errors)

    // A book can only stand in the built-in bookcase, or on a bookcase or
    // table the reader owns.
    const bookcase = value.shelfSpot?.bookcase
    if (bookcase && bookcase !== 'main') {
      const item = await room.getItem(pool, request.readerId, Number(bookcase))
      if (!catalogEntry(item?.kind)?.holds) {
        return badRequest(response, ['That bookcase or table is not in your room'])
      }
    }

    // The reply carries the Ember this save earned, as `rewards` (often []).
    const bookId = request.params.bookId
    const entry = await transaction(pool, async (db) => {
      const before = await myBooks.lock(db, request.readerId, bookId)
      if (!before) return null
      const after = await myBooks.update(db, request.readerId, bookId, value)
      const rewards = await ember.rewardReading(db, request.readerId, bookId, before, after, request.timezone, request.pageGoal)
      return { ...after, rewards }
    })
    if (!entry) return response.status(404).json({ error: 'That book is not in your collection' })
    response.json(entry)
  }))

  app.delete('/api/my-books/:bookId', route(async (request, response) => {
    const removed = await myBooks.remove(pool, request.readerId, request.params.bookId)
    if (!removed) return response.status(404).json({ error: 'That book is not in your collection' })
    response.status(204).end()
  }))

  // ------------------------------------------------------------ insights

  app.get('/api/stats', route(async (request, response) => {
    response.json(await insights.readingStats(pool, request.readerId))
  }))

  // GET /api/recommendations?limit=4. The limit is clamped rather than
  // rejected: asking for 500 gets you 20, not an error.
  app.get('/api/recommendations', route(async (request, response) => {
    const asked = Number.parseInt(request.query.limit, 10)
    const limit = Number.isInteger(asked) ? Math.min(Math.max(asked, 1), 20) : 4
    response.json(await insights.recommendations(pool, request.readerId, limit))
  }))

  // ------------------------------------------------------------ profile

  app.get('/api/profile', route(async (request, response) => {
    const current = await profile.get(pool, request.readerId)
    if (!current) return response.status(404).json({ error: 'Profile not found' })
    response.json(current)
  }))

  // Body: any of { displayName, bio, yearlyGoal }.
  app.patch('/api/profile', route(async (request, response) => {
    const current = await profile.get(pool, request.readerId)
    if (!current) return response.status(404).json({ error: 'Profile not found' })

    const { errors, value } = validateProfile(current, request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)

    response.json(await profile.update(pool, request.readerId, value))
  }))

  
  // ------------------------------------------------------------ settings

  // Returns the signed-in reader's preferences.
  app.get('/api/settings', route(async (request, response) => {
    const current = await settings.get(pool, request.readerId)

    if (!current) {
      return response.status(404).json({
        error: 'Settings not found'
      })
    }

    response.json(current)
  }))

  // Body: any of { timezone, dailyPageGoal, theme }.
  app.patch('/api/settings', route(async (request, response) => {
    const current = await settings.get(pool, request.readerId)

    if (!current) {
      return response.status(404).json({
        error: 'Settings not found'
      })
    }

    const { errors, value } = validateSettings(
      current,
      request.body ?? {}
    )

    if (errors.length > 0) {
      return badRequest(response, errors)
    }

    response.json(
      await settings.update(pool, request.readerId, value)
    )
  }))


// ------------------------------------------------------------ ember

// The wallet: balance, today's check-in and reading, and recent changes.
app.get('/api/ember', route(async (request, response) => {
  response.json(
    await ember.summary(
      pool,
      request.readerId,
      request.timezone,
      request.pageGoal
    )
  )
}))

app.post('/api/ember/check-in', route(async (request, response) => {
  const reward = await ember.checkIn(
    pool,
    request.readerId,
    request.timezone
  )

  if (!reward) {
    return response.status(409).json({
      error: 'You already checked in today'
    })
  }

  const summary = await ember.summary(
    pool,
    request.readerId,
    request.timezone,
    request.pageGoal
  )

  response.status(201).json({ reward, ...summary })
}))


  // ------------------------------------------------------------ library room

  // The room's colours, finishes and furniture. The books on its shelves are
  // GET /api/my-books: every book the reader has started, in shelfPosition order.
  app.get('/api/room', route(async (request, response) => {
    response.json(await room.get(pool, request.readerId))
  }))

  // Body: any of { wallColor, floorColor, shelfColor, upperFloorColor } and
  // the finishes: { wallpaper, floor, wallShape, roof, loft, upperFloor }. How
  // big the room is changes only by building blocks (below).
  app.patch('/api/room', route(async (request, response) => {
    const { errors, value } = validateRoom(request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)

    const owned = await room.unlocks(pool, request.readerId)
    const locked = [...FINISH_TYPES, 'upperFloor'].map((key) => value[key]).find((id) => id && !owned.includes(id))
    if (locked) return response.status(409).json({ error: 'Buy that in the shop first' })
    const current = await room.settings(pool, request.readerId)
    if (value.loft === 'loft-gallery' && !hasLoft({ ...current, loft: value.loft })) {
      return response.status(409).json({ error: `Build the window wall ${LOFT.wallBlocks} blocks high for a loft` })
    }


    response.json(await room.update(pool, request.readerId, value))
  }))

  // Body: { items: [catalogue id, ...] }. Everything is bought, or nothing.
  app.post('/api/shop/checkout', route(async (request, response) => {
    const { errors, value } = validateCheckout(request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)

    const result = await transaction(pool, (db) => room.checkout(db, request.readerId, value))
    if (result.error === 'funds') {
      return response.status(409).json({
        error: `That costs ${result.cost} Ember and you have ${result.balance}`,
      })
    }
    if (result.error === 'owned') {
      return response.status(409).json({ error: `You already own ${result.entry.name}` })
    }
    if (result.error === 'full') {
      return response.status(409).json({ error: 'You own as much furniture as a room can keep' })
    }
    response.status(201).json(result)
  }))

  // Body: { type: "add" | "move" | "remove", kind: "floor" | "wall" | "upper",
  // at } or, to move, { from, to }. A block is paid for when it is put down,
  // and gives half its price back when taken away.
  app.post('/api/room/blocks', route(async (request, response) => {
    const { errors, value } = validateBlockChange(request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)

    const result = await transaction(pool, (db) => room.changeRoomBlocks(db, request.readerId, value))
    const refusals = {
      max: `A room can have ${BLOCKS.maxFloor} floor blocks`,
      spot: {
        floor: 'A floor block goes on an empty square beside the floor, not behind a wall',
        wall: `A wall block goes on a back edge of the floor, up to ${BLOCKS.maxLevels} high`,
        upper: `An upstairs floor needs a staircase in the room, and goes over a floor square with a wall ${BLOCKS.upperWalls} blocks high behind it, or beside another upstairs square`,
      }[value.kind],
      none: value.kind === 'upper' ? 'There is no upstairs floor there' : `There is no ${value.kind} block there`,
      upper: 'Take away the upstairs floor above it first',
      last: 'A room needs at least one floor block',
      apart: 'The floor has to stay in one piece',
      walls: 'Take away the walls standing on that floor block first',
    }
    if (result.error === 'funds') {
      return response.status(409).json({ error: `That costs ${result.cost} Ember and you have ${result.balance}` })
    }
    if (result.error) return response.status(409).json({ error: refusals[result.error] })
    response.status(value.type === 'add' ? 201 : 200).json(result)
  }))

  // Item ids are integers. Anything else cannot match a row, so it is a 404
  // here rather than a PostgreSQL type error (a 500) further down.
  const itemId = (request) => {
    const id = Number(request.params.id)
    return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null
  }

  // Body: any of { x, z, rotation, level, placed, lit }. level 1 is upstairs;
  // lit switches a light on or off; placed: false puts the item in storage.
  // Nothing a reader bought is ever thrown away.
  app.patch('/api/room/items/:id', route(async (request, response) => {
    const id = itemId(request)
    const current = id && (await room.getItem(pool, request.readerId, id))
    if (!current) return response.status(404).json({ error: 'Room item not found' })

    const settings = { ...(await room.settings(pool, request.readerId)), items: await room.listItems(pool, request.readerId) }
    const { errors, value } = validateRoomItem(request.body ?? {}, settings, current)
    if (errors.length > 0) return badRequest(response, errors)

    // Something small stands only on another of the reader's things that is
    // in the room.
    if (value.on) {
      const under = await room.getItem(pool, request.readerId, value.on)
      if (!under?.placed) return badRequest(response, ['on must be the id of another item in the room, or null'])
    }

    response.json(await room.updateItem(pool, request.readerId, id, value))
  }))

  // Sell an item back for half what it cost. Its books return to the shelves.
  app.post('/api/room/items/:id/sell', route(async (request, response) => {
    const id = itemId(request)
    const result = id && (await transaction(pool, (db) => room.sell(db, request.readerId, id)))
    if (!result) return response.status(404).json({ error: 'Room item not found' })
    response.json(result)
  }))

  app.use((request, response) => {
    response.status(404).json({ error: 'No such route' })
  })

  // The detail goes in your logs; the visitor gets a plain message. Sending a
  // stack trace to a stranger tells them about your file layout and
  // dependencies.
  app.use((error, request, response, next) => {
    // A body that is not valid JSON is the client's mistake, not the server's.
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'Request body is not valid JSON' })
    }
    if (error.type === 'entity.too.large') {
      return response.status(413).json({ error: 'Request body is too large' })
    }
    console.error(error)
    response.status(500).json({ error: 'Something went wrong on the server' })
  })

  return app
}
