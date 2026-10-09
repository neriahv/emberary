import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getLists, createList, renameList, deleteList, setListBook, listMyBooks } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
export default function ListsPage() {
  const lists = useAsync(getLists),
    books = useAsync(listMyBooks),
    [params, setParams] = useSearchParams()
  const [name, setName] = useState(''),
    [rename, setRename] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const selected = lists.data?.find((l) => String(l.id) === params.get('list'))
  async function perform(work) {
    setBusy(true)
    setError('')
    try {
      await work()
      await lists.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="page-head">
        <h1>Book lists</h1>
        <p className="lede">Summer reads, old favourites, and everything you want to return to.</p>
      </div>
      <div className="feature-stack">
        <form
          className="card form"
          onSubmit={(e) => {
            e.preventDefault()
            perform(async () => {
              const list = await createList(name)
              setName('')
              setRename(list.name)
              setParams({ list: String(list.id) })
            })
          }}
        >
          <label>
            New list name
            <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button disabled={busy || !name.trim()}>Create list</button>
        </form>
        <AsyncState {...lists} label="Loading lists" />
        <div className="tabs">
          {lists.data?.map((l) => (
            <button
              key={l.id}
              aria-pressed={l === selected}
              onClick={() => {
                setParams({ list: String(l.id) })
                setRename(l.name)
              }}
            >
              {l.name} ({l.bookIds.length})
            </button>
          ))}
        </div>
        {selected && (
          <section className="card panel">
            <h2>{selected.name}</h2>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault()
                perform(() => renameList(selected.id, rename))
              }}
            >
              <label>
                Rename list
                <input required maxLength={60} value={rename} onChange={(e) => setRename(e.target.value)} />
              </label>
              <div className="detail-actions">
                <button disabled={busy || !rename.trim()}>Rename</button>
                <button
                  type="button"
                  className="button-quiet"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Delete “${selected.name}”? Your books stay in My Books.`))
                      perform(async () => {
                        await deleteList(selected.id)
                        setParams({})
                      })
                  }}
                >
                  Delete list
                </button>
              </div>
            </form>
            <h3>Books in this list</h3>
            <ul>
              {books.data
                ?.filter((e) => selected.bookIds.includes(e.bookId))
                .map((e) => (
                  <li key={e.bookId}>
                    <Link to={`/my-books?book=${encodeURIComponent(e.bookId)}`}>{e.book.title}</Link>{' '}
                    <button
                      className="button-quiet"
                      disabled={busy}
                      onClick={() => perform(() => setListBook(selected.id, e.bookId, false))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
            </ul>
            {selected.bookIds.length === 0 && (
              <p className="muted">This list is waiting for its first book.</p>
            )}
            <h3>Add from My Books</h3>
            <AsyncState {...books} label="Loading books" />
            <ul>
              {books.data
                ?.filter((e) => !selected.bookIds.includes(e.bookId))
                .map((e) => (
                  <li key={e.bookId}>
                    {e.book.title}{' '}
                    <button
                      className="button-quiet"
                      disabled={busy}
                      onClick={() => perform(() => setListBook(selected.id, e.bookId, true))}
                    >
                      Add
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </>
  )
}
