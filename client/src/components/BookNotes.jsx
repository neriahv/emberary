import { useState } from 'react'
import { getNotes, addNote, deleteNote } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from './AsyncState.jsx'
export default function BookNotes({ book }) {
  const notes = useAsync(() => getNotes(book.id), [book.id])
  const [text, setText] = useState(''),
    [page, setPage] = useState(''),
    [kind, setKind] = useState('quote'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function add(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await addNote(book.id, {
        text,
        page: page === '' ? null : Number(page),
        kind,
      })
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
    <section className="section">
      <h3>Notes & favourite quotes</h3>
      <AsyncState {...notes} label="Loading notes" />
      <ul className="notes-list">
        {notes.data?.map((n) => (
          <li key={n.id}>
            <p>{n.kind === 'quote' ? `“${n.text}”` : n.text}</p>
            <p className="muted">
              {n.page ? `Page ${n.page}` : 'No page'} · {n.kind}{' '}
              <button className="button-quiet button-small" disabled={busy} onClick={() => remove(n.id)}>
                Delete
              </button>
            </p>
          </li>
        ))}
      </ul>
      <form className="form" onSubmit={add}>
        <label>
          Kind
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="quote">Quote</option>
            <option value="note">Note</option>
          </select>
        </label>
        <label>
          Text
          <textarea required maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label>
          Page (optional)
          <input
            type="number"
            min="1"
            max={book.pages}
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
        </label>
        <button disabled={busy || !text.trim()}>Save {kind}</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  )
}
