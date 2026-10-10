import { useId, useRef, useState } from 'react'
import { STATUS_LABELS } from '../../api'
import BookCover from '../BookCover.jsx'
import Icon from '../Icon.jsx'

// "Find a book" in the Library Room: type part of a title or author, and the
// matching books on the shelves appear with their covers. Arrow keys move
// through them, Enter opens one, Escape closes the list. The canvas cannot be
// used with a keyboard or a screen reader, so this is also how they open books.
export default function BookFinder({ entries, onPick, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef(null)
  const listId = useId()

  const needle = query.trim().toLowerCase()
  const matches = entries.filter(
    (e) =>
      !needle ||
      e.book.title.toLowerCase().includes(needle) ||
      e.book.author.toLowerCase().includes(needle)
  )
  const current = Math.min(active, Math.max(matches.length - 1, 0))

  function pick(entry) {
    onPick(entry.bookId)
    setQuery('')
    setOpen(false)
    input.current?.blur()
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current + step + matches.length) % Math.max(matches.length, 1))
    } else if (event.key === 'Enter' && open && matches[current]) {
      event.preventDefault()
      pick(matches[current])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="book-finder">
      <label htmlFor={`${listId}-input`} className="hud-label">
        Find a book
      </label>
      <div className="book-finder-field">
        <Icon name="search" />
        <input
          id={`${listId}-input`}
          ref={input}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[current] ? `${listId}-${matches[current].bookId}` : undefined}
          placeholder={placeholder ?? `Search your ${entries.length} ${entries.length === 1 ? 'book' : 'books'}…`}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && (
        <ul className="book-finder-list" id={listId} role="listbox" aria-label="Books on your shelves">
          {matches.length === 0 && <li className="book-finder-empty">No book on your shelves matches "{query.trim()}".</li>}
          {matches.map((entry, i) => (
            <li
              key={entry.bookId}
              id={`${listId}-${entry.bookId}`}
              role="option"
              aria-selected={i === current}
              className={i === current ? 'is-active' : ''}
              // mousedown, not click: the input's blur would close the list first
              onMouseDown={(event) => {
                event.preventDefault()
                pick(entry)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <BookCover book={entry.book} size="xs" />
              <span className="book-finder-text">
                <strong>{entry.book.title}</strong>
                <span>{entry.book.author}</span>
              </span>
              <span className={`badge badge-${entry.status}`}>{STATUS_LABELS[entry.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
