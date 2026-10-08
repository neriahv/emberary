import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  listMyBooks,
  getRoom,
  updateMyBook,
  updateRoomItem,
  sellRoomItem,
  sellPrice,
  blockPrice,
  blockRefund,
  blocksValue,
  catalogEntry,
  changeRoomBlocks,
  checkout,
  clearanceOf,
  hasUpstairs,
  roomExtent,
  upperCells,
  nearestSpot,
  resizable,
  onWallAt,
  wallHeight,
  walls,
  BLOCKS,
  USING_MOCK_API,
} from '../api'
import { useAsync } from '../hooks/useAsync.js'
import { useEmber } from '../hooks/useEmber.js'
import { useRoomSaver } from '../hooks/useRoomSaver.js'
import AsyncState from '../components/AsyncState.jsx'
import { EmberCoin } from '../components/EmberBadge.jsx'
import LibraryScene, { bookcasesIn, layoutBookcases, shelfOrder, tablesIn } from '../components/room/LibraryScene.jsx'
import { BuildShelf, ShopShelf, StoragePanel, itemNames } from '../components/room/RoomCustomizer.jsx'
import { CatalogBar, ROOM_CATALOGS, catalogOf } from '../components/room/catalogs.jsx'
import { MODELS } from '../components/room/models.jsx'
import { alongOf, fitWindow, wallOf } from '../components/room/windows.jsx'
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
  { id: 'day', icon: '☀', label: 'Day' },
  { id: 'dusk', icon: '◐', label: 'Dusk' },
  { id: 'night', icon: '☾', label: 'Night' },
]
const TIME_KEY = 'emberary:room-time'
const WELCOME_KEY = 'emberary:room-welcome-seen'

// The room's three ways of working, besides looking around.
const MODES = [
  { id: 'shop', icon: '🛒', label: 'Shop' },
  { id: 'build', icon: '🔨', label: 'Build' },
  { id: 'storage', icon: '📦', label: 'Storage' },
]

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

// What an undo puts back.
const UNDOABLE = { x: 0, z: 0, y: 0, rotation: 0, level: 0, on: null, placed: true, color: null, sx: 1, sy: 1 }
const pick = (item) =>
  Object.fromEntries(
    Object.entries(UNDOABLE)
      // Only bookcases and windows have a size of their own.
      .filter(([key]) => (key !== 'sx' && key !== 'sy') || resizable(item.kind))
      .map(([key, usual]) => [key, item[key] ?? usual])
  )
const round2 = (n) => Math.round(n * 100) / 100

// Where something coming out of storage goes in the room: a window back on a
// wall (its own, if that still stands), something for a wall on the nearest
// one, anything else as near its last spot as there is floor. null when there
// is nowhere for it.
function placingSpot(room, item, level = 0) {
  const def = MODELS[item.kind]
  if (def?.window || def?.wall) {
    const own = wallOf(item)
    const edge = wallHeight(room, own.side, own.i, own.j) > 0 ? own : walls(room)[0]
    if (!edge) return null
    if (!def.window) return onWallAt(room, edge, alongOf(item))
    const spot = fitWindow(room, item.kind, {
      edge, along: alongOf(item), y: item.y || 1.75, size: item.size ?? 1, sx: item.sx ?? 1, sy: item.sy ?? 1,
    })
    delete spot.size
    return spot
  }
  // On the floor being looked at, or downstairs if there is no room up there.
  const up = level === 1 && nearestSpot(room, 1, item.x, item.z, clearanceOf(item.kind))
  if (up) return { ...up, rotation: item.rotation, y: 0, level: 1 }
  const spot = nearestSpot(room, 0, item.x, item.z, clearanceOf(item.kind))
  return spot && { ...spot, rotation: item.rotation, y: 0, level: 0 }
}

// Emberary's 3D room, filling the window below the site's navigation bar, with
// a game-style overlay: the library's level, find a book, the reader's Ember,
// the time of day, and three modes: Shop (a cart; what is bought goes into
// storage), Build (put stored things in the room, move, turn, paint and size
// them, and build the room itself) and Storage (the furniture and books
// waiting there). This page is loaded lazily (see App.jsx) because three.js is
// most of the app's JavaScript and no other screen needs it.
export default function LibraryRoomPage() {
  const books = useAsync(listMyBooks)
  const room = useAsync(getRoom)
  const saver = useRoomSaver()
  const wallet = useEmber()

  const [mode, setMode] = useState('view')
  // Whether the upstairs floor is shown. Hidden, the downstairs is in view
  // under it.
  const [upstairs, setUpstairs] = useState(true)
  // The catalogue open along the top, in the shop and the builder.
  const [catalog, setCatalog] = useState('bookshelves')
  // Something being tried in the shop before it is bought: { kind, x, z,
  // rotation, y, on }, drawn see-through in the room. And a wallpaper, floor
  // or wall shape being tried on the room.
  const [ghost, setGhost] = useState(null)
  const [trying, setTrying] = useState(null)
  const [shopError, setShopError] = useState(null)
  const [shopBusy, setShopBusy] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(null)
  // The book off the shelf, and whether it has opened yet.
  const [pulledId, setPulledId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [moveError, setMoveError] = useState(null)
  const [placeError, setPlaceError] = useState(null)
  // Bumped by the Re-centre button to put the view back where it started.
  const [viewReset, setViewReset] = useState(0)
  const [time, setTime] = useState(() => remembered(TIME_KEY, 'day'))
  const [welcome, setWelcome] = useState(() => remembered(WELCOME_KEY, '') !== 'yes')
  // Building with room blocks: { action: 'add' | 'move' | 'remove', kind,
  // from?, at? }, or null. While it is set, the room shows the reader's
  // choices and the panels step aside.
  const [blockMode, setBlockMode] = useState(null)
  const [blockError, setBlockError] = useState(null)
  const [blockBusy, setBlockBusy] = useState(false)
  // Each change the builder makes to an item, so it can be undone: the item's
  // fields from just before.
  const history = useRef([])
  const [, setHistoryCount] = useState(0)
  const openTimer = useRef(null)
  const [params, setParams] = useSearchParams()

  const editing = mode === 'build'
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

  // A book carried to a new spot while building. It moves at once, and goes
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

  // An item changed. Whatever stands on it goes with it: moved as far, turned
  // with it, lifted or lowered with it.
  const changeItem = (id, patch) => {
    const items = room.data.items
    const before = items.find((i) => i.id === id)
    const patches = [[id, patch]]
    const moves = ['x', 'z', 'y', 'rotation', 'level'].some((key) => key in patch)
    if (before && moves) {
      const after = { ...before, ...patch }
      const turn = (((after.rotation - before.rotation) % 360) * Math.PI) / 180
      const cos = Math.cos(turn)
      const sin = Math.sin(turn)
      for (const child of items.filter((i) => i.on === id && i.placed)) {
        const dx = child.x - before.x
        const dz = child.z - before.z
        patches.push([
          child.id,
          {
            x: round2(after.x + dx * cos + dz * sin),
            z: round2(after.z - dx * sin + dz * cos),
            y: round2((child.y ?? 0) + ((after.y ?? 0) - (before.y ?? 0))),
            rotation: (((child.rotation + after.rotation - before.rotation) % 360) + 360) % 360,
            level: after.level ?? 0,
          },
        ])
      }
    }
    room.setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => {
        const found = patches.find(([pid]) => pid === i.id)
        return found ? { ...i, ...found[1] } : i
      }),
    }))
    for (const [pid, p] of patches) saver.queue(pid, p)
  }

  // Remember an item as it is now, before the builder changes it.
  function snapshot(item) {
    history.current = [...history.current.slice(-49), { id: item.id, before: pick(item) }]
    setHistoryCount(history.current.length)
  }

  // Whatever stood on an item that left the room comes down, here as on the
  // server.
  const bringDown = (id) =>
    room.setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.on === id ? { ...i, on: null, y: 0 } : i)),
    }))

  // An item sold: it leaves the room, whatever stood on it comes down, and any
  // books on it go back to the shelves.
  async function sell(item) {
    try {
      await sellRoomItem(item.id)
      bringDown(item.id)
      room.setData((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== item.id) }))
      books.setData((rows) =>
        rows.map((row) => (row.shelfSpot?.bookcase === String(item.id) ? { ...row, shelfSpot: null } : row))
      )
      history.current = history.current.filter((entry) => entry.id !== item.id)
      if (selectedItemId === item.id) setSelectedItemId(null)
    } catch (error) {
      saver.report('error', error)
    }
  }

  // The toolbar over the selected item while building.
  const itemTools = {
    canUndo: (item) => history.current.some((entry) => entry.id === item.id),
    undo: (item) => {
      const index = history.current.findLastIndex((entry) => entry.id === item.id)
      if (index < 0) return
      const { before } = history.current[index]
      history.current = history.current.filter((_, i) => i !== index)
      setHistoryCount(history.current.length)
      changeItem(item.id, before)
    },
    turn: (item, by) => {
      snapshot(item)
      changeItem(item.id, { rotation: (item.rotation + by + 360) % 360 })
    },
    store: (item) => {
      snapshot(item)
      changeItem(item.id, { placed: false, on: null })
      bringDown(item.id)
      setSelectedItemId(null)
    },
    sell,
    sellPrice: (item) => sellPrice(item.kind),
    gesture: snapshot,
    // Happy with where it stands: save it now and let go of it.
    confirm: () => {
      saver.flush()
      setSelectedItemId(null)
    },
    // Up or down the stairs, to the nearest place on the other floor.
    otherLevel: (item) => {
      const def = MODELS[item.kind]
      if (!hasUpstairs(room.data) || def?.wall || def?.window || def?.landing) return null
      const level = (item.level ?? 0) === 1 ? 0 : 1
      const spot = nearestSpot(room.data, level, item.x, item.z, clearanceOf(item.kind))
      return spot && { ...spot, level }
    },
    switchLevel: (item) => {
      const next = itemTools.otherLevel(item)
      if (!next) return
      snapshot(item)
      changeItem(item.id, { ...next, on: null, y: 0 })
      if (next.level === 1) setUpstairs(true)
    },
    // A window is re-hung so it stays on its wall at its new size.
    resize: (item, patch) => {
      if (!MODELS[item.kind]?.window) return changeItem(item.id, patch)
      const next = fitWindow(room.data, item.kind, {
        edge: wallOf(item), along: alongOf(item), y: item.y, size: item.size ?? 1, sx: patch.sx ?? item.sx ?? 1, sy: patch.sy ?? item.sy ?? 1,
      })
      changeItem(item.id, { ...patch, x: next.x, z: next.z, y: next.y })
    },
  }

  // ---------------------------------------------------------------- shopping

  // Try something from the shop: it appears in the room, see-through, near
  // the middle of the floor (or on a wall), where the reader can move it.
  function tryItem(entry) {
    setShopError(null)
    setTrying(null)
    const { x, z } = roomExtent(room.data)
    const spot = placingSpot(room.data, {
      kind: entry.id, x: (x[0] + x[1]) / 2, z: (z[0] + z[1]) / 2, rotation: 0, y: 1.75, size: 1, sx: 1, sy: 1,
    })
    if (!spot) return setShopError(new Error('Build a wall first: this hangs on one'))
    setGhost({ kind: entry.id, y: 0, on: null, ...spot })
  }

  function tryFinish(entry) {
    setShopError(null)
    setGhost(null)
    setTrying(entry)
  }

  // Bought: furniture arrives in storage, finishes are unlocked.
  function bought(result) {
    room.setData((prev) => ({
      ...prev,
      items: [...prev.items, ...result.items],
      unlocks: [...prev.unlocks, ...result.unlocks],
    }))
  }

  // The thing being tried is bought: put where it stands, or into storage.
  async function buyGhost(intoStorage) {
    const tried = ghost
    setShopBusy(true)
    setShopError(null)
    try {
      const result = await checkout([tried.kind])
      bought(result)
      setGhost(null)
      if (!intoStorage) {
        const { x, z, rotation, y, on } = tried
        const saved = await updateRoomItem(result.items[0].id, { x, z, rotation, y, on, placed: true, level: 0 })
        room.setData((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === saved.id ? { ...i, ...saved } : i)) }))
      }
    } catch (error) {
      setShopError(error)
    } finally {
      setShopBusy(false)
    }
  }

  async function buyFinish() {
    const entry = trying
    setShopBusy(true)
    setShopError(null)
    try {
      const result = await checkout([entry.id])
      bought(result)
      changeRoom({ [entry.type]: entry.id })
      setTrying(null)
    } catch (error) {
      setShopError(error)
    } finally {
      setShopBusy(false)
    }
  }

  const ghostTools = {
    turn: (item, by) => setGhost((g) => ({ ...g, rotation: (g.rotation + by + 360) % 360 })),
    confirm: () => buyGhost(false),
    store: () => buyGhost(true),
    cancel: () => setGhost(null),
    price: (item) => catalogEntry(item.kind)?.price,
  }

  // Out of storage and into the room, then selected, ready to move.
  async function placeFromStorage(item) {
    setPlaceError(null)
    const spot = placingSpot(room.data, item, upstairs && hasUpstairs(room.data) ? 1 : 0)
    if (!spot) {
      setPlaceError(new Error('Build a wall first: this hangs on one'))
      return
    }
    try {
      const saved = await updateRoomItem(item.id, { level: 0, ...spot, placed: true, on: null })
      room.setData((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, ...saved } : i)) }))
      setMode('build')
      setCatalog(catalogOf(item.kind) ?? catalog)
      setSelectedItemId(item.id)
    } catch (error) {
      setPlaceError(error)
    }
  }

  function startBlocks(next) {
    setBlockError(null)
    setSelectedItemId(null)
    setBlockMode(next)
    if (next.kind === 'upper') setUpstairs(true)
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

  // What can be done to a floor square or a wall the reader points at, in the
  // builder or while shopping for expansion: move it, or sell it back.
  const blockTools = {
    move: (kind, from) => startBlocks({ action: 'move', kind, from }),
    sell: (kind, at) => sendBlocks({ type: 'remove', kind, at: kind === 'wall' ? { side: at.side, i: at.i, j: at.j } : at }),
    refund: blockRefund,
  }
  const blockToolsOn = !blockBusy && !trying && (mode === 'build' || (mode === 'shop' && catalog === 'expansion'))

  // Escape stops building blocks, puts back what is being tried, or lets go
  // of the selected item.
  useEffect(() => {
    const cancel = (event) => {
      if (event.key !== 'Escape') return
      if (blockMode) setBlockMode(null)
      else {
        setGhost(null)
        setTrying(null)
        setSelectedItemId(null)
      }
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [blockMode])

  const toggleLight = (item) => changeItem(item.id, { lit: item.lit === false })

  // "Spend it in the shop" in the wallet arrives here with ?shop=1.
  useEffect(() => {
    if (params.get('shop') !== '1' || room.status !== 'ready') return
    switchMode('shop')
    setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, room.status])

  function switchMode(next, nextCatalog) {
    if (mode === 'build' && next !== 'build') saver.flush()
    setSelectedItemId(null)
    setBlockMode(null)
    setGhost(null)
    setTrying(null)
    setShopError(null)
    const to = next === mode && !nextCatalog ? 'view' : next
    setMode(to)
    // The builder has no Expansion: that is bought in the shop.
    if (nextCatalog) setCatalog(nextCatalog)
    else if (to === 'build' && catalog === 'expansion') setCatalog('walls')
    dismissWelcome()
  }

  // Out of the builder's shelf for a catalogue, into the same in the shop.
  const shopFor = () => switchMode('shop', catalog)

  function pickCatalog(id) {
    setCatalog(id)
    setGhost(null)
    setTrying(null)
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
  // Books with no room on any shelf wait in the storage room.
  const storedBooks = ready ? layoutBookcases(entries, bookcasesIn(room.data), tablesIn(room.data)).stored : []
  const storedItems = ready ? room.data.items.filter((i) => !i.placed) : []
  const names = ready ? itemNames(room.data.items) : {}
  const level = ready ? libraryLevel(room.data) : null
  const timeOfDay = TIMES.find((t) => t.id === time) ?? TIMES[0]
  // A finish being tried shows on the room before it is bought.
  const shown = ready && trying ? { ...room.data, [trying.type]: trying.id } : room.data
  const catalogs = ROOM_CATALOGS.filter((c) => mode === 'shop' || !c.shopOnly)
  const storedCounts = Object.fromEntries(
    ROOM_CATALOGS.map((c) => [c.id, storedItems.filter((i) => c.cats.includes(catalogEntry(i.kind)?.category)).length])
  )

  return (
    <div className={`room-screen time-${time} mode-${mode}`}>
      <h1 className="visually-hidden">Library Room: build your dream library</h1>

      {ready ? (
        <div className="room-canvas">
          <LibraryScene
            entries={entries}
            room={shown}
            time={time}
            selectedBookId={pulledId}
            onSelectBook={pickBook}
            editing={editing}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onItemChange={changeItem}
            onGesture={snapshot}
            itemTools={itemTools}
            onToggleLight={toggleLight}
            onMoveBook={moveBook}
            viewReset={viewReset}
            blockMode={blockMode}
            onBlockSpot={blockSpot}
            blockTools={blockToolsOn ? blockTools : null}
            ghost={mode === 'shop' ? ghost : null}
            upstairs={upstairs}
            ghostTools={ghostTools}
            onGhostChange={(patch) => setGhost((g) => (g ? { ...g, ...patch } : g))}
          />
        </div>
      ) : (
        <div className="room-loading">
          <AsyncState {...loading} label="Building your room" />
        </div>
      )}

      {/* the overlay, like a game's HUD */}
      <div className="hud hud-top">
        {mode === 'view' && (
        <div className="hud-dream">
          <span className="hud-title">Build your dream library</span>
          {level && (
            <button
              type="button"
              className="hud-level"
              onClick={() => switchMode('build')}
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
        )}
        {USING_MOCK_API && <span className="hud-chip">Demo mode</span>}
      </div>

      {/* The room's controls, in one slim column down the right-hand edge, so
          the room itself keeps the space. A mode's button closes it again. */}
      <nav className="hud-rail" aria-label="Library Room">
        {wallet.data && (
          <span className="rail-ember" title="Your Ember">
            <EmberCoin size="sm" />
            <span>{wallet.data.balance}</span>
            <span className="visually-hidden"> Ember</span>
          </span>
        )}
        {ready && (
          <>
            {MODES.map(({ id, icon, label }) => (
              <button
                key={id}
                type="button"
                className="rail-button"
                aria-pressed={mode === id}
                onClick={() => switchMode(id)}
                title={mode === id ? `Close ${label}` : label}
              >
                <span className="rail-icon" aria-hidden="true">{icon}</span>
                <span className="rail-label">{label}</span>
                {id === 'storage' && storedItems.length + storedBooks.length > 0 && (
                  <span className="rail-count">{storedItems.length + storedBooks.length}</span>
                )}
              </button>
            ))}
            <span className="rail-divider" aria-hidden="true" />
            {upperCells(room.data).length > 0 && (
              <button
                type="button"
                className="rail-button"
                aria-pressed={!upstairs}
                onClick={() => setUpstairs(!upstairs)}
                title={upstairs ? 'See downstairs: hide the upstairs floor' : 'Show the upstairs floor again'}
              >
                <span className="rail-icon" aria-hidden="true">{upstairs ? '⬇' : '⬆'}</span>
                <span className="rail-label">{upstairs ? 'Downstairs' : 'Upstairs'}</span>
              </button>
            )}
            <button type="button" className="rail-button" onClick={cycleTime} aria-label={`Time of day: ${timeOfDay.label}. Change it`}>
              <span className="rail-icon" aria-hidden="true">{timeOfDay.icon}</span>
              <span className="rail-label">{timeOfDay.label}</span>
            </button>
            <button type="button" className="rail-button" onClick={() => setViewReset((n) => n + 1)} title="Put the view back">
              <span className="rail-icon" aria-hidden="true">⟲</span>
              <span className="rail-label">Centre</span>
            </button>
          </>
        )}
      </nav>

      {ready && welcome && mode === 'view' && (
        <section className="room-welcome" aria-labelledby="welcome-heading">
          <h2 id="welcome-heading">Build your dream library</h2>
          <ol>
            <li>
              <strong>🛒 Shop</strong> for furniture, lights, plants, windows and more. Try something right in the
              room, then buy it where it stands, or into your storage room.
            </li>
            <li>
              <strong>🔨 Build</strong>: bring things out of storage, move, turn and size them, set little things on
              tables and shelves, choose the walls and floors, and build the room bigger, even upstairs.
            </li>
            <li>
              <strong>📦 Storage</strong> keeps what is not in the room, and the books waiting for a shelf.
            </li>
          </ol>
          <p className="muted">Every book you finish earns Ember to build with. Click a lamp to switch it; try it at night.</p>
          <div className="detail-actions">
            <button type="button" onClick={() => switchMode('shop')}>
              Start shopping
            </button>
            <button type="button" className="button-quiet" onClick={dismissWelcome}>
              Just look around
            </button>
          </div>
        </section>
      )}

      {ready && mode === 'view' && (
        <div className="hud hud-bottom">
          {storedBooks.length > 0 && (
            <p className="hud-notice">
              {storedBooks.length} {storedBooks.length === 1 ? 'book is' : 'books are'} waiting for a shelf.{' '}
              <button type="button" className="button-link" onClick={() => switchMode('storage')}>
                See them
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

      {ready && (mode === 'shop' || mode === 'build') && !blockMode && (
        <CatalogBar catalogs={catalogs} current={catalog} onPick={pickCatalog} counts={mode === 'build' ? storedCounts : {}} />
      )}

      {ready && trying && (
        <div className="hud hud-place" role="status">
          <p className="place-banner">
            <strong>Trying {trying.name}.</strong> Buy it for {trying.price} Ember?
          </p>
          <button type="button" className="hud-button hud-buy" onClick={buyFinish} disabled={shopBusy}>
            {shopBusy ? 'Buying...' : `✓ Buy · ${trying.price}`}
          </button>
          <button type="button" className="hud-button" onClick={() => setTrying(null)}>
            ✕ Not this
          </button>
        </div>
      )}

      {ready && mode !== 'view' && !blockMode && (
        <aside className="shelf-panel">
          {mode === 'shop' && (
            <ShopShelf
              room={room.data}
              balance={wallet.data?.balance}
              catalog={catalog}
              onTryItem={tryItem}
              onTryFinish={tryFinish}
              onExpansion={startBlocks}
            />
          )}
          {mode === 'build' && (
            <BuildShelf
              room={room.data}
              catalog={catalog}
              storedItems={storedItems}
              onPlace={placeFromStorage}
              onRoomChange={changeRoom}
              onShop={shopFor}
            />
          )}
          {mode === 'storage' && (
            <StoragePanel
              items={storedItems}
              names={names}
              books={storedBooks}
              onPlace={placeFromStorage}
              onSell={sell}
              onOpenBook={setOpenId}
              onShop={() => switchMode('shop')}
            />
          )}
        </aside>
      )}

      {ready && mode !== 'view' && !blockMode && (
        <div className="hud hud-bottom hud-modes-bottom">
          {[blockBusy && { key: 'busy', text: 'Building...' }, shopBusy && { key: 'shop', text: 'Buying...' },
            blockError && { key: 'block', text: `Could not change the room: ${blockError.message}` },
            shopError && { key: 'shoperr', text: `Could not buy it: ${shopError.message}` },
            placeError && { key: 'place', text: `Could not put it in the room: ${placeError.message}` },
            moveError && { key: 'move', text: `Could not move the book: ${moveError.message}` },
            saver.status === 'error' && { key: 'save', text: `Could not save the room: ${saver.error.message}` }]
            .filter(Boolean)
            .map(({ key, text }) => (
              <p key={key} className="hud-notice" role={key === 'busy' || key === 'shop' ? 'status' : 'alert'}>
                {text}
              </p>
            ))}
          <p className="hud-hint">
            {mode === 'shop'
              ? ghost
                ? 'Drag it, or click where it goes · ✓ buys it there · 📦 buys it into storage · ✕ puts it back'
                : 'Pick a catalogue along the top, then something to try in the room'
              : mode === 'build'
                ? 'Click something to select it · drag it, or click where it goes · point at a wall or floor to move or sell it · small things sit on tables, seats and shelves · drag a book to any shelf or table'
                : 'What is not in the room waits here'}
          </p>
        </div>
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
  const name = kind === 'upper' ? 'upstairs floor' : `${kind} block`
  if (action === 'add') {
    return (
      <>
        <strong>Choose where your {name} goes.</strong>{' '}
        {kind === 'floor'
          ? 'Point at a square beside the floor'
          : kind === 'upper'
            ? 'Point at a lit square over the floor (it leaves an opening for the stairs)'
            : `Point at one of the see-through walls at the back of the room (walls stack up to ${BLOCKS.maxLevels} high)`}{' '}
        and click it: that is when its {blockPrice(kind)} Ember is paid. Right-drag to move the view.
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
