import { DailyQuests, ReadingTimer } from '../components/ReaderTools.jsx'
import { Link } from 'react-router-dom'
import { listMyBooks, getReadingStats, getRecommendations, getProfile } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import BookCover from '../components/BookCover.jsx'
import BookTile from '../components/BookTile.jsx'
import Icon from '../components/Icon.jsx'
import { RoomArt } from '../components/Illustrations.jsx'
import mark from '../assets/emberary-mark.svg'
import ProgressBar from '../components/ProgressBar.jsx'
import StatCard from '../components/StatCard.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const QUICK_LINKS = [
  { to: '/my-books', label: 'My Books', icon: 'books' },
  { to: '/discover', label: 'Discover', icon: 'discover' },
  { to: '/library-room', label: 'Library Room', icon: 'room' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
]

// The dashboard, laid out like the wireframe: a welcome, where you are in your
// current books beside quick links, what to read next, then your numbers
// beside the way into the Library Room.
export default function HomePage() {
  const profile = useAsync(getProfile)
  const books = useAsync(listMyBooks)
  const stats = useAsync(getReadingStats)
  const recs = useAsync(() => getRecommendations(5))

  const reading = (books.data ?? []).filter((e) => e.status === 'currently-reading')
  // listMyBooks is already newest-first by last update.
  const recent = (books.data ?? []).slice(0, 5)
  const next = reading[0]

  return (
    <>
      <section className="hero" aria-labelledby="welcome-heading">
        <div className="hero-text">
          <p className="eyebrow">Your reading nook</p>
          <h1 id="welcome-heading">
            {profile.status === 'ready' ? `Welcome back, ${profile.data.displayName}` : 'Welcome back'}
          </h1>
          <p className="lede">Pick up where you left off, or find something new to curl up with.</p>
          <div className="hero-actions">
            <Link className="button" to={next ? `/my-books?book=${next.bookId}` : '/discover'}>
              {next ? 'Continue reading' : 'Find a book'}
              <Icon name="arrow" />
            </Link>
            <Link className="button-quiet" to="/library-room">
              Enter your Library Room
            </Link>
          </div>
        </div>
        {/* Emberary's little flame, glowing over its book. */}
        <div className="hero-mascot" aria-hidden="true">
          <img src={mark} alt="" />
        </div>
      </section>

      <div className="feature-stack">
        <DailyQuests />
        <ReadingTimer />
      </div>
      <div className="home-row">
        <section className="card panel" aria-labelledby="reading-heading">
          <div className="section-head">
            <h2 id="reading-heading">Currently Reading</h2>
            <Link to="/my-books?status=currently-reading">View all</Link>
          </div>
          <AsyncState {...books} label="Loading your books" />
          {books.status === 'ready' && reading.length === 0 && (
            <p className="empty">
              Nothing on the go.{' '}
              <Link to="/my-books?status=want-to-read">Start something from Want to Read</Link>.
            </p>
          )}
          {/* The two most recently updated, so the card stays compact. */}
          {books.status === 'ready' && reading.length > 0 && (
            <ul className="reading-list">
              {reading.slice(0, 2).map((entry) => (
                <li key={entry.bookId} className="reading-item">
                  <BookCover book={entry.book} size="sm" />
                  <div>
                    <h3 className="book-card-title">{entry.book.title}</h3>
                    <p className="book-card-author">{entry.book.author}</p>
                    <ProgressBar
                      value={entry.currentPage}
                      max={entry.book.pages}
                      label={`Progress in ${entry.book.title}`}
                    />
                  </div>
                  <Link className="button-quiet button-small" to={`/my-books?book=${entry.bookId}`}>
                    Update
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {books.status === 'ready' && reading.length > 2 && (
            <Link className="more-link" to="/my-books?status=currently-reading">
              and {reading.length - 2} more you are reading
            </Link>
          )}
        </section>

        <section className="card panel" aria-labelledby="quick-heading">
          <h2 id="quick-heading">Quick Access</h2>
          <ul className="quick-grid">
            {QUICK_LINKS.map((link) => (
              <li key={link.to}>
                <Link className="quick-tile" to={link.to}>
                  <span className="quick-icon">
                    <Icon name={link.icon} />
                  </span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="section" aria-labelledby="home-recs-heading">
        <div className="section-head">
          <h2 id="home-recs-heading">Recommended Books</h2>
          <Link to="/discover">See more</Link>
        </div>
        <AsyncState {...recs} label="Finding recommendations" />
        {recs.status === 'ready' && recs.data.length === 0 && (
          <p className="empty">No recommendations right now.</p>
        )}
        {recs.status === 'ready' && recs.data.length > 0 && (
          <ul className="book-tiles">
            {recs.data.map(({ book, reason }) => (
              <BookTile key={book.id} book={book} to={`/discover?q=${encodeURIComponent(book.title)}`}>
                <span className="rec-reason">{reason}</span>
              </BookTile>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="recent-heading">
        <div className="section-head">
          <h2 id="recent-heading">Recently Updated</h2>
          <Link to="/my-books">My Books</Link>
        </div>
        {books.status === 'ready' && recent.length === 0 && <p className="empty">No books yet.</p>}
        {books.status === 'ready' && recent.length > 0 && (
          <ul className="book-tiles">
            {recent.map((entry) => (
              <BookTile key={entry.bookId} book={entry.book} to={`/my-books?book=${entry.bookId}`}>
                <StatusBadge status={entry.status} />
              </BookTile>
            ))}
          </ul>
        )}
      </section>

      <div className="home-row home-row-even">
        <section className="card panel" aria-labelledby="stats-heading">
          <div className="section-head">
            <h2 id="stats-heading">Your Stats</h2>
            <Link to="/profile">Insights</Link>
          </div>
          <AsyncState {...stats} label="Counting your books" />
          {stats.status === 'ready' && (
            <div className="stat-grid">
              <StatCard label="Books read" value={stats.data.read} />
              <StatCard label="Pages read" value={stats.data.pagesRead.toLocaleString()} />
              <StatCard label="In library" value={stats.data.total} />
              <StatCard label="Want to Read" value={stats.data.wantToRead} />
            </div>
          )}
        </section>

        <section className="card panel room-card" aria-labelledby="room-heading">
          <h2 id="room-heading">Your Library Room</h2>
          <div className="room-card-body">
            <RoomArt className="room-card-art" />
            <div>
              <p className="muted">
                Every book you have started, standing on real shelves. Furnish it with the Ember you
                earn by reading.
              </p>
              <Link className="button" to="/library-room">
                Enter Room
                <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
