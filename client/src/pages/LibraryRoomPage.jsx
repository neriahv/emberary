import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listMyBooks, getRoom, reorderShelf, STATUS_LABELS, USING_MOCK_API } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import { useRoomSaver } from '../hooks/useRoomSaver.js'
import AsyncState from '../components/AsyncState.jsx'
import LibraryScene, { shelfOrder } from '../components/room/LibraryScene.jsx'
import RoomCustomizer from '../components/room/RoomCustomizer.jsx'
import BookModal from '../components/room/BookModal.jsx'

// How long a book takes to slide off the shelf before it opens.
const PULL_MS = 420

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Emberary's 3D room, full screen, with a game-style overlay: leave, find a
// book, and an Edit button that turns the room into a place to rearrange.
// This page is loaded lazily (see App.jsx) because three.js is most of the
// app's JavaScript and no other screen needs it.
export default function LibraryRoomPage() {
  const navigate = useNavigate()
  const books = useAsync(listMyBooks)
  const room = useAsync(getRoom)
  const saver = useRoomSaver()

  const [editing, setEditing] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(null)
  // The book off the shelf, and whether it has opened yet.
  const [pulledId, setPulledId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [shelfMove, setShelfMove] = useState({ busy: false, error: null })
  const openTimer = useRef(null)

  const entries = books.data ?? []
  const openEntry = entries.find((e) => e.bookId === openId)

  // The room covers the whole window, so the page underneath must not scroll.
  useEffect(() => {
    document.body.classList.add('room-open')
    return () => {
      document.body.classList.remove('room-open')
      document.body.style.cursor = ''
      clearTimeout(openTimer.current)
    }
  }, [])

  function leave() {
    // Back where they came from, or Home if they arrived straight here.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/')
  }

  // Click a book: it slides out, then opens.
  function pickBook(bookId) {
    if (!bookId || pulledId) return
    setPulledId(bookId)
    setShelfMove({ busy: false, error: null })
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

  // Move the open book one place along its shelf. The whole shelf's order is
  // saved, because most books on it may never have had a saved place.
  async function moveOnShelf(step) {
    const order = shelfOrder(entries, openEntry.status).map((e) => e.bookId)
    const index = order.indexOf(openEntry.bookId)
    const next = [...order]
    ;[next[index], next[index + step]] = [next[index + step], next[index]]
    const positions = Object.fromEntries(next.map((bookId, position) => [bookId, position]))
    const previous = entries

    books.setData((rows) =>
      rows.map((row) => (row.bookId in positions ? { ...row, shelfPosition: positions[row.bookId] } : row))
    )
    setShelfMove({ busy: true, error: null })
    try {
      await reorderShelf(next)
      setShelfMove({ busy: false, error: null })
    } catch (error) {
      books.setData(previous)
      setShelfMove({ busy: false, error })
    }
  }

  const changeColour = (patch) => {
    room.setData((prev) => ({ ...prev, ...patch }))
    saver.queue('room', patch)
  }
  const changeItem = (id, patch) => {
    room.setData((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))
    saver.queue(id, patch)
  }
  const changeItems = (update) => room.setData((prev) => ({ ...prev, items: update(prev.items) }))

  function toggleEditing() {
    if (editing) {
      saver.flush()
      setSelectedItemId(null)
    }
    setEditing(!editing)
  }

  const ready = books.status === 'ready' && room.status === 'ready'
  const loading = books.status !== 'ready' ? books : room
  const shelf = openEntry && {
    index: shelfOrder(entries, openEntry.status).findIndex((e) => e.bookId === openEntry.bookId),
    count: shelfOrder(entries, openEntry.status).length,
    ...shelfMove,
  }

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
          />
        </div>
      ) : (
        <div className="room-loading">
          <AsyncState {...loading} label="Building your room" />
        </div>
      )}

      {/* the overlay, like a game's HUD */}
      <div className="hud hud-top">
        <button type="button" className="hud-button" onClick={leave}>
          ← Leave room
        </button>
        <span className="hud-title" aria-hidden="true">
          Library Room
        </span>
        {USING_MOCK_API && <span className="hud-chip">Demo mode</span>}
        <span className="hud-spacer" />
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
          {entries.length > 0 ? (
            <>
              {/* The canvas cannot be used with a keyboard or a screen reader,
                  so every book in it can also be opened from this list. */}
              <label htmlFor="room-picker" className="hud-label">
                Find a book
              </label>
              <select
                id="room-picker"
                className="hud-select"
                value=""
                onChange={(event) => pickBook(event.target.value)}
              >
                <option value="">Choose...</option>
                {entries.map((entry) => (
                  <option key={entry.bookId} value={entry.bookId}>
                    {entry.book.title} ({STATUS_LABELS[entry.status]})
                  </option>
                ))}
              </select>
              <span className="hud-hint">Click a book on the shelves to open it · drag to look around</span>
            </>
          ) : (
            <p className="hud-hint">
              Your shelves are empty. <Link to="/discover">Add a book from Discover</Link>.
            </p>
          )}
        </div>
      )}

      {ready && editing && (
        <aside className="edit-drawer">
          <RoomCustomizer
            room={room.data}
            saver={saver}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onColourChange={changeColour}
            onItemChange={changeItem}
            onItemsChange={changeItems}
          />
        </aside>
      )}

      {openEntry && (
        <BookModal
          entry={openEntry}
          shelf={shelf}
          onSaved={handleSaved}
          onRemoved={handleRemoved}
          onMove={moveOnShelf}
          onClosed={bookClosed}
        />
      )}
    </div>
  )
}
