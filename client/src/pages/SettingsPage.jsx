import { useState } from 'react'
import { getSettings, updateSettings } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
const zones = Intl.supportedValuesOf?.('timeZone') ?? [
  'Asia/Manila',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
]
export default function SettingsPage() {
  const result = useAsync(getSettings)
  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p className="lede">Make your reading days feel like yours.</p>
      </div>
      <AsyncState {...result} label="Loading settings" />
      {result.status === 'ready' && <SettingsForm initial={result.data} />}
    </>
  )
}
function SettingsForm({ initial }) {
  const [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const saved = await updateSettings(form)
      setForm(saved)
      window.dispatchEvent(new CustomEvent('emberary:settings', { detail: saved }))
      window.dispatchEvent(new Event('emberary:ember-changed'))
      setMessage('Settings saved.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="card form" onSubmit={submit}>
      <label>
        Time zone
        <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
          {[...new Set(['UTC', form.timezone, ...zones])].sort().map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </select>
      </label>
      <p className="muted">
        Your reading day and daily quests reset at midnight here. Past reading dates stay as recorded.
      </p>
      <label>
        Daily page goal
        <input
          type="number"
          min="5"
          max="500"
          required
          value={form.dailyPageGoal}
          onChange={(e) => setForm({ ...form, dailyPageGoal: Number(e.target.value) })}
        />
      </label>
      <label>
        Theme
        <select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">Match my device</option>
        </select>
      </label>
      <p role="status">{message}</p>
      <button disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
    </form>
  )
}
