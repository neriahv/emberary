import { useEffect, useRef, useState } from 'react'
import { updateRoom } from '../../api'

const COLOR_FIELDS = [
  { key: 'wallColor', label: 'Walls' },
  { key: 'floorColor', label: 'Floor' },
  { key: 'shelfColor', label: 'Bookcase' },
]

const DECOR_FIELDS = [
  { key: 'rug', label: 'Rug' },
  { key: 'plant', label: 'Plant' },
  { key: 'lamp', label: 'Reading lamp' },
]

// Changes show in the room immediately through onChange; saving waits for a
// pause, because a colour picker fires a change on every pixel you drag.
export default function RoomCustomizer({ room, onChange }) {
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [error, setError] = useState(null)
  const pending = useRef({})
  const timer = useRef(null)

  // Selecting a book swaps this panel out. Save anything still waiting rather
  // than dropping it.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (Object.keys(pending.current).length > 0) {
        updateRoom(pending.current).catch((caught) => console.error('Room not saved:', caught))
      }
    },
    []
  )

  function change(patch) {
    onChange(patch)
    pending.current = { ...pending.current, ...patch }
    clearTimeout(timer.current)
    timer.current = setTimeout(save, 500)
  }

  async function save() {
    const patch = pending.current
    pending.current = {}
    setSaveState('saving')
    setError(null)
    try {
      await updateRoom(patch)
      setSaveState('saved')
    } catch (caught) {
      setError(caught)
      setSaveState('error')
    }
  }

  return (
    <section className="card customizer" aria-labelledby="customize-heading">
      <h2 id="customize-heading">Customize your room</h2>

      <fieldset>
        <legend>Colours</legend>
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="color-field">
            <input type="color" value={room[key]} onChange={(event) => change({ [key]: event.target.value })} />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Decor</legend>
        {DECOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="check-field">
            <input type="checkbox" checked={room[key]} onChange={(event) => change({ [key]: event.target.checked })} />
            {label}
          </label>
        ))}
      </fieldset>

      <p className="muted save-state" role="status">
        {saveState === 'saving' && 'Saving...'}
        {saveState === 'saved' && 'Room saved.'}
      </p>
      {saveState === 'error' && (
        <p className="error" role="alert">
          Could not save the room: {error.message}
        </p>
      )}
    </section>
  )
}
