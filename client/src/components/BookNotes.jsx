import { useState } from 'react'
import { getNotes, addNote, deleteNote } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from './AsyncState.jsx'
import Icon from './Icon.jsx'

// A reader's notes and favourite lines from one book, newest first.
export default function BookNotes({ book }) {
  const notes = useAsync(() => getNotes(book.id), [book.id])
  const [text, setText] = useState('')
  const [page, setPage] = useState('')
  const [kind, setKind] = useState('quote')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function add(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addNote(book.id, { text, page: page === '' ? null : Number(page), kind })
      setText('')
      setPage('')
      await notes.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    setBusy(true)
    setError('')
    try {
      await deleteNote(book.id, id)
      await notes.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="book-notes" aria-labelledby={`notes-${book.id}`}>
      <h3 id={`notes-${book.id}`}>Notes &amp; favourite quotes</h3>
      {!notes.data && <AsyncState {...notes} label="Loading notes" />}
      {notes.data?.length > 0 && (
        <ul className="notes-list">
          {notes.data.map((n) => (
            <li key={n.id} className={`note-card is-${n.kind}`}>
              {n.kind === 'quote' ? <blockquote>{n.text}</blockquote> : <p>{n.text}</p>}
              <div className="note-meta">
                <span>
                  <Icon name={n.kind === 'quote' ? 'quote' : 'note'} />
                  {n.kind === 'quote' ? 'Quote' : 'Note'}
                  {n.page ? ` · page ${n.page}` : ''}
                </span>
                <button
                  type="button"
                  className="note-delete"
                  aria-label={`Delete this ${n.kind}`}
                  disabled={busy}
                  onClick={() => remove(n.id)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="note-form" onSubmit={add}>
        <div className="segmented-tabs" role="group" aria-label="Kind">
          {['quote', 'note'].map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              <Icon name={k === 'quote' ? 'quote' : 'note'} />
              {k === 'quote' ? 'Quote' : 'Note'}
            </button>
          ))}
        </div>
        <label htmlFor={`note-text-${book.id}`} className="visually-hidden">
          {kind === 'quote' ? 'The line you loved' : 'Your note'}
        </label>
        <textarea
          id={`note-text-${book.id}`}
          rows={3}
          required
          maxLength={2000}
          placeholder={kind === 'quote' ? 'A line you want to keep…' : 'A thought about this book…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="note-form-row">
          <label htmlFor={`note-page-${book.id}`}>Page</label>
          <input
            id={`note-page-${book.id}`}
            type="number"
            min="1"
            max={book.pages}
            placeholder="optional"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
          <button className="button-small" disabled={busy || !text.trim()}>
            Save {kind}
          </button>
        </div>
        {error && (
          <p className="error error-inline" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
