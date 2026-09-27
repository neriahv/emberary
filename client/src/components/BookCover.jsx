import { useState } from 'react'

// The book's real cover when it has one (see server/db/fetch-covers.js), and a
// drawn cover in the book's colour when it does not, or when the image fails to
// load. The drawn one is always there underneath, so a slow image never leaves
// an empty box.
export default function BookCover({ book, size = 'md' }) {
  const [failed, setFailed] = useState(false)
  const showImage = book.coverUrl && !failed

  return (
    <div
      className={`book-cover book-cover-${size}${showImage ? ' has-image' : ''}`}
      style={{ '--cover': book.color }}
      role="img"
      aria-label={`Cover of ${book.title} by ${book.author}`}
    >
      <span className="book-cover-title">{book.title}</span>
      <span className="book-cover-author">{book.author}</span>
      {showImage && (
        <img
          className="book-cover-image"
          src={book.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
