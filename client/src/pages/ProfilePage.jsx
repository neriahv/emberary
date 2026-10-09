import Avatar, { AVATARS } from '../components/Avatar.jsx'
import { ReadingMilestones, AccountSecurity } from '../components/ReaderTools.jsx'
import { useAuth } from '../components/AuthGate.jsx'
import { useState } from 'react'
import { getProfile, updateProfile, getReadingStats } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import StatCard from '../components/StatCard.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ProfilePage() {
  const { updateAccount } = useAuth()
  const profile = useAsync(getProfile)
  const stats = useAsync(getReadingStats)
  const [editing, setEditing] = useState(false)

  return (
    <>
      <div className="page-head">
        <h1>Profile</h1>
        <p className="lede">Who you are as a reader, worked out from your shelves.</p>
      </div>

      <AsyncState {...profile} label="Loading your profile" />
      {profile.status === 'ready' &&
        (editing ? (
          <ProfileForm
            profile={profile.data}
            onCancel={() => setEditing(false)}
            onSaved={(saved) => {
              profile.setData(saved)
              updateAccount({
                displayName: saved.displayName,
                avatar: saved.avatar,
              })
              setEditing(false)
            }}
          />
        ) : (
          <section className="card profile-card">
            <div className="avatar" aria-hidden="true">
              <Avatar name={profile.data.avatar} />
            </div>
            <div>
              <h2>{profile.data.displayName}</h2>
              <p>{profile.data.bio || <span className="muted">No bio yet.</span>}</p>
              <p className="muted">
                Reading since{' '}
                {new Date(profile.data.joinedAt).toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <button type="button" className="button-quiet" onClick={() => setEditing(true)}>
              Edit profile
            </button>
          </section>
        ))}

      <ReadingMilestones />
      <AccountSecurity />
      <section className="section" aria-labelledby="insights-heading">
        <h2 id="insights-heading">Reading insights</h2>
        <AsyncState {...stats} label="Working out your insights" />
        {stats.status === 'ready' && stats.data.total === 0 && (
          <p className="empty">Add a few books and your insights will appear here.</p>
        )}
        {stats.status === 'ready' && stats.data.total > 0 && (
          <Insights stats={stats.data} goal={profile.data?.yearlyGoal} />
        )}
      </section>
    </>
  )
}

function Insights({ stats, goal }) {
  const year = new Date().getFullYear()
  const readThisYear = Object.entries(stats.finishedByMonth)
    .filter(([month]) => month.startsWith(String(year)))
    .reduce((sum, [, n]) => sum + n, 0)

  // The last six months, oldest first, including months with nothing read.
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { key, label: MONTHS[d.getMonth()], count: stats.finishedByMonth[key] ?? 0 }
  })
  const peak = Math.max(1, ...months.map((m) => m.count))

  return (
    <>
      <div className="insight-row">
        <div className="stat-grid">
          <StatCard label="Books read" value={stats.read} />
          <StatCard label="Pages read" value={stats.pagesRead.toLocaleString()} />
          <StatCard label="Currently Reading" value={stats.currentlyReading} />
          <StatCard
            label="Average rating"
            value={stats.averageRating ?? '–'}
            hint={stats.averageRating ? 'out of 5' : 'nothing rated yet'}
          />
        </div>

        {goal && (
          <div className="card panel goal">
            <h3>{year} Reading Goal</h3>
            <GoalRing done={readThisYear} goal={goal} year={year} />
          </div>
        )}
      </div>

      <div className="insight-row">
        <div className="card panel">
          <h3>Favourite Genres</h3>
          <RankList items={stats.favoriteGenres} empty="Finish a book to see your genres." />
        </div>
        <ReadingActivity stats={stats} months={months} peak={peak} />
      </div>

      <div className="card panel">
        <h3>Favourite Authors</h3>
        <RankList items={stats.favoriteAuthors} empty="Finish a book to see your authors." />
      </div>
    </>
  )
}

function ReadingActivity({ stats, months, peak }) {
  return (
    <div className="card panel">
      <h3>Reading Progress</h3>
      <p className="muted">Books finished per month, last six months.</p>
      <ol className="bar-chart">
        {months.map((m) => (
          <li key={m.key}>
            <span className="bar-value">{m.count}</span>
            <span
              className="bar"
              style={{ height: `calc((100% - 3rem) * ${m.count / peak})` }}
              aria-hidden="true"
            />
            <span className="bar-label">{m.label}</span>
            <span className="visually-hidden">
              {m.count} {m.count === 1 ? 'book' : 'books'} finished in {m.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="muted">
        {stats.pagesRead.toLocaleString()} pages read in total
        {stats.didNotFinish > 0 && `, ${stats.didNotFinish} set aside as Did Not Finish`}.
      </p>
    </div>
  )
}

// The yearly goal as a ring: the full circle is the goal, the coloured arc the
// books finished. The number in the middle carries the meaning, so the chart
// never depends on telling colours apart.
function GoalRing({ done, goal, year }) {
  const share = Math.min(done / goal, 1)
  const left = Math.max(goal - done, 0)
  const percent = Math.round((done / goal) * 100)
  const summary = `${done} of ${goal} books finished in ${year} (${percent}%)`

  return (
    <div className="goal-ring">
      <svg viewBox="0 0 120 120" role="img" aria-label={summary}>
        <circle className="goal-ring-track" cx="60" cy="60" r="48" pathLength="100" />
        {done > 0 && (
          <circle
            className="goal-ring-fill"
            cx="60"
            cy="60"
            r="48"
            pathLength="100"
            strokeDasharray={`${share * 100} 100`}
          >
            <title>{summary}</title>
          </circle>
        )}
        <text x="60" y="58" className="goal-ring-number">
          {done}
        </text>
        <text x="60" y="76" className="goal-ring-unit">
          of {goal} books
        </text>
      </svg>
      <dl className="goal-ring-legend">
        <div>
          <dt>
            <span className="goal-key goal-key-done" aria-hidden="true" /> Finished
          </dt>
          <dd>{done}</dd>
        </div>
        <div>
          <dt>
            <span className="goal-key goal-key-left" aria-hidden="true" /> To go
          </dt>
          <dd>{left}</dd>
        </div>
        <p className="muted goal-caption">
          {done >= goal
            ? `Goal reached${done > goal ? `, and ${done - goal} more` : ''}.`
            : `${percent}% of the way there.`}
        </p>
      </dl>
    </div>
  )
}

function RankList({ items, empty }) {
  if (items.length === 0) return <p className="muted">{empty}</p>
  return (
    <ol className="rank-list">
      {items.map((item) => (
        <li key={item.name}>
          <span>{item.name}</span>
          <span className="muted">
            {item.books} {item.books === 1 ? 'book' : 'books'}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ProfileForm({ profile, onSaved, onCancel }) {
  const [form, setForm] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
    yearlyGoal: profile.yearlyGoal,
    avatar: profile.avatar ?? 'flame',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSaved(await updateProfile({ ...form, yearlyGoal: Number(form.yearlyGoal) }))
    } catch (caught) {
      setError(caught)
      setBusy(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>Edit profile</h2>
      <fieldset>
        <legend>Choose your avatar</legend>
        <div className="avatar-options">
          {AVATARS.map((name) => (
            <button
              type="button"
              key={name}
              aria-label={`Choose ${name}`}
              aria-pressed={form.avatar === name}
              onClick={() => setForm({ ...form, avatar: name })}
            >
              <Avatar name={name} />
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="displayName">Display name</label>
      <input
        id="displayName"
        maxLength={60}
        required
        value={form.displayName}
        onChange={(event) => setForm({ ...form, displayName: event.target.value })}
      />
      <label htmlFor="bio">Bio</label>
      <textarea
        id="bio"
        rows={3}
        maxLength={280}
        value={form.bio}
        onChange={(event) => setForm({ ...form, bio: event.target.value })}
      />
      <label htmlFor="yearlyGoal">Books to read this year</label>
      <input
        id="yearlyGoal"
        type="number"
        min="1"
        max="365"
        required
        value={form.yearlyGoal}
        onChange={(event) => setForm({ ...form, yearlyGoal: event.target.value })}
      />
      {error && (
        <p className="error" role="alert">
          {error.message}
        </p>
      )}
      <div className="detail-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save profile'}
        </button>
        <button type="button" className="button-quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  )
}
