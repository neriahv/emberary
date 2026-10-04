import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addToCollection, STATUSES, STATUS_LABELS } from '../api'
import Icon from './Icon.jsx'

// The "add this book" control on Discover: one button that opens the four
// places a book can go. When the book is already yours it becomes a link to it.
export default function AddToCollection({ book, owned, onAdded }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const box = useRef(null)

  // Close on a click elsewhere or on Escape.
  useEffect(() => {
    if (!open) return
    const outside = (event) => box.current && !box.current.contains(event.target) && setOpen(false)
    const escape = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  if (owned) {
    return (
      <Link className="button-quiet button-small" to={`/my-books?book=${book.id}`}>
        In My Books
      </Link>
    )
  }

  async function add(status) {
    setBusy(status)
    setError(null)
    try {
      const entry = await addToCollection(book.id, status)
      setOpen(false)
      onAdded?.(entry)
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="add-control" ref={box}>
      <button
        type="button"
        className="button-small"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((was) => !was)}
        disabled={Boolean(busy)}
      >
        <Icon name="plus" />
        {busy ? 'Adding...' : 'Add to My Books'}
      </button>
      {open && (
        <ul className="add-menu" aria-label={`Add ${book.title} as`}>
          {STATUSES.map((status) => (
            <li key={status}>
              <button type="button" onClick={() => add(status)} disabled={Boolean(busy)}>
                {STATUS_LABELS[status]}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="error error-inline" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}
