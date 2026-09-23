import BookCover from './BookCover.jsx'
import ProgressBar from './ProgressBar.jsx'
import StarRating from './StarRating.jsx'
import StatusBadge from './StatusBadge.jsx'

// One book in a grid. Works for a catalogue book (`book` only) and for a
// collection entry (`entry`, which carries status, progress and rating).
//
// `onSelect` makes the whole card a button; `children` is for actions such as
// "Add to My Books" that sit under the details.
export default function BookCard({ book, entry, onSelect, selected = false, children }) {
  const data = entry?.book ?? book

  const body = (
    <>
      <BookCover book={data} size="sm" />
      <div className="book-card-body">
        <h3 className="book-card-title">{data.title}</h3>
        <p className="book-card-author">{data.author}</p>
        <p className="book-card-meta">
          {data.genre} · {data.pages} pages
        </p>
        {entry && (
          <>
            <StatusBadge status={entry.status} />
            {entry.status === 'currently-reading' && (
              <ProgressBar
                value={entry.currentPage}
                max={data.pages}
                label={`Progress in ${data.title}`}
              />
            )}
            {(entry.status === 'read' || entry.status === 'did-not-finish') && (
              <StarRating value={entry.rating} />
            )}
          </>
        )}
      </div>
    </>
  )

  return (
    <article className={`book-card card${selected ? ' is-selected' : ''}`}>
      {onSelect ? (
        <button
          type="button"
          className="book-card-select"
          onClick={() => onSelect(data.id)}
          aria-pressed={selected}
        >
          {body}
        </button>
      ) : (
        <div className="book-card-select">{body}</div>
      )}
      {children && <div className="book-card-actions">{children}</div>}
    </article>
  )
}
