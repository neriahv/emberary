import { Link, useSearchParams } from 'react-router-dom'
import { listMyBooks, STATUSES, STATUS_LABELS } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import BookCard from '../components/BookCard.jsx'
import BookDetailPanel from '../components/BookDetailPanel.jsx'

// The traditional half of Emberary: your collection, sorted into the four
// reading statuses. The tab and selected book live in the URL, so a link from
// the Home page or the Library Room can open a specific book.
export default function MyBooksPage() {
  const result = useAsync(listMyBooks)
  const [params, setParams] = useSearchParams()
  const tab = STATUSES.includes(params.get('status')) ? params.get('status') : 'all'
  const selectedId = params.get('book')

  const entries = result.data ?? []
  const visible = tab === 'all' ? entries : entries.filter((e) => e.status === tab)
  const selected = entries.find((e) => e.bookId === selectedId)

  function update(next) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }
    setParams(merged, { replace: true })
  }

  function handleSaved(saved) {
    result.setData((rows) => rows.map((row) => (row.bookId === saved.bookId ? saved : row)))
  }

  function handleRemoved(bookId) {
    result.setData((rows) => rows.filter((row) => row.bookId !== bookId))
    update({ book: null })
  }

  const countFor = (status) => entries.filter((e) => e.status === status).length

  return (
    <>
      <div className="page-head">
        <h1>My Books</h1>
        <p className="lede">Everything on your shelves, sorted by where you are with it.</p>
      </div>

      <div className="tabs" role="tablist" aria-label="Reading status">
        {['all', ...STATUSES].map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={tab === status}
            className="tab"
            onClick={() => update({ status: status === 'all' ? null : status, book: null })}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
            {result.status === 'ready' && (
              <span className="tab-count">{status === 'all' ? entries.length : countFor(status)}</span>
            )}
          </button>
        ))}
      </div>

      <AsyncState {...result} label="Loading your books" />

      {result.status === 'ready' && entries.length === 0 && (
        <p className="empty">
          Your collection is empty. <Link to="/discover">Find a book on Discover</Link> to start.
        </p>
      )}

      {result.status === 'ready' && entries.length > 0 && (
        <div className={`split${selected ? ' has-detail' : ''}`}>
          <div>
            {visible.length === 0 ? (
              <p className="empty">No books marked {STATUS_LABELS[tab]} yet.</p>
            ) : (
              <div className="book-grid">
                {visible.map((entry) => (
                  <BookCard
                    key={entry.bookId}
                    entry={entry}
                    selected={entry.bookId === selectedId}
                    onSelect={(id) => update({ book: id === selectedId ? null : id })}
                  />
                ))}
              </div>
            )}
          </div>

          {selected && (
            <BookDetailPanel
              key={selected.bookId}
              entry={selected}
              onSaved={handleSaved}
              onRemoved={handleRemoved}
              onClose={() => update({ book: null })}
            />
          )}
        </div>
      )}
    </>
  )
}
