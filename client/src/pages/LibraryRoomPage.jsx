import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  listMyBooks,
  getRoom,
  updateMyBook,
  blockPrice,
  blockRefund,
  blocksValue,
  catalogEntry,
  changeRoomBlocks,
  fixturesOf,
  BLOCKS,
  USING_MOCK_API,
} from '../api'
import { useAsync } from '../hooks/useAsync.js'
import { useEmber } from '../hooks/useEmber.js'
import { useRoomSaver } from '../hooks/useRoomSaver.js'
import AsyncState from '../components/AsyncState.jsx'
import { EmberCoin } from '../components/EmberBadge.jsx'
import LibraryScene, { bookcasesIn, layoutBookcases, shelfOrder, tablesIn } from '../components/room/LibraryScene.jsx'
import RoomCustomizer from '../components/room/RoomCustomizer.jsx'
import BookModal from '../components/room/BookModal.jsx'
import BookFinder from '../components/room/BookFinder.jsx'

// How long a book takes to slide off the shelf before it opens.
const PULL_MS = 420

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The library grows a title as the reader builds it: everything they have put
// into it, in Ember (its blocks, finishes and furniture), counts towards the
// next. Furniture sold no longer counts.
const LEVELS = [
  { at: 0, name: 'Reading Nook' },
  { at: 30, name: 'Cozy Study' },
  { at: 80, name: 'Reading Room' },
  { at: 160, name: 'Book Lover’s Loft' },
  { at: 280, name: 'Grand Library' },
  { at: 450, name: 'Dream Library' },
]

export function libraryLevel(room) {
  const spent =
    blocksValue(room) +
    [...room.items.map((i) => i.kind), ...room.unlocks]
      .map((id) => catalogEntry(id)?.price ?? 0)
      .reduce((sum, price) => sum + price, 0)
  const index = LEVELS.findLastIndex((level) => spent >= level.at)
  const next = LEVELS[index + 1]
  const from = LEVELS[index].at
  return {
    number: index + 1,
    name: LEVELS[index].name,
    spent,
    next,
    progress: next ? (spent - from) / (next.at - from) : 1,
  }
}

// The time of day is how the reader likes to look at the room, not part of
// it, so it stays in this browser. Storage can be unavailable (a private
// window); the room is then simply in daylight.
const TIMES = [
  { id: 'day', label: '☀ Day' },
  { id: 'dusk', label: '◐ Dusk' },
  { id: 'night', label: '☾ Night' },
]
const TIME_KEY = 'emberary:room-time'
const WELCOME_KEY = 'emberary:room-welcome-seen'

function remembered(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
function remember(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not remembered; it still applies for this visit.
  }
}

// Emberary's 3D room, filling the window below the site's navigation bar, with
// a game-style overlay: the library's level, find a book, the reader's Ember,
// the time of day, and a Build button that opens the builder and shop and
// turns the room into a place to rearrange. This page is loaded lazily (see
// App.jsx) because three.js is most of the app's JavaScript and no other
// screen needs it.
export default function LibraryRoomPage() {
  const books = useAsync(listMyBooks)
  const room = useAsync(getRoom)
  const saver = useRoomSaver()
  const wallet = useEmber()

  const [editing, setEditing] = useState(false)
  const [drawerTab, setDrawerTab] = useState('build')
  const [selectedItemId, setSelectedItemId] = useState(null)
  // The book off the shelf, and whether it has opened yet.
  const [pulledId, setPulledId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [moveError, setMoveError] = useState(null)
  // Bumped by the Re-centre button to put the view back where it started.
  const [viewReset, setViewReset] = useState(0)
  const [time, setTime] = useState(() => remembered(TIME_KEY, 'day'))
  const [welcome, setWelcome] = useState(() => remembered(WELCOME_KEY, '') !== 'yes')
  // Building with room blocks: { action: 'add' | 'move' | 'remove', kind,
  // from?, at? }, or null. While it is set, the room shows the reader's
  // choices and the edit panel steps aside.
  const [blockMode, setBlockMode] = useState(null)
  const [blockError, setBlockError] = useState(null)
  const [blockBusy, setBlockBusy] = useState(false)
  const openTimer = useRef(null)
  const [params, setParams] = useSearchParams()

  const entries = books.data ?? []
  const shelved = shelfOrder(entries)
  const openEntry = entries.find((e) => e.bookId === openId)

  // The room fills the window, so the page underneath must not scroll.
  useEffect(() => {
    document.body.classList.add('room-open')
    return () => {
      document.body.classList.remove('room-open')
      document.body.style.cursor = ''
      clearTimeout(openTimer.current)
    }
  }, [])

  // Click a book: it slides out, then opens.
  function pickBook(bookId) {
    if (!bookId || pulledId) return
    setPulledId(bookId)
    openTimer.current = setTimeout(() => setOpenId(bookId), reducedMotion() ? 0 : PULL_MS)
  }

  // The book has closed: put it back on the shelf.
  function bookClosed() {
    setOpenId(null)
    setPulledId(null)
  }

  function handleSaved(saved) {
    books.setData((rows) => rows.map((row) => (row.bookId === saved.bookId ? saved : row)))
  }

  function handleRemoved(bookId) {
    books.setData((rows) => rows.filter((row) => row.bookId !== bookId))
    bookClosed()
  }

  // A book carried to a new spot in Edit room. It moves at once, and goes
  // back if the save fails.
  async function moveBook(bookId, shelfSpot) {
    const previous = entries
    books.setData((rows) => rows.map((row) => (row.bookId === bookId ? { ...row, shelfSpot } : row)))
    setMoveError(null)
    try {
      await updateMyBook(bookId, { shelfSpot })
    } catch (error) {
      books.setData(previous)
      setMoveError(error)
    }
  }

  // Without its loft, whatever stood up there comes down, here as on the
  // server.
  const changeRoom = (patch) => {
    room.setData((prev) => {
      const next = { ...prev, ...patch }
      if (patch.loft !== 'loft-none') return next
      return { ...next, items: next.items.map((item) => ({ ...item, level: 0 })) }
    })
    saver.queue('room', patch)
  }
  // A built-in piece moved or turned: saved with the room's settings.
  const changeFixture = (id, patch) => {
    room.setData((prev) => {
      const fixtures = fixturesOf(prev)
      const next = { ...fixtures, [id]: { ...fixtures[id], ...patch } }
      saver.queue('room', { fixtures: next })
      return { ...prev, fixtures: next }
    })
  }

  function startBlocks(mode) {
    setBlockError(null)
    setSelectedItemId(null)
    setBlockMode(mode)
  }

  // Send a change to the room's blocks. The server sends the whole room back,
  // furniture and all, since a change can move things that stood on a block.
  async function sendBlocks(change) {
    setBlockMode(null)
    setBlockBusy(true)
    try {
      const result = await changeRoomBlocks(change)
      room.setData(result.room)
    } catch (error) {
      setBlockError(error)
    } finally {
      setBlockBusy(false)
    }
  }

  // A spot chosen in the room. Adding puts the block there at once; moving
  // first picks the block up, then puts it down; taking away asks first.
  function blockSpot(spot) {
    const { action, kind, from } = blockMode
    if (action === 'add') sendBlocks({ type: 'add', kind, at: spot })
    else if (action === 'move' && !from) setBlockMode({ ...blockMode, from: spot })
    else if (action === 'move') sendBlocks({ type: 'move', kind, from, to: spot })
    else setBlockMode({ ...blockMode, at: spot })
  }

  // Escape stops building; nothing is paid for until a block is put down.
  useEffect(() => {
    if (!blockMode) return
    const cancel = (event) => event.key === 'Escape' && setBlockMode(null)
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [blockMode])

  // An item sold: it leaves the room, and any books on it go back to the
  // shelves.
  const itemSold = (id) => {
    room.setData((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }))
    books.setData((rows) =>
      rows.map((row) => (row.shelfSpot?.bookcase === String(id) ? { ...row, shelfSpot: null } : row))
    )
  }
  const changeItem = (id, patch) => {
    room.setData((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
    saver.queue(id, patch)
  }
  const changeItems = (update) => room.setData((prev) => ({ ...prev, items: update(prev.items) }))
  const unlock = (ids) => room.setData((prev) => ({ ...prev, unlocks: [...prev.unlocks, ...ids] }))
  const toggleLight = (item) => changeItem(item.id, { lit: item.lit === false })

  // "Spend it in the shop" in the wallet arrives here with ?shop=1.
  useEffect(() => {
    if (params.get('shop') !== '1' || room.status !== 'ready') return
    openDrawer('shop')
    setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, room.status])

  function openDrawer(tab) {
    setDrawerTab(tab)
    setEditing(true)
    dismissWelcome()
  }

  function toggleEditing() {
    if (editing) {
      saver.flush()
      setSelectedItemId(null)
      setBlockMode(null)
    }
    setEditing(!editing)
  }

  function cycleTime() {
    const next = TIMES[(TIMES.findIndex((t) => t.id === time) + 1) % TIMES.length].id
    setTime(next)
    remember(TIME_KEY, next)
  }

  function dismissWelcome() {
    setWelcome(false)
    remember(WELCOME_KEY, 'yes')
  }

  const ready = books.status === 'ready' && room.status === 'ready'
  const loading = books.status !== 'ready' ? books : room
  const onShelves = openEntry && shelved.some((e) => e.bookId === openEntry.bookId)
  // Books that do not fit on any bookcase; the answer is another bookcase.
  const overflow = ready ? layoutBookcases(entries, bookcasesIn(room.data), tablesIn(room.data)).overflow : 0
  const level = ready ? libraryLevel(room.data) : null
  const timeLabel = TIMES.find((t) => t.id === time)?.label ?? TIMES[0].label

  return (
    <div className={`room-screen time-${time}${editing ? ' is-editing' : ''}`}>
      <h1 className="visually-hidden">Library Room: build your dream library</h1>

      {ready ? (
        <div className="room-canvas">
          <LibraryScene
            entries={entries}
            room={room.data}
            time={time}
            selectedBookId={pulledId}
            onSelectBook={pickBook}
            editing={editing}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onItemChange={changeItem}
            onToggleLight={toggleLight}
            onMoveBook={moveBook}
            viewReset={viewReset}
            blockMode={blockMode}
            onBlockSpot={blockSpot}
            onFixtureChange={changeFixture}
          />
        </div>
      ) : (
        <div className="room-loading">
          <AsyncState {...loading} label="Building your room" />
        </div>
      )}

      {/* the overlay, like a game's HUD */}
      <div className="hud hud-top">
        <div className="hud-dream">
          <span className="hud-title">Build your dream library</span>
          {level && (
            <button
              type="button"
              className="hud-level"
              onClick={() => openDrawer('build')}
              title={level.next ? `${level.spent} of ${level.next.at} Ember built towards ${level.next.name}` : 'Your library is complete. Keep decorating!'}
            >
              <span className="hud-level-badge">Lv {level.number}</span>
              <span className="hud-level-name">{level.name}</span>
              <span className="hud-level-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
              </span>
              <span className="visually-hidden">
                {level.next ? `${level.spent} of ${level.next.at} Ember towards ${level.next.name}. Open the builder` : 'Open the builder'}
              </span>
            </button>
          )}
        </div>
        {USING_MOCK_API && <span className="hud-chip">Demo mode</span>}
        <span className="hud-spacer" />
        {wallet.data && (
          <button type="button" className="hud-button hud-ember" onClick={() => openDrawer('shop')}>
            <EmberCoin size="sm" /> {wallet.data.balance}
            <span className="visually-hidden"> Ember. Open the shop</span>
          </button>
        )}
        {ready && (
          <button type="button" className="hud-button" onClick={cycleTime} aria-label={`Time of day: ${time}. Change it`}>
            {timeLabel}
          </button>
        )}
        {ready && (
          <button type="button" className="hud-button" onClick={() => setViewReset((n) => n + 1)}>
            ⟲ Re-centre
          </button>
        )}
        {ready && (
          <button
            type="button"
            className="hud-button hud-edit"
            aria-pressed={editing}
            onClick={toggleEditing}
          >
            {editing ? '✓ Done' : '✎ Build & decorate'}
          </button>
        )}
      </div>

      {ready && welcome && !editing && (
        <section className="room-welcome" aria-labelledby="welcome-heading">
          <h2 id="welcome-heading">Build your dream library</h2>
          <ol>
            <li>
              <strong>Build</strong> the room a block at a time: a wider or deeper floor, taller walls, a loft. Hang
              windows where you like, and pick a roof and a wall shape.
            </li>
            <li>
              <strong>Furnish</strong> it: bookcases, tables, seats, all kinds of lights, plants, stairs and more. Sell
              anything back for half what it cost.
            </li>
            <li>
              <strong>Play</strong>: click a lamp to switch it, lay a book on a table, spin the globe, and try it at night.
            </li>
          </ol>
          <p className="muted">Every book you finish earns Ember to build with.</p>
          <div className="detail-actions">
            <button type="button" onClick={() => openDrawer('build')}>
              Start building
            </button>
            <button type="button" className="button-quiet" onClick={dismissWelcome}>
              Just look around
            </button>
          </div>
        </section>
      )}

      {ready && !editing && (
        <div className="hud hud-bottom">
          {overflow > 0 && (
            <p className="hud-notice">
              {overflow} {overflow === 1 ? 'book does' : 'books do'} not fit on your shelves.{' '}
              <button type="button" className="button-link" onClick={() => openDrawer('shop')}>
                Buy another bookcase
              </button>
            </p>
          )}
          {saver.status === 'error' && (
            <p className="hud-notice" role="alert">
              Could not save the room: {saver.error.message}
            </p>
          )}
          {shelved.length > 0 ? (
            <>
              {/* The canvas cannot be used with a keyboard or a screen reader,
                  so every book in it can also be found and opened here. */}
              <BookFinder entries={shelved} onPick={pickBook} />
              <span className="hud-hint">
                Click a book to open it · click a lamp to switch it · drag to turn · right-drag to move · scroll to zoom
              </span>
            </>
          ) : (
            <p className="hud-hint">
              Your shelves are empty. Books appear here once you start reading them.{' '}
              <Link to="/my-books">Go to My Books</Link>.
            </p>
          )}
        </div>
      )}

      {ready && blockMode && (
        <div className="hud hud-place" role="status">
          <p className="place-banner">
            <BlockBanner mode={blockMode} />
          </p>
          {blockMode.at ? (
            <>
              <button
                type="button"
                className="hud-button hud-remove"
                onClick={() => sendBlocks({ type: 'remove', kind: blockMode.kind, at: blockMode.at })}
              >
                Take it away
              </button>
              <button type="button" className="hud-button" onClick={() => setBlockMode({ ...blockMode, at: undefined })}>
                Pick another
              </button>
            </>
          ) : (
            blockMode.action === 'move' &&
            blockMode.from && (
              <button type="button" className="hud-button" onClick={() => setBlockMode({ ...blockMode, from: undefined })}>
                Pick another
              </button>
            )
          )}
          <button type="button" className="hud-button" onClick={() => setBlockMode(null)}>
            Done (Esc)
          </button>
        </div>
      )}

      {ready && editing && !blockMode && (
        <div className="hud hud-bottom">
          <p className="hud-hint">
            Drag a book onto any shelf or table · drag furniture across the floor · right-drag to move the view
          </p>
          {blockBusy && <p className="hud-notice">Building...</p>}
          {blockError && (
            <p className="hud-notice" role="alert">
              Could not change the room: {blockError.message}
            </p>
          )}
          {moveError && (
            <p className="hud-notice" role="alert">
              Could not move the book: {moveError.message}
            </p>
          )}
        </div>
      )}

      {ready && editing && !blockMode && (
        <aside className="edit-drawer">
          <RoomCustomizer
            room={room.data}
            wallet={wallet}
            saver={saver}
            tab={drawerTab}
            onTab={setDrawerTab}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onRoomChange={changeRoom}
            onItemChange={changeItem}
            onItemsChange={changeItems}
            onItemSold={itemSold}
            onUnlock={unlock}
            onBlockMode={startBlocks}
            onFixtureChange={changeFixture}
          />
        </aside>
      )}

      {openEntry && (
        <BookModal
          entry={openEntry}
          onShelves={onShelves}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          onClosed={bookClosed}
        />
      )}
    </div>
  )
}

// What the reader is asked while building with blocks.
function BlockBanner({ mode }) {
  const { action, kind, from, at } = mode
  const name = `${kind} block`
  if (action === 'add') {
    return (
      <>
        <strong>Choose where your {name} goes.</strong>{' '}
        {kind === 'floor'
          ? 'Point at a square beside the floor'
          : `Point at an edge of the floor (walls stack up to ${BLOCKS.maxLevels} high)`}{' '}
        and click: that is when its {blockPrice(kind)} Ember is paid. Drag to turn the view.
      </>
    )
  }
  if (action === 'move') {
    return from ? (
      <>
        <strong>Now choose where it goes.</strong> {kind === 'floor' ? 'Furniture on it moves with it.' : 'Windows on it move with it.'}
      </>
    ) : (
      <>
        <strong>Pick the {kind === 'floor' ? name : 'wall'} to move.</strong> Only ones the room can do without are
        lit up.
      </>
    )
  }
  return at ? (
    <>
      <strong>Take this {name} away?</strong> You get {blockRefund(kind)} Ember back.{' '}
      {kind === 'wall' && 'Windows that no longer fit go into storage.'}
    </>
  ) : (
    <>
      <strong>Pick the {name} to take away.</strong> {kind === 'wall' ? 'The top block of a wall comes off.' : 'The floor has to stay in one piece.'}
    </>
  )
}
