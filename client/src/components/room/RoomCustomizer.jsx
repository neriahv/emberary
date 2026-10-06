import { useEffect, useState } from 'react'
import {
  BLOCKS,
  CATALOG,
  EMBER_RULES,
  LOFT,
  SHOP_CATEGORIES,
  WINDOW_LIMITS,
  FIXTURES,
  FIXTURE_CLEARANCE,
  blockPrice,
  blockRefund,
  catalogEntry,
  cellBox,
  checkout,
  floorCells,
  hasLoft,
  nearestSpot,
  placedLimit,
  sellPrice,
  fixturesOf,
  pickSpots,
  sellRoomItem,
  standingAreas,
  updateRoomItem,
  wallHeight,
} from '../../api'
import { EmberIcon } from '../EmberBadge.jsx'
import { MODELS } from './models.jsx'
import { FinishSwatch, ItemThumb, StructureSwatch, ThumbnailStudio } from './thumbnails.jsx'
import { alongOf, fitWindow, wallOf } from './windows.jsx'

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

// The two kinds of room block, for the Build tab.
const BLOCK_TYPES = [
  { kind: 'floor', label: 'Floor block', note: `${BLOCKS.floor} × ${BLOCKS.floor} m of floor` },
  { kind: 'wall', label: 'Wall block', note: `${BLOCKS.floor} m of wall, ${BLOCKS.wall} m high` },
]

// Spending this much asks "are you sure?" first.
const CONFIRM_FROM = 20

const FURNITURE = [
  ...CATALOG.filter((entry) => entry.type === 'item').map((entry) => entry.id),
  ...Object.values(FIXTURES).map((f) => f.kind),
]
// The built-in pieces, as items the panel can list and arrange.
const fixtureItems = (room) =>
  Object.entries(fixturesOf(room)).map(([id, f]) => ({ id, kind: FIXTURES[id].kind, ...f, level: 0, placed: true }))
const isFixture = (id) => typeof id === 'string' && id in FIXTURES
const FINISH_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.section === 'build' && c.id !== 'windows')
const FURNISH_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.section === 'furnish')
const WINDOWS = CATALOG.filter((entry) => entry.category === 'windows')
const nameOf = (kind) => catalogEntry(kind)?.name ?? kind

// "Wooden chair", "Wooden chair 2": a name for each item that stays the same
// while you move it, so the list and the room can be matched up.
function itemNames(items) {
  const seen = {}
  return Object.fromEntries(
    items.map((item) => {
      seen[item.kind] = (seen[item.kind] ?? 0) + 1
      const n = seen[item.kind]
      return [item.id, nameOf(item.kind) + (n > 1 ? ` ${n}` : '')]
    })
  )
}

// A wallpaper or floor is shown in the colour it will be tinted in the room;
// the other build options are drawn.
function Swatch({ entry, room }) {
  if (entry.type === 'wallpaper') return <FinishSwatch id={entry.id} color={room.wallColor} />
  if (entry.type === 'floor') return <FinishSwatch id={entry.id} color={room.floorColor} />
  return <StructureSwatch entry={entry} />
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

// A button that spends Ember: one click for a small sum, two (the second to
// confirm) for a big one.
function SpendButton({ price, balance, busy, label, onSpend, ...props }) {
  const [confirming, setConfirming] = useState(false)
  const short = price - balance
  return (
    <button
      type="button"
      className="button-small"
      disabled={busy || short > 0}
      title={short > 0 ? earnHint(short) : undefined}
      onClick={() => {
        if (price >= CONFIRM_FROM && !confirming) return setConfirming(true)
        setConfirming(false)
        onSpend()
      }}
      onBlur={() => setConfirming(false)}
      {...props}
    >
      {confirming ? (
        `Confirm · ${price}`
      ) : (
        <>
          {label} · <EmberIcon /> {price}
        </>
      )}
    </button>
  )
}

// The edit panel of the Library Room: building the room itself, a shop for
// furniture, and the room's own arrangement. Changes to the room show straight
// away through the callbacks; the page's saver sends them after a pause.
// Purchases and sales are sent at once.
export default function RoomCustomizer({
  room,
  wallet,
  saver,
  tab,
  onTab,
  selectedItemId,
  onSelectItem,
  onRoomChange,
  onItemChange,
  onItemsChange,
  onItemSold,
  onUnlock,
  onBlockMode,
  onFixtureChange,
}) {
  // Clicking furniture in the room means the reader wants to arrange it.
  useEffect(() => {
    if (selectedItemId) onTab('room')
  }, [selectedItemId, onTab])

  // Whatever was bought arrives: furniture into the room, finishes unlocked
  // and put straight on (a floor bought is a floor wanted).
  function received(result) {
    onItemsChange((items) => [...items, ...result.items])
    onUnlock(result.unlocks)
    for (const id of result.unlocks) onRoomChange({ [catalogEntry(id).type]: id })
  }

  // Bought from the Build tab or the shop: show the reader where it went.
  function placedNew(result) {
    received(result)
    const first = result.items.find((item) => item.placed)
    if (first) {
      onTab('room')
      onSelectItem(first.id)
    }
  }

  const balance = wallet.data?.balance ?? 0

  return (
    <section className="customizer" aria-labelledby="customize-heading">
      <h2 id="customize-heading" className="visually-hidden">
        Build your dream library
      </h2>
      <div className="drawer-tabs" role="tablist" aria-label="Build your dream library">
        {[
          ['build', 'Build'],
          ['shop', 'Furnish'],
          ['room', 'Arrange'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="drawer-tab"
            onClick={() => onTab(id)}
          >
            {label}
          </button>
        ))}
        <span className="drawer-balance" title="Your Ember">
          <EmberIcon /> {wallet.data?.balance ?? '…'}
        </span>
      </div>

      {/* Takes the pictures of the furniture, once, off-screen. */}
      <ThumbnailStudio kinds={FURNITURE} />

      {tab === 'build' && (
        <Build
          room={room}
          balance={balance}
          onRoomChange={onRoomChange}
          onBought={received}
          onWindowBought={placedNew}
          onBlockMode={onBlockMode}
        />
      )}
      {tab === 'shop' && <Shop balance={balance} onBought={placedNew} />}
      {tab === 'room' && (
        <Arrange
          room={room}
          saver={saver}
          selectedItemId={selectedItemId}
          onSelectItem={onSelectItem}
          onItemChange={onItemChange}
          onItemsChange={onItemsChange}
          onItemSold={onItemSold}
          onFixtureChange={onFixtureChange}
          onShop={() => onTab('shop')}
        />
      )}

      <p className="muted save-state" role="status">
        {saver.status === 'saving' && 'Saving...'}
        {saver.status === 'saved' && 'Room saved.'}
      </p>
      {saver.status === 'error' && (
        <p className="error" role="alert">
          Could not save the room: {saver.error.message}
        </p>
      )}
    </section>
  )
}

// ------------------------------------------------------------ build

// The room itself: built a block at a time, then windows hung on its walls,
// a loft, the shape of the walls' tops, a roof, and what covers the walls and
// floor. Finishes are bought once and can then be swapped back and forth.
function Build({ room, balance, onRoomChange, onBought, onWindowBought, onBlockMode }) {
  const [busy, setBusy] = useState(null) // what is being bought
  const [error, setError] = useState(null)
  const [note, setNote] = useState(null)

  async function spend(id, buy, done) {
    setBusy(id)
    setError(null)
    setNote(null)
    try {
      done(await buy())
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(null)
    }
  }

  const buyFinish = (entry) =>
    spend(entry.id, () => checkout([entry.id]), (result) => {
      onBought(result)
      setNote(`${entry.name} for ${entry.price} Ember.`)
    })
  const buyWindow = (entry) => spend(entry.id, () => checkout([entry.id]), onWindowBought)

  const loftReady = hasLoft({ ...room, loft: 'loft-gallery' })
  const floorFull = floorCells(room).length >= BLOCKS.maxFloor

  return (
    <div className="build">
      {(note || error) && (
        <p className={error ? 'error error-inline' : 'build-note'} role={error ? 'alert' : 'status'}>
          {error ? error.message : note}
        </p>
      )}

      <fieldset>
        <legend>Room blocks</legend>
        <p className="muted hint">
          Build the room one block at a time, right in the room: choose where a block goes and click. A floor block
          goes beside the floor; a wall block on an edge of the floor, on top of any wall already there (up to{' '}
          {BLOCKS.maxLevels} high). You pay when you click. Move blocks around, or take one away for half its price
          back.
        </p>
        <ul className="block-steps">
          {BLOCK_TYPES.map((type) => {
            const full = type.kind === 'floor' && floorFull
            const price = blockPrice(type.kind)
            const short = price - balance
            const canMove = pickSpots(room, type.kind, 'move').length > 0
            const canRemove = pickSpots(room, type.kind, 'remove').length > 0
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
                    aria-label={`Buy a ${type.label.toLowerCase()} for ${price} Ember: choose where it goes`}
                  >
                    Buy · <EmberIcon /> {price}
                  </button>
                  <button
                    type="button"
                    className="button-small button-quiet"
                    disabled={!canMove}
                    onClick={() => onBlockMode({ action: 'move', kind: type.kind })}
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    className="button-small button-quiet"
                    disabled={!canRemove}
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

      <fieldset>
        <legend>Windows</legend>
        <p className="muted hint">Buy each window you want, then drag it anywhere on a wall and size it in Arrange.</p>
        <ul className="build-choices">
          {WINDOWS.map((entry) => (
            <li key={entry.id} className="build-card">
              <ItemThumb kind={entry.id} />
              <span className="build-card-name">{entry.name}</span>
              <SpendButton
                price={entry.price}
                balance={balance}
                busy={busy !== null}
                label="Buy"
                onSpend={() => buyWindow(entry)}
                aria-label={`Buy a ${entry.name} for ${entry.price} Ember`}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      {FINISH_CATEGORIES.map((category) => {
        const entries = CATALOG.filter((entry) => entry.category === category.id)
        return (
          <fieldset key={category.id}>
            <legend>{category.label}</legend>
            {category.id === 'loft' && !loftReady && (
              <p className="muted hint">
                A reading loft runs along the first window wall wherever it stands {LOFT.wallBlocks} blocks high. Add
                stairs from Furnish.
              </p>
            )}
            <ul className="build-choices">
              {entries.map((entry) => {
                const key = entry.type
                const owned = room.unlocks.includes(entry.id)
                const inUse = room[key] === entry.id
                const needsWall = entry.id === 'loft-gallery' && !loftReady
                return (
                  <li key={entry.id} className={`build-card${inUse ? ' is-in-use' : ''}`}>
                    <Swatch entry={entry} room={room} />
                    <span className="build-card-name">{entry.name}</span>
                    {inUse ? (
                      <span className="build-card-state">✓ In your room</span>
                    ) : owned ? (
                      <button
                        type="button"
                        className="button-small button-quiet"
                        disabled={needsWall}
                        onClick={() => onRoomChange({ [key]: entry.id })}
                      >
                        {needsWall ? 'Needs a taller wall' : 'Use this'}
                      </button>
                    ) : (
                      <SpendButton
                        price={entry.price}
                        balance={balance}
                        busy={busy !== null || needsWall}
                        label="Buy"
                        onSpend={() => buyFinish(entry)}
                        aria-label={`Buy ${entry.name} for ${entry.price} Ember`}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )
      })}

      <fieldset>
        <legend>Colours</legend>
        <p className="muted hint">A palette for each mood, free, or mix your own.</p>
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

// ------------------------------------------------------------ the shop

function Shop({ balance, onBought }) {
  const [category, setCategory] = useState(FURNISH_CATEGORIES[0].id)
  const [cart, setCart] = useState([]) // catalogue ids; furniture may repeat
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const total = cart.reduce((sum, id) => sum + catalogEntry(id).price, 0)
  const short = total - balance
  const entries = CATALOG.filter((entry) => entry.category === category)

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
      setCart([])
      setDone(`Bought ${cart.length} ${cart.length === 1 ? 'thing' : 'things'} for ${total} Ember.`)
      onBought(result)
    } catch (caught) {
      setError(caught)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shop">
      <div className="shop-categories" role="group" aria-label="Shop categories">
        {FURNISH_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ul className="shop-grid" aria-label={SHOP_CATEGORIES.find((c) => c.id === category).label}>
        {entries.map((entry) => {
          const inCart = cart.filter((id) => id === entry.id).length
          return (
            <li key={entry.id} className="shop-card">
              <ItemThumb kind={entry.id} />
              <span className="shop-card-name">{entry.name}</span>
              <Price amount={entry.price} />
              <button
                type="button"
                className="button-small"
                onClick={() => add(entry.id)}
                aria-label={`Add ${entry.name} to cart`}
              >
                {inCart ? `Add another (${inCart})` : 'Add to cart'}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="cart" aria-labelledby="cart-heading">
        <h3 id="cart-heading">
          Cart{cart.length > 0 && <span className="muted"> · {cart.length}</span>}
        </h3>
        {cart.length === 0 ? (
          <p className="muted cart-empty">{done ?? 'Add furniture to buy it.'}</p>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.map((id, index) => {
                const entry = catalogEntry(id)
                return (
                  <li key={`${id}-${index}`}>
                    <ItemThumb kind={id} />
                    <span className="cart-line-name">{entry.name}</span>
                    <Price amount={entry.price} />
                    <button
                      type="button"
                      className="button-link cart-remove"
                      onClick={() => removeAt(index)}
                      aria-label={`Remove ${entry.name} from cart`}
                    >
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
              You have {balance} Ember
              {short > 0 ? '.' : `, ${balance - total} left after this.`}
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
        {error && (
          <p className="error error-inline" role="alert">
            {error.message}
          </p>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ the room


// Sell an item for half what it cost: one click to ask, a second to confirm.
function SellButton({ item, name, onSold, saver }) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const refund = sellPrice(item.kind)
  async function sell() {
    setBusy(true)
    try {
      const result = await sellRoomItem(item.id)
      onSold(item.id, result)
      saver.report('saved')
    } catch (error) {
      saver.report('error', error)
      setBusy(false)
    }
  }
  if (!asking) {
    return (
      <button type="button" className="button-quiet button-small button-sell" onClick={() => setAsking(true)}>
        Sell for <EmberIcon /> {refund}
      </button>
    )
  }
  return (
    <span className="sell-confirm" role="group" aria-label={`Sell ${name}?`}>
      <span>
        Sell {name} for {refund} Ember? (Half of the {catalogEntry(item.kind)?.price} it cost.)
      </span>
      <button type="button" className="button-small button-sell" onClick={sell} disabled={busy}>
        {busy ? 'Selling...' : 'Yes, sell it'}
      </button>
      <button type="button" className="button-quiet button-small" onClick={() => setAsking(false)} disabled={busy}>
        Keep it
      </button>
    </span>
  )
}

// Where a window hangs on its wall: how far along, how high, how big. To
// move it to another wall, drag it there in the room.
function WindowControls({ room, item, onItemChange }) {
  const edge = wallOf(item)
  const place = (patch) => {
    onItemChange(item.id, fitWindow(room, item.kind, { edge, along: alongOf(item), y: item.y, size: item.size ?? 1, ...patch }))
  }
  const box = cellBox(edge.i, edge.j)
  const along = edge.side === 'x' ? box.x : box.z
  const top = wallHeight(room, edge.side, edge.i, edge.j) * BLOCKS.wall
  return (
    <>
      <label htmlFor="window-along">Along the wall</label>
      <input id="window-along" type="range" min={along[0]} max={along[1]} step="0.05" value={alongOf(item)}
        onChange={(event) => place({ along: Number(event.target.value) })} />
      <label htmlFor="window-y">Height on the wall</label>
      <input id="window-y" type="range" min={WINDOW_LIMITS.y[0]} max={top} step="0.05" value={item.y}
        onChange={(event) => place({ y: Number(event.target.value) })} />
      <label htmlFor="window-size">Size ({Math.round((item.size ?? 1) * 100)}%)</label>
      <input id="window-size" type="range" min={WINDOW_LIMITS.size[0]} max={WINDOW_LIMITS.size[1]} step="0.05" value={item.size ?? 1}
        onChange={(event) => place({ size: Number(event.target.value) })} />
    </>
  )
}

// The furthest an item may go each way on a level, for the sliders.
function reach(room, level, clearance) {
  const areas = standingAreas(room, level, clearance)
  return {
    x: [Math.min(...areas.map((a) => a.x[0])), Math.max(...areas.map((a) => a.x[1]))],
    z: [Math.min(...areas.map((a) => a.z[0])), Math.max(...areas.map((a) => a.z[1]))],
  }
}

function Arrange({ room, saver, selectedItemId, onSelectItem, onItemChange, onItemsChange, onItemSold, onFixtureChange, onShop }) {
  const [moving, setMoving] = useState(null) // id being stored or placed
  const builtIn = fixtureItems(room)
  const names = { ...itemNames(room.items), ...Object.fromEntries(builtIn.map((f) => [f.id, FIXTURES[f.id].name])) }
  const placed = room.items.filter((item) => item.placed)
  const stored = room.items.filter((item) => !item.placed)
  const selected = [...builtIn, ...placed].find((item) => item.id === selectedItemId)
  const fixture = selected && isFixture(selected.id)
  // The built-in pieces are saved with the room; furniture on its own.
  const change = (id, patch) => (isFixture(id) ? onFixtureChange(id, patch) : onItemChange(id, patch))
  const loftBuilt = hasLoft(room)
  const limit = placedLimit(room)

  // Quarter and eighth turns, for when a slider is too fiddly.
  const turn = (item, by) => change(item.id, { rotation: (item.rotation + by + 360) % 360 })

  // Up to the loft or down to the floor, as near to where it stood as fits.
  function moveToLevel(item, level) {
    const spot = nearestSpot(room, level, item.x, item.z)
    if (spot) onItemChange(item.id, { level, ...spot })
  }

  // A slider moved: as near to that as there is floor.
  function moveTo(item, patch) {
    const clearance = isFixture(item.id) ? FIXTURE_CLEARANCE : undefined
    const spot = nearestSpot(room, item.level ?? 0, patch.x ?? item.x, patch.z ?? item.z, clearance)
    if (spot) change(item.id, spot)
  }

  async function setPlaced(item, value) {
    setMoving(item.id)
    try {
      const saved = await updateRoomItem(item.id, { placed: value })
      onItemsChange((items) => items.map((i) => (i.id === item.id ? { ...i, ...saved } : i)))
      onSelectItem(value ? item.id : null)
      saver.report('saved')
    } catch (error) {
      saver.report('error', error)
    } finally {
      setMoving(null)
    }
  }

  function sold(id, result) {
    onSelectItem(null)
    onItemSold(id, result)
  }

  const bounds = selected && reach(room, selected.level ?? 0, fixture ? FIXTURE_CLEARANCE : undefined)
  const def = selected && MODELS[selected.kind]

  return (
    <div className="arrange">
      <fieldset>
        <legend>Built in</legend>
        <ul className="thumb-grid" aria-label="Built into the room">
          {builtIn.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="thumb-choice"
                aria-pressed={item.id === selectedItemId}
                onClick={() => onSelectItem(item.id === selectedItemId ? null : item.id)}
              >
                <ItemThumb kind={item.kind} />
                <span>{names[item.id]}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend>
          In the room <span className="muted">· {placed.length} of {limit}</span>
        </legend>
        {placed.length === 0 ? (
          <p className="muted">
            Nothing yet. <button type="button" className="button-link" onClick={onShop}>Visit the shop</button>.
          </p>
        ) : (
          <>
            <p className="muted hint">Pick something, or drag it in the room.</p>
            <ul className="thumb-grid" aria-label="Furniture in the room">
              {placed.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="thumb-choice"
                    aria-pressed={item.id === selectedItemId}
                    onClick={() => onSelectItem(item.id === selectedItemId ? null : item.id)}
                  >
                    <ItemThumb kind={item.kind} />
                    <span>{names[item.id]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </fieldset>

      {selected && (
        <fieldset className="item-editor">
          <legend>{names[selected.id]}</legend>
          {def?.window ? (
            <>
              <p className="muted hint">A window hangs on a wall only: drag it over the walls, or set it here.</p>
              <WindowControls room={room} item={selected} onItemChange={onItemChange} />
            </>
          ) : (
            <>
              {fixture && <p className="muted hint">Built into the room: drag it anywhere on the floor and turn it. It is not for sale.</p>}
              {def?.wall && <p className="muted hint">Hangs on a wall: drag it and it follows the nearest one.</p>}
              {def?.surfaces && <p className="muted hint">A table: drag a book from a shelf onto it.</p>}
              {loftBuilt && !fixture && (
                <div className="segmented" role="group" aria-label="Which floor">
                  {[
                    [0, 'Ground floor'],
                    [1, 'Up in the loft'],
                  ].map(([level, label]) => (
                    <button
                      key={level}
                      type="button"
                      className="chip"
                      aria-pressed={(selected.level ?? 0) === level}
                      onClick={() => moveToLevel(selected, level)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {def?.light && (
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={selected.lit !== false}
                    onChange={(event) => onItemChange(selected.id, { lit: event.target.checked })}
                  />
                  Switched on
                </label>
              )}
              <label htmlFor="item-x">Towards the window ↔ away</label>
              <input
                id="item-x"
                type="range"
                min={bounds.x[0]}
                max={bounds.x[1]}
                step="0.05"
                value={selected.x}
                onChange={(event) => moveTo(selected, { x: Number(event.target.value) })}
              />
              <label htmlFor="item-z">Towards the bookcase ↔ away</label>
              <input
                id="item-z"
                type="range"
                min={bounds.z[0]}
                max={bounds.z[1]}
                step="0.05"
                value={selected.z}
                onChange={(event) => moveTo(selected, { z: Number(event.target.value) })}
              />
              <label htmlFor="item-rotation">Turn ({selected.rotation}°)</label>
              <input
                id="item-rotation"
                type="range"
                min="0"
                max="355"
                step="5"
                value={selected.rotation}
                onChange={(event) => change(selected.id, { rotation: Number(event.target.value) })}
              />
              <div className="detail-actions">
                <button type="button" className="button-quiet button-small" onClick={() => turn(selected, -45)}>
                  ⟲ Turn left
                </button>
                <button type="button" className="button-quiet button-small" onClick={() => turn(selected, 45)}>
                  Turn right ⟳
                </button>
              </div>
            </>
          )}
          <div className="detail-actions">
            {!fixture && (
              <button
                type="button"
                className="button-quiet button-small"
                onClick={() => setPlaced(selected, false)}
                disabled={moving === selected.id}
              >
                Put in storage
              </button>
            )}
            <button type="button" className="button-quiet button-small" onClick={() => onSelectItem(null)}>
              Deselect
            </button>
          </div>
          {!fixture && (
            <div className="detail-actions">
              <SellButton key={selected.id} item={selected} name={names[selected.id]} onSold={sold} saver={saver} />
            </div>
          )}
        </fieldset>
      )}

      {stored.length > 0 && (
        <fieldset>
          <legend>In storage</legend>
          <p className="muted hint">Yours to place again, free, or to sell for half what it cost.</p>
          <ul className="thumb-grid" aria-label="Furniture in storage">
            {stored.map((item) => (
              <li key={item.id}>
                <div className="thumb-choice is-stored">
                  <ItemThumb kind={item.kind} />
                  <span>{names[item.id]}</span>
                  <button
                    type="button"
                    className="button-small"
                    onClick={() => setPlaced(item, true)}
                    disabled={moving === item.id}
                    aria-label={`Place ${names[item.id]} in the room`}
                  >
                    Place
                  </button>
                  <SellButton item={item} name={names[item.id]} onSold={sold} saver={saver} />
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  )
}
