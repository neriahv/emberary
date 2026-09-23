import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyBooks, getRoom, STATUS_LABELS } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import BookDetailPanel from '../components/BookDetailPanel.jsx'
import LibraryScene from '../components/room/LibraryScene.jsx'
import RoomCustomizer from '../components/room/RoomCustomizer.jsx'

// Emberary's 3D room. This page is loaded lazily (see App.jsx) because
// three.js is most of the app's JavaScript and no other screen needs it.
export default function LibraryRoomPage() {
  const books = useAsync(listMyBooks)
  const room = useAsync(getRoom)
  const [selectedId, setSelectedId] = useState(null)

  const entries = books.data ?? []
  const selected = entries.find((e) => e.bookId === selectedId)

  function handleSaved(saved) {
    books.setData((rows) => rows.map((row) => (row.bookId === saved.bookId ? saved : row)))
  }

  function handleRemoved(bookId) {
    books.setData((rows) => rows.filter((row) => row.bookId !== bookId))
    setSelectedId(null)
  }

  const loading = books.status !== 'ready' ? books : room

  return (
    <>
      <div className="page-head">
        <h1>Library Room</h1>
        <p className="lede">
          Your collection as a room. Each shelf is a reading status. Click a book to open it; drag to look
          around, scroll to move closer.
        </p>
      </div>

      <AsyncState {...loading} label="Building your room" />

      {books.status === 'ready' && room.status === 'ready' && (
        <div className="room-layout">
          <div className="room-stage">
            <div className="room-canvas">
              <LibraryScene
                entries={entries}
                room={room.data}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              {entries.length === 0 && (
                <p className="room-empty">
                  Your shelves are empty. <Link to="/discover">Add a book from Discover</Link>.
                </p>
              )}
            </div>

            {/* The canvas cannot be used with a keyboard or a screen reader, so
                every book in it can also be picked from this list. */}
            {entries.length > 0 && (
              <div className="room-picker">
                <label htmlFor="room-picker">Or choose a book</label>
                <select
                  id="room-picker"
                  value={selectedId ?? ''}
                  onChange={(event) => setSelectedId(event.target.value || null)}
                >
                  <option value="">No book selected</option>
                  {entries.map((entry) => (
                    <option key={entry.bookId} value={entry.bookId}>
                      {entry.book.title} ({STATUS_LABELS[entry.status]})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <aside className="room-side">
            {selected ? (
              <BookDetailPanel
                key={selected.bookId}
                entry={selected}
                onSaved={handleSaved}
                onRemoved={handleRemoved}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <RoomCustomizer
                room={room.data}
                onChange={(patch) => room.setData((prev) => ({ ...prev, ...patch }))}
              />
            )}
          </aside>
        </div>
      )}
    </>
  )
}
