import express from 'express'
import cors from 'cors'
import * as books from './repos/books.js'
import * as myBooks from './repos/myBooks.js'
import * as insights from './repos/insights.js'
import * as profile from './repos/profile.js'
import * as room from './repos/room.js'
import {
  MAX_ROOM_ITEMS,
  validateStatus,
  validateEntryPatch,
  validateProfile,
  validateRoom,
  validateRoomItem,
  validateShelfOrder,
} from './validation.js'

// Every reader-owned row carries a reader id, but until accounts exist the API
// always acts as reader 1, whom schema.sql creates. When login arrives, this
// becomes request.user.id and nothing below needs to change shape.
const READER_ID = 1

// Express 4 does not pass a rejected promise to the error handler by itself.
// Without this, a failed query leaves the request hanging until it times out.
const route = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response)).catch(next)

const badRequest = (response, errors) => response.status(400).json({ error: errors.join('; ') })

// Build the app without starting it, so the tests can run it on a spare port.
export function createApp(pool, { corsOrigins = ['http://localhost:5173'] } = {}) {
  const app = express()

  // CORS before the routes. Middleware registered after a route never sees
  // that route's requests.
  //
  // Name your origins. app.use(cors()) with no options sends
  // Access-Control-Allow-Origin: *, which lets any site on the internet call
  // this API from a visitor's browser.
  app.use(cors({ origin: corsOrigins }))
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

  // ------------------------------------------------------------ catalogue

  // GET /api/books?q=austen&genre=Romance
  app.get('/api/books', route(async (request, response) => {
    const query = typeof request.query.q === 'string' ? request.query.q : ''
    const genre = typeof request.query.genre === 'string' ? request.query.genre : ''
    response.json(await books.search(pool, { query, genre }))
  }))

  app.get('/api/books/:id', route(async (request, response) => {
    const book = await books.getById(pool, request.params.id)
    if (!book) return response.status(404).json({ error: 'Book not found' })
    response.json(book)
  }))

  // ------------------------------------------------------------ my books

  app.get('/api/my-books', route(async (request, response) => {
    response.json(await myBooks.list(pool, READER_ID))
  }))

  app.get('/api/my-books/:bookId', route(async (request, response) => {
    const entry = await myBooks.get(pool, READER_ID, request.params.bookId)
    if (!entry) return response.status(404).json({ error: 'That book is not in your collection' })
    response.json(entry)
  }))

  // Body: { bookId, status }. status defaults to want-to-read, as in the mock.
  app.post('/api/my-books', route(async (request, response) => {
    const { bookId, status = 'want-to-read' } = request.body ?? {}
    if (typeof bookId !== 'string' || !bookId) return badRequest(response, ['bookId is required'])
    const errors = validateStatus(status)
    if (errors.length > 0) return badRequest(response, errors)

    const book = await books.getById(pool, bookId)
    if (!book) return response.status(404).json({ error: 'Book not found' })

    const entry = await myBooks.add(pool, READER_ID, bookId, status)
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
    await myBooks.reorder(pool, READER_ID, value)
    response.status(204).end()
  }))

  // Body: any of { status, currentPage, rating, review, shelfPosition }.
  app.patch('/api/my-books/:bookId', route(async (request, response) => {
    const existing = await myBooks.get(pool, READER_ID, request.params.bookId)
    if (!existing) return response.status(404).json({ error: 'That book is not in your collection' })

    const { errors, value } = validateEntryPatch(request.body ?? {}, existing.book.pages)
    if (errors.length > 0) return badRequest(response, errors)

    response.json(await myBooks.update(pool, READER_ID, request.params.bookId, value))
  }))

  app.delete('/api/my-books/:bookId', route(async (request, response) => {
    const removed = await myBooks.remove(pool, READER_ID, request.params.bookId)
    if (!removed) return response.status(404).json({ error: 'That book is not in your collection' })
    response.status(204).end()
  }))

  // ------------------------------------------------------------ insights

  app.get('/api/stats', route(async (request, response) => {
    response.json(await insights.readingStats(pool, READER_ID))
  }))

  // GET /api/recommendations?limit=4. The limit is clamped rather than
  // rejected: asking for 500 gets you 20, not an error.
  app.get('/api/recommendations', route(async (request, response) => {
    const asked = Number.parseInt(request.query.limit, 10)
    const limit = Number.isInteger(asked) ? Math.min(Math.max(asked, 1), 20) : 4
    response.json(await insights.recommendations(pool, READER_ID, limit))
  }))

  // ------------------------------------------------------------ profile

  app.get('/api/profile', route(async (request, response) => {
    const current = await profile.get(pool, READER_ID)
    if (!current) return response.status(404).json({ error: 'Profile not found' })
    response.json(current)
  }))

  // Body: any of { displayName, bio, yearlyGoal }.
  app.patch('/api/profile', route(async (request, response) => {
    const current = await profile.get(pool, READER_ID)
    if (!current) return response.status(404).json({ error: 'Profile not found' })

    const { errors, value } = validateProfile(current, request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)

    response.json(await profile.update(pool, READER_ID, value))
  }))

  // ------------------------------------------------------------ library room

  // The room's colours and the items standing in it. The books on its shelves
  // are GET /api/my-books, whose status picks the shelf and shelfPosition the
  // place along it.
  app.get('/api/room', route(async (request, response) => {
    response.json(await room.get(pool, READER_ID))
  }))

  // Body: any of { wallColor, floorColor, shelfColor }.
  app.patch('/api/room', route(async (request, response) => {
    const { errors, value } = validateRoom(request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)
    response.json(await room.update(pool, READER_ID, value))
  }))

  // Body: { kind, x?, z?, rotation? }.
  app.post('/api/room/items', route(async (request, response) => {
    const { errors, value } = validateRoomItem(request.body ?? {}, { creating: true })
    if (errors.length > 0) return badRequest(response, errors)

    const item = await room.addItem(pool, READER_ID, value, MAX_ROOM_ITEMS)
    if (!item) {
      return response.status(409).json({ error: `The room already holds ${MAX_ROOM_ITEMS} items` })
    }
    response.status(201).json(item)
  }))

  // Item ids are integers. Anything else cannot match a row, so it is a 404
  // here rather than a PostgreSQL type error (a 500) further down.
  const itemId = (request) => {
    const id = Number(request.params.id)
    return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null
  }

  // Body: any of { x, z, rotation }.
  app.patch('/api/room/items/:id', route(async (request, response) => {
    const id = itemId(request)
    if (!id) return response.status(404).json({ error: 'Room item not found' })

    const { errors, value } = validateRoomItem(request.body ?? {})
    if (errors.length > 0) return badRequest(response, errors)

    const item = await room.updateItem(pool, READER_ID, id, value)
    if (!item) return response.status(404).json({ error: 'Room item not found' })
    response.json(item)
  }))

  app.delete('/api/room/items/:id', route(async (request, response) => {
    const id = itemId(request)
    const removed = id && (await room.removeItem(pool, READER_ID, id))
    if (!removed) return response.status(404).json({ error: 'Room item not found' })
    response.status(204).end()
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
