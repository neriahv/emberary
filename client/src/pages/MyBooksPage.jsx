import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listMyBooks, STATUSES, STATUS_LABELS } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import BookCard from '../components/BookCard.jsx'
import BookDetailPanel from '../components/BookDetailPanel.jsx'
import Icon from '../components/Icon.jsx'
import { BooksArt } from '../components/Illustrations.jsx'
import { filterBooks, sortBooks } from './filterBooks.js'

const RATINGS = ['any', 'unrated', '5', '4', '3', '2', '1']
const SORTS = ['updated', 'title', 'author', 'rating', 'progress', 'pages']

// The traditional half of Emberary: your collection, sorted into the four
// reading statuses. Filters and the selected book live in the URL.
export default function MyBooksPage() {
  const result = useAsync(listMyBooks)
  const [params, setParams] = useSearchParams()

  const tab = STATUSES.includes(params.get('status'))
    ? params.get('status')
    : 'all'
  const selectedId = params.get('book')

  const genre = params.get('genre') || 'all'
  const rating = RATINGS.includes(params.get('rating'))
    ? params.get('rating')
    : 'any'
  const sort = SORTS.includes(params.get('sort'))
    ? params.get('sort')
    : 'updated'

  const [filter, setFilter] = useState('')

  const entries = result.data ?? []

  // Build the genre choices from the reader's own books.
  const genres = [...new Set(
    entries.map((entry) => entry.book.genre).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))

  const visible = sortBooks(
    filterBooks(entries, { tab, search: filter, genre, rating }),
    sort
  )

  const selected = entries.find((e) => e.bookId === selectedId)

  // Sorting doesn't count as filtering because it doesn't hide books.
  const hasFilters =
    filter.trim() !== '' ||
    genre !== 'all' ||
    rating !== 'any'

  const countFor = (status) =>
    entries.filter((e) => e.status === status).length

  const tabCount = tab === 'all' ? entries.length : countFor(tab)

  function update(next) {
    const merged = new URLSearchParams(params)

    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }

    setParams(merged, { replace: true })
  }

  function clearFilters() {
    setFilter('')
    update({ genre: null, rating: null })
  }

  function handleSaved(saved) {
    result.setData((rows) =>
      rows.map((row) => (row.bookId === saved.bookId ? saved : row))
    )
  }

  function handleRemoved(bookId) {
    result.setData((rows) => rows.filter((row) => row.bookId !== bookId))
    update({ book: null })
  }

  return (
    <>
      <div className="page-banner">
        <div>
          <h1>My Books</h1>
          <p className="lede">
            Everything on your shelves, sorted by where you are with it.
          </p>
        </div>
        <BooksArt className="page-banner-art" />
      </div>

      <div className="tabs" role="tablist" aria-label="Reading status">
        {['all', ...STATUSES].map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={tab === status}
            className="tab"
            onClick={() =>
              update({
                status: status === 'all' ? null : status,
                book: null
              })
            }
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
            {result.status === 'ready' && (
              <span className="tab-count">
                {status === 'all' ? entries.length : countFor(status)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" />
          <label
            htmlFor="my-books-search"
            className="visually-hidden"
          >
            Search your books
          </label>
          <input
            id="my-books-search"
            type="search"
            placeholder="Search your books"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>

        <div className="filter-field">
          <label
            htmlFor="my-books-genre"
            className="visually-hidden"
          >
            Filter by genre
          </label>
          <select
            id="my-books-genre"
            value={genre}
            onChange={(event) =>
              update({
                genre: event.target.value === 'all'
                  ? null
                  : event.target.value
              })
            }
          >
            <option value="all">All genres</option>
            {genres.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            {genre !== 'all' && !genres.includes(genre) && (
              <option value={genre}>{genre}</option>
            )}
          </select>
        </div>

        <div className="filter-field">
          <label
            htmlFor="my-books-rating"
            className="visually-hidden"
          >
            Filter by rating
          </label>
          <select
            id="my-books-rating"
            value={rating}
            onChange={(event) =>
              update({
                rating: event.target.value === 'any'
                  ? null
                  : event.target.value
              })
            }
          >
            <option value="any">Any rating</option>
            <option value="unrated">Unrated</option>
            <option value="5">5★</option>
            <option value="4">4★ and up</option>
            <option value="3">3★ and up</option>
            <option value="2">2★ and up</option>
            <option value="1">1★ and up</option>
          </select>
        </div>

        <div className="filter-field">
          <label
            htmlFor="my-books-sort"
            className="visually-hidden"
          >
            Sort books
          </label>
          <select
            id="my-books-sort"
            value={sort}
            onChange={(event) =>
              update({
                sort: event.target.value === 'updated'
                  ? null
                  : event.target.value
              })
            }
          >
            <option value="updated">Recently updated</option>
            <option value="title">Title A–Z</option>
            <option value="author">Author A–Z</option>
            <option value="rating">Highest rated</option>
            <option value="progress">Furthest along</option>
            <option value="pages">Longest first</option>
          </select>
        </div>

        <Link className="button" to="/discover">
          <Icon name="plus" />
          Add Book
        </Link>
      </div>

      <AsyncState {...result} label="Loading your books" />

      {result.status === 'ready' && entries.length === 0 && (
        <p className="empty">
          Your collection is empty.{' '}
          <Link to="/discover">Find a book on Discover</Link> to start.
        </p>
      )}

      {result.status === 'ready' && entries.length > 0 && (
        <>
          {hasFilters && (
            <div className="filter-summary">
              <span aria-live="polite" aria-atomic="true">
                {hasFilters
                  ? `Showing ${visible.length} of ${tabCount} books`
                  : ''}
              </span>

              {hasFilters && visible.length > 0 && (
                <button
                  type="button"
                  className="button-quiet button-small"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          <div className={`split${selected ? ' has-detail' : ''}`}>
            <div>
              {visible.length === 0 ? (
                <div className="empty">
                  {tabCount === 0 ? (
                    <p>
                      No books marked {STATUS_LABELS[tab]} yet.
                    </p>
                  ) : (
                    <>
                      <p>No books match these filters.</p>
                        <button
                          type="button"
                          className="button-quiet button-small"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="book-grid">
                  {visible.map((entry) => (
                    <BookCard
                      key={entry.bookId}
                      entry={entry}
                      selected={entry.bookId === selectedId}
                      onSelect={(id) =>
                        update({
                          book: id === selectedId ? null : id
                        })
                      }
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
        </>
      )}
    </>
  )
}
