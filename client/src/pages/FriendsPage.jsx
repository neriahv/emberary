
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

  return (
    <>
      <div className="page-banner">
        <div>
          <h1>Friends & libraries</h1>
          <p className="lede">
            Find fellow readers, exchange friend requests, and explore
            each other's cozy reading spaces.
          </p>
        </div>

        <div className="friends-banner-art" aria-hidden="true">
          <Icon name="friends" />
        </div>
      </div>

      {/* Keep action errors near the top so they're easy to notice. */}
      {error && (
        <p className="error error-inline" role="alert">
          {error}
        </p>
      )}

      {USING_MOCK_API ? (
        <div className="card friends-demo-note">
          <Icon name="friends" />

          <div>
            <strong>Friendships need the live app.</strong>
            <p className="muted">
              You can explore this page in demo mode, but finding readers,
              sending requests, and visiting libraries require an account
              connected to the live server.
            </p>
          </div>
        </div>
      ) : (
        <section
          className="card panel friends-search"
          aria-labelledby="friends-search-heading"
        >
          <div className="friends-section-head">
            <div>
              <h2 id="friends-search-heading">Find readers</h2>
              <p className="muted">
                Search by display name to connect with other readers.
              </p>
            </div>
          </div>

          <div className="search-field list-find">
            <Icon name="search" />

            <label
              htmlFor="friend-search"
              className="visually-hidden"
            >
              Search readers by name
            </label>

            <input
              id="friend-search"
              type="search"
              maxLength={100}
              placeholder="Search readers by name..."
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

          {term.length === 1 && (
            <p className="muted friends-search-help">
              Type at least 2 characters to search.
            </p>
          )}

          {searching && (
            <p
              className="muted friends-search-help"
              role="status"
            >
              Searching for readers...
            </p>
          )}

          {searchError && (
            <p className="error error-inline" role="alert">
              {searchError}
            </p>
          )}

          {term.length >= 2 &&
            !searching &&
            !searchError &&
            results.length === 0 && (
              <p className="empty">
                No readers found. Try another name.
              </p>
            )}

          {results.length > 0 && (
            <ul className="list-add friends-reader-list">
              {results.map((reader) => (
                <li key={reader.id}>
                  <span
                    className="friends-avatar"
                    aria-hidden="true"
                  >
                    <Avatar name={reader.avatar} />
                  </span>

                  <span className="list-add-text">
                    <strong>{reader.displayName}</strong>
                    <span>Emberary reader</span>
                  </span>

                  <button
                    type="button"
                    className="button-small"
                    disabled={busy}
                    onClick={() => addFriend(reader)}
                  >
                    <Icon name="plus" />
                    Add friend
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Only show the loading message on the initial load. */}
      {!friends.data && (
        <AsyncState {...friends} label="Loading friends" />
      )}

      {friends.data && (
        <div className="friends-sections">
          {/* Incoming requests */}
          <section
            className="card panel"
            aria-labelledby="incoming-heading"
          >
            <div className="friends-section-head">
              <h2 id="incoming-heading">Requests to you</h2>
              <span className="tab-count">{incoming.length}</span>
            </div>

            {incoming.length === 0 ? (
              <p className="empty">
                No incoming requests right now.
              </p>
            ) : (
              <ul className="list-add friends-reader-list">
                {incoming.map((reader) => (
                  <li key={reader.id}>
                    <span
                      className="friends-avatar"
                      aria-hidden="true"
                    >
                      <Avatar name={reader.avatar} />
                    </span>

                    <span className="list-add-text">
                      <strong>{reader.displayName}</strong>
                      <span>Wants to connect with you</span>
                    </span>

                    <div className="friends-actions">
                      <button
                        type="button"
                        className="button-small"
                        disabled={busy}
                        onClick={() =>
                          perform(() => acceptFriend(reader.id))
                        }
                      >
                        <Icon name="check" />
                        Accept
                      </button>

                      <button
                        type="button"
                        className="button-quiet button-small"
                        disabled={busy}
                        onClick={() =>
                          perform(() => removeFriend(reader.id))
                        }
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Accepted friends */}
          <section
            className="card panel"
            aria-labelledby="my-friends-heading"
          >
            <div className="friends-section-head">
              <h2 id="my-friends-heading">Friends</h2>
              <span className="tab-count">{connections.length}</span>
            </div>

            {connections.length === 0 ? (
              <p className="empty">
                {USING_MOCK_API
                  ? 'No friends to display in demo mode. Friendships are available in the live app.'
                  : 'No friends yet. Search for a reader above.'}
              </p>
            ) : (
              <ul className="list-add friends-reader-list">
                {connections.map((reader) => (
                  <li key={reader.id}>
                    <span
                      className="friends-avatar"
                      aria-hidden="true"
                    >
                      <Avatar name={reader.avatar} />
                    </span>

                    <span className="list-add-text">
                      <strong>{reader.displayName}</strong>
                      <span>Connected reader</span>
                    </span>

                    <div className="friends-actions">
                      <Link
                        className="button button-small"
                        to={`/friends/${reader.id}/room`}
                      >
                        <Icon name="room" />
                        Visit library
                      </Link>

                      <button
                        type="button"
                        className="button-danger button-small"
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Outgoing requests */}
          <section
            className="card panel"
            aria-labelledby="outgoing-heading"
          >
            <div className="friends-section-head">
              <h2 id="outgoing-heading">Requests you sent</h2>
              <span className="tab-count">{outgoing.length}</span>
            </div>

            {outgoing.length === 0 ? (
              <p className="empty">
                No pending requests sent.
              </p>
            ) : (
              <ul className="list-add friends-reader-list">
                {outgoing.map((reader) => (
                  <li key={reader.id}>
                    <span
                      className="friends-avatar"
                      aria-hidden="true"
                    >
                      <Avatar name={reader.avatar} />
                    </span>

                    <span className="list-add-text">
                      <strong>{reader.displayName}</strong>
                      <span>Waiting for a response</span>
                    </span>

                    <button
                      type="button"
                      className="button-quiet button-small"
                      disabled={busy}
                      onClick={() =>
                        perform(() => removeFriend(reader.id))
                      }
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )
}
