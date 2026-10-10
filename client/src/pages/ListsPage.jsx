import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getLists, createList, renameList, deleteList, setListBook, listMyBooks } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import BookCover from '../components/BookCover.jsx'
import Icon from '../components/Icon.jsx'
import { BooksArt } from '../components/Illustrations.jsx'

// Lists the reader makes from their own books: summer reads, favourites,
// anything. The open list is in the URL, so it survives a refresh.
export default function ListsPage() {
  const lists = useAsync(getLists)
  const books = useAsync(listMyBooks)
  const [params, setParams] = useSearchParams()
  const [name, setName] = useState('')
  const [rename, setRename] = useState(null)
  const [find, setFind] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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

  function open(list) {
    setParams(list ? { list: String(list.id) } : {})
    setRename(null)
    setFind('')
  }

  const inList = (books.data ?? []).filter((e) => selected?.bookIds.includes(e.bookId))
  const needle = find.trim().toLowerCase()
  const addable = (books.data ?? []).filter(
    (e) =>
      selected &&
      !selected.bookIds.includes(e.bookId) &&
      (!needle || `${e.book.title} ${e.book.author}`.toLowerCase().includes(needle))
  )

  return (
    <>
      <div className="page-banner">
        <div>
          <h1>Book lists</h1>
          <p className="lede">Summer reads, old favourites, and everything you want to return to.</p>
        </div>
        <BooksArt className="page-banner-art" />
      </div>

      <div className="lists-layout">
        <aside className="card lists-side" aria-label="Your lists">
          <form
            className="list-create"
            onSubmit={(e) => {
              e.preventDefault()
              perform(async () => {
                const list = await createList(name)
                setName('')
                open(list)
              })
            }}
          >
            <label htmlFor="new-list">New list name</label>
            <div className="list-create-row">
              <input
                id="new-list"
                required
                maxLength={60}
                placeholder="Rainy-day reads"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button disabled={busy || !name.trim()}>
                <Icon name="plus" />
                Create list
              </button>
            </div>
          </form>

          {!lists.data && <AsyncState {...lists} label="Loading lists" />}
          {lists.data?.length === 0 && <p className="muted lists-none">No lists yet. Name your first one above.</p>}
          {lists.data?.length > 0 && (
            <ul className="list-picker">
              {lists.data.map((l) => (
                <li key={l.id}>
                  <button type="button" aria-pressed={l === selected} onClick={() => open(l)}>
                    <Icon name="list" />
                    <span className="list-picker-name">{l.name}</span>
                    <span className="tab-count">{l.bookIds.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="card panel list-detail" aria-live="polite">
          {!selected ? (
            <div className="list-empty">
              <BooksArt className="list-empty-art" />
              <p>{lists.data?.length ? 'Open a list to see its books.' : 'Make a list, then add books from My Books.'}</p>
            </div>
          ) : (
            <>
              <div className="list-head">
                {rename === null ? (
                  <>
                    <h2>{selected.name}</h2>
                    <div className="list-head-actions">
                      <button type="button" className="button-quiet button-small" onClick={() => setRename(selected.name)}>
                        <Icon name="pencil" />
                        Rename
                      </button>
                      <button
                        type="button"
                        className="button-danger button-small"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Delete “${selected.name}”? Your books stay in My Books.`))
                            perform(async () => {
                              await deleteList(selected.id)
                              open(null)
                            })
                        }}
                      >
                        <Icon name="trash" />
                        Delete list
                      </button>
                    </div>
                  </>
                ) : (
                  <form
                    className="list-rename"
                    onSubmit={(e) => {
                      e.preventDefault()
                      perform(async () => {
                        await renameList(selected.id, rename)
                        setRename(null)
                      })
                    }}
                  >
                    <label htmlFor="rename-list" className="visually-hidden">
                      Rename list
                    </label>
                    <input
                      id="rename-list"
                      required
                      maxLength={60}
                      autoFocus
                      value={rename}
                      onChange={(e) => setRename(e.target.value)}
                    />
                    <button className="button-small" disabled={busy || !rename.trim()}>
                      Save
                    </button>
                    <button type="button" className="button-quiet button-small" onClick={() => setRename(null)}>
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              {inList.length === 0 ? (
                <p className="empty list-waiting">This list is waiting for its first book.</p>
              ) : (
                <ul className="list-books">
                  {inList.map((e) => (
                    <li key={e.bookId}>
                      <Link to={`/my-books?book=${encodeURIComponent(e.bookId)}`} className="list-book">
                        <BookCover book={e.book} size="md" />
                        <span className="book-tile-title">{e.book.title}</span>
                        <span className="book-tile-author">{e.book.author}</span>
                      </Link>
                      <button
                        type="button"
                        className="button-quiet button-small"
                        disabled={busy}
                        onClick={() => perform(() => setListBook(selected.id, e.bookId, false))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <h3>Add from My Books</h3>
              {!books.data && <AsyncState {...books} label="Loading books" />}
              {books.data?.length > 0 && (
                <div className="search-field list-find">
                  <Icon name="search" />
                  <label htmlFor="list-find" className="visually-hidden">
                    Find a book to add
                  </label>
                  <input
                    id="list-find"
                    type="search"
                    placeholder="Find one of your books"
                    value={find}
                    onChange={(e) => setFind(e.target.value)}
                  />
                </div>
              )}
              {books.data && addable.length === 0 && (
                <p className="muted">
                  {books.data.length === 0 ? (
                    <>
                      Your shelves are empty. <Link to="/discover">Find a book on Discover</Link>.
                    </>
                  ) : needle ? (
                    'No book matches that.'
                  ) : (
                    'Every one of your books is in this list.'
                  )}
                </p>
              )}
              {addable.length > 0 && (
                <ul className="list-add">
                  {addable.map((e) => (
                    <li key={e.bookId}>
                      <BookCover book={e.book} size="xs" />
                      <span className="list-add-text">
                        <strong>{e.book.title}</strong>
                        <span>{e.book.author}</span>
                      </span>
                      <button
                        type="button"
                        className="button-small"
                        disabled={busy}
                        onClick={() => perform(() => setListBook(selected.id, e.bookId, true))}
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {error && (
            <p className="error error-inline" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </>
  )
}
