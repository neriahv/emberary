import { useState } from 'react'
import { getProfile, updateProfile, getReadingStats } from '../api'
import { useAsync } from '../hooks/useAsync.js'
import AsyncState from '../components/AsyncState.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import StatCard from '../components/StatCard.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ProfilePage() {
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
              setEditing(false)
            }}
          />
        ) : (
          <section className="card profile-card">
            <div className="avatar" aria-hidden="true">
              {profile.data.displayName.charAt(0).toUpperCase()}
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
      <div className="stat-grid">
        <StatCard label="Books read" value={stats.read} />
        <StatCard label="Currently Reading" value={stats.currentlyReading} />
        <StatCard label="Want to Read" value={stats.wantToRead} />
        <StatCard
          label="Average rating"
          value={stats.averageRating ?? '–'}
          hint={stats.averageRating ? 'out of 5' : 'nothing rated yet'}
        />
      </div>

      {goal && (
        <div className="card goal">
          <h3>{year} reading goal</h3>
          <ProgressBar value={readThisYear} max={goal} label={`${year} reading goal`} unit="books" />
          <p className="muted goal-caption">
            {readThisYear} of {goal} books finished this year.
          </p>
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <h3>Favorite genres</h3>
          <RankList items={stats.favoriteGenres} empty="Finish a book to see your genres." />
        </div>
        <div className="card">
          <h3>Favorite authors</h3>
          <RankList items={stats.favoriteAuthors} empty="Finish a book to see your authors." />
        </div>
      </div>

      <div className="card">
        <h3>Reading activity</h3>
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
    </>
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
