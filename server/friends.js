import * as friends from './repos/friends.js'
import * as room from './repos/room.js'
import * as myBooks from './repos/myBooks.js'
import { rateLimit } from 'express-rate-limit'

const readerSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'Too many searches. Wait a moment',
  },
})

// Match the positive integer validation used by readerTools.js.
const positiveId = (value) =>
  /^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= 2147483647
    ? Number(value)
    : null

const pickFields = (source, keys) =>
  Object.fromEntries(keys.filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]))

const ROOM_FIELDS = [
  'wallColor', 'floorColor', 'shelfColor',
  'wallpaper', 'floor', 'wallShape', 'roof',
  'loft', 'upperFloor', 'upperFloorColor', 'blocks',
]

const ITEM_FIELDS = [
  'id', 'kind', 'x', 'z', 'rotation', 'placed',
  'level', 'lit', 'y', 'size', 'color',
  'sx', 'sy', 'on',
]

const BOOK_FIELDS = [
  'id', 'title', 'author', 'genre', 'pages',
  'year', 'color', 'description', 'coverUrl',
]

const ENTRY_FIELDS = [
  'bookId', 'status', 'currentPage', 'rating',
  'review', 'shelfPosition', 'shelfSpot',
]

const notFound = (res) =>
  res.status(404).json({ error: 'Not found' })

// Match LibraryScene's shelfOrder eligibility.
// Books with these statuses belong in the Library Room,
// even without a saved shelf position or spot.
const SHELVED_STATUSES = [
  'currently-reading',
  'read',
  'did-not-finish',
]

const onShelf = (entry) =>
  SHELVED_STATUSES.includes(entry.status)

// Shared authorization for all visiting endpoints.
async function canVisit(pool, visitorId, ownerId) {
  return ownerId !== null &&
    await friends.areFriends(pool, visitorId, ownerId)
}

export function registerFriends(app, { pool, route, badRequest }) {
  // ------------------------------------------------------------ search

    app.get(
    '/api/readers/search',
    readerSearchLimiter,
    route(async (req, res) => {
      const query = typeof req.query.q === 'string'
        ? req.query.q.trim()
        : ''

      if (query.length < 2 || query.length > 100) {
        return badRequest(res, ['Search must be 2 to 100 characters'])
      }

      res.json(await friends.search(pool, req.readerId, query))
    })
  )

  // ------------------------------------------------------------ friend lists

  app.get(
    '/api/friends',
    route(async (req, res) => {
      res.json(await friends.list(pool, req.readerId))
    })
  )

  // ------------------------------------------------------------ send request

  app.post(
    '/api/friends/:id',
    route(async (req, res) => {
      const otherId = positiveId(req.params.id)
      if (!otherId) return notFound(res)

      const result = await friends.request(
        pool,
        req.readerId,
        otherId
      )

      if (result.error === 'self') {
        return badRequest(res, ['You cannot add yourself as a friend'])
      }

      if (result.error === 'missing') {
        return notFound(res)
      }

      if (result.error === 'exists') {
        return res.status(409).json({
          error: 'A friend request or friendship already exists',
        })
      }

      res.status(201).json(result)
    })
  )

  // ------------------------------------------------------------ accept request

  app.post(
    '/api/friends/:id/accept',
    route(async (req, res) => {
      const otherId = positiveId(req.params.id)
      if (!otherId) return notFound(res)

      const accepted = await friends.accept(
        pool,
        req.readerId,
        otherId
      )

      if (!accepted) return notFound(res)

      res.json({ ok: true })
    })
  )

  // ------------------------------------------------------------ remove friendship

  app.delete(
    '/api/friends/:id',
    route(async (req, res) => {
      const otherId = positiveId(req.params.id)
      if (!otherId) return notFound(res)

      const removed = await friends.remove(
        pool,
        req.readerId,
        otherId
      )

      if (!removed) return notFound(res)

      res.status(204).end()
    })
  )

  // ------------------------------------------------------------ visit library

  app.get(
    '/api/friends/:id/library',
    route(async (req, res) => {
      const ownerId = positiveId(req.params.id)

      // Check access before reading room or book information.
      if (!(await canVisit(pool, req.readerId, ownerId))) {
        return notFound(res)
      }

      const readerResult = await pool.query(
        `SELECT
           display_name AS "displayName",
           avatar
         FROM readers
         WHERE id = $1`,
        [ownerId]
      )

      const reader = readerResult.rows[0]
      if (!reader) return notFound(res)

      const ownerRoom = await room.get(pool, ownerId)
      const entries = await myBooks.list(pool, ownerId)

      // Share the room's design, but never the storage inventory,
      // currency balance, unlock ownership, or personal settings.
      const visibleRoom = {
        ...pickFields(ownerRoom, ROOM_FIELDS),
        items: ownerRoom.items
          .filter((item) => item.placed)
          .map((item) => pickFields(item, ITEM_FIELDS)),
      }

      const visibleBooks = entries
        .filter(onShelf)
        .map((entry) => ({
          ...pickFields(entry, ENTRY_FIELDS),
          book: pickFields(entry.book, BOOK_FIELDS),
        }))

      res.json({
        reader: pickFields(reader, ['displayName', 'avatar']),
        room: visibleRoom,
        books: visibleBooks,
      })
    })
  )

  // ------------------------------------------------------------ read friend's notes

  app.get(
    '/api/friends/:id/books/:bookId/notes',
    route(async (req, res) => {
      const ownerId = positiveId(req.params.id)
      if (!(await canVisit(pool, req.readerId, ownerId))) {
        return notFound(res)
      }

      const bookId = req.params.bookId

      // Check both ownership and placement on a visible shelf.
      const entry = await myBooks.get(pool, ownerId, bookId)
      if (!entry || !onShelf(entry)) {
        return notFound(res)
      }

      const result = await pool.query(
        `SELECT id, text, page, kind
         FROM book_notes
         WHERE reader_id = $1
           AND book_id = $2
         ORDER BY id DESC`,
        [ownerId, bookId]
      )

      res.json(result.rows)
    })
  )
}