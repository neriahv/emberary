import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, updateSettings } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import Icon from '../components/Icon.jsx'

const zones = Intl.supportedValuesOf?.('timeZone') ?? ['Asia/Manila', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo']

const THEMES = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'Match my device', icon: 'device' },
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
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const changed = ['timezone', 'dailyPageGoal', 'theme'].some((key) => form[key] !== saved[key])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const result = await updateSettings(form)
      setForm(result)
      setSaved(result)
      window.dispatchEvent(new CustomEvent('emberary:settings', { detail: result }))
      window.dispatchEvent(new Event('emberary:ember-changed'))
      setMessage({ ok: true, text: 'Settings saved.' })
    } catch (error) {
      setMessage({ ok: false, text: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="settings card" onSubmit={submit}>
      <div className="setting-row">
        <span className="setting-icon" aria-hidden="true">
          <Icon name="globe" />
        </span>
        <div className="setting-text">
          <label htmlFor="setting-timezone">Time zone</label>
          <p className="muted">Your reading day and daily quests start at midnight here.</p>
        </div>
        <select
          id="setting-timezone"
          className="setting-control"
          value={form.timezone}
          onChange={(e) => set('timezone', e.target.value)}
        >
          {[...new Set(['UTC', form.timezone, ...zones])].sort().map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </select>
      </div>

      <div className="setting-row">
        <span className="setting-icon" aria-hidden="true">
          <Icon name="target" />
        </span>
        <div className="setting-text">
          <label htmlFor="setting-goal">Daily page goal</label>
          <p className="muted">Reach it in a day for +5 Ember. From 5 to 500 pages.</p>
        </div>
        <div className="setting-control goal-control">
          <input
            type="range"
            min="5"
            max="500"
            step="5"
            aria-label="Daily page goal slider"
            value={form.dailyPageGoal}
            onChange={(e) => set('dailyPageGoal', Number(e.target.value))}
          />
          <input
            id="setting-goal"
            type="number"
            min="5"
            max="500"
            required
            value={form.dailyPageGoal}
            onChange={(e) => set('dailyPageGoal', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="setting-row" role="radiogroup" aria-labelledby="setting-theme">
        <span className="setting-icon" aria-hidden="true">
          <Icon name="sun" />
        </span>
        <div className="setting-text">
          <span id="setting-theme" className="setting-label">
            Theme
          </span>
          <p className="muted">Warm paper by day, firelight by night.</p>
        </div>
        <div className="setting-control theme-choices">
          {THEMES.map((theme) => (
            <label key={theme.id} className={`theme-choice theme-choice-${theme.id}`}>
              <input
                type="radio"
                name="theme"
                value={theme.id}
                checked={form.theme === theme.id}
                onChange={() => set('theme', theme.id)}
              />
              <span className="theme-preview" aria-hidden="true">
                <span />
                <span />
              </span>
              <span className="theme-label">
                <Icon name={theme.icon} />
                {theme.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="settings-foot">
        <p className="muted">
          <Icon name="lock" />
          <span>
            Your password and email are on your <Link to="/profile">Profile</Link>.
          </span>
        </p>
        <p role="status" className={message?.ok === false ? 'settings-error' : 'settings-ok'}>
          {message?.text}
        </p>
        <button disabled={busy || !changed}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  )
}
