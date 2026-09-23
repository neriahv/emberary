// The only file the pages and components import from.
//
// Swapping the simulated backend for the real API is one environment variable,
// set at BUILD time. Nothing in src/pages or src/components changes.
//
//   VITE_USE_MOCK_API=false  -> the Express API at VITE_API_BASE_URL
//   anything else, INCLUDING UNSET -> the browser-only fake
//
// Demo mode is the DEFAULT, so a forgotten variable gives a working site with a
// visible notice rather than one that fails every request silently.
//
// Both modules are imported statically and one is chosen at run time: a
// top-level `await import(...)` does not build under Vite's default target.

import * as mockApi from './mockApi.js'
import * as httpApi from './httpApi.js'

export const USING_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

const implementation = USING_MOCK_API ? mockApi : httpApi

export const STATUSES = mockApi.STATUSES

export const STATUS_LABELS = {
  'currently-reading': 'Currently Reading',
  'want-to-read': 'Want to Read',
  read: 'Read',
  'did-not-finish': 'Did Not Finish',
}

export const {
  listBooks,
  getBook,
  listMyBooks,
  addToCollection,
  updateMyBook,
  removeFromCollection,
  getReadingStats,
  getRecommendations,
  getProfile,
  updateProfile,
  getRoom,
  updateRoom,
} = implementation

// Demo only. Undefined when the real API is in use, so check before calling.
export const resetDemo = USING_MOCK_API ? mockApi.resetDemo : undefined
