import { useState } from 'react'
import {
  BLOCKS,
  CATALOG,
  EMBER_RULES,
  blockPrice,
  catalogEntry,
  floorCells,
  sellPrice,
  upperCells,
  upperSpots,
} from '../../api'
import BookCover from '../BookCover.jsx'
import { EmberIcon } from '../EmberBadge.jsx'
import { ROOM_CATALOGS, forSaleIn } from './catalogs.jsx'
import { FinishSwatch, ItemThumb, StructureSwatch, ThumbnailStudio } from './thumbnails.jsx'

// The shelves on the left of the room: in the shop, everything in the chosen
// catalogue with what it costs; in the builder, what the reader owns in it.
// And the storage room's panel.

// A clear way out to the shop, wherever a shelf has nothing to show.
function ShopButton({ label, onClick }) {
  return (
    <button type="button" className="shelf-shop-button" onClick={onClick}>
      {label}
    </button>
  )
}

const ALL_KINDS = CATALOG.filter((entry) => entry.type === 'item').map((entry) => entry.id)

// Colours the walls and floor may be painted, besides any other.
const WALL_PAINTS = ['#e3a86b', '#d98a4e', '#f6d7de', '#f3e2c8', '#b5c27e', '#9fbfa8', '#a8c4d9', '#4a3f6b', '#6b3f2a', '#f6f2ea']
const FLOOR_PAINTS = ['#9a5530', '#7a3b1e', '#c99a66', '#e8cdb8', '#8a5a3a', '#5c5470', '#9a9a9a', '#d9c0a0', '#6b4a2a', '#3a2a1e']

const nameOf = (kind) => catalogEntry(kind)?.name ?? kind

// "Wooden chair", "Wooden chair 2": a name for each item that stays the same
// while it moves, so the panels and the room can be matched up.
export function itemNames(items) {
  const seen = {}
  return Object.fromEntries(
    items.map((item) => {
      seen[item.kind] = (seen[item.kind] ?? 0) + 1
      const n = seen[item.kind]
      return [item.id, nameOf(item.kind) + (n > 1 ? ` ${n}` : '')]
    })
  )
}

function earnHint(short) {
  return `You need ${short} more Ember. Finish a book (+${EMBER_RULES.bookFinished}), read ${EMBER_RULES.dailyPageGoal} pages today (+${EMBER_RULES.dailyGoalReward}) or check in (+${EMBER_RULES.dailyCheckIn}).`
}

// A wallpaper or floor is shown in the colour it will be tinted in the room;
// a wall shape is drawn; furniture is photographed.
function Swatch({ entry, room }) {
  if (entry.type === 'item') return <ItemThumb kind={entry.id} />
  if (entry.type === 'wallpaper') return <FinishSwatch id={entry.id} color={room.wallColor} />
  if (entry.type === 'floor') return <FinishSwatch id={entry.id} color={room.floorColor} />
  return <StructureSwatch entry={entry} />
}

// One tile on a shelf: a picture, a name, and underneath either a price or
// how many there are.
function Tile({ picture, name, price, count, note, pressed, disabled, title, onClick }) {
  return (
    <li>
      <button type="button" className="shelf-tile" aria-pressed={pressed} disabled={disabled} title={title ?? name} onClick={onClick}>
        <span className="shelf-tile-picture">
          {picture}
          {count > 1 && <span className="shelf-tile-count">×{count}</span>}
        </span>
        <span className="shelf-tile-name">{name}</span>
        {price !== undefined && (
          <span className="shelf-tile-price">
            {price} <EmberIcon />
          </span>
        )}
        {note && <span className="shelf-tile-note">{note}</span>}
      </button>
    </li>
  )
}

function ShelfHeader({ catalog, children }) {
  const label = ROOM_CATALOGS.find((c) => c.id === catalog)?.label
  return (
    <div className="shelf-header">
      <h2>{label}</h2>
      {children}
    </div>
  )
}

// ------------------------------------------------------------ the shop

// Click something and it appears in the room to try where it goes; it is
// bought when the reader confirms. A wallpaper, floor or wall shape is tried
// on the room the same way. Expansion goes straight to choosing a spot.
// The groups a catalogue's shelf is split into, each under its own heading.
// Walls hold two kinds of thing: the pattern on them, and the shape of the
// top.
const SHELF_GROUPS = {
  walls: [['wallpaper', 'Wall patterns']],
  wallTops: [['wallShape', 'Wall tops']],
  floors: [['floors', 'Flooring']],
}

// Why no upstairs floor can be laid yet.
function upperHint(room) {
  const stairs = room.items.some((item) => item.placed && (item.level ?? 0) === 0 && catalogEntry(item.kind)?.stairwell)
  if (!stairs) return 'Needs a staircase in the room'
  if (upperCells(room).length === 0) return `Needs a wall ${BLOCKS.upperWalls} blocks high`
  return 'Every square has one'
}

export function ShopShelf({ room, balance, catalog, onTryItem, onTryFinish, onExpansion }) {
  const current = ROOM_CATALOGS.find((c) => c.id === catalog)
  const afford = (price) => price <= (balance ?? 0)

  if (catalog === 'expansion') {
    const floorFull = floorCells(room).length >= BLOCKS.maxFloor
    return (
      <section className="shelf" aria-labelledby="shelf-heading">
        <ShelfHeader catalog={catalog} />
        <p className="shelf-hint">Choose a block, then click where it goes in the room. It is bought when you click.</p>
        <ul className="shelf-grid">
          {[
            ['floor', 'Floor block', `${BLOCKS.floor} × ${BLOCKS.floor} m`, floorFull && `All ${BLOCKS.maxFloor} built`],
            ['wall', 'Wall block', `${BLOCKS.wall} m high`, false],
            ['upper', 'Upstairs floor', 'Over a floor square', upperSpots(room).length === 0 && upperHint(room)],
          ].map(([kind, name, note, blocked]) => (
            <Tile
              key={kind}
              picture={<span className={`block-picture block-picture-${kind}`} aria-hidden="true" />}
              name={name}
              price={blockPrice(kind)}
              note={blocked || note}
              disabled={Boolean(blocked) || !afford(blockPrice(kind))}
              title={blocked || (afford(blockPrice(kind)) ? name : earnHint(blockPrice(kind) - (balance ?? 0)))}
              onClick={() => onExpansion({ action: 'add', kind })}
            />
          ))}
        </ul>
        <p className="shelf-hint">To move a block or sell it back, point at it in the room.</p>
      </section>
    )
  }

  const entries = forSaleIn(current)
  const tiles = (list) => (
    <ul className="shelf-grid">
      {list.map((entry) => {
        const owned = entry.type !== 'item' && room.unlocks.includes(entry.id)
        return (
          <Tile
            key={entry.id}
            picture={<Swatch entry={entry} room={room} />}
            name={entry.name}
            price={owned ? undefined : entry.price}
            note={owned ? 'Owned' : undefined}
            disabled={owned || !afford(entry.price)}
            title={owned || afford(entry.price) ? entry.name : earnHint(entry.price - (balance ?? 0))}
            onClick={() => (entry.type === 'item' ? onTryItem(entry) : onTryFinish(entry))}
          />
        )
      })}
    </ul>
  )
  const groups = SHELF_GROUPS[catalog]
  return (
    <section className="shelf" aria-labelledby="shelf-heading">
      <ThumbnailStudio kinds={ALL_KINDS} />
      <ShelfHeader catalog={catalog} />
      <p className="shelf-hint">Click something to try it in the room.</p>
      {groups && groups.length > 1
        ? groups.map(([category, heading]) => (
            <div key={category}>
              <h3 className="shelf-subheading">{heading}</h3>
              {tiles(entries.filter((entry) => entry.category === category))}
            </div>
          ))
        : tiles(entries)}
    </section>
  )
}

// ------------------------------------------------------------ building

// What the reader owns in the catalogue. Furniture comes out of storage into
// the room with a click; walls and floors are chosen, and painted.
export function BuildShelf({ room, catalog, storedItems, onPlace, onRoomChange, onShop }) {
  if (catalog === 'walls' || catalog === 'floors' || catalog === 'wallTops') {
    const walls = catalog === 'walls'
    const tops = catalog === 'wallTops'
    const upstairs = catalog === 'floors' && upperCells(room).length > 0
    const finishes = (category) => CATALOG.filter((e) => e.category === category && room.unlocks.includes(e.id))
    // A set of finish tiles, choosing the room setting `key`.
    const tiles = (category, key, look = room) => (
      <ul className="shelf-grid shelf-grid-wide">
        {finishes(category).map((entry) => (
          <Tile
            key={entry.id}
            picture={<Swatch entry={entry} room={look} />}
            name={entry.name}
            pressed={room[key] === entry.id}
            onClick={() => onRoomChange({ [key]: entry.id })}
          />
        ))}
      </ul>
    )
    // Paint swatches and a colour picker for the room setting `key`.
    const paints = (key, label) => (
      <>
        <div className="paint-swatches" role="group" aria-label={label}>
          {(walls ? WALL_PAINTS : FLOOR_PAINTS).map((color) => (
            <button
              key={color}
              type="button"
              className="paint-swatch"
              style={{ background: color }}
              aria-pressed={room[key] === color}
              aria-label={`${label} ${color}`}
              onClick={() => onRoomChange({ [key]: color })}
            />
          ))}
        </div>
        <label className="color-field">
          <input type="color" value={room[key]} onChange={(event) => onRoomChange({ [key]: event.target.value })} />
          Any colour
        </label>
      </>
    )
    return (
      <section className="shelf" aria-labelledby="shelf-heading">
        <ShelfHeader catalog={catalog} />
        {SHELF_GROUPS[catalog].map(([category, heading]) => (
          <div key={category}>
            <h3 className="shelf-subheading">{upstairs ? 'Downstairs floor' : heading}</h3>
            {tiles(category, CATALOG.find((e) => e.category === category)?.type)}
          </div>
        ))}
        {!tops && (
          <>
            <h3 className="shelf-subheading">{upstairs ? 'Downstairs colour' : 'Colour'}</h3>
            {paints(walls ? 'wallColor' : 'floorColor', walls ? 'Wall colour' : 'Floor colour')}
          </>
        )}
        {upstairs && (
          <>
            <h3 className="shelf-subheading">Upstairs floor</h3>
            {tiles('floors', 'upperFloor', { ...room, floorColor: room.upperFloorColor })}
            <h3 className="shelf-subheading">Upstairs colour</h3>
            {paints('upperFloorColor', 'Upstairs floor colour')}
          </>
        )}
        <ShopButton onClick={onShop} label={walls ? 'Shop walls' : tops ? 'Shop wall tops' : 'Shop floors'} />
      </section>
    )
  }

  const current = ROOM_CATALOGS.find((c) => c.id === catalog)
  const here = storedItems.filter((item) => current.cats.includes(catalogEntry(item.kind)?.category))
  const kinds = [...new Set(here.map((item) => item.kind))]
  return (
    <section className="shelf" aria-labelledby="shelf-heading">
      <ThumbnailStudio kinds={ALL_KINDS} />
      <ShelfHeader catalog={catalog} />
      {kinds.length === 0 ? (
        <div className="shelf-empty">
          <p className="shelf-hint">Nothing of these in your storage room.</p>
          <ShopButton onClick={onShop} label="Find some in the shop" />
        </div>
      ) : (
        <>
          <p className="shelf-hint">Click one to bring it into the room.</p>
          <ul className="shelf-grid">
            {kinds.map((kind) => {
              const mine = here.filter((item) => item.kind === kind)
              return (
                <Tile
                  key={kind}
                  picture={<ItemThumb kind={kind} />}
                  name={nameOf(kind)}
                  count={mine.length}
                  onClick={() => onPlace(mine[0])}
                />
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

// ------------------------------------------------------------ storage

// Selling, from the storage room: one click to ask, a second to confirm.
function SellButton({ item, onSell }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const refund = sellPrice(item.kind)
  if (!asking) {
    return (
      <button type="button" className="button-quiet button-small button-sell" onClick={() => setAsking(true)}>
        Sell · <EmberIcon /> {refund}
      </button>
    )
  }
  return (
    <span className="sell-confirm" role="group" aria-label={`Sell ${nameOf(item.kind)}?`}>
      <span>Sell for {refund} Ember? (Half its price.)</span>
      <button
        type="button"
        className="button-small button-sell"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await onSell(item)
          setBusy(false)
        }}
      >
        {busy ? 'Selling...' : 'Yes, sell it'}
      </button>
      <button type="button" className="button-quiet button-small" onClick={() => setAsking(false)} disabled={busy}>
        Keep it
      </button>
    </span>
  )
}

export function StoragePanel({ items, names, books, onPlace, onSell, onOpenBook, onShop }) {
  return (
    <section className="shelf" aria-labelledby="storage-heading">
      <ThumbnailStudio kinds={ALL_KINDS} />
      <div className="shelf-header">
        <h2 id="storage-heading">Storage room</h2>
      </div>

      <h3 className="shelf-subheading">
        Furniture <span className="muted">· {items.length}</span>
      </h3>
      {items.length === 0 ? (
        <div className="shelf-empty">
          <p className="shelf-hint">Nothing stored.</p>
          <ShopButton onClick={onShop} label="Visit the shop" />
        </div>
      ) : (
        <ul className="storage-grid">
          {items.map((item) => (
            <li key={item.id} className="storage-card">
              <ItemThumb kind={item.kind} />
              <span className="shelf-tile-name">{names[item.id]}</span>
              <button type="button" className="button-small" onClick={() => onPlace(item)}>
                Put in the room
              </button>
              <SellButton item={item} onSell={onSell} />
            </li>
          ))}
        </ul>
      )}

      <h3 className="shelf-subheading">
        Books waiting for a shelf <span className="muted">· {books.length}</span>
      </h3>
      {books.length === 0 ? (
        <p className="shelf-hint">Every book you have started is on display.</p>
      ) : (
        <>
          <p className="shelf-hint">
            There is no room for these on your shelves. Put out another bookcase, or make one bigger, and they go up by
            themselves.
          </p>
          <ul className="storage-books">
            {books.map((entry) => (
              <li key={entry.bookId}>
                <button type="button" className="storage-book" onClick={() => onOpenBook(entry.bookId)}>
                  <BookCover book={entry.book} size="sm" />
                  <span>{entry.book.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
