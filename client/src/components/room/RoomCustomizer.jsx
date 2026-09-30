import { useEffect, useState } from 'react'
import {
  CATALOG,
  EMBER_RULES,
  ROOM_BOUNDS,
  SHOP_CATEGORIES,
  catalogEntry,
  checkout,
  updateRoomItem,
} from '../../api'
import { EmberIcon } from '../EmberBadge.jsx'
import { FinishSwatch, ItemThumb, ThumbnailStudio } from './thumbnails.jsx'

const COLOR_FIELDS = [
  { key: 'wallColor', label: 'Walls' },
  { key: 'floorColor', label: 'Floor' },
  { key: 'shelfColor', label: 'Bookcases' },
]

const FURNITURE = CATALOG.filter((entry) => entry.type === 'item').map((entry) => entry.id)
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

// A wallpaper or floor is shown in the colour it will be tinted in the room.
const finishColour = (entry, room) => (entry.type === 'wallpaper' ? room.wallColor : room.floorColor)

function Price({ amount }) {
  if (amount === 0) return <span className="price">Free</span>
  return (
    <span className="price">
      <EmberIcon /> {amount}
    </span>
  )
}

// The edit panel of the Library Room: a shop, and the room's own arrangement.
// Changes to the room show straight away through the callbacks; the page's
// saver sends them after a pause. Purchases are sent at once.
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
  onUnlock,
}) {
  // Clicking furniture in the room means the reader wants to arrange it.
  useEffect(() => {
    if (selectedItemId) onTab('room')
  }, [selectedItemId, onTab])

  return (
    <section className="customizer" aria-labelledby="customize-heading">
      <h2 id="customize-heading" className="visually-hidden">
        Edit your room
      </h2>
      <div className="drawer-tabs" role="tablist" aria-label="Edit your room">
        {[
          ['shop', 'Shop'],
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

      {tab === 'shop' ? (
        <Shop
          room={room}
          balance={wallet.data?.balance ?? 0}
          onBought={(result) => {
            onItemsChange((items) => [...items, ...result.items])
            onUnlock(result.unlocks)
            // A wallpaper or floor bought is a wallpaper or floor wanted.
            for (const id of result.unlocks) onRoomChange({ [catalogEntry(id).type]: id })
            const first = result.items.find((item) => item.placed)
            onTab('room')
            if (first) onSelectItem(first.id)
          }}
        />
      ) : (
        <Arrange
          room={room}
          saver={saver}
          selectedItemId={selectedItemId}
          onSelectItem={onSelectItem}
          onRoomChange={onRoomChange}
          onItemChange={onItemChange}
          onItemsChange={onItemsChange}
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

// ------------------------------------------------------------ the shop

function Shop({ room, balance, onBought }) {
  const [category, setCategory] = useState(SHOP_CATEGORIES[0].id)
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
        {SHOP_CATEGORIES.map((c) => (
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
          const isFinish = entry.type !== 'item'
          const owned = isFinish && room.unlocks.includes(entry.id)
          const inCart = cart.filter((id) => id === entry.id).length
          return (
            <li key={entry.id} className="shop-card">
              {isFinish ? (
                <FinishSwatch id={entry.id} color={finishColour(entry, room)} />
              ) : (
                <ItemThumb kind={entry.id} />
              )}
              <span className="shop-card-name">{entry.name}</span>
              <Price amount={entry.price} />
              {owned ? (
                <span className="shop-card-owned">Owned</span>
              ) : isFinish && inCart ? (
                <span className="shop-card-owned">In cart</span>
              ) : (
                <button
                  type="button"
                  className="button-small"
                  onClick={() => add(entry.id)}
                  aria-label={`Add ${entry.name} to cart`}
                >
                  {inCart ? `Add another (${inCart})` : 'Add to cart'}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <div className="cart" aria-labelledby="cart-heading">
        <h3 id="cart-heading">
          Cart{cart.length > 0 && <span className="muted"> · {cart.length}</span>}
        </h3>
        {cart.length === 0 ? (
          <p className="muted cart-empty">{done ?? 'Add furniture, wallpaper or a floor to buy it.'}</p>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.map((id, index) => {
                const entry = catalogEntry(id)
                return (
                  <li key={`${id}-${index}`}>
                    {entry.type === 'item' ? (
                      <ItemThumb kind={id} />
                    ) : (
                      <FinishSwatch id={id} color={finishColour(entry, room)} />
                    )}
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
                You need {short} more Ember. Finish a book (+{EMBER_RULES.bookFinished}), read{' '}
                {EMBER_RULES.dailyPageGoal} pages today (+{EMBER_RULES.dailyGoalReward}) or check in
                (+{EMBER_RULES.dailyCheckIn}).
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

function Arrange({
  room,
  saver,
  selectedItemId,
  onSelectItem,
  onRoomChange,
  onItemChange,
  onItemsChange,
  onShop,
}) {
  const [moving, setMoving] = useState(null) // id being stored or placed
  const names = itemNames(room.items)
  const placed = room.items.filter((item) => item.placed)
  const stored = room.items.filter((item) => !item.placed)
  const selected = placed.find((item) => item.id === selectedItemId)
  const ownedFinishes = (type) => CATALOG.filter((e) => e.type === type && room.unlocks.includes(e.id))

  // Quarter and eighth turns, for when a slider is too fiddly.
  const turn = (item, by) => onItemChange(item.id, { rotation: (item.rotation + by + 360) % 360 })

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

  return (
    <div className="arrange">
      <fieldset>
        <legend>Colours</legend>
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="color-field">
            <input type="color" value={room[key]} onChange={(event) => onRoomChange({ [key]: event.target.value })} />
            {label}
          </label>
        ))}
      </fieldset>

      {[
        ['wallpaper', 'Wallpaper'],
        ['floor', 'Floor'],
      ].map(([type, legend]) => (
        <fieldset key={type}>
          <legend>{legend}</legend>
          <ul className="finish-choices">
            {ownedFinishes(type).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="finish-choice"
                  aria-pressed={room[type] === entry.id}
                  onClick={() => onRoomChange({ [type]: entry.id })}
                >
                  <FinishSwatch id={entry.id} color={finishColour(entry, room)} />
                  <span>{entry.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      <fieldset>
        <legend>In the room</legend>
        {placed.length === 0 ? (
          <p className="muted">
            Nothing yet. <button type="button" className="button-link" onClick={onShop}>Visit the shop</button>.
          </p>
        ) : (
          <>
            <p className="muted hint">Pick something, or drag it across the floor in the room.</p>
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
          <label htmlFor="item-x">Towards the window ↔ away</label>
          <input
            id="item-x"
            type="range"
            min={ROOM_BOUNDS.x[0]}
            max={ROOM_BOUNDS.x[1]}
            step="0.05"
            value={selected.x}
            onChange={(event) => onItemChange(selected.id, { x: Number(event.target.value) })}
          />
          <label htmlFor="item-z">Towards the bookcase ↔ away</label>
          <input
            id="item-z"
            type="range"
            min={ROOM_BOUNDS.z[0]}
            max={ROOM_BOUNDS.z[1]}
            step="0.05"
            value={selected.z}
            onChange={(event) => onItemChange(selected.id, { z: Number(event.target.value) })}
          />
          <label htmlFor="item-rotation">Turn ({selected.rotation}°)</label>
          <input
            id="item-rotation"
            type="range"
            min="0"
            max="355"
            step="5"
            value={selected.rotation}
            onChange={(event) => onItemChange(selected.id, { rotation: Number(event.target.value) })}
          />
          <div className="detail-actions">
            <button type="button" className="button-quiet button-small" onClick={() => turn(selected, -45)}>
              ⟲ Turn left
            </button>
            <button type="button" className="button-quiet button-small" onClick={() => turn(selected, 45)}>
              Turn right ⟳
            </button>
          </div>
          <div className="detail-actions">
            <button
              type="button"
              className="button-quiet button-small"
              onClick={() => setPlaced(selected, false)}
              disabled={moving === selected.id}
            >
              Put in storage
            </button>
            <button type="button" className="button-quiet button-small" onClick={() => onSelectItem(null)}>
              Deselect
            </button>
          </div>
        </fieldset>
      )}

      {stored.length > 0 && (
        <fieldset>
          <legend>In storage</legend>
          <p className="muted hint">Yours to place again, free.</p>
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
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  )
}
