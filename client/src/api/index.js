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
export {
  CATALOG,
  SHOP_CATEGORIES,
  EMBER_RULES,
  BLOCKS,
  BUILT_INS,
  SIZE_LIMITS,
  LOFT,
  WINDOW_LIMITS,
  alongOf,
  blockPrice,
  blockRefund,
  clearanceOf,
  forSale,
  isSmall,
  moveSpots,
  resizable,
  onWallAt,
  pickSpots,
  wallFace,
  wallOf,
  blocksValue,
  canPlace,
  catalogEntry,
  cellBox,
  cutOut,
  edgeSides,
  floorCells,
  floorSpots,
  hasLoft,
  hasUpstairs,
  itemFits,
  stairwells,
  upperCells,
  upperSpots,
  loftCells,
  nearestSpot,
  roomExtent,
  sellPrice,
  standingAreas,
  wallHeight,
  walls,
  wallSpots,
} from './catalog.js'

// Books on the Library Room shelves: every one the reader has started.
export const SHELVED_STATUSES = ['currently-reading', 'read', 'did-not-finish']

export const STATUS_LABELS = {
  'currently-reading': 'Currently Reading',
  'want-to-read': 'Want to Read',
  read: 'Read',
  'did-not-finish': 'Did Not Finish',
}

export const {
  getMe,
  signUp,
  logIn,
  logOut,
  listBooks,
  searchBooks,
  coverImageUrl,
  getBook,
  listMyBooks,
  removeFromCollection,
  reorderShelf,
  getReadingStats,
  getRecommendations,
  getProfile,
  updateProfile,
  getRoom,
  updateRoom,
  updateRoomItem,
  getEmber,
} = implementation

// A session that ended while the app was open (the API answered 401).
export function onSignedOut(listener) {
  window.addEventListener('emberary:signed-out', listener)
  return () => window.removeEventListener('emberary:signed-out', listener)
}

// Anything that can change the Ember balance tells the page, so the wallet in
// the header can refresh itself without every screen knowing it exists.
const EMBER_CHANGED = 'emberary:ember-changed'

export function onEmberChange(listener) {
  window.addEventListener(EMBER_CHANGED, listener)
  return () => window.removeEventListener(EMBER_CHANGED, listener)
}

const announcing =
  (call) =>
  async (...args) => {
    const result = await call(...args)
    window.dispatchEvent(new Event(EMBER_CHANGED))
    return result
  }

export const addToCollection = announcing(implementation.addToCollection)
export const updateMyBook = announcing(implementation.updateMyBook)
export const checkout = announcing(implementation.checkout)
export const checkIn = announcing(implementation.checkIn)
export const changeRoomBlocks = announcing(implementation.changeRoomBlocks)
export const sellRoomItem = announcing(implementation.sellRoomItem)

// "+15 Ember for finishing the book", from the `rewards` a save returns.
const REWARD_REASONS = {
  'book-finished': 'finishing the book',
  'pages-read': 'pages read',
  'daily-goal': "reaching today's reading goal",
  'daily-check-in': 'checking in today',
  welcome: 'joining Emberary',
}

export const describeRewards = (rewards = []) =>
  rewards.map((r) => `+${r.amount} Ember for ${REWARD_REASONS[r.reason] ?? r.reason}`).join(', ')

// Demo only. Undefined when the real API is in use, so check before calling.
export const resetDemo = USING_MOCK_API ? mockApi.resetDemo : undefined
