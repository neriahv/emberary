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
import { EmberCoin } from './EmberBadge.jsx'
import Icon from './Icon.jsx'

const QUEST_ICONS = { pages: 'books', rating: 'star', 'check-in': 'check' }

// "Friday, 9 October", for a YYYY-MM-DD day.
const longDay = (day) =>
  new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

const twoDigits = (n) => String(n).padStart(2, '0')

// A session timed on the server, so it survives a refresh. The clock face
// glows while it runs.
export function ReadingTimer() {
  const timer = useAsync(getTimer)
  const [clock, setClock] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const running = Boolean(timer.data)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [running])

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      if (running) {
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

  const seconds = running ? Math.max(0, Math.floor((clock - Date.parse(timer.data.startedAt)) / 1000)) : 0
  const hours = Math.floor(seconds / 3600)
  const face = `${hours > 0 ? `${hours}:` : ''}${twoDigits(Math.floor(seconds / 60) % 60)}:${twoDigits(seconds % 60)}`

  return (
    <section className={`card panel timer-card${running ? ' is-running' : ''}`} aria-labelledby="timer-heading">
      <h2 id="timer-heading">Reading timer</h2>
      <AsyncState {...timer} label="Loading timer" />
      {timer.status === 'ready' && (
        <>
          <div className="timer-face">
            <Icon name="clock" className="timer-face-icon" />
            <span role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`}>
              {face}
            </span>
            <small>{running ? 'Reading now' : 'Ready when you are'}</small>
          </div>
          <button
            type="button"
            className={running ? 'button-quiet timer-button' : 'timer-button'}
            disabled={busy}
            onClick={toggle}
          >
            {running ? 'Stop and log reading' : 'Start reading'}
          </button>
          <p className="timer-note muted">Keeps running if you leave the page. A forgotten timer logs at most 12 hours.</p>
        </>
      )}
      {error && (
        <p className="error error-inline" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

// Three small tasks a day, each claimed once for Ember.
export function DailyQuests() {
  const quests = useAsync(getQuests)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const { reload } = quests

  useEffect(() => {
    window.addEventListener('emberary:ember-changed', reload)
    window.addEventListener('focus', reload)
    const tick = setInterval(reload, 60000)
    return () => {
      window.removeEventListener('emberary:ember-changed', reload)
      window.removeEventListener('focus', reload)
      clearInterval(tick)
    }
  }, [reload])

  async function claim(id) {
    setBusy(id)
    setError('')
    try {
      await claimQuest(id)
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card panel quests-card" aria-labelledby="quests-heading">
      <div className="section-head">
        <h2 id="quests-heading">Daily quests</h2>
        {quests.data && <span className="quest-day">{longDay(quests.data.day)}</span>}
      </div>
      {!quests.data && <AsyncState {...quests} label="Loading today's quests" />}
      {quests.data && (
        <ul className="quest-list">
          {quests.data.items.map((q) => {
            const done = Math.min(q.progress, q.target)
            const complete = q.progress >= q.target
            return (
              <li key={q.id} className={`quest${q.claimed ? ' is-claimed' : complete ? ' is-ready' : ''}`}>
                <span className="quest-icon" aria-hidden="true">
                  <Icon name={q.claimed ? 'check' : QUEST_ICONS[q.id] ?? 'star'} />
                </span>
                <div className="quest-body">
                  <h3>{q.label}</h3>
                  <div
                    className="quest-track"
                    role="progressbar"
                    aria-label={q.label}
                    aria-valuemin={0}
                    aria-valuemax={q.target}
                    aria-valuenow={done}
                  >
                    <span style={{ width: `${(done / q.target) * 100}%` }} />
                  </div>
                  <span className="quest-count">
                    {done} / {q.target}
                  </span>
                </div>
                {q.claimed ? (
                  <span className="quest-state">Claimed</span>
                ) : complete ? (
                  <button
                    type="button"
                    className="button-small quest-claim"
                    disabled={busy !== null}
                    onClick={() => claim(q.id)}
                  >
                    {busy === q.id ? 'Claiming…' : `Claim +${q.reward}`}
                  </button>
                ) : (
                  <span className="quest-reward" title={`${q.reward} Ember when done`}>
                    <EmberCoin size="xs" />+{q.reward}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {error && (
        <p className="error error-inline" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

// Streaks, achievements and the year so far, on the Profile page.
export function ReadingMilestones() {
  const reading = useAsync(getReading)
  const review = useAsync(getYearReview)
  const year = review.data?.year ?? new Date().getFullYear()

  return (
    <div className="milestones">
      <section className="card panel journey" aria-labelledby="journey-heading">
        <h2 id="journey-heading">Your reading journey</h2>
        <AsyncState {...reading} label="Loading your milestones" />
        {reading.data && (
          <>
            <ul className="journey-stats">
              <li className="journey-stat is-streak">
                <Icon name="flame" />
                <strong>{reading.data.streak.current}</strong>
                <span>{reading.data.streak.current === 1 ? 'day in a row' : 'days in a row'}</span>
              </li>
              <li className="journey-stat">
                <Icon name="star" />
                <strong>{reading.data.streak.best}</strong>
                <span>best streak</span>
              </li>
              <li className="journey-stat">
                <Icon name="clock" />
                <strong>{reading.data.minutes.toLocaleString()}</strong>
                <span>minutes timed</span>
              </li>
            </ul>
            <h3>Achievements</h3>
            <ul className="badge-list">
              {reading.data.badges.map((b) => (
                <li key={b.id} className={`badge-medal${b.earnedAt ? ' is-earned' : ''}`}>
                  <span className="badge-medal-icon" aria-hidden="true">
                    <Icon name={b.earnedAt ? 'trophy' : 'lock'} />
                  </span>
                  <strong>{b.label}</strong>
                  <span className="badge-medal-note">
                    {b.earnedAt ? 'Earned' : 'Not yet'} · <EmberCoin size="xs" />+{b.reward}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card panel year-review" aria-labelledby="review-heading">
        <h2 id="review-heading">{year} in review</h2>
        <AsyncState {...review} label="Building your year in review" />
        {review.data && (
          <dl className="review-grid">
            {[
              ['Books finished', review.data.booksFinished, 'books'],
              ['Pages logged', review.data.pagesRead?.toLocaleString(), 'note'],
              ['Busiest month', review.data.busiestMonth, 'clock'],
              ['Favourite genre', review.data.favoriteGenre, 'star'],
              ['Longest book', review.data.longestBook, 'layers'],
            ].map(([label, value, icon]) => (
              <div key={label} className={label === 'Longest book' ? 'is-wide' : ''}>
                <dt>
                  <Icon name={icon} />
                  {label}
                </dt>
                <dd>{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}

// Changing the password or the email, with the current password.
export function AccountSecurity() {
  const { account, updateAccount } = useAuth()
  const [mode, setMode] = useState('password')
  const [current, setCurrent] = useState('')
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const problems = passwordProblems(value, account.email)

  function choose(next) {
    setMode(next)
    setValue('')
    setConfirm('')
    setMessage('')
  }

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
        const result = await changeEmail({ currentPassword: current, email: value })
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
    <section className="card panel security" aria-labelledby="security-heading">
      <h2 id="security-heading">Account security</h2>
      {USING_MOCK_API ? (
        <p className="security-demo muted">
          <Icon name="lock" />
          Changing your password or email works on the live app. Demo mode keeps no passwords.
        </p>
      ) : (
        <>
          <div className="segmented-tabs" role="group" aria-label="What to change">
            <button type="button" aria-pressed={mode === 'password'} onClick={() => choose('password')}>
              Change password
            </button>
            <button type="button" aria-pressed={mode === 'email'} onClick={() => choose('email')}>
              Change email
            </button>
          </div>
          <form className="security-form" onSubmit={submit}>
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
            )}
            {mode === 'password' && value && (
              <p className={problems.length ? 'security-hint' : 'security-hint is-ok'}>
                {problems.length ? `Still needs: ${problems.join(' · ')}` : '✓ Meets every rule'}
              </p>
            )}
            <div className="security-actions">
              <button disabled={busy || (mode === 'password' && (problems.length > 0 || confirm !== value))}>
                {busy ? 'Saving…' : `Save ${mode}`}
              </button>
              <p role="status" className="muted">
                {message}
              </p>
            </div>
          </form>
        </>
      )}
    </section>
  )
}
