import { Link } from 'react-router-dom'
import { listMyBooks, getReadingStats, getRecommendations, getProfile } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import BookCover from '../components/BookCover.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

// The dashboard: where you are in your current books, a summary of the
// library, what changed recently, and what to read next.
export default function HomePage() {
  const profile = useAsync(getProfile)
  const books = useAsync(listMyBooks)
  const stats = useAsync(getReadingStats)
  const recs = useAsync(() => getRecommendations(3))

  const reading = (books.data ?? []).filter((e) => e.status === 'currently-reading')
  // listMyBooks is already newest-first by last update.
  const recent = (books.data ?? []).slice(0, 4)

  return (
    <>
      <div className="page-head">
        <h1>
          {profile.status === 'ready' ? `Welcome back, ${profile.data.displayName}` : 'Welcome back'}
        </h1>
        <p className="lede">Pick up where you left off, or find something new.</p>
      </div>

      <section className="section" aria-labelledby="reading-heading">
        <div className="section-head">
          <h2 id="reading-heading">Currently Reading</h2>
          <Link to="/my-books?status=currently-reading">See all</Link>
        </div>
        <AsyncState {...books} label="Loading your books" />
        {books.status === 'ready' && reading.length === 0 && (
          <p className="empty">
            Nothing on the go. <Link to="/my-books?status=want-to-read">Start something from Want to Read</Link>.
          </p>
        )}
        {books.status === 'ready' && reading.length > 0 && (
          <ul className="reading-list">
            {reading.map((entry) => (
              <li key={entry.bookId} className="card reading-item">
                <BookCover book={entry.book} size="sm" />
                <div>
                  <h3 className="book-card-title">{entry.book.title}</h3>
                  <p className="book-card-author">{entry.book.author}</p>
                  <ProgressBar
                    value={entry.currentPage}
                    max={entry.book.pages}
                    label={`Progress in ${entry.book.title}`}
                  />
                  <Link className="button-quiet" to={`/my-books?book=${entry.bookId}`}>
                    Update progress
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="stats-heading">
        <div className="section-head">
          <h2 id="stats-heading">Your library</h2>
          <Link to="/profile">Reading insights</Link>
        </div>
        <AsyncState {...stats} label="Counting your books" />
        {stats.status === 'ready' && (
          <div className="stat-grid">
            <StatCard label="Books in library" value={stats.data.total} />
            <StatCard label="Read" value={stats.data.read} />
            <StatCard label="Want to Read" value={stats.data.wantToRead} />
            <StatCard label="Pages read" value={stats.data.pagesRead.toLocaleString()} />
          </div>
        )}
      </section>

      <div className="two-col">
        <section className="section" aria-labelledby="recent-heading">
          <h2 id="recent-heading">Recently updated</h2>
          {books.status === 'ready' && recent.length === 0 && (
            <p className="empty">No books yet.</p>
          )}
          {books.status === 'ready' && recent.length > 0 && (
            <ul className="compact-list">
              {recent.map((entry) => (
                <li key={entry.bookId}>
                  <Link to={`/my-books?book=${entry.bookId}`}>{entry.book.title}</Link>
                  <StatusBadge status={entry.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section" aria-labelledby="home-recs-heading">
          <div className="section-head">
            <h2 id="home-recs-heading">Recommended</h2>
            <Link to="/discover">Discover more</Link>
          </div>
          <AsyncState {...recs} label="Finding recommendations" />
          {recs.status === 'ready' && recs.data.length === 0 && (
            <p className="empty">No recommendations right now.</p>
          )}
          {recs.status === 'ready' && recs.data.length > 0 && (
            <ul className="compact-list">
              {recs.data.map(({ book, reason }) => (
                <li key={book.id}>
                  <span>
                    <Link to={`/discover?q=${encodeURIComponent(book.title)}`}>{book.title}</Link>
                    <span className="muted"> · {book.author}</span>
                  </span>
                  <span className="rec-reason">{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="section" aria-labelledby="quick-heading">
        <h2 id="quick-heading">Jump to</h2>
        <div className="quick-links">
          <Link className="quick-link card" to="/library-room">
            <strong>Library Room</strong>
            <span>Walk your shelves in 3D</span>
          </Link>
          <Link className="quick-link card" to="/discover">
            <strong>Discover</strong>
            <span>Search and add books</span>
          </Link>
          <Link className="quick-link card" to="/my-books">
            <strong>My Books</strong>
            <span>Status, progress and reviews</span>
          </Link>
          <Link className="quick-link card" to="/profile">
            <strong>Profile</strong>
            <span>Your reading insights</span>
          </Link>
        </div>
      </section>
    </>
  )
}
