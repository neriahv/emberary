import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getFriendLibrary, upperCells } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import Avatar from '../components/Avatar.jsx'
import LibraryScene, { shelfOrder } from '../components/room/LibraryScene.jsx'
import BookModal from '../components/room/BookModal.jsx'
import BookFinder from '../components/room/BookFinder.jsx'

const PULL_MS = 420

const TIMES = [
  { id: 'day', icon: '☀', label: 'Day' },
  { id: 'dusk', icon: '◐', label: 'Dusk' },
  { id: 'night', icon: '☾', label: 'Night' },
]

const noop = () => {}

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function VisitRoomPage() {
  const { id } = useParams()
  const library = useAsync(() => getFriendLibrary(id), [id])

  const [time, setTime] = useState('day')
  const [upstairs, setUpstairs] = useState(true)
  const [viewReset, setViewReset] = useState(0)
  const [pulledId, setPulledId] = useState(null)
  const [openId, setOpenId] = useState(null)

  const openTimer = useRef(null)

  // The 3D room fills the viewport below the navigation.
  useEffect(() => {
    document.body.classList.add('room-open')

    return () => {
      document.body.classList.remove('room-open')
      document.body.style.cursor = ''
      clearTimeout(openTimer.current)
    }
  }, [])

  // Clear a previously opened book when navigating to another friend.
  useEffect(() => {
    clearTimeout(openTimer.current)
    setPulledId(null)
    setOpenId(null)
  }, [id])

  // Animate a book sliding from the shelf before opening the modal.
  function pickBook(bookId) {
    if (!bookId || pulledId) return

    setPulledId(bookId)

    clearTimeout(openTimer.current)

    openTimer.current = setTimeout(
      () => setOpenId(bookId),
      reducedMotion() ? 0 : PULL_MS
    )
  }

  function closeBook() {
    clearTimeout(openTimer.current)
    setOpenId(null)
    setPulledId(null)
  }

  function cycleTime() {
    const index = TIMES.findIndex((option) => option.id === time)
    setTime(TIMES[(index + 1) % TIMES.length].id)
  }

  const data = library.data
  const ready = library.status === 'ready' && Boolean(data)
  const entries = data?.books ?? []
  const shelved = shelfOrder(entries)
  const openEntry = entries.find((entry) => entry.bookId === openId)
  const timeOfDay = TIMES.find((option) => option.id === time) ?? TIMES[0]

  // A rejected visit must never render private room information.
  if (library.status === 'error') {
    return (
      <div className="page-banner">
        <div>
          <h1>This library isn't available</h1>
          <p className="lede">
            This library may be private, unavailable, or no longer shared
            with you.
          </p>
          <Link to="/friends" className="button">
            Back to Friends
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`room-screen time-${time} mode-view`}>
      <h1 className="visually-hidden">
        Visiting {data?.reader?.displayName ?? 'a friend'}'s library
      </h1>

      {ready ? (
        <div className="room-canvas">
          <LibraryScene
            entries={entries}
            room={data.room}
            time={time}
            selectedBookId={pulledId}
            onSelectBook={pickBook}
            editing={false}
            selectedItemId={null}
            onSelectItem={noop}
            onItemChange={noop}
            onToggleLight={noop}
            onMoveBook={noop}
            viewReset={viewReset}
            upstairs={upstairs}
          />
        </div>
      ) : (
        <div className="room-loading">
          <AsyncState {...library} label="Opening your friend's library" />
        </div>
      )}

      {/* Visiting banner */}
      <div className="hud hud-top">
        <div className="visit-room-banner">
          {data?.reader && (
            <span className="visit-room-avatar">
              <Avatar name={data.reader.avatar} />
            </span>
          )}

          <div>
            <span className="hud-title">
              You're visiting {data?.reader?.displayName ?? 'a reader'}'s library
            </span>
            <span className="visit-room-subtitle">
              Explore their books and reading space
            </span>
          </div>

          <Link to="/friends" className="button-small button-quiet">
            Leave
          </Link>
        </div>
      </div>

      {/* View-only controls. No Shop, Build, Storage or Layouts. */}
      <nav className="hud-rail" aria-label="Library visit controls">
        {ready && (
          <>
            {upperCells(data.room).length > 0 && (
              <button
                type="button"
                className="rail-button"
                aria-pressed={!upstairs}
                onClick={() => setUpstairs((current) => !current)}
                title={upstairs ? 'See downstairs' : 'Show upstairs'}
              >
                <span className="rail-icon" aria-hidden="true">
                  {upstairs ? '⬇' : '⬆'}
                </span>
                <span className="rail-label">
                  {upstairs ? 'Downstairs' : 'Upstairs'}
                </span>
              </button>
            )}

            <button
              type="button"
              className="rail-button"
              onClick={cycleTime}
              aria-label={`Time of day: ${timeOfDay.label}. Change it`}
            >
              <span className="rail-icon" aria-hidden="true">
                {timeOfDay.icon}
              </span>
              <span className="rail-label">{timeOfDay.label}</span>
            </button>

            <button
              type="button"
              className="rail-button"
              onClick={() => setViewReset((current) => current + 1)}
              title="Put the view back"
            >
              <span className="rail-icon" aria-hidden="true">⟲</span>
              <span className="rail-label">Centre</span>
            </button>
          </>
        )}
      </nav>

      {ready && (
        <div className="hud hud-bottom">
          {shelved.length > 0 ? (
            <>
              <BookFinder
                entries={shelved}
                onPick={pickBook}
                placeholder={`Search ${data.reader.displayName}'s ${shelved.length === 1 ? 'book' : 'books'}…`}
              />
              <span className="hud-hint">
                Click a book to read about it · drag to turn ·
                right-drag to move · scroll to zoom
              </span>
            </>
          ) : (
            <p className="hud-hint">
              This reader's shelves are empty for now.
            </p>
          )}
        </div>
      )}

      {ready && openEntry && (
        <BookModal
          key={`${id}-${openEntry.bookId}`}
          entry={openEntry}
          onShelves
          readOnly
          friendId={id}
          onClosed={closeBook}
        />
      )}
    </div>
  )
}
