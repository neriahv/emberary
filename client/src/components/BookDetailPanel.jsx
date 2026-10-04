import BookCover from './BookCover.jsx'
import BookEditForm from './BookEditForm.jsx'
import ProgressBar from './ProgressBar.jsx'
import StarRating from './StarRating.jsx'
import StatusBadge from './StatusBadge.jsx'

// Everything about one book in your collection, and the form to change it.
// Used by My Books; the Library Room shows the same form inside an open book.
//
// Give it key={entry.bookId} in the parent, so the form resets when a
// different book is selected.
export default function BookDetailPanel({ entry, onSaved, onRemoved, onClose }) {
  const { book } = entry

  return (
    <section className="detail-panel card" aria-labelledby={`detail-${book.id}`}>
      <div className="detail-head">
        <BookCover book={book} size="md" />
        <div>
          <h2 id={`detail-${book.id}`}>{book.title}</h2>
          <p className="detail-author">
            {book.author}
            {book.year ? ` · ${book.year}` : ''}
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

      <BookEditForm entry={entry} onSaved={onSaved} onRemoved={onRemoved} />
    </section>
  )
}
