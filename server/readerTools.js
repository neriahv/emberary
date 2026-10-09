import * as settings from './repos/settings.js'
import * as reading from './repos/reading.js'
import * as room from './repos/room.js'
import * as myBooks from './repos/myBooks.js'
import { checkPassword, hashPassword, SESSION_COOKIE, readCookie, tokenHash } from './auth.js'
import { validateSettings, validateSignup, validateRoom, validateRoomItem } from './validation.js'
import { catalogEntry, FINISH_TYPES, wallOf, wallHeight } from './catalog.js'

const positiveId = (value) =>
  /^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= 2147483647 ? Number(value) : null
const nameOf = (body) => (typeof body?.name === 'string' ? body.name.trim() : '')
const validName = (name) => name.length >= 1 && name.length <= 60

export function registerReaderTools(
  app,
  { pool, route, transaction, badRequest, checkEmailDomain, authLimiter }
) {
  const locked = (readerId, work) =>
    transaction(pool, async (db) => {
      await db.query('SELECT id FROM readers WHERE id=$1 FOR UPDATE', [readerId])
      return work(db)
    })
  const missing = (response) => response.status(404).json({ error: 'Not found in your library' })
  app.get(
    '/api/settings',
    route(async (req, res) => res.json(await settings.get(pool, req.readerId)))
  )
  app.patch(
    '/api/settings',
    route(async (req, res) => {
      const result = await locked(req.readerId, async (db) => {
        const checked = validateSettings(await settings.get(db, req.readerId), req.body ?? {})
        return checked.errors.length
          ? checked
          : {
              value: await settings.update(db, req.readerId, checked.value),
              errors: [],
            }
      })
      if (result.errors.length) return badRequest(res, result.errors)
      res.json(result.value)
    })
  )
  // Both sensitive changes require a current password. Serialize with other
  // account writes and invalidate other sessions after a successful change.
  for (const kind of ['password', 'email'])
    app.post(
      `/api/account/${kind}`,
      authLimiter,
      route(async (req, res) => {
        const body = req.body ?? {}
        if (typeof body.currentPassword !== 'string' || body.currentPassword.length > 200)
          return badRequest(res, ['Enter your current password'])
        const result = await locked(req.readerId, async (db) => {
          const {
            rows: [account],
          } = await db.query('SELECT email,password_hash FROM readers WHERE id=$1', [req.readerId])
          if (!(await checkPassword(body.currentPassword, account.password_hash)))
            return { status: 403, error: 'Current password is incorrect' }
          const checked = validateSignup({
            displayName: 'Reader',
            email: kind === 'email' ? body.email : account.email,
            password: kind === 'password' ? body.password : body.currentPassword,
          })
          // Changing an address does not retroactively enforce new password rules.
          const errors =
            kind === 'email' ? checked.errors.filter((e) => e.startsWith('email')) : checked.errors
          if (errors.length) return { status: 400, error: errors.join('; ') }
          if (kind === 'email') {
            if ((await checkEmailDomain(checked.value.email.split('@')[1])) === 'none')
              return {
                status: 400,
                error: 'That email domain does not receive email',
              }
            const taken = await db.query('SELECT id FROM readers WHERE lower(email)=$1 AND id<>$2', [
              checked.value.email,
              req.readerId,
            ])
            if (taken.rowCount) return { status: 409, error: 'That email already has an account' }
            // A concurrent signup can still win the unique index; handled below.
            await db.query('UPDATE readers SET email=$2 WHERE id=$1', [req.readerId, checked.value.email])
          } else {
            if (body.password === body.currentPassword)
              return { status: 400, error: 'Choose a different password' }
            await db.query('UPDATE readers SET password_hash=$2 WHERE id=$1', [
              req.readerId,
              await hashPassword(checked.value.password),
            ])
          }
          await db.query('DELETE FROM sessions WHERE reader_id=$1 AND token_hash<>$2', [
            req.readerId,
            tokenHash(readCookie(req, SESSION_COOKIE)),
          ])
          return {
            ok: true,
            email: kind === 'email' ? checked.value.email : account.email,
          }
        }).catch((error) => {
          if (error.code === '23505') return { status: 409, error: 'That email already has an account' }
          throw error
        })
        if (result.error) return res.status(result.status).json({ error: result.error })
        res.json(result)
      })
    )
  app.get(
    '/api/reading',
    route(async (req, res) => {
      const summary = await locked(req.readerId, async (db) => {
        const rewards = await reading.settleAchievements(db, req.readerId, req.preferences.timezone)
        return {
          ...(await reading.readingSummary(db, req.readerId, req.preferences.timezone)),
          rewards,
        }
      })
      res.json(summary)
    })
  )
  app.get(
    '/api/year-review',
    route(async (req, res) =>
      res.json(await reading.yearReview(pool, req.readerId, req.preferences.timezone))
    )
  )
  app.get(
    '/api/quests',
    route(async (req, res) => res.json(await reading.quests(pool, req.readerId, req.preferences.timezone)))
  )
  app.post(
    '/api/quests/:id/claim',
    route(async (req, res) => {
      const reward = await locked(req.readerId, (db) =>
        reading.claimQuest(db, req.readerId, req.preferences.timezone, req.params.id)
      )
      if (!reward)
        return res.status(409).json({
          error: 'Complete this quest first, or it has already been claimed',
        })
      res.json({ reward })
    })
  )
  app.get(
    '/api/timer',
    route(async (req, res) => res.json(await reading.timer(pool, req.readerId)))
  )
  app.post(
    '/api/timer/start',
    route(async (req, res) =>
      res.json(await locked(req.readerId, (db) => reading.startTimer(db, req.readerId)))
    )
  )
  app.post(
    '/api/timer/stop',
    route(async (req, res) => {
      const result = await locked(req.readerId, (db) =>
        reading.stopTimer(db, req.readerId, req.preferences.timezone)
      )
      if (!result) return res.status(409).json({ error: 'No reading timer is running' })
      res.json(result)
    })
  )
  app.get(
    '/api/my-books/:bookId/notes',
    route(async (req, res) => {
      if (!(await myBooks.get(pool, req.readerId, req.params.bookId))) return missing(res)
      const result = await pool.query(
        'SELECT id,text,page,kind FROM book_notes WHERE reader_id=$1 AND book_id=$2 ORDER BY id DESC',
        [req.readerId, req.params.bookId]
      )
      res.json(result.rows)
    })
  )
  app.post(
    '/api/my-books/:bookId/notes',
    route(async (req, res) => {
      const entry = await myBooks.get(pool, req.readerId, req.params.bookId)
      if (!entry) return missing(res)
      const { text, page = null, kind = 'quote' } = req.body ?? {}
      if (
        typeof text !== 'string' ||
        !text.trim() ||
        text.length > 2000 ||
        !['note', 'quote'].includes(kind) ||
        (page !== null && (!Number.isInteger(page) || page < 1 || page > entry.book.pages))
      )
        return badRequest(res, [
          'Enter text (up to 2000 characters), a note or quote, and an optional valid page',
        ])
      const result = await pool.query(
        'INSERT INTO book_notes(reader_id,book_id,text,page,kind) VALUES($1,$2,$3,$4,$5) RETURNING id,text,page,kind',
        [req.readerId, req.params.bookId, text.trim(), page, kind]
      )
      res.status(201).json(result.rows[0])
    })
  )
  app.delete(
    '/api/my-books/:bookId/notes/:id',
    route(async (req, res) => {
      const result = await pool.query('DELETE FROM book_notes WHERE reader_id=$1 AND book_id=$2 AND id=$3', [
        req.readerId,
        req.params.bookId,
        positiveId(req.params.id),
      ])
      if (!result.rowCount) return missing(res)
      res.status(204).end()
    })
  )
  app.get(
    '/api/lists',
    route(async (req, res) => {
      const result = await pool.query(
        `SELECT l.id,l.name,COALESCE(array_agg(e.book_id ORDER BY e.book_id) FILTER(WHERE e.book_id IS NOT NULL),'{}') AS "bookIds"
   FROM book_lists l LEFT JOIN book_list_entries e ON e.reader_id=l.reader_id AND e.list_id=l.id
   WHERE l.reader_id=$1 GROUP BY l.id ORDER BY l.id`,
        [req.readerId]
      )
      res.json(result.rows)
    })
  )
  app.post(
    '/api/lists',
    route(async (req, res) => {
      const name = nameOf(req.body)
      if (!validName(name)) return badRequest(res, ['List name must be 1 to 60 characters'])
      const result = await pool.query(
        'INSERT INTO book_lists(reader_id,name) VALUES($1,$2) RETURNING id,name',
        [req.readerId, name]
      )
      res.status(201).json({ ...result.rows[0], bookIds: [] })
    })
  )
  app.patch(
    '/api/lists/:id',
    route(async (req, res) => {
      const name = nameOf(req.body)
      if (!validName(name)) return badRequest(res, ['List name must be 1 to 60 characters'])
      const result = await pool.query(
        'UPDATE book_lists SET name=$3 WHERE reader_id=$1 AND id=$2 RETURNING id,name',
        [req.readerId, positiveId(req.params.id), name]
      )
      if (!result.rowCount) return missing(res)
      res.json(result.rows[0])
    })
  )
  app.delete(
    '/api/lists/:id',
    route(async (req, res) => {
      const result = await pool.query('DELETE FROM book_lists WHERE reader_id=$1 AND id=$2', [
        req.readerId,
        positiveId(req.params.id),
      ])
      if (!result.rowCount) return missing(res)
      res.status(204).end()
    })
  )
  for (const method of ['put', 'delete'])
    app[method](
      '/api/lists/:id/books/:bookId',
      route(async (req, res) => {
        const id = positiveId(req.params.id)
        const owns = await pool.query('SELECT 1 FROM book_lists WHERE reader_id=$1 AND id=$2', [
          req.readerId,
          id,
        ])
        if (!owns.rowCount || !(await myBooks.get(pool, req.readerId, req.params.bookId))) return missing(res)
        if (method === 'put')
          await pool.query(
            'INSERT INTO book_list_entries(reader_id,list_id,book_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
            [req.readerId, id, req.params.bookId]
          )
        else
          await pool.query('DELETE FROM book_list_entries WHERE reader_id=$1 AND list_id=$2 AND book_id=$3', [
            req.readerId,
            id,
            req.params.bookId,
          ])
        res.status(204).end()
      })
    )
  app.get(
    '/api/room/snapshots',
    route(async (req, res) => {
      const result = await pool.query('SELECT id,name FROM room_snapshots WHERE reader_id=$1 ORDER BY id', [
        req.readerId,
      ])
      res.json(result.rows)
    })
  )
  app.post(
    '/api/room/snapshots',
    route(async (req, res) => {
      const name = nameOf(req.body)
      if (!validName(name)) return badRequest(res, ['Snapshot name must be 1 to 60 characters'])
      const result = await locked(req.readerId, async (db) => {
        const current = await room.get(db, req.readerId)
        // Explicit allowlist excludes blocks, size, unlocks and currency.
        const colors = ['wallColor', 'floorColor', 'shelfColor', 'upperFloorColor']
        const finishes = [...FINISH_TYPES, 'upperFloor']
        const layout = {
          settings: Object.fromEntries([...colors, ...finishes].map((k) => [k, current[k]])),
          items: current.items,
          books: (await myBooks.list(db, req.readerId)).map((e) => ({
            bookId: e.bookId,
            shelfSpot: e.shelfSpot,
            shelfPosition: e.shelfPosition,
          })),
        }
        return db.query(
          'INSERT INTO room_snapshots(reader_id,name,layout) VALUES($1,$2,$3) RETURNING id,name',
          [req.readerId, name, layout]
        )
      })
      res.status(201).json(result.rows[0])
    })
  )
  app.delete(
    '/api/room/snapshots/:id',
    route(async (req, res) => {
      const result = await pool.query('DELETE FROM room_snapshots WHERE reader_id=$1 AND id=$2', [
        req.readerId,
        positiveId(req.params.id),
      ])
      if (!result.rowCount) return missing(res)
      res.status(204).end()
    })
  )
  app.post(
    '/api/room/snapshots/:id/restore',
    route(async (req, res) => {
      const result = await locked(req.readerId, async (db) => {
        const saved = await db.query('SELECT layout FROM room_snapshots WHERE reader_id=$1 AND id=$2', [
          req.readerId,
          positiveId(req.params.id),
        ])
        if (!saved.rowCount) return null
        const current = await room.get(db, req.readerId)
        const { layout } = saved.rows[0]
        const checked = validateRoom(layout.settings)
        const allowed = Object.fromEntries(
          Object.entries(checked.value).filter(([key, value]) => {
            const entry = catalogEntry(value)
            return !entry || entry.price === 0 || current.unlocks.includes(value)
          })
        )
        // Structural finishes (loft/roof) are deliberately not restored.
        delete allowed.loft
        delete allowed.roof
        await room.update(db, req.readerId, allowed)
        const live = new Map(current.items.map((i) => [i.id, i]))
        const skipped = []
        const savedIds = new Set(layout.items.map((item) => item.id))
        for (const owned of current.items)
          if (!savedIds.has(owned.id))
            await room.updateItem(db, req.readerId, owned.id, {
              placed: false,
              on: null,
            })
        for (const item of layout.items) {
          const owned = live.get(item.id)
          if (!owned) {
            skipped.push(item.id)
            continue
          }
          const patch = Object.fromEntries(
            ['x', 'z', 'rotation', 'placed', 'level', 'lit', 'y', 'size', 'sx', 'sy', 'color', 'on']
              .filter(
                (k) => item[k] !== undefined && (!['sx', 'sy'].includes(k) || item.sx !== 1 || item.sy !== 1)
              )
              .map((k) => [k, item[k]])
          )
          if (patch.on && !live.has(patch.on)) {
            patch.on = null
            patch.y = 0
          }
          if (patch.on && !layout.items.find((item) => item.id === patch.on)?.placed) {
            patch.on = null
            patch.y = 0
            patch.placed = false
          }
          if (patch.placed && catalogEntry(owned.kind)?.wall) {
            const edge = wallOf({ ...owned, ...patch })
            if (wallHeight(current, edge.side, edge.i, edge.j) === 0) {
              await room.updateItem(db, req.readerId, item.id, { placed: false, on: null })
              skipped.push(item.id)
              continue
            }
          }
          const checked = validateRoomItem(patch, current, owned)
          if (checked.errors.length) {
            await room.updateItem(db, req.readerId, item.id, {
              placed: false,
              on: null,
            })
            skipped.push(item.id)
          } else await room.updateItem(db, req.readerId, item.id, checked.value)
        }
        const restoredItems = await room.listItems(db, req.readerId)
        for (const item of restoredItems)
          if (item.on && !restoredItems.find((parent) => parent.id === item.on)?.placed) {
            await room.updateItem(db, req.readerId, item.id, { placed: false, on: null, y: 0 })
            if (!skipped.includes(item.id)) skipped.push(item.id)
          }
        for (const book of layout.books ?? []) {
          if (book.shelfSpot?.bookcase !== 'main' && !live.has(Number(book.shelfSpot?.bookcase)))
            book.shelfSpot = null
          await myBooks.update(db, req.readerId, book.bookId, {
            shelfSpot: book.shelfSpot ?? null,
            shelfPosition: book.shelfPosition ?? null,
          })
        }
        return { room: await room.get(db, req.readerId), skipped }
      })
      if (!result) return missing(res)
      res.json(result)
    })
  )
}
