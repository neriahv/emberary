import { useState } from 'react'
import { STATUSES, STATUS_LABELS, updateMyBook, removeFromCollection, describeRewards } from '../api'
import StarRating from './StarRating.jsx'

// The form that changes one book on your shelves: status, page, rating and
// review, plus removing it. Shared by the My Books panel and the book that
// opens in the Library Room, so a book is edited the same way everywhere.
//
// Give it key={entry.bookId} in the parent, so it resets when a different
// book is shown.
export default function BookEditForm({ entry, onSaved, onRemoved, heading = 'Update this book' }) {
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
  const [earned, setEarned] = useState('')

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
      setEarned(describeRewards(saved.rewards))
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
    <form className="detail-form" onSubmit={handleSave}>
      {heading && <h3>{heading}</h3>}

      <label htmlFor={`status-${book.id}`}>Reading status</label>
      <select id={`status-${book.id}`} value={form.status} onChange={(event) => set('status')(event.target.value)}>
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
            Saved.{earned && <strong className="reward-note"> {earned}.</strong>}
          </span>
        )}
      </div>
    </form>
  )
}
