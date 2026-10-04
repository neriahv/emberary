import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listMyBooks, getRoom, updateMyBook, USING_MOCK_API } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import { useEmber } from '../hooks/useEmber.js'
import { useRoomSaver } from '../hooks/useRoomSaver.js'
import AsyncState from '../components/AsyncState.jsx'
import { EmberCoin } from '../components/EmberBadge.jsx'
import LibraryScene, { bookcasesIn, layoutBookcases, shelfOrder } from '../components/room/LibraryScene.jsx'
import RoomCustomizer from '../components/room/RoomCustomizer.jsx'
import BookModal from '../components/room/BookModal.jsx'
import BookFinder from '../components/room/BookFinder.jsx'

// How long a book takes to slide off the shelf before it opens.
const PULL_MS = 420

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Emberary's 3D room, filling the window below the site's navigation bar, with
// a game-style overlay: find a book, the reader's Ember, and an Edit button
// that opens the shop and turns the room into a place to rearrange. This page
// is loaded lazily (see App.jsx) because three.js is most of the app's
// JavaScript and no other screen needs it.
export default function LibraryRoomPage() {
  const books = useAsync(listMyBooks)
  const room = useAsync(getRoom)
  const saver = useRoomSaver()
  const wallet = useEmber()

  const [editing, setEditing] = useState(false)
  const [drawerTab, setDrawerTab] = useState('room')
  const [selectedItemId, setSelectedItemId] = useState(null)
  // The book off the shelf, and whether it has opened yet.
  const [pulledId, setPulledId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [moveError, setMoveError] = useState(null)
  // Bumped by the Re-centre button to put the view back where it started.
  const [viewReset, setViewReset] = useState(0)
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

  const changeRoom = (patch) => {
    room.setData((prev) => ({ ...prev, ...patch }))
    saver.queue('room', patch)
  }
  const changeItem = (id, patch) => {
    room.setData((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
    saver.queue(id, patch)
  }
  const changeItems = (update) => room.setData((prev) => ({ ...prev, items: update(prev.items) }))
  const unlock = (ids) => room.setData((prev) => ({ ...prev, unlocks: [...prev.unlocks, ...ids] }))

  // "Spend it in the shop" in the wallet arrives here with ?shop=1.
  useEffect(() => {
    if (params.get('shop') !== '1' || room.status !== 'ready') return
    openShop()
    setParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, room.status])

  function openShop() {
    setDrawerTab('shop')
    setEditing(true)
  }

  function toggleEditing() {
    if (editing) {
      saver.flush()
      setSelectedItemId(null)
    }
    setEditing(!editing)
  }

  const ready = books.status === 'ready' && room.status === 'ready'
  const loading = books.status !== 'ready' ? books : room
  const onShelves = openEntry && shelved.some((e) => e.bookId === openEntry.bookId)
  // Books that do not fit on any bookcase; the answer is another bookcase.
  const overflow = ready ? layoutBookcases(entries, bookcasesIn(room.data)).overflow : 0

  return (
    <div className={`room-screen${editing ? ' is-editing' : ''}`}>
      <h1 className="visually-hidden">Library Room</h1>

      {ready ? (
        <div className="room-canvas">
          <LibraryScene
            entries={entries}
            room={room.data}
            selectedBookId={pulledId}
            onSelectBook={pickBook}
            editing={editing}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onItemChange={changeItem}
            onMoveBook={moveBook}
            viewReset={viewReset}
          />
        </div>
      ) : (
        <div className="room-loading">
          <AsyncState {...loading} label="Building your room" />
        </div>
      )}

      {/* the overlay, like a game's HUD */}
      <div className="hud hud-top">
        <span className="hud-title" aria-hidden="true">
          Library Room
        </span>
        {USING_MOCK_API && <span className="hud-chip">Demo mode</span>}
        <span className="hud-spacer" />
        {wallet.data && (
          <button type="button" className="hud-button hud-ember" onClick={openShop}>
            <EmberCoin size="sm" /> {wallet.data.balance}
            <span className="visually-hidden"> Ember. Open the shop</span>
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
            {editing ? '✓ Done editing' : '✎ Edit room'}
          </button>
        )}
      </div>

      {ready && !editing && (
        <div className="hud hud-bottom">
          {overflow > 0 && (
            <p className="hud-notice">
              {overflow} {overflow === 1 ? 'book does' : 'books do'} not fit on your shelves.{' '}
              <button type="button" className="button-link" onClick={openShop}>
                Buy another bookcase
              </button>
            </p>
          )}
          {shelved.length > 0 ? (
            <>
              {/* The canvas cannot be used with a keyboard or a screen reader,
                  so every book in it can also be found and opened here. */}
              <BookFinder entries={shelved} onPick={pickBook} />
              <span className="hud-hint">
                Click a book to open it · drag to turn · right-drag or two fingers to move · scroll to zoom
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

      {ready && editing && (
        <div className="hud hud-bottom">
          <p className="hud-hint">
            Drag a book to any shelf · drag furniture across the floor · right-drag to move the view
          </p>
          {moveError && (
            <p className="hud-notice" role="alert">
              Could not move the book: {moveError.message}
            </p>
          )}
        </div>
      )}

      {ready && editing && (
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
            onUnlock={unlock}
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
