import { useState } from 'react'
import { getSnapshots, saveSnapshot, restoreSnapshot, deleteSnapshot } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from './AsyncState.jsx'
export default function RoomSnapshots({ onRestored, beforeSave }) {
  const snapshots = useAsync(getSnapshots),
    [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
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
    <aside className="snapshot-panel">
      <details>
        <summary>Saved layouts</summary>
        <p className="muted">
          Your current room size stays. Sold furniture is skipped; pieces that no longer fit return to
          storage.
        </p>
        <AsyncState {...snapshots} label="Loading saved layouts" />
        <form
          className="form"
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
          <label>
            Layout name
            <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button disabled={busy || !name.trim()}>Save current layout</button>
        </form>
        <ul>
          {snapshots.data?.map((s) => (
            <li key={s.id}>
              {s.name}
              <div className="detail-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await beforeSave?.()
                      const restored = await restoreSnapshot(s.id)
                      onRestored(restored.room)
                      setMessage(
                        restored.skipped.length
                          ? `Restored; ${restored.skipped.length} unavailable pieces were skipped or stored.`
                          : 'Layout restored.'
                      )
                    })
                  }
                >
                  Restore
                </button>
                <button
                  className="button-quiet"
                  disabled={busy}
                  onClick={() => act(() => deleteSnapshot(s.id))}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p role="status">{message}</p>
      </details>
    </aside>
  )
}
