import { CATALOG, forSale } from '../../api'

// The catalogues the shop and the builder are browsed by: a row of picture
// tabs along the top of the room. Each gathers one or more of the shop's
// categories (catalog.js). Expansion (more floor and wall) is only in the
// shop; it is bought and built at once.

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
  expansion: (
    <>
      <path d="M6 22 L16 27 L26 22 L16 17 Z" {...stroke} />
      <path d="M6 22 V12 L16 7 L26 12 V22" {...stroke} strokeDasharray="2 3" />
      <path d="M16 11 V15 M14 13 H18" {...stroke} />
    </>
  ),
  walls: (
    <>
      <path d="M5 26 V9 L16 4 V21 Z M16 4 L27 9 V26 L16 21" {...stroke} />
      <path d="M8 13 L13 11 M8 18 L13 16 M19 11 L24 13 M19 16 L24 18" {...stroke} strokeWidth="1.5" />
    </>
  ),
  wallTops: (
    <>
      <path d="M5 27 V14 H8 V10 H12 V14 H14 L16 7 L18 14 H20 V10 H24 V14 H27 V27 Z" {...stroke} />
      <path d="M5 20 H27" {...stroke} strokeWidth="1.5" />
    </>
  ),
  floors: (
    <>
      <path d="M3 18 L16 11 L29 18 L16 25 Z" {...stroke} />
      <path d="M9.5 14.5 L22.5 21.5 M9.5 21.5 L22.5 14.5" {...stroke} strokeWidth="1.5" />
    </>
  ),
  windows: (
    <>
      <path d="M9 27 V13 A7 7 0 0 1 23 13 V27 Z" {...stroke} />
      <path d="M16 6 V27 M9 17 H23" {...stroke} strokeWidth="1.5" />
    </>
  ),
  bookshelves: (
    <>
      <rect x="7" y="4" width="18" height="24" rx="1.5" {...stroke} />
      <path d="M7 12 H25 M7 20 H25 M10 12 V7 M13 12 V8 M16 12 V7 M11 20 V15 M14 20 V16 M20 20 V15 M22 20 V16" {...stroke} strokeWidth="1.5" />
    </>
  ),
  tables: (
    <>
      <path d="M4 12 H28 M7 12 V27 M25 12 V27 M7 18 H25" {...stroke} />
    </>
  ),
  chairs: (
    <>
      <path d="M10 5 V27 M22 17 V27 M10 17 H22 M10 5 H20 V17" {...stroke} />
    </>
  ),
  lamps: (
    <>
      <path d="M10 13 L13 4 H19 L22 13 Z M16 13 V26 M11 27 H21" {...stroke} />
    </>
  ),
  rugs: (
    <>
      <rect x="5" y="9" width="22" height="14" rx="2" {...stroke} />
      <rect x="9" y="13" width="14" height="6" rx="1" {...stroke} strokeWidth="1.5" />
      <path d="M3 11 H5 M3 15 H5 M3 19 H5 M27 11 H29 M27 15 H29 M27 19 H29" {...stroke} strokeWidth="1.2" />
    </>
  ),
  plants: (
    <>
      <path d="M10 19 H22 L20 28 H12 Z M16 19 V11" {...stroke} />
      <path d="M16 13 C10 13 8 8 9 5 C13 5 16 8 16 13 C16 8 19 5 23 5 C24 8 22 13 16 13" {...stroke} strokeWidth="1.5" />
    </>
  ),
  decor: (
    <>
      <rect x="5" y="6" width="22" height="18" rx="1.5" {...stroke} />
      <path d="M8 21 L13 14 L17 18 L20 15 L24 21 Z" {...stroke} strokeWidth="1.5" />
      <circle cx="21" cy="10" r="1.8" {...stroke} strokeWidth="1.5" />
    </>
  ),
  stairs: (
    <>
      <path d="M4 27 H10 V21 H16 V15 H22 V9 H28" {...stroke} />
    </>
  ),
}

// `cats` are the shop categories each catalogue shows.
export const ROOM_CATALOGS = [
  { id: 'expansion', label: 'Expansion', cats: [], shopOnly: true },
  { id: 'walls', label: 'Walls', cats: ['wallpaper'] },
  { id: 'wallTops', label: 'Wall tops', cats: ['wallShape'] },
  { id: 'floors', label: 'Floors', cats: ['floors'] },
  { id: 'windows', label: 'Windows', cats: ['windows'] },
  { id: 'bookshelves', label: 'Bookshelves', cats: ['bookshelves'] },
  { id: 'tables', label: 'Tables', cats: ['tables'] },
  { id: 'chairs', label: 'Seating', cats: ['chairs'] },
  { id: 'lamps', label: 'Lights', cats: ['lamps'] },
  { id: 'rugs', label: 'Rugs', cats: ['rugs'] },
  { id: 'plants', label: 'Plants', cats: ['plants'] },
  { id: 'decor', label: 'Decor', cats: ['decor'] },
  { id: 'stairs', label: 'Stairs', cats: ['stairs'] },
]

export const catalogIcon = (id) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className="catalog-icon">
    {ICONS[id]}
  </svg>
)

// What the shop sells in a catalogue: everything with a price, but not the
// pieces built into every room.
export const forSaleIn = (catalog) =>
  CATALOG.filter((entry) => catalog.cats.includes(entry.category) && forSale(entry) && entry.price > 0)

// Which catalogue a piece of furniture belongs to.
export const catalogOf = (kind) => {
  const entry = CATALOG.find((e) => e.id === kind)
  return ROOM_CATALOGS.find((c) => c.cats.includes(entry?.category))?.id
}

// The tabs along the top of the room.
export function CatalogBar({ catalogs, current, onPick, counts = {} }) {
  return (
    <nav className="catalog-bar" aria-label="Catalogues">
      {catalogs.map((catalog) => (
        <button
          key={catalog.id}
          type="button"
          className="catalog-tab"
          aria-pressed={current === catalog.id}
          onClick={() => onPick(catalog.id)}
          title={catalog.label}
          aria-label={catalog.label}
        >
          {catalogIcon(catalog.id)}
          {counts[catalog.id] > 0 && <span className="catalog-tab-count">{counts[catalog.id]}</span>}
        </button>
      ))}
    </nav>
  )
}
