// Talking to the Google Books API from the server, so the API key stays in the
// server's environment and never reaches a browser.
//
// The answers are cached for a few minutes: the same search is often typed
// twice, and Google's free quota is per key, not per visitor.

import { searchUrl, volumeToBook, volumeUrl } from './bookFromGoogle.js'

const CACHE_MS = 10 * 60 * 1000
const CACHE_SIZE = 200
const TIMEOUT_MS = 6000

export class GoogleBooksError extends Error {}

export function createGoogleBooks({ key = '', fetch: fetchImpl = globalThis.fetch } = {}) {
  const cache = new Map()

  async function getJson(url) {
    const hit = cache.get(url)
    if (hit && hit.until > Date.now()) return hit.body

    let response
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    } catch {
      throw new GoogleBooksError('Google Books did not answer')
    }
    if (response.status === 404) return null
    if (!response.ok) throw new GoogleBooksError(`Google Books answered ${response.status}`)
    const body = await response.json()

    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value)
    cache.set(url, { body, until: Date.now() + CACHE_MS })
    return body
  }

  return {
    // Up to 24 books for a search, each already in Emberary's shape.
    async search(query, genre) {
      const body = await getJson(searchUrl(query, genre, key))
      return (body?.items ?? []).map(volumeToBook).filter(Boolean)
    },

    // One volume by its Google id, or null when Google does not have it.
    async volume(volumeId) {
      const body = await getJson(volumeUrl(volumeId, key))
      return body ? volumeToBook(body) : null
    },
  }
}
