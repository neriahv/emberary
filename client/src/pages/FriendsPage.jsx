import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  USING_MOCK_API,
  searchReaders,
  getFriends,
  sendFriendRequest,
  acceptFriend,
  removeFriend,
} from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'

// Friends, incoming requests and outgoing requests.
// Library visits are read-only and require an accepted friendship.
export default function FriendsPage() {
  const friends = useAsync(getFriends)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const searchVersion = useRef(0)

  // Wait 300 ms after typing stops before searching.
  // Ignore outdated responses when a newer search starts.
  useEffect(() => {
    const term = query.trim()
    const version = ++searchVersion.current

    if (USING_MOCK_API || term.length < 2) {
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError('')

      try {
        const readers = await searchReaders(term)

        if (version === searchVersion.current) {
          setResults(readers)
        }
      } catch (e) {
        if (version === searchVersion.current) {
          setSearchError(e.message)
          setResults([])
        }
      } finally {
        if (version === searchVersion.current) {
          setSearching(false)
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Run an action, reload the lists and show any error.
  async function perform(work) {
    if (busy) return

    setBusy(true)
    setError('')

    try {
      await work()
      await friends.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Send a request and immediately remove the reader from search.
  function addFriend(reader) {
    perform(async () => {
      await sendFriendRequest(reader.id)

      // Invalidate any searches that are still in flight.
      ++searchVersion.current

      // Search excludes readers with existing relationships.
      setResults((current) =>
        current.filter((entry) => entry.id !== reader.id)
      )
      setSearching(false)
    })
  }

  const connections = friends.data?.friends ?? []
  const incoming = friends.data?.incoming ?? []
  const outgoing = friends.data?.outgoing ?? []
  const term = query.trim()

  // One reader as a row: their avatar and name, a line about them, and the
  // buttons for this list.
  const readerRow = (reader, note, actions) => (
    <li key={reader.id} className="friend-row">
      <span className="friends-avatar" aria-hidden="true">
        <Avatar name={reader.avatar} />
      </span>
      <span className="friend-row-text">
        <strong>{reader.displayName}</strong>
        <span>{note}</span>
      </span>
      <div className="friends-actions">{actions}</div>
    </li>
  )

  return (
    <>
      <div className="page-banner">
        <div>
          <h1>Friends &amp; libraries</h1>
          <p className="lede">
            Find fellow readers, exchange friend requests, and wander through each
            other's cozy reading rooms.
          </p>
        </div>
        <div className="friends-banner-art" aria-hidden="true">
          <Icon name="friends" />
        </div>
      </div>

      {/* Keep action errors near the top so they're easy to notice. */}
      {error && (
        <p className="error error-inline friends-error" role="alert">
          {error}
        </p>
      )}

      {USING_MOCK_API && (
        <div className="card friends-demo-note">
          <Icon name="lock" />
          <div>
            <strong>Friendships need the live app.</strong>
            <p className="muted">
              Finding readers, sending requests and visiting libraries need a real
              account on the live server. Demo mode is one reader in this browser.
            </p>
          </div>
        </div>
      )}

      {/* Requests to you come first: they are the only thing waiting on you. */}
      {incoming.length > 0 && (
        <section className="card friends-incoming" aria-labelledby="incoming-heading">
          <h2 id="incoming-heading">
            <Icon name="star" />
            {incoming.length === 1 ? 'A reader wants to be friends' : `${incoming.length} readers want to be friends`}
          </h2>
          <ul className="friend-rows">
            {incoming.map((reader) =>
              readerRow(reader, 'Wants to visit your library, and share theirs', (
                <>
                  <button
                    type="button"
                    className="button-small"
                    disabled={busy}
                    onClick={() => perform(() => acceptFriend(reader.id))}
                  >
                    <Icon name="check" />
                    Accept
                  </button>
                  <button
                    type="button"
                    className="button-quiet button-small"
                    disabled={busy}
                    onClick={() => perform(() => removeFriend(reader.id))}
                  >
                    Decline
                  </button>
                </>
              ))
            )}
          </ul>
        </section>
      )}

      {!friends.data && <AsyncState {...friends} label="Loading friends" />}

      <div className="friends-layout">
        <section className="card panel friends-main" aria-labelledby="my-friends-heading">
          <div className="section-head">
            <h2 id="my-friends-heading">Your friends</h2>
            {friends.data && (
              <span className="count-pill" aria-label={`${connections.length} ${connections.length === 1 ? 'friend' : 'friends'}`}>
                {connections.length}
              </span>
            )}
          </div>

          {friends.data && connections.length === 0 && (
            <div className="friends-empty">
              <span className="friends-empty-art" aria-hidden="true">
                <Icon name="room" />
              </span>
              <p>
                {USING_MOCK_API
                  ? 'Friends you make on the live app show up here, with a door into each of their libraries.'
                  : 'No friends yet. Find a reader by name, and once they accept, their library opens to you.'}
              </p>
            </div>
          )}

          {connections.length > 0 && (
            <ul className="friend-cards">
              {connections.map((reader) => (
                <li key={reader.id} className="friend-card">
                  <span className="friend-card-avatar" aria-hidden="true">
                    <Avatar name={reader.avatar} />
                  </span>
                  <strong className="friend-card-name">{reader.displayName}</strong>
                  <Link className="button button-small friend-card-visit" to={`/friends/${reader.id}/room`}>
                    <Icon name="room" />
                    Visit library
                  </Link>
                  <button
                    type="button"
                    className="friend-card-remove"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Unfriend ${reader.displayName}? You will no longer be able to visit each other's libraries.`
                        )
                      ) {
                        perform(() => removeFriend(reader.id))
                      }
                    }}
                  >
                    Unfriend
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="friends-side">
          {!USING_MOCK_API && (
            <section className="card panel friends-search" aria-labelledby="friends-search-heading">
              <h2 id="friends-search-heading">Find readers</h2>
              <div className="search-field">
                <Icon name="search" />
                <label htmlFor="friend-search" className="visually-hidden">
                  Search readers by name
                </label>
                <input
                  id="friend-search"
                  type="search"
                  maxLength={100}
                  placeholder="Search by name…"
                  value={query}
                  onChange={(e) => {
                    const nextQuery = e.target.value

                    // Invalidate earlier searches and clear previous results.
                    ++searchVersion.current
                    setQuery(nextQuery)
                    setResults([])
                    setSearchError('')

                    // Display searching immediately during the debounce delay.
                    setSearching(nextQuery.trim().length >= 2)
                  }}
                />
              </div>

              {term.length < 2 && (
                <p className="friends-hint">
                  {term.length === 1 ? 'Type one more letter.' : 'Only names and avatars are shown, never emails.'}
                </p>
              )}
              {searching && (
                <p className="friends-hint" role="status">
                  Searching for readers…
                </p>
              )}
              {searchError && (
                <p className="error error-inline" role="alert">
                  {searchError}
                </p>
              )}
              {term.length >= 2 && !searching && !searchError && results.length === 0 && (
                <p className="friends-hint">No readers by that name. Try another.</p>
              )}

              {results.length > 0 && (
                <ul className="friend-rows">
                  {results.map((reader) =>
                    readerRow(reader, 'Emberary reader', (
                      <button
                        type="button"
                        className="button-small"
                        disabled={busy}
                        onClick={() => addFriend(reader)}
                      >
                        <Icon name="plus" />
                        Add friend
                      </button>
                    ))
                  )}
                </ul>
              )}
            </section>
          )}

          {outgoing.length > 0 && (
            <section className="card panel friends-sent" aria-labelledby="outgoing-heading">
              <div className="section-head">
                <h2 id="outgoing-heading">Requests you sent</h2>
                <span className="count-pill" aria-label={`${outgoing.length} sent`}>
                  {outgoing.length}
                </span>
              </div>
              <ul className="friend-rows">
                {outgoing.map((reader) =>
                  readerRow(reader, 'Waiting for an answer', (
                    <button
                      type="button"
                      className="button-quiet button-small"
                      disabled={busy}
                      onClick={() => perform(() => removeFriend(reader.id))}
                    >
                      Cancel
                    </button>
                  ))
                )}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}
