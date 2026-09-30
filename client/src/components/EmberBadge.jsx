import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { checkIn } from '../api'
import { useEmber } from '../hooks/useEmber.js'

// A small ember, the currency's mark.
export function EmberIcon() {
  return (
    <svg className="ember-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 1c.6 2.4 3.9 4.2 3.9 8.1A3.9 3.9 0 0 1 8 13a3.9 3.9 0 0 1-3.9-3.9c0-1.8 1-3 1.9-3.8-.1 1.3.4 2.3 1.3 2.7C7.3 6 6.9 3.3 8 1Z" />
    </svg>
  )
}

const HISTORY_LABELS = {
  welcome: 'Welcome gift',
  'daily-check-in': 'Daily check-in',
  'daily-goal': 'Daily reading goal',
  'book-finished': 'Finished a book',
  'pages-read': 'Pages read',
  purchase: 'Bought for the Library Room',
}

// The wallet in the navigation bar: the balance, the daily check-in, and how
// to earn more.
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

  return (
    <div className="ember-wallet" ref={box}>
      <button
        type="button"
        className={`ember-badge${gaining ? ' is-gaining' : ''}`}
        aria-expanded={open}
        aria-label={data ? `${data.balance} Ember. How to earn more` : 'Ember'}
        onClick={() => setOpen(!open)}
      >
        <EmberIcon />
        <span>{data ? data.balance : '…'}</span>
      </button>
      {data && !data.checkedInToday && (
        <button type="button" className="ember-claim" onClick={claim} disabled={claiming}>
          {claiming ? 'Claiming...' : `Daily +${rules.dailyCheckIn}`}
        </button>
      )}

      {open && data && (
        <div className="ember-popover" role="dialog" aria-label="Your Ember">
          <p className="ember-popover-balance">
            <EmberIcon /> <strong>{data.balance}</strong> Ember
          </p>
          <p className="muted ember-popover-today">
            Today: {Math.min(data.pagesToday, data.dailyPageGoal)} of {data.dailyPageGoal} pages read
            {data.pagesToday >= data.dailyPageGoal ? ' — goal reached.' : '.'}
          </p>
          <h3>How to earn Ember</h3>
          <ul className="ember-rules">
            <li>
              Check in once a day <strong>+{rules.dailyCheckIn}</strong>
            </li>
            <li>
              Read {rules.dailyPageGoal} pages in a day <strong>+{rules.dailyGoalReward}</strong>
            </li>
            <li>
              Every {rules.pagesPerEmber} pages of a book <strong>+1</strong>
            </li>
            <li>
              Finish a book <strong>+{rules.bookFinished}</strong>
            </li>
          </ul>
          <p className="muted ember-popover-spend">
            Spend it on furniture in the <Link to="/library-room" onClick={() => setOpen(false)}>Library Room</Link>{' '}
            shop.
          </p>
          {data.history.length > 0 && (
            <>
              <h3>Recently</h3>
              <ul className="ember-history">
                {data.history.map((row) => (
                  <li key={row.id}>
                    <span>{HISTORY_LABELS[row.reason] ?? row.reason}</span>
                    <strong className={row.amount < 0 ? 'is-spent' : 'is-earned'}>
                      {row.amount > 0 ? '+' : '−'}
                      {Math.abs(row.amount)}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
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
