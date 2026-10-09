// The real client. Every function here talks to the Emberary Express API.
//
// Same names and return shapes as mockApi.js. The endpoints below are served
// by server/app.js; set VITE_USE_MOCK_API=false to use them.

const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    // The session cookie goes with every request, including to an API on
    // another address (VITE_API_BASE_URL).
    credentials: 'include',
    ...options,
  })

  if (!response.ok) {
    // Try to use the API's own message; fall back to the status line.
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // The body was not JSON. The status line is all we have.
    }
    // A session that has ended while the app was open: the app shows the
    // sign-in page again.
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event('emberary:signed-out'))
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.status === 204 ? null : response.json()
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

// accounts
export const getMe = () => request('/api/auth/me')
export const signUp = ({ email, password, displayName }) =>
  request('/api/auth/signup', json('POST', { email, password, displayName }))
export const logIn = ({ email, password }) => request('/api/auth/login', json('POST', { email, password }))
export const logOut = () => request('/api/auth/logout', { method: 'POST' })

// catalogue
export const listBooks = ({ query = '', genre = '' } = {}) =>
  request(`/api/books?${new URLSearchParams({ q: query, genre })}`)

// Every book on Google Books, through the server, which holds the API key.
export const searchBooks = ({ query = '', genre = '' } = {}) =>
  request(`/api/books/search?${new URLSearchParams({ q: query, genre })}`)

// The server passes a book's cover through from Google, so the Library Room can
// paint it onto a spine.
export const coverImageUrl = (book) =>
  book.coverUrl ? `${BASE}/api/covers/${encodeURIComponent(book.id)}` : null

export const getBook = (id) => request(`/api/books/${encodeURIComponent(id)}`)

// my books
export const listMyBooks = () => request('/api/my-books')

export const addToCollection = (bookId, status = 'want-to-read') =>
  request('/api/my-books', json('POST', { bookId, status }))

export const updateMyBook = (bookId, patch) =>
  request(`/api/my-books/${encodeURIComponent(bookId)}`, json('PATCH', patch))

export const removeFromCollection = (bookId) =>
  request(`/api/my-books/${encodeURIComponent(bookId)}`, { method: 'DELETE' })

export const reorderShelf = (bookIds) => request('/api/my-books/order', json('PUT', { bookIds }))

// insights
export const getReadingStats = () => request('/api/stats')

export const getRecommendations = (limit = 4) => request(`/api/recommendations?limit=${limit}`)

// profile
export const getProfile = () => request('/api/profile')

export const updateProfile = (patch) => request('/api/profile', json('PATCH', patch))

// library room
export const getRoom = () => request('/api/room')

export const updateRoom = (patch) => request('/api/room', json('PATCH', patch))

export const updateRoomItem = (id, patch) =>
  request(`/api/room/items/${encodeURIComponent(id)}`, json('PATCH', patch))

export const checkout = (items) => request('/api/shop/checkout', json('POST', { items }))

export const changeRoomBlocks = (change) => request('/api/room/blocks', json('POST', change))

export const sellRoomItem = (id) =>
  request(`/api/room/items/${encodeURIComponent(id)}/sell`, json('POST', {}))

// ember
export const getEmber = () => request('/api/ember')

export const checkIn = () => request('/api/ember/check-in', { method: 'POST' })
