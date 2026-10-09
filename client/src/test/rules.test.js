import { describe, it, expect } from 'vitest'
import { filterBooks, sortBooks } from '../pages/filterBooks.js'
import {
  passwordProblems,
  canPlace,
  changeBlocks,
  DEFAULT_BLOCKS,
  itemFits,
  CATALOG,
} from '../api/catalog.js'
const entries = [
  {
    bookId: 'a',
    status: 'read',
    rating: 5,
    currentPage: 300,
    updatedAt: '2026-01-01',
    book: { title: 'Zebra', author: 'Ada Smith', genre: 'Fantasy', pages: 300 },
  },
  {
    bookId: 'b',
    status: 'currently-reading',
    rating: null,
    currentPage: 50,
    updatedAt: '2026-03-01',
    book: { title: 'Alpha', author: 'Bo Adams', genre: 'History', pages: 100 },
  },
  {
    bookId: 'c',
    status: 'read',
    rating: 2,
    currentPage: 0,
    updatedAt: '2026-02-01',
    book: { title: 'Moon', author: 'Cara Reed', genre: 'Fantasy', pages: 500 },
  },
]
describe('My Books filters', () => {
  it('combines title or author search, status, genre and minimum rating', () => {
    expect(
      filterBooks(entries, {
        tab: 'read',
        search: '  SMITH ',
        genre: 'Fantasy',
        rating: '4',
      })
    ).toEqual([entries[0]])
    expect(filterBooks(entries, { tab: 'all', search: 'alpha' })).toEqual([entries[1]])
  })
  it('keeps unrated separate and handles no matches', () => {
    expect(filterBooks(entries, { tab: 'all', rating: 'unrated' })).toEqual([entries[1]])
    expect(filterBooks(entries, { tab: 'all', genre: 'Romance' })).toEqual([])
  })
  it.each([
    ['updated', ['a', 'b', 'c']],
    ['title', ['b', 'c', 'a']],
    ['author', ['b', 'c', 'a']],
    ['rating', ['a', 'c', 'b']],
    ['progress', ['a', 'b', 'c']],
    ['pages', ['c', 'a', 'b']],
  ])('sorts %s without mutating input', (mode, order) => {
    expect(sortBooks(entries, mode).map((e) => e.bookId)).toEqual(order)
    expect(entries.map((e) => e.bookId)).toEqual(['a', 'b', 'c'])
  })
  it('handles a zero-page book without NaN progress', () =>
    expect(
      sortBooks([{ ...entries[0], book: { ...entries[0].book, pages: 0 } }, entries[1]], 'progress')[0]
    ).toEqual(entries[1]))
})
describe('password requirements', () => {
  it('accepts a strong password and rejects missing rules', () => {
    expect(passwordProblems('Library-77', 'reader@example.com')).toEqual([])
    expect(passwordProblems('short', 'reader@example.com').length).toBeGreaterThan(0)
  })
  it('rejects the email name and excessive length', () => {
    expect(passwordProblems('Reader-77', 'reader@example.com').length).toBeGreaterThan(0)
    expect(passwordProblems('A!7' + 'x'.repeat(201), 'me@example.com').length).toBeGreaterThan(0)
  })
})
describe('Library Room constraints', () => {
  const room = { blocks: DEFAULT_BLOCKS, loft: 'loft-none', items: [] }
  it('refuses disconnected floors, duplicate floors and an unsupported upper floor', () => {
    expect(canPlace(room, 'floor', { i: 2, j: 2 }, [])).toBeFalsy()
    expect(canPlace(room, 'floor', { i: 0, j: 0 }, [])).toBeFalsy()
    expect(canPlace(room, 'upper', { i: 0, j: 0 }, [])).toBeFalsy()
  })
  it('keeps furniture on owned floor and out of nonexistent upstairs', () => {
    expect(itemFits(room, 0, 0, 0, 0.3)).toBe(true)
    expect(itemFits(room, 0, 9, 9, 0.3)).toBe(false)
    expect(itemFits(room, 1, 0, 0, 0.3)).toBe(false)
  })
  it('has exactly ten original shop pieces', () =>
    expect(CATALOG.filter((item) => item.id.startsWith('ember-'))).toHaveLength(10))
})
