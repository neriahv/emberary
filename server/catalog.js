// What the Library Room shop sells, and what Ember is earned for.
//
// Kept IDENTICAL in server/catalog.js and client/src/api/catalog.js. The server
// is deployed on its own and cannot import from the client, and the client
// shows prices without asking the server. The server is the authority on price
// and balance; the catalog parity test fails if the two copies ever differ.

export const SHOP_CATEGORIES = [
  { id: 'bookshelves', label: 'Bookshelves' },
  { id: 'wallpaper', label: 'Wallpaper' },
  { id: 'floors', label: 'Floors' },
  { id: 'tables', label: 'Tables' },
  { id: 'chairs', label: 'Chairs' },
  { id: 'lamps', label: 'Lamps' },
  { id: 'rugs', label: 'Rugs' },
  { id: 'decor', label: 'Decorations' },
]

// type "item" stands on the floor and can be moved; "wallpaper" and "floor"
// are finishes that cover the walls or floor once bought. A price of 0 means
// every room already has it.
export const CATALOG = [
  { id: 'bookcase-small', category: 'bookshelves', type: 'item', name: 'Small bookcase', price: 6 },
  { id: 'bookcase-tall', category: 'bookshelves', type: 'item', name: 'Tall bookcase', price: 10 },

  { id: 'wallpaper-plain', category: 'wallpaper', type: 'wallpaper', name: 'Plain paint', price: 0 },
  { id: 'wallpaper-stripes', category: 'wallpaper', type: 'wallpaper', name: 'Regency stripes', price: 3 },
  { id: 'wallpaper-trellis', category: 'wallpaper', type: 'wallpaper', name: 'Diamond trellis', price: 3 },
  { id: 'wallpaper-sprig', category: 'wallpaper', type: 'wallpaper', name: 'Sprig print', price: 3 },
  { id: 'wallpaper-panels', category: 'wallpaper', type: 'wallpaper', name: 'Wood panelling', price: 4 },

  { id: 'floor-planks', category: 'floors', type: 'floor', name: 'Oak planks', price: 0 },
  { id: 'floor-checker', category: 'floors', type: 'floor', name: 'Checkerboard tiles', price: 3 },
  { id: 'floor-herringbone', category: 'floors', type: 'floor', name: 'Herringbone parquet', price: 4 },
  { id: 'floor-stone', category: 'floors', type: 'floor', name: 'Stone flags', price: 4 },

  { id: 'side-table', category: 'tables', type: 'item', name: 'Pedestal table', price: 2 },
  { id: 'coffee-table', category: 'tables', type: 'item', name: 'Coffee table', price: 2 },
  { id: 'desk', category: 'tables', type: 'item', name: 'Writing desk', price: 4 },
  { id: 'dresser', category: 'tables', type: 'item', name: 'Chest of drawers', price: 4 },

  { id: 'stool', category: 'chairs', type: 'item', name: 'Wooden stool', price: 1 },
  { id: 'chair', category: 'chairs', type: 'item', name: 'Wooden chair', price: 1 },
  { id: 'cushion', category: 'chairs', type: 'item', name: 'Floor cushion', price: 1 },
  { id: 'armchair', category: 'chairs', type: 'item', name: 'Armchair', price: 3 },
  { id: 'rocking-chair', category: 'chairs', type: 'item', name: 'Rocking chair', price: 3 },

  { id: 'lantern', category: 'lamps', type: 'item', name: 'Lantern', price: 1 },
  { id: 'lamp', category: 'lamps', type: 'item', name: 'Floor lamp', price: 2 },
  { id: 'candelabra', category: 'lamps', type: 'item', name: 'Candelabra', price: 2 },

  { id: 'rug', category: 'rugs', type: 'item', name: 'Persian rug', price: 2 },
  { id: 'round-rug', category: 'rugs', type: 'item', name: 'Round rug', price: 2 },
  { id: 'runner-rug', category: 'rugs', type: 'item', name: 'Runner rug', price: 2 },

  { id: 'vase', category: 'decor', type: 'item', name: 'Flower vase', price: 1 },
  { id: 'plant', category: 'decor', type: 'item', name: 'Potted plant', price: 2 },
  { id: 'globe', category: 'decor', type: 'item', name: 'Globe', price: 3 },
  { id: 'clock', category: 'decor', type: 'item', name: 'Grandfather clock', price: 5 },
]

// How Ember is earned. Every one-off reward is recorded once in the ledger
// with what it was for, so it cannot be earned twice.
export const EMBER_RULES = {
  welcome: 10, // once, to every new reader
  dailyCheckIn: 3, // once per day, claimed by the reader
  bookFinished: 15, // once per book, the first time it is marked Read
  pagesPerEmber: 50, // 1 Ember for every 50 pages reached in a book, once
  dailyPageGoal: 20, // pages to read in one day...
  dailyGoalReward: 5, // ...for this, once per day
}

// A room holds this many items at once; the rest wait in storage.
export const MAX_PLACED_ITEMS = 30
// And a reader can own this many in all.
export const MAX_OWNED_ITEMS = 60

export const ITEM_KINDS = CATALOG.filter((entry) => entry.type === 'item').map((entry) => entry.id)
export const catalogEntry = (id) => CATALOG.find((entry) => entry.id === id)
export const FREE_FINISHES = CATALOG.filter((e) => e.type !== 'item' && e.price === 0).map((e) => e.id)
