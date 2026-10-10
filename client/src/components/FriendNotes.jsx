import { getFriendNotes } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from './AsyncState.jsx'
import Icon from './Icon.jsx'

// Read-only notes and quotes belonging to a friend's shelved book.
export default function FriendNotes({ friendId, bookId }) {
  const notes = useAsync(
    () => getFriendNotes(friendId, bookId),
    [friendId, bookId]
  )

  return (
    <section className="book-notes" aria-labelledby="friend-notes-title">
      <h3 id="friend-notes-title">Notes &amp; favourite quotes</h3>

      {!notes.data && (
        <AsyncState {...notes} label="Loading notes" />
      )}

      {notes.data?.length === 0 && (
        <p className="muted">
          No notes or quotes shared for this book yet.
        </p>
      )}

      {notes.data?.length > 0 && (
        <ul className="notes-list">
          {notes.data.map((note) => (
            <li
              key={note.id}
              className={`note-card is-${note.kind}`}
            >
              {note.kind === 'quote' ? (
                <blockquote>{note.text}</blockquote>
              ) : (
                <p>{note.text}</p>
              )}

              <div className="note-meta">
                <span>
                  <Icon name={note.kind === 'quote' ? 'quote' : 'note'} />
                  {note.kind === 'quote' ? 'Quote' : 'Note'}
                  {note.page ? ` · page ${note.page}` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
