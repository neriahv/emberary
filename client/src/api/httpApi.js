// The real client. Every function here talks to the Emberary Express API.
//
// Same names and return shapes as mockApi.js. The endpoints below are the
// contract the Week 2 server implements; until then the app runs on the mock.

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

// insights
export const getReadingStats = () => request('/api/stats')

export const getRecommendations = (limit = 4) => request(`/api/recommendations?limit=${limit}`)

// profile
export const getProfile = () => request('/api/profile')

export const updateProfile = (patch) => request('/api/profile', json('PATCH', patch))

// library room
export const getRoom = () => request('/api/room')

export const updateRoom = (patch) => request('/api/room', json('PATCH', patch))
