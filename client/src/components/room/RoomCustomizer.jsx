import { useState } from 'react'
import { ROOM_BOUNDS, ROOM_ITEM_KINDS, ROOM_ITEM_LABELS, addRoomItem, removeRoomItem } from '../../api'

const COLOR_FIELDS = [
  { key: 'wallColor', label: 'Walls' },
  { key: 'floorColor', label: 'Floor' },
  { key: 'shelfColor', label: 'Bookcases' },
]

// "Lantern", "Lantern 2": a name for each item that stays the same while you
// move it, so the list and the room can be matched up.
function itemNames(items) {
  const seen = {}
  return Object.fromEntries(
    items.map((item) => {
      seen[item.kind] = (seen[item.kind] ?? 0) + 1
      const n = seen[item.kind]
      return [item.id, ROOM_ITEM_LABELS[item.kind] + (n > 1 ? ` ${n}` : '')]
    })
  )
}

// The edit panel of the Library Room. Changes show in the room straight away
// through the callbacks; the page's saver sends them after a pause.
export default function RoomCustomizer({
  room,
  saver,
  selectedItemId,
  onSelectItem,
  onColourChange,
  onItemChange,
  onItemsChange,
}) {
  const [newKind, setNewKind] = useState('lantern')
  const [adding, setAdding] = useState(false)

  const names = itemNames(room.items)
  const selected = room.items.find((item) => item.id === selectedItemId)

  async function handleAdd() {
    setAdding(true)
    try {
      const item = await addRoomItem(newKind)
      onItemsChange((items) => [...items, item])
      onSelectItem(item.id)
      saver.report('saved')
    } catch (error) {
      saver.report('error', error)
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(item) {
    saver.forget(item.id)
    try {
      await removeRoomItem(item.id)
      onItemsChange((items) => items.filter((i) => i.id !== item.id))
      onSelectItem(null)
      saver.report('saved')
    } catch (error) {
      saver.report('error', error)
    }
  }

  // Quarter and eighth turns, for when a slider is too fiddly.
  const turn = (item, by) => onItemChange(item.id, { rotation: (item.rotation + by + 360) % 360 })

  return (
    <section className="customizer" aria-labelledby="customize-heading">
      <h2 id="customize-heading">Edit your room</h2>
      <p className="muted hint">Drag furniture across the floor to move it.</p>

      <fieldset>
        <legend>Colours</legend>
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="color-field">
            <input type="color" value={room[key]} onChange={(event) => onColourChange({ [key]: event.target.value })} />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Furniture</legend>
        <div className="item-add">
          <label htmlFor="new-item-kind" className="visually-hidden">
            Item to add
          </label>
          <select id="new-item-kind" value={newKind} onChange={(event) => setNewKind(event.target.value)}>
            {ROOM_ITEM_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {ROOM_ITEM_LABELS[kind]}
              </option>
            ))}
          </select>
          <button type="button" className="button-small" onClick={handleAdd} disabled={adding}>
            {adding ? 'Adding...' : 'Add to room'}
          </button>
        </div>

        {room.items.length === 0 ? (
          <p className="muted">The room is empty. Add something above.</p>
        ) : (
          <ul className="item-list" aria-label="Items in the room">
            {room.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="button-quiet button-small"
                  aria-pressed={item.id === selectedItemId}
                  onClick={() => onSelectItem(item.id === selectedItemId ? null : item.id)}
                >
                  {names[item.id]}
                </button>
              </li>
            ))}
          </ul>
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
            <button type="button" className="button-danger button-small" onClick={() => handleRemove(selected)}>
              Remove {names[selected.id]}
            </button>
            <button type="button" className="button-quiet button-small" onClick={() => onSelectItem(null)}>
              Deselect
            </button>
          </div>
        </fieldset>
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
