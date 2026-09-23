// A drawn cover rather than an image: every book has a colour in the data, and
// the Library Room uses the same colour for its spine, so a book looks like the
// same object on every screen.
export default function BookCover({ book, size = 'md' }) {
  return (
    <div
      className={`book-cover book-cover-${size}`}
      style={{ '--cover': book.color }}
      role="img"
      aria-label={`Cover of ${book.title} by ${book.author}`}
    >
      <span className="book-cover-title">{book.title}</span>
      <span className="book-cover-author">{book.author}</span>
    </div>
  )
}
