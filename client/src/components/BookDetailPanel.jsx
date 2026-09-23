import { useState } from 'react'
import { STATUSES, STATUS_LABELS, updateMyBook, removeFromCollection } from '../api'
import BookCover from './BookCover.jsx'
import ProgressBar from './ProgressBar.jsx'
import StarRating from './StarRating.jsx'
import StatusBadge from './StatusBadge.jsx'

// Everything about one book in your collection, and the form to change it.
// Shared by My Books and the Library Room, so a book is edited the same way
// wherever you find it.
//
// Give it key={entry.bookId} in the parent, so the form resets when a
// different book is selected.
export default function BookDetailPanel({ entry, onSaved, onRemoved, onClose }) {
  const { book } = entry
  const [form, setForm] = useState({
    status: entry.status,
    currentPage: entry.currentPage,
    rating: entry.rating,
    review: entry.review,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }))
  const showProgress = form.status === 'currently-reading' || form.status === 'did-not-finish'

  const dirty =
    form.status !== entry.status ||
    Number(form.currentPage) !== entry.currentPage ||
    form.rating !== entry.rating ||
    form.review !== entry.review

  async function handleSave(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const saved = await updateMyBook(book.id, {
        status: form.status,
        currentPage: Number(form.currentPage),
        rating: form.rating,
        review: form.review.trim(),
      })
      setForm({
        status: saved.status,
        currentPage: saved.currentPage,
        rating: saved.rating,
        review: saved.review,
      })
      setSavedAt(Date.now())
      onSaved?.(saved)
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!window.confirm(`Remove "${book.title}" from your collection?`)) return
    setBusy(true)
    setError(null)
    try {
      await removeFromCollection(book.id)
      onRemoved?.(book.id)
    } catch (caught) {
      setError(caught)
      setBusy(false)
    }
  }

  return (
    <section className="detail-panel card" aria-labelledby={`detail-${book.id}`}>
      <div className="detail-head">
        <BookCover book={book} size="md" />
        <div>
          <h2 id={`detail-${book.id}`}>{book.title}</h2>
          <p className="detail-author">
            {book.author} · {book.year}
          </p>
          <p className="book-card-meta">
            {book.genre} · {book.pages} pages
          </p>
          <StatusBadge status={entry.status} />
          {entry.status !== 'want-to-read' && (
            <ProgressBar value={entry.currentPage} max={book.pages} label={`Progress in ${book.title}`} />
          )}
          <StarRating value={entry.rating} />
        </div>
        {onClose && (
          <button type="button" className="button-quiet detail-close" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <p className="detail-description">{book.description}</p>

      {entry.review && (
        <blockquote className="detail-review">
          <p>{entry.review}</p>
        </blockquote>
      )}

      <form className="detail-form" onSubmit={handleSave}>
        <h3>Update this book</h3>

        <label htmlFor={`status-${book.id}`}>Reading status</label>
        <select
          id={`status-${book.id}`}
          value={form.status}
          onChange={(event) => set('status')(event.target.value)}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        {showProgress && (
          <>
            <label htmlFor={`page-${book.id}`}>Current page, out of {book.pages}</label>
            <div className="page-input">
              <input
                id={`page-${book.id}`}
                type="number"
                min="0"
                max={book.pages}
                value={form.currentPage}
                onChange={(event) => set('currentPage')(event.target.value)}
              />
              <input
                type="range"
                min="0"
                max={book.pages}
                value={form.currentPage}
                onChange={(event) => set('currentPage')(event.target.value)}
                aria-label="Current page slider"
              />
            </div>
          </>
        )}

        <StarRating value={form.rating} onChange={set('rating')} name={`rating-${book.id}`} />

        <label htmlFor={`review-${book.id}`}>Review</label>
        <textarea
          id={`review-${book.id}`}
          rows={3}
          maxLength={2000}
          placeholder="What did you think?"
          value={form.review}
          onChange={(event) => set('review')(event.target.value)}
        />

        {error && (
          <p className="error" role="alert">
            {error.message}
          </p>
        )}

        <div className="detail-actions">
          <button type="submit" disabled={busy || !dirty}>
            {busy ? 'Saving...' : 'Save changes'}
          </button>
          <button type="button" className="button-danger" onClick={handleRemove} disabled={busy}>
            Remove from collection
          </button>
          {savedAt && !dirty && (
            <span className="muted" role="status">
              Saved.
            </span>
          )}
        </div>
      </form>
    </section>
  )
}
