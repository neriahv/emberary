import { useEffect, useRef, useState } from 'react'
import { STATUS_LABELS } from '../../api'
import BookCover from '../BookCover.jsx'
import BookEditForm from '../BookEditForm.jsx'
import ProgressBar from '../ProgressBar.jsx'
import StarRating from '../StarRating.jsx'
import StatusBadge from '../StatusBadge.jsx'

// A book taken off the Library Room shelf: it appears closed, its cover swings
// open onto a two-page spread (the book on the left, your notes on the right),
// and closing plays the same thing backwards before the book goes back on the
// shelf.
//
// A native <dialog>, so focus is trapped inside it and Escape works; Escape is
// intercepted only to run the closing animation first.

const TIMING = { grow: 320, turn: 850 } // must match the CSS transitions

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function BookModal({ entry, shelf, onSaved, onRemoved, onMove, onClosed }) {
  const dialog = useRef(null)
  // entering -> closed (grown, cover shut) -> open -> closing -> leaving
  const [phase, setPhase] = useState('entering')
  const timers = useRef([])
  const { book } = entry

  const later = (fn, ms) => timers.current.push(setTimeout(fn, reducedMotion() ? 0 : ms))

  useEffect(() => {
    dialog.current.showModal()
    later(() => setPhase('closed'), 20)
    later(() => setPhase('open'), 20 + TIMING.grow)
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
    // Run once, when the book is first opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function close() {
    if (phase === 'closing' || phase === 'leaving') return
    setPhase('closing')
    later(() => setPhase('leaving'), TIMING.turn)
    later(() => {
      dialog.current?.close()
      onClosed()
    }, TIMING.turn + TIMING.grow)
  }

  function handleRemoved(bookId) {
    dialog.current?.close()
    onRemoved(bookId)
  }

  // Shown twice: on the left page, and above the notes on a narrow screen
  // where there is only one page. CSS hides whichever copy does not apply, and
  // only the left page's title carries the id the dialog is named by.
  const details = (titleId) => (
    <div className="page-details">
      <p className="page-kicker">
        {book.genre} · {book.year}
      </p>
      <h2 id={titleId} className="page-title">
        {book.title}
      </h2>
      <p className="page-author">by {book.author}</p>
      <div className="page-status">
        <StatusBadge status={entry.status} />
        <StarRating value={entry.rating} />
      </div>
      {entry.status !== 'want-to-read' && (
        <ProgressBar value={entry.currentPage} max={book.pages} label={`Progress in ${book.title}`} />
      )}
      <p className="page-body">{book.description}</p>
      {entry.review && (
        <blockquote className="page-review">
          <p>{entry.review}</p>
        </blockquote>
      )}
      <p className="page-meta">{book.pages} pages</p>
    </div>
  )

  return (
    <dialog
      ref={dialog}
      className={`book-dialog phase-${phase}`}
      aria-labelledby="open-book-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        // A click on the backdrop, outside the book, closes it.
        if (event.target === dialog.current) close()
      }}
    >
      <div className="open-book">
        {/* the right-hand page, under the cover until it opens */}
        <div className="book-page book-page-right">
          <div className="page-scroll">
            <div className="page-details-narrow">{details()}</div>
            <h3 className="page-heading">Your notes</h3>
            <BookEditForm key={entry.bookId} entry={entry} onSaved={onSaved} onRemoved={handleRemoved} heading={null} />
            <div className="page-shelf">
              <p className="muted">
                {STATUS_LABELS[entry.status]} shelf, {shelf.index + 1} of {shelf.count} from the left
              </p>
              <div className="detail-actions">
                <button
                  type="button"
                  className="button-quiet button-small"
                  onClick={() => onMove(-1)}
                  disabled={shelf.busy || shelf.index <= 0}
                >
                  ← Move left
                </button>
                <button
                  type="button"
                  className="button-quiet button-small"
                  onClick={() => onMove(1)}
                  disabled={shelf.busy || shelf.index >= shelf.count - 1}
                >
                  Move right →
                </button>
              </div>
              {shelf.error && (
                <p className="error" role="alert">
                  Could not move the book: {shelf.error.message}
                </p>
              )}
            </div>
          </div>
          <span className="page-number" aria-hidden="true">
            2
          </span>
        </div>

        {/* the cover: its front is the real cover, its back the left-hand page */}
        <div className="book-cover-leaf">
          <div className="leaf-front" aria-hidden={phase === 'open'}>
            <BookCover book={book} size="fill" />
          </div>
          <div className="leaf-back book-page book-page-left">
            <div className="page-scroll">{details('open-book-title')}</div>
            <span className="page-number" aria-hidden="true">
              1
            </span>
          </div>
        </div>
      </div>

      <button type="button" className="book-dialog-close" onClick={close}>
        Close book
      </button>
    </dialog>
  )
}
