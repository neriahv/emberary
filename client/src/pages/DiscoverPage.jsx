import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listBooks, searchBooks, listMyBooks, getRecommendations } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import BookCard from '../components/BookCard.jsx'
import BookCover from '../components/BookCover.jsx'
import AddToCollection from '../components/AddToCollection.jsx'
import Icon from '../components/Icon.jsx'

const GENRES = ['Classic', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Science Fiction']

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const genre = params.get('genre') ?? ''
  const [draft, setDraft] = useState(query)
  const [selectedId, setSelectedId] = useState(null)

  // Search as you type, but wait for a pause so the real API is not hit on
  // every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== query) setFilter('q', draft)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  function setFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  // A search or a genre goes to Google Books; with neither, Discover shows the
  // books already on Emberary's shelf.
  const searching = Boolean(query.trim() || genre)
  const results = useAsync(
    () => (searching ? searchBooks({ query, genre }) : listBooks()),
    [query, genre]
  )
  const mine = useAsync(listMyBooks)
  const recs = useAsync(() => getRecommendations(4))

  // The demo falls back to its own shelf when Google refuses it.
  const fromGoogle = searching && results.data?.source !== 'catalogue'

  const owned = new Set((mine.data ?? []).map((e) => e.bookId))
  const selected = (results.data ?? []).find((b) => b.id === selectedId)

  function handleAdded(entry) {
    mine.setData((rows) => [entry, ...(rows ?? [])])
    recs.reload()
  }

  const recommended = (
    <section aria-labelledby="recs-heading" className="section feature-panel">
      <h2 id="recs-heading">Recommended for You</h2>
      <AsyncState {...recs} label="Finding recommendations" />
      {recs.status === 'ready' && recs.data.length === 0 && (
        <p className="empty">You own every book in the catalogue. Impressive.</p>
      )}
      {recs.status === 'ready' && recs.data.length > 0 && (
        <ul className="rec-row">
          {recs.data.map(({ book, reason }) => (
            <li key={book.id} className="rec card">
              <BookCover book={book} size="sm" />
              <div>
                <h3 className="book-card-title">{book.title}</h3>
                <p className="book-card-author">{book.author}</p>
                <p className="rec-reason">{reason}</p>
                <AddToCollection book={book} owned={owned.has(book.id)} onAdded={handleAdded} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  const found = (
    <section aria-labelledby="results-heading" className="section">
      <h2 id="results-heading">
        {fromGoogle ? 'From Google Books' : "On Emberary's shelf"}
        {results.status === 'ready' && <span className="muted"> · {results.data.length}</span>}
      </h2>

      <AsyncState {...results} label={searching ? 'Searching Google Books' : 'Loading the catalogue'} />
      {searching && results.status === 'ready' && !fromGoogle && (
        <p className="demo-notice">
          Google Books is not answering the demo right now (without a key it shares a small daily
          limit with everyone), so these are matches from Emberary's own shelf. The live app searches
          all of Google Books with its own key.
        </p>
      )}

      {results.status === 'ready' && results.data.length === 0 && (
        <p className="empty">
          No books match {query ? `"${query}"` : 'that filter'}
          {genre ? ` in ${genre}` : ''}. Try a shorter search or another genre.
        </p>
      )}

      {results.status === 'ready' && results.data.length > 0 && (
        <div className={`split${selected ? ' has-detail' : ''}`}>
          <div className="book-grid">
            {results.data.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                selected={book.id === selectedId}
                onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              >
                <AddToCollection book={book} owned={owned.has(book.id)} onAdded={handleAdded} />
              </BookCard>
            ))}
          </div>

          {selected && (
            <section className="detail-panel card" aria-labelledby="discover-detail">
              <div className="detail-head">
                <BookCover book={selected} size="md" />
                <div>
                  <h2 id="discover-detail">{selected.title}</h2>
                  <p className="detail-author">
                    {selected.author}
                    {selected.year ? ` · ${selected.year}` : ''}
                  </p>
                  <p className="book-card-meta">
                    {selected.genre} · {selected.pages} pages
                  </p>
                </div>
                <button
                  type="button"
                  className="button-quiet detail-close"
                  onClick={() => setSelectedId(null)}
                >
                  Close
                </button>
              </div>
              <p className="detail-description">{selected.description}</p>
              <AddToCollection
                book={selected}
                owned={owned.has(selected.id)}
                onAdded={handleAdded}
              />
            </section>
          )}
        </div>
      )}
    </section>
  )

  return (
    <>
      <div className="page-head">
        <h1>Discover</h1>
        <p className="lede">Search every book on Google Books by title or author, or browse by genre.</p>
      </div>

      <form
        className="search-bar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          setFilter('q', draft)
        }}
      >
        <div className="search-field">
          <Icon name="search" />
          <label htmlFor="search" className="visually-hidden">
            Search books
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search by title or author"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <button type="submit">Search</button>
      </form>

      <div className="genre-chips" role="group" aria-label="Genre">
        {['', ...GENRES].map((g) => (
          <button
            key={g || 'all'}
            type="button"
            className="chip"
            aria-pressed={genre === g}
            onClick={() => setFilter('genre', g)}
          >
            {g || 'All'}
          </button>
        ))}
      </div>

      {/* While searching, the results come first; otherwise the recommendations do. */}
      {searching ? found : recommended}
      {searching ? recommended : found}
    </>
  )
}
