import { useEffect, useState } from 'react'
import {
  getReading,
  getYearReview,
  getQuests,
  claimQuest,
  getTimer,
  startTimer,
  stopTimer,
  changePassword,
  changeEmail,
  passwordProblems,
  checkEmail,
  USING_MOCK_API,
} from '../api'
import { useAsync } from '../hooks/useAsync.js'
import { useAuth } from './AuthGate.jsx'
import AsyncState from './AsyncState.jsx'

export function ReadingTimer() {
  const timer = useAsync(getTimer),
    [clock, setClock] = useState(Date.now()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    if (!timer.data) return
    const interval = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [timer.data])
  async function toggle() {
    setBusy(true)
    setError('')
    try {
      if (timer.data) {
        await stopTimer()
        timer.setData(null)
      } else {
        timer.setData(await startTimer())
        setClock(Date.now())
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const seconds = timer.data ? Math.max(0, Math.floor((clock - Date.parse(timer.data.startedAt)) / 1000)) : 0
  return (
    <section className="card panel">
      <h2>Reading timer</h2>
      <AsyncState {...timer} label="Loading timer" />
      <p role="timer">
        {Math.floor(seconds / 60)}m {seconds % 60}s
      </p>
      <button type="button" disabled={busy || timer.status !== 'ready'} onClick={toggle}>
        {timer.data ? 'Stop and log reading' : 'Start reading'}
      </button>
      <p className="muted">Your timer survives a page refresh. Forgotten timers log up to 12 hours.</p>
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
export function DailyQuests() {
  const quests = useAsync(getQuests),
    [busy, setBusy] = useState(null),
    [error, setError] = useState('')
  useEffect(() => {
    const refresh = () => quests.reload()
    window.addEventListener('emberary:ember-changed', refresh)
    window.addEventListener('focus', refresh)
    const tick = setInterval(refresh, 60000)
    return () => {
      window.removeEventListener('emberary:ember-changed', refresh)
      window.removeEventListener('focus', refresh)
      clearInterval(tick)
    }
  }, [quests.reload])
  async function claim(id) {
    setBusy(id)
    setError('')
    try {
      await claimQuest(id)
      await quests.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }
  return (
    <section className="card panel">
      <h2>Daily quests</h2>
      <AsyncState {...quests} label="Loading today's quests" />
      {quests.data && (
        <>
          <p className="muted">For {quests.data.day} · three fresh tasks each day</p>
          <div className="quest-grid">
            {quests.data.items.map((q) => (
              <div key={q.id}>
                <h3>{q.label}</h3>
                <progress value={Math.min(q.progress, q.target)} max={q.target} aria-label={q.label} />
                <p>
                  {Math.min(q.progress, q.target)} / {q.target} · +{q.reward} Ember
                </p>
                <button
                  disabled={busy !== null || q.claimed || q.progress < q.target}
                  onClick={() => claim(q.id)}
                >
                  {q.claimed ? 'Claimed' : busy === q.id ? 'Claiming…' : 'Claim'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
export function ReadingMilestones() {
  const reading = useAsync(getReading),
    review = useAsync(getYearReview)
  return (
    <div className="feature-stack">
      <section className="card panel">
        <h2>Your reading journey</h2>
        <AsyncState {...reading} label="Loading your milestones" />
        {reading.data && (
          <>
            <p>
              🔥 {reading.data.streak.current} days in a row · Best: {reading.data.streak.best} days
            </p>
            <p>{reading.data.minutes.toLocaleString()} minutes spent reading</p>
            <h3>Achievements</h3>
            <ul className="badge-list">
              {reading.data.badges.map((b) => (
                <li key={b.id} className={b.earnedAt ? '' : 'locked'}>
                  <strong>
                    {b.earnedAt ? '🏅' : '○'} {b.label}
                  </strong>
                  <p>
                    {b.earnedAt ? 'Earned' : 'Keep reading'} · +{b.reward} Ember once
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <section className="card panel">
        <h2>{review.data?.year ?? new Date().getFullYear()} in review</h2>
        <AsyncState {...review} label="Building your year in review" />
        {review.data && (
          <dl className="review-grid">
            {[
              ['Books finished', review.data.booksFinished],
              ['Pages logged this year', review.data.pagesRead],
              ['Longest finished book', review.data.longestBook],
              ['Busiest finishing month', review.data.busiestMonth],
              ['Favourite genre', review.data.favoriteGenre],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}
export function AccountSecurity() {
  const { account, updateAccount } = useAuth()
  const [mode, setMode] = useState('password'),
    [current, setCurrent] = useState(''),
    [value, setValue] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  const problems = passwordProblems(value, account.email)
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'password') {
        await changePassword({ currentPassword: current, password: value })
      } else {
        const checked = await checkEmail(value)
        if (['none', 'invalid'].includes(checked.status)) throw Error('Check your email address and domain')
        const result = await changeEmail({
          currentPassword: current,
          email: value,
        })
        updateAccount({ email: result.email })
      }
      setCurrent('')
      setValue('')
      setConfirm('')
      setMessage('Saved. Other sessions have been signed out.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="card panel">
      <h2>Account security</h2>
      {USING_MOCK_API ? (
        <p className="muted">
          Password and email changes are available with the server. Demo mode has no stored account
          credentials.
        </p>
      ) : (
        <>
          <div className="detail-actions">
            <button
              type="button"
              onClick={() => {
                setMode('password')
                setValue('')
                setConfirm('')
                setMessage('')
              }}
            >
              Change password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('email')
                setValue('')
                setMessage('')
              }}
            >
              Change email
            </button>
          </div>
          <form className="form" onSubmit={submit}>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                maxLength={200}
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>
            <label>
              {mode === 'password' ? 'New password' : 'New email'}
              <input
                type={mode === 'password' ? 'password' : 'email'}
                autoComplete={mode === 'password' ? 'new-password' : 'email'}
                maxLength={mode === 'password' ? 200 : 254}
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            {mode === 'password' && (
              <>
                <p className="muted">{problems.length ? problems.join(' · ') : 'Password meets all rules'}</p>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    maxLength={200}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
              </>
            )}
            <button disabled={busy || (mode === 'password' && (problems.length > 0 || confirm !== value))}>
              {busy ? 'Saving…' : `Save ${mode}`}
            </button>
            <p role="status">{message}</p>
          </form>
        </>
      )}
    </section>
  )
}
