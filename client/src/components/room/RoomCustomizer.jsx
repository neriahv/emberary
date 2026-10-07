import { useState } from 'react'
import {
  BLOCKS,
  CATALOG,
  EMBER_RULES,
  LOFT,
  SHOP_CATEGORIES,
  SIZE_LIMITS,
  WINDOW_LIMITS,
  blockPrice,
  blockRefund,
  catalogEntry,
  checkout,
  floorCells,
  forSale,
  hasLoft,
  isSmall,
  pickSpots,
  resizable,
  sellPrice,
  wallHeight,
} from '../../api'
import BookCover from '../BookCover.jsx'
import { EmberIcon } from '../EmberBadge.jsx'
import { MODELS } from './models.jsx'
import { FinishSwatch, ItemThumb, StructureSwatch, ThumbnailStudio } from './thumbnails.jsx'
import { alongOf, fitWindow, wallOf } from './windows.jsx'

// The Library Room's three panels, one for each of its modes, and the tray of
// stored things along the bottom while building:
//
//   Shop     browse by kind, fill a cart, buy: what is bought goes into the
//            storage room
//   Build    the room's own tools (blocks, finishes, colours) or, with
//            something selected, its colour and size
//   Storage  the furniture and the books waiting in the storage room

const ALL_KINDS = CATALOG.filter((entry) => entry.type === 'item').map((entry) => entry.id)
const FURNISH = SHOP_CATEGORIES.filter((c) => c.section === 'furnish')
const BUILDING = SHOP_CATEGORIES.filter((c) => c.section === 'build')
const FINISH_CATEGORIES = BUILDING.filter((c) => c.id !== 'windows')

const COLOR_FIELDS = [
  { key: 'wallColor', label: 'Walls' },
  { key: 'floorColor', label: 'Floor' },
  { key: 'shelfColor', label: 'Bookcases' },
]

// One click to colour the whole room in a mood. Free: colours always are.
const PALETTES = [
  { label: 'Cozy', wallColor: '#e3a86b', floorColor: '#9a5530', shelfColor: '#5e3219' },
  { label: 'Autumn', wallColor: '#d98a4e', floorColor: '#7a3b1e', shelfColor: '#4a2512' },
  { label: 'Pastel', wallColor: '#f6d7de', floorColor: '#e8cdb8', shelfColor: '#e8a7b8' },
  { label: 'Nature', wallColor: '#b5c27e', floorColor: '#8a5a3a', shelfColor: '#6b4a2a' },
  { label: 'Starlit', wallColor: '#4a3f6b', floorColor: '#5c5470', shelfColor: '#3a2433' },
]

// Paints for furniture: soft pastels, warm woods and a few deep colours.
const PAINTS = [
  '#f6d7de', '#f2a7a0', '#f07870', '#f6c84a', '#f39a3a', '#c3a6e8',
  '#9fd4b0', '#8fb08a', '#4fb8b0', '#7fb3e0', '#f6f2ea', '#d9a05b',
  '#8a5a3a', '#5e3219', '#3a2433', '#2f3a4a',
]

const BLOCK_TYPES = [
  { kind: 'floor', label: 'Floor block', note: `${BLOCKS.floor} × ${BLOCKS.floor} m of floor` },
  { kind: 'wall', label: 'Wall block', note: `${BLOCKS.floor} m of wall, ${BLOCKS.wall} m high` },
]

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

function Price({ amount }) {
  if (amount === 0) return <span className="price">Free</span>
  return (
    <span className="price">
      <EmberIcon /> {amount}
    </span>
  )
}

function earnHint(short) {
  return `You need ${short} more Ember. Finish a book (+${EMBER_RULES.bookFinished}), read ${EMBER_RULES.dailyPageGoal} pages today (+${EMBER_RULES.dailyGoalReward}) or check in (+${EMBER_RULES.dailyCheckIn}).`
}

// A wallpaper or floor is shown in the colour it will be tinted in the room;
// the other build options are drawn; furniture is photographed.
function Swatch({ entry, room }) {
  if (entry.type === 'item') return <ItemThumb kind={entry.id} />
  if (entry.type === 'wallpaper') return <FinishSwatch id={entry.id} color={room.wallColor} />
  if (entry.type === 'floor') return <FinishSwatch id={entry.id} color={room.floorColor} />
  return <StructureSwatch entry={entry} />
}

// Selling, from a panel: one click to ask, a second to confirm.
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

function PanelHeader({ title, balance, children }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      {children}
      <span className="drawer-balance" title="Your Ember">
        <EmberIcon /> {balance ?? '…'}
      </span>
    </div>
  )
}

// ------------------------------------------------------------ the shop

export function ShopPanel({ room, balance, onBought, onGoBuild }) {
  const [category, setCategory] = useState(FURNISH[0].id)
  const [cart, setCart] = useState([]) // catalogue ids; furniture may repeat
  const [viewing, setViewing] = useState('shelves') // or 'cart'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const total = cart.reduce((sum, id) => sum + catalogEntry(id).price, 0)
  const short = total - (balance ?? 0)
  const entries = CATALOG.filter((entry) => entry.category === category && forSale(entry) && entry.price > 0)

  const add = (id) => {
    setDone(null)
    setError(null)
    setCart((current) => [...current, id])
  }
  const removeAt = (index) => setCart((current) => current.filter((_, i) => i !== index))

  async function buy() {
    setBusy(true)
    setError(null)
    try {
      const result = await checkout(cart)
      setDone(`${cart.length} ${cart.length === 1 ? 'thing' : 'things'} bought for ${total} Ember.`)
      setCart([])
      setViewing('shelves')
      onBought(result)
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="shop panel" aria-labelledby="shop-heading">
      <ThumbnailStudio kinds={ALL_KINDS} />
      <PanelHeader title={<span id="shop-heading">Shop</span>} balance={balance}>
        <button
          type="button"
          className={`cart-toggle${viewing === 'cart' ? ' is-open' : ''}`}
          onClick={() => setViewing(viewing === 'cart' ? 'shelves' : 'cart')}
          aria-pressed={viewing === 'cart'}
        >
          🛒 Cart{cart.length > 0 && <span className="cart-count">{cart.length}</span>}
        </button>
      </PanelHeader>

      {done && (
        <div className="shop-done" role="status">
          <p>
            <strong>{done}</strong> Furniture waits in your storage room; finishes are ready to use.
          </p>
          <button type="button" className="button-small" onClick={onGoBuild}>
            🔨 Go build
          </button>
        </div>
      )}

      {viewing === 'shelves' ? (
        <>
          <div className="shop-categories" role="group" aria-label="Furniture">
            {FURNISH.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="shop-categories" role="group" aria-label="For the room itself">
            {BUILDING.map((c) => (
              <button key={c.id} type="button" className="chip chip-small" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <ul className="shop-grid" aria-label={SHOP_CATEGORIES.find((c) => c.id === category).label}>
            {entries.map((entry) => {
              const isFinish = entry.type !== 'item'
              const owned = isFinish && room.unlocks.includes(entry.id)
              const inCart = cart.filter((id) => id === entry.id).length
              return (
                <li key={entry.id} className="shop-card">
                  <Swatch entry={entry} room={room} />
                  <span className="shop-card-name">{entry.name}</span>
                  <Price amount={entry.price} />
                  {owned ? (
                    <span className="shop-card-owned">Owned</span>
                  ) : isFinish && inCart ? (
                    <span className="shop-card-owned">In cart</span>
                  ) : (
                    <button type="button" className="button-small" onClick={() => add(entry.id)} aria-label={`Add ${entry.name} to cart`}>
                      {inCart ? `Add another (${inCart})` : 'Add to cart'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          {cart.length > 0 && (
            <button type="button" className="cart-checkout-bar" onClick={() => setViewing('cart')}>
              🛒 {cart.length} in cart · <EmberIcon /> {total} · Proceed to buy
            </button>
          )}
        </>
      ) : (
        <div className="cart-view" aria-labelledby="cart-heading">
          <h3 id="cart-heading">Your cart</h3>
          {cart.length === 0 ? (
            <p className="muted">Your cart is empty.</p>
          ) : (
            <>
              <ul className="cart-lines">
                {cart.map((id, index) => {
                  const entry = catalogEntry(id)
                  return (
                    <li key={`${id}-${index}`}>
                      <Swatch entry={entry} room={room} />
                      <span className="cart-line-name">{entry.name}</span>
                      <Price amount={entry.price} />
                      <button type="button" className="button-link cart-remove" onClick={() => removeAt(index)} aria-label={`Remove ${entry.name} from cart`}>
                        ×
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="cart-total">
                <span>Total</span>
                <Price amount={total} />
              </p>
              <p className="muted cart-after">
                You have {balance} Ember{short > 0 ? '.' : `, ${balance - total} left after this.`}
              </p>
              {short > 0 && (
                <p className="cart-short" role="status">
                  {earnHint(short)}
                </p>
              )}
              <button type="button" className="cart-buy" onClick={buy} disabled={busy || short > 0}>
                {busy ? 'Buying...' : `Buy for ${total} Ember`}
              </button>
            </>
          )}
          <button type="button" className="button-link" onClick={() => setViewing('shelves')}>
            ← Keep shopping
          </button>
        </div>
      )}
      {error && (
        <p className="error error-inline" role="alert">
          {error.message}
        </p>
      )}
    </section>
  )
}

// ------------------------------------------------------------ building

// The right-hand panel while building: the selected thing's colour and size,
// or, with nothing selected, the room's own tools.
export function BuildPanel({ room, balance, selected, names, onRoomChange, onItemChange, onGesture, onBlockMode, onDeselect }) {
  return (
    <section className="panel" aria-labelledby="build-heading">
      <ThumbnailStudio kinds={ALL_KINDS} />
      <PanelHeader title={<span id="build-heading">{selected ? names[selected.id] : 'Build'}</span>} balance={balance} />
      {selected ? (
        <ItemPanel key={selected.id} room={room} item={selected} onItemChange={onItemChange} onGesture={onGesture} onDeselect={onDeselect} />
      ) : (
        <RoomTools room={room} balance={balance} onRoomChange={onRoomChange} onBlockMode={onBlockMode} />
      )}
    </section>
  )
}

function ItemPanel({ room, item, onItemChange, onGesture, onDeselect }) {
  const def = MODELS[item.kind]
  const isWindow = catalogEntry(item.kind)?.category === 'windows'
  const [custom, setCustom] = useState(item.color ?? '#f6d7de')
  const paint = (color) => {
    onGesture(item)
    onItemChange(item.id, { color })
  }
  // A window is re-hung so it stays on its wall at its new size.
  const hang = (patch) => {
    const next = fitWindow(room, item.kind, {
      edge: wallOf(item),
      along: alongOf(item),
      y: patch.y ?? item.y,
      size: item.size ?? 1,
      sx: patch.sx ?? item.sx ?? 1,
      sy: patch.sy ?? item.sy ?? 1,
    })
    return { ...patch, x: next.x, z: next.z, y: next.y }
  }
  const resize = (patch) => onItemChange(item.id, isWindow ? hang(patch) : patch)
  const loft = hasLoft(room)
  const wall = isWindow && wallOf(item)
  const top = isWindow ? wallHeight(room, wall.side, wall.i, wall.j) * BLOCKS.wall : 0

  return (
    <div className="item-panel">
      <p className="muted hint">
        {isWindow
          ? 'Drag it over the walls to move it.'
          : isSmall(item.kind)
            ? 'Drag it onto a table, a seat or a shelf, or onto the floor.'
            : def?.wall
              ? 'Drag it and it follows the nearest wall.'
              : 'Drag it across the floor.'}{' '}
        The buttons above it undo, turn, store and sell.
      </p>

      <fieldset>
        <legend>Colour</legend>
        <div className="paint-swatches" role="group" aria-label="Paint it">
          {PAINTS.map((color) => (
            <button
              key={color}
              type="button"
              className="paint-swatch"
              style={{ background: color }}
              aria-pressed={item.color === color}
              aria-label={`Paint it ${color}`}
              onClick={() => paint(color)}
            />
          ))}
        </div>
        <div className="paint-row">
          <label className="color-field">
            <input
              type="color"
              value={custom}
              onFocus={() => onGesture(item)}
              onChange={(event) => {
                setCustom(event.target.value)
                onItemChange(item.id, { color: event.target.value })
              }}
            />
            Any colour
          </label>
          <button type="button" className="button-quiet button-small" onClick={() => paint(null)} disabled={!item.color}>
            Its own colour
          </button>
        </div>
      </fieldset>

      {resizable(item.kind) && (
        <fieldset>
          <legend>Size</legend>
          {[
            ['sx', 'Width'],
            ['sy', 'Height'],
          ].map(([key, label]) => (
            <label key={key} className="slider-field">
              <span>
                {label} <span className="muted">{Math.round((item[key] ?? 1) * 100)}%</span>
              </span>
              <input
                type="range"
                min={SIZE_LIMITS[key][0]}
                max={SIZE_LIMITS[key][1]}
                step="0.05"
                value={item[key] ?? 1}
                onPointerDown={() => onGesture(item)}
                onChange={(event) => resize({ [key]: Number(event.target.value) })}
              />
            </label>
          ))}
          {isWindow && (
            <label className="slider-field">
              <span>Height on the wall</span>
              <input
                type="range"
                min={WINDOW_LIMITS.y[0]}
                max={top}
                step="0.05"
                value={item.y}
                onPointerDown={() => onGesture(item)}
                onChange={(event) => onItemChange(item.id, { y: hang({ y: Number(event.target.value) }).y })}
              />
            </label>
          )}
          <button
            type="button"
            className="button-quiet button-small"
            onClick={() => {
              onGesture(item)
              resize({ sx: 1, sy: 1 })
            }}
          >
            Usual size
          </button>
        </fieldset>
      )}

      {(def?.light || (loft && !item.on && !def?.wall)) && (
        <fieldset>
          <legend>More</legend>
          {def?.light && (
            <label className="check-field">
              <input type="checkbox" checked={item.lit !== false} onChange={(event) => onItemChange(item.id, { lit: event.target.checked })} />
              Switched on
            </label>
          )}
          {loft && !item.on && !def?.wall && (
            <div className="segmented" role="group" aria-label="Which floor">
              {[
                [0, 'Ground floor'],
                [1, 'Up in the loft'],
              ].map(([level, label]) => (
                <button
                  key={level}
                  type="button"
                  className="chip"
                  aria-pressed={(item.level ?? 0) === level}
                  onClick={() => {
                    onGesture(item)
                    onItemChange(item.id, { level })
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </fieldset>
      )}

      <button type="button" className="button-quiet button-small" onClick={onDeselect}>
        Done with this
      </button>
    </div>
  )
}

function RoomTools({ room, balance, onRoomChange, onBlockMode }) {
  const loftReady = hasLoft({ ...room, loft: 'loft-gallery' })
  const floorFull = floorCells(room).length >= BLOCKS.maxFloor
  return (
    <div className="build">
      <p className="muted hint">Click anything in the room to move, turn, paint or size it. Your stored things are in the tray below.</p>
      <fieldset>
        <legend>Room blocks</legend>
        <p className="muted hint">
          Choose where each block goes, right in the room, and click. You pay when you click. Move blocks, or take one
          away for half its price back.
        </p>
        <ul className="block-steps">
          {BLOCK_TYPES.map((type) => {
            const full = type.kind === 'floor' && floorFull
            const price = blockPrice(type.kind)
            const short = price - (balance ?? 0)
            return (
              <li key={type.kind} className="block-step">
                <span className="block-step-name">{type.label}</span>
                <span className="block-step-note">{full ? `The room has all ${BLOCKS.maxFloor}` : type.note}</span>
                <span className="block-step-actions">
                  <button
                    type="button"
                    className="button-small"
                    disabled={full || short > 0}
                    title={short > 0 ? earnHint(short) : undefined}
                    onClick={() => onBlockMode({ action: 'add', kind: type.kind })}
                  >
                    Buy · <EmberIcon /> {price}
                  </button>
                  <button
                    type="button"
                    className="button-small button-quiet"
                    disabled={pickSpots(room, type.kind, 'move').length === 0}
                    onClick={() => onBlockMode({ action: 'move', kind: type.kind })}
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    className="button-small button-quiet"
                    disabled={pickSpots(room, type.kind, 'remove').length === 0}
                    title={`Gives back ${blockRefund(type.kind)} Ember`}
                    onClick={() => onBlockMode({ action: 'remove', kind: type.kind })}
                  >
                    Take away
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {FINISH_CATEGORIES.map((category) => {
        const all = CATALOG.filter((entry) => entry.category === category.id)
        const owned = all.filter((entry) => room.unlocks.includes(entry.id))
        return (
          <fieldset key={category.id}>
            <legend>{category.label}</legend>
            {category.id === 'loft' && !loftReady && (
              <p className="muted hint">
                A reading loft runs along the first window wall wherever it stands {LOFT.wallBlocks} blocks high.
              </p>
            )}
            <ul className="finish-choices">
              {owned.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="finish-choice"
                    aria-pressed={room[entry.type] === entry.id}
                    disabled={entry.id === 'loft-gallery' && !loftReady}
                    onClick={() => onRoomChange({ [entry.type]: entry.id })}
                  >
                    <Swatch entry={entry} room={room} />
                    <span>{entry.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            {owned.length < all.length && <p className="muted hint">More in the shop.</p>}
          </fieldset>
        )
      })}

      <fieldset>
        <legend>Colours</legend>
        <div className="palettes">
          {PALETTES.map(({ label, ...colours }) => (
            <button key={label} type="button" className="palette" onClick={() => onRoomChange(colours)}>
              <span className="palette-dots" aria-hidden="true">
                {Object.values(colours).map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </span>
              {label}
            </button>
          ))}
        </div>
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="color-field">
            <input type="color" value={room[key]} onChange={(event) => onRoomChange({ [key]: event.target.value })} />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  )
}

// What is in storage, along the bottom of the room while building. Click one
// to bring it into the room.
export function BuildTray({ items, names, onPlace }) {
  return (
    <div className="build-tray" role="region" aria-label="Your storage room">
      <span className="build-tray-label">📦 Storage</span>
      {items.length === 0 ? (
        <span className="build-tray-empty">Empty. Buy things in the shop and they wait here.</span>
      ) : (
        <ul className="build-tray-items">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className="build-tray-item" onClick={() => onPlace(item)} title={`Put ${names[item.id]} in the room`}>
                <ItemThumb kind={item.kind} />
                <span>{names[item.id]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ------------------------------------------------------------ storage

export function StoragePanel({ balance, items, names, books, onPlace, onSell, onOpenBook, onShop }) {
  return (
    <section className="panel" aria-labelledby="storage-heading">
      <ThumbnailStudio kinds={ALL_KINDS} />
      <PanelHeader title={<span id="storage-heading">Storage room</span>} balance={balance} />

      <fieldset>
        <legend>
          Furniture <span className="muted">· {items.length}</span>
        </legend>
        {items.length === 0 ? (
          <p className="muted">
            Nothing stored. <button type="button" className="button-link" onClick={onShop}>Visit the shop</button>.
          </p>
        ) : (
          <ul className="storage-grid">
            {items.map((item) => (
              <li key={item.id} className="storage-card">
                <ItemThumb kind={item.kind} />
                <span className="shop-card-name">{names[item.id]}</span>
                <button type="button" className="button-small" onClick={() => onPlace(item)}>
                  Put in the room
                </button>
                <SellButton item={item} onSell={onSell} />
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset>
        <legend>
          Books waiting for a shelf <span className="muted">· {books.length}</span>
        </legend>
        {books.length === 0 ? (
          <p className="muted">Every book you have started is on display.</p>
        ) : (
          <>
            <p className="muted hint">
              There is no room for these on your shelves. Put out another bookcase, or make one bigger, and they go up
              by themselves.
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
      </fieldset>
    </section>
  )
}
