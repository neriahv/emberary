import { Link } from 'react-router-dom'
import BookCover from './BookCover.jsx'

// A book standing on its own, cover first, for rows like "Recently updated".
// The whole tile is one link; `children` adds a line under the author, such
// as a status badge or why it was recommended.
export default function BookTile({ book, to, children }) {
  return (
    <li className="book-tile">
      <Link to={to} className="book-tile-link">
        <BookCover book={book} size="md" />
        <span className="book-tile-title">{book.title}</span>
        <span className="book-tile-author">{book.author}</span>
      </Link>
      {children && <div className="book-tile-extra">{children}</div>}
    </li>
  )
}
