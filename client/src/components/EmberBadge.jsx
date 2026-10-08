import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { checkIn, catalogEntry } from '../api'
import { useEmber } from '../hooks/useEmber.js'
import ProgressBar from './ProgressBar.jsx'

// A small ember, the currency's mark.
export function EmberIcon() {
  return (
    <svg className="ember-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 1c.6 2.4 3.9 4.2 3.9 8.1A3.9 3.9 0 0 1 8 13a3.9 3.9 0 0 1-3.9-3.9c0-1.8 1-3 1.9-3.8-.1 1.3.4 2.3 1.3 2.7C7.3 6 6.9 3.3 8 1Z" />
    </svg>
  )
}

// The ember stamped on a gold coin: how the currency looks wherever it is shown.
export function EmberCoin({ size = 'md' }) {
  return (
    <span className={`ember-coin ember-coin-${size}`} aria-hidden="true">
      <EmberIcon />
    </span>
  )
}

const HISTORY_LABELS = {
  welcome: 'Welcome gift',
  'daily-check-in': 'Daily check-in',
  'daily-goal': 'Daily reading goal',
  'book-finished': 'Finished a book',
  'pages-read': 'Pages read',
  purchase: 'Shop',
  sale: 'Sold',
  'demo-gift': 'Demo gift',
}

const BLOCK_NAMES = {
  'block:floor': 'A floor block',
  'block:wall': 'A wall block',
  'block:upper': 'An upstairs floor',
}

// What a purchase bought, by name, from the catalogue ids it was recorded with.
function purchaseNames(ref) {
  if (BLOCK_NAMES[ref]) return BLOCK_NAMES[ref]
  const names = String(ref ?? '')
    .split(',')
    .map((id) => catalogEntry(id.trim())?.name)
    .filter(Boolean)
  if (names.length === 0) return 'Furniture for the Library Room'
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(', ')
}

function when(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// The wallet in the navigation bar: the balance, the daily check-in, how to
// earn more, and where it went.
export default function EmberBadge() {
  const wallet = useEmber()
  const [open, setOpen] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState(null)
  const [gaining, setGaining] = useState(false)
  const previous = useRef(null)
  const box = useRef(null)
  const data = wallet.data

  // A short glow when the balance goes up, so a reward is noticed wherever the
  // reader is when it arrives.
  useEffect(() => {
    if (!data) return
    if (previous.current !== null && data.balance > previous.current) {
      setGaining(true)
      const timer = setTimeout(() => setGaining(false), 1200)
      previous.current = data.balance
      return () => clearTimeout(timer)
    }
    previous.current = data.balance
  }, [data])

  // Close on Escape or a click anywhere else.
  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    const onClick = (event) => box.current && !box.current.contains(event.target) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onClick)
    }
  }, [open])

  async function claim() {
    setClaiming(true)
    setError(null)
    try {
      await checkIn()
    } catch (caught) {
      setError(caught)
    } finally {
      setClaiming(false)
    }
  }

  if (wallet.status === 'error' && !data) return null
  const rules = data?.rules
  const ways = rules && [
    { amount: rules.dailyCheckIn, text: 'Check in once a day' },
    { amount: rules.dailyGoalReward, text: `Read ${rules.dailyPageGoal} pages in a day` },
    { amount: 1, text: `Every ${rules.pagesPerEmber} pages of a book` },
    { amount: rules.bookFinished, text: 'Finish a book' },
  ]
  const claimButton = data && !data.checkedInToday && (
    <button type="button" className="ember-claim" onClick={claim} disabled={claiming}>
      {claiming ? 'Claiming...' : `Daily +${rules.dailyCheckIn}`}
    </button>
  )

  return (
    <div className="ember-wallet" ref={box}>
      <button
        type="button"
        className={`ember-badge${gaining ? ' is-gaining' : ''}`}
        aria-expanded={open}
        aria-label={data ? `Your wallet: ${data.balance} Ember` : 'Your Ember wallet'}
        onClick={() => setOpen(!open)}
      >
        <EmberCoin size="sm" />
        <span className="ember-amount">{data ? data.balance : '…'}</span>
        <span className="ember-unit">Ember</span>
      </button>
      {claimButton}

      {open && data && (
        <div className="ember-popover" role="dialog" aria-label="Your Ember wallet">
          <div className="ember-card">
            <p className="ember-card-label">Your wallet</p>
            <p className="ember-card-balance">
              <EmberCoin size="lg" />
              <strong>{data.balance}</strong>
              <span>Ember</span>
            </p>
            <p className="ember-card-about">
              Ember is Emberary's currency. You earn it by reading, and spend it on furniture,
              wallpaper and floors for your Library Room.
            </p>
          </div>

          <section className="ember-section" aria-label="Today">
            <h3>Today's reading goal</h3>
            <ProgressBar
              value={Math.min(data.pagesToday, data.dailyPageGoal)}
              max={data.dailyPageGoal}
              label="Pages read today"
              unit="pages"
            />
            {data.checkedInToday ? (
              <p className="ember-done">✓ Checked in today</p>
            ) : (
              claimButton
            )}
          </section>

          <section className="ember-section">
            <h3>Ways to earn</h3>
            <ul className="ember-ways">
              {ways.map((way) => (
                <li key={way.text}>
                  <span className="ember-gain">
                    <EmberCoin size="xs" />+{way.amount}
                  </span>
                  <span>{way.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <Link className="button ember-shop" to="/library-room?shop=1" onClick={() => setOpen(false)}>
            Spend it in the shop
          </Link>

          {data.history.length > 0 && (
            <section className="ember-section">
              <h3>Recent activity</h3>
              <ul className="ember-history">
                {data.history.map((row, i) => (
                  <li key={row.id ?? i}>
                    <span className={`ember-history-dot ${row.amount < 0 ? 'is-spent' : 'is-earned'}`} aria-hidden="true">
                      {row.amount < 0 ? '−' : '+'}
                    </span>
                    <span className="ember-history-what">
                      {row.reason === 'purchase'
                        ? purchaseNames(row.ref)
                        : row.reason === 'sale'
                          ? BLOCK_NAMES[row.ref]
                            ? `Took away ${BLOCK_NAMES[row.ref].toLowerCase()}`
                            : `Sold ${catalogEntry(row.ref)?.name ?? 'furniture'}`
                          : HISTORY_LABELS[row.reason] ?? row.reason}
                      <small>{row.reason === 'purchase' ? `Shop · ${when(row.createdAt)}` : when(row.createdAt)}</small>
                    </span>
                    <strong className={row.amount < 0 ? 'is-spent' : 'is-earned'}>
                      {row.amount > 0 ? '+' : '−'}
                      {Math.abs(row.amount)}
                    </strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {error && (
            <p className="error error-inline" role="alert">
              {error.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
