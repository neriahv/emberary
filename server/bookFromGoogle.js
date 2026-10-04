// Turning Google Books results into Emberary books. Pure functions, no network:
// server/googleBooks.js (the live app) and client/src/api/mockApi.js (demo
// mode) both use them, so a book found on Google looks the same either way.
//
// This file is kept identical in server/ and client/src/api/; a test checks.

export const GOOGLE_VOLUMES = 'https://www.googleapis.com/books/v1/volumes'

// Emberary's id for a Google volume. Google ids are letters, digits, - and _.
export const GOOGLE_ID = /^gb-[A-Za-z0-9_-]{4,40}$/
export const isGoogleId = (id) => typeof id === 'string' && GOOGLE_ID.test(id)
export const volumeIdOf = (bookId) => bookId.slice(3)

// The genre chips on Discover, as Google subjects.
const SUBJECTS = {
  Classic: 'classics',
  Fantasy: 'fantasy',
  Horror: 'horror',
  Mystery: 'mystery',
  Romance: 'romance',
  'Science Fiction': 'science fiction',
}

// Google's categories are free text ("Fiction / Fantasy / Epic"); map the ones
// Emberary has a genre for, and keep the first word of anything else.
const GENRE_WORDS = [
  ['Science Fiction', /science fiction|sci-fi/i],
  ['Fantasy', /fantasy/i],
  ['Horror', /horror|ghost/i],
  ['Mystery', /mystery|detective|crime|thriller/i],
  ['Romance', /romance|love stor/i],
  ['Classic', /classic|literary/i],
]

// The palette's book colours, for books whose cover colour is not known.
const SPINE_COLORS = ['#7a2e1f', '#a4431f', '#5b3a29', '#2f4a3a', '#3a3a5c', '#6a4a24', '#8a5a2b', '#4d2f3f']

export function googleQuery(query = '', genre = '') {
  const parts = []
  if (query.trim()) parts.push(query.trim())
  if (SUBJECTS[genre]) parts.push(`subject:"${SUBJECTS[genre]}"`)
  return parts.join(' ')
}

export function searchUrl(query, genre, key) {
  const params = new URLSearchParams({
    q: googleQuery(query, genre),
    printType: 'books',
    maxResults: '24',
    fields: 'items(id,volumeInfo(title,subtitle,authors,categories,pageCount,publishedDate,description,imageLinks))',
  })
  if (key) params.set('key', key)
  return `${GOOGLE_VOLUMES}?${params}`
}

export function volumeUrl(volumeId, key) {
  const params = new URLSearchParams({
    fields: 'id,volumeInfo(title,subtitle,authors,categories,pageCount,publishedDate,description,imageLinks)',
  })
  if (key) params.set('key', key)
  return `${GOOGLE_VOLUMES}/${encodeURIComponent(volumeId)}?${params}`
}

function genreOf(categories = []) {
  const text = categories.join(' ')
  const known = GENRE_WORDS.find(([, pattern]) => pattern.test(text))
  if (known) return known[0]
  const first = (categories[0] ?? '').split('/')[0].trim()
  return first ? first.slice(0, 40) : 'General'
}

function colorOf(id) {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return SPINE_COLORS[hash % SPINE_COLORS.length]
}

// Descriptions sometimes carry HTML. Keep the words only.
function plainText(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000)
}

// Only Google's own cover host, and only over https, ever becomes a cover.
function coverOf(imageLinks = {}) {
  const raw = imageLinks.thumbnail ?? imageLinks.smallThumbnail
  if (!raw) return null
  try {
    const url = new URL(raw.replace(/^http:/, 'https:'))
    if (url.hostname !== 'books.google.com') return null
    url.searchParams.delete('edge')
    return url.toString()
  } catch {
    return null
  }
}

// One Google volume as an Emberary book, or null when it cannot be one: a
// book needs a title and a page count, or progress means nothing.
export function volumeToBook(volume) {
  const info = volume?.volumeInfo
  if (!volume?.id || !info?.title || !(info.pageCount > 0)) return null
  const id = `gb-${volume.id}`
  if (!GOOGLE_ID.test(id)) return null
  const year = Number.parseInt(String(info.publishedDate ?? '').slice(0, 4), 10)
  return {
    id,
    title: (info.subtitle && info.title.length < 40 ? `${info.title}: ${info.subtitle}` : info.title).slice(0, 200),
    author: (info.authors?.length ? info.authors.slice(0, 2).join(', ') : 'Unknown author').slice(0, 200),
    genre: genreOf(info.categories),
    pages: Math.min(info.pageCount, 20000),
    year: Number.isFinite(year) ? year : null,
    color: colorOf(id),
    description: plainText(info.description),
    coverUrl: coverOf(info.imageLinks),
  }
}

// The same book can come back from Google as several editions, and some of
// the catalogue's own books are on Google too. Match on title and first author.
export function bookKey(book) {
  const surname = book.author.split(',')[0].trim().split(' ').at(-1) ?? ''
  return `${book.title.split(':')[0].trim().toLowerCase()}|${surname.toLowerCase()}`
}
