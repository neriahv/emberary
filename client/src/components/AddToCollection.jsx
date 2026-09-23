import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addToCollection, STATUSES, STATUS_LABELS } from '../api'

// The "add this book" control used on Discover and in recommendation lists.
// When the book is already yours it becomes a link to it instead.
export default function AddToCollection({ book, owned, onAdded }) {
  const [status, setStatus] = useState('want-to-read')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (owned) {
    return (
      <Link className="button-quiet" to={`/my-books?book=${book.id}`}>
        In My Books
      </Link>
    )
  }

  async function handleAdd() {
    setBusy(true)
    setError(null)
    try {
      onAdded?.(await addToCollection(book.id, status))
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="add-control">
      <label className="visually-hidden" htmlFor={`add-status-${book.id}`}>
        Add {book.title} as
      </label>
      <select
        id={`add-status-${book.id}`}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        disabled={busy}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <button type="button" className="button-small" onClick={handleAdd} disabled={busy}>
        {busy ? 'Adding...' : 'Add'}
      </button>
      {error && (
        <p className="error error-inline" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}
