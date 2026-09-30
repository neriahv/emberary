// The real client. Every function here talks to the Emberary Express API.
//
// Same names and return shapes as mockApi.js. The endpoints below are served
// by server/app.js; set VITE_USE_MOCK_API=false to use them.

const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(message)
  }

  return response.status === 204 ? null : response.json()
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })

// catalogue
export const listBooks = ({ query = '', genre = '' } = {}) =>
  request(`/api/books?${new URLSearchParams({ q: query, genre })}`)

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

// ember
export const getEmber = () => request('/api/ember')

export const checkIn = () => request('/api/ember/check-in', { method: 'POST' })
