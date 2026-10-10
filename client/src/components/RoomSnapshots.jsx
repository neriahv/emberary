import { useState } from 'react'
import { getSnapshots, saveSnapshot, restoreSnapshot, deleteSnapshot } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from './AsyncState.jsx'
import Icon from './Icon.jsx'

// The Library Room's Layouts mode: save how the room looks now, and bring a
// saved look back later.
export default function RoomSnapshots({ onRestored, beforeSave }) {
  const snapshots = useAsync(getSnapshots)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function act(work) {
    setBusy(true)
    setMessage('')
    try {
      await work()
      await snapshots.reload()
    } catch (e) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="layouts">
      <div className="shelf-header">
        <h2>Saved layouts</h2>
      </div>
      <p className="shelf-hint">
        Save the furniture, colours and finishes as they are now. Restoring keeps your room's size; sold pieces are
        skipped, and anything that no longer fits goes to storage.
      </p>
      <form
        className="layout-save"
        onSubmit={(e) => {
          e.preventDefault()
          act(async () => {
            await beforeSave?.()
            await saveSnapshot(name)
            setName('')
            setMessage('Layout saved.')
          })
        }}
      >
        <label htmlFor="layout-name" className="visually-hidden">
          Layout name
        </label>
        <input
          id="layout-name"
          required
          maxLength={60}
          placeholder="Name this look, e.g. Winter study"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="shelf-shop-button" disabled={busy || !name.trim()}>
          <Icon name="layers" />
          Save current layout
        </button>
      </form>

      {!snapshots.data && <AsyncState {...snapshots} label="Loading saved layouts" />}
      {snapshots.data?.length === 0 && <p className="shelf-hint">No saved layouts yet.</p>}
      {snapshots.data?.length > 0 && (
        <ul className="layout-list">
          {snapshots.data.map((s) => (
            <li key={s.id} className="layout-card">
              <span className="layout-card-icon" aria-hidden="true">
                <Icon name="layers" />
              </span>
              <strong>{s.name}</strong>
              <button
                type="button"
                className="button-small"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await beforeSave?.()
                    const restored = await restoreSnapshot(s.id)
                    onRestored(restored.room)
                    setMessage(
                      restored.skipped.length
                        ? `Restored. ${restored.skipped.length} ${restored.skipped.length === 1 ? 'piece was' : 'pieces were'} skipped or stored.`
                        : 'Layout restored.'
                    )
                  })
                }
              >
                Restore
              </button>
              <button
                type="button"
                className="note-delete"
                aria-label={`Delete ${s.name}`}
                disabled={busy}
                onClick={() => act(() => deleteSnapshot(s.id))}
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="layout-message">
        {message}
      </p>
    </div>
  )
}
