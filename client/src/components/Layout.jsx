import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { USING_MOCK_API } from '../api'
import Avatar from './Avatar.jsx'
import Theme from './Theme.jsx'
import DemoNotice from './DemoNotice.jsx'
import { useAuth } from './AuthGate.jsx'
import EmberBadge from './EmberBadge.jsx'
import Icon from './Icon.jsx'
import mark from '../assets/emberary-mark.svg'

const LINKS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/discover', label: 'Discover', icon: 'discover' },
  { to: '/library-room', label: 'Library Room', short: 'Library', icon: 'room' },
  { to: '/my-books', label: 'My Books', icon: 'books' },
  { to: '/profile', label: 'Profile', icon: 'profile' },
]

// Who is signed in, behind their avatar: their lists, settings and a way out.
function Account() {
  const { account, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const box = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  // Close on a click elsewhere or on Escape.
  useEffect(() => {
    if (!open) return
    const outside = (event) => box.current && !box.current.contains(event.target) && setOpen(false)
    const escape = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="account" ref={box}>
      <button
        type="button"
        className="account-button"
        aria-expanded={open}
        aria-label={`Your account: ${account.displayName || account.email}`}
        onClick={() => setOpen(!open)}
      >
        <span className="account-avatar" aria-hidden="true">
          <Avatar name={account.avatar} />
        </span>
        <Icon name="chevron" className="account-chevron" />
      </button>
      {open && (
        <div className="account-menu">
          <div className="account-who">
            <span className="account-avatar account-avatar-lg" aria-hidden="true">
              <Avatar name={account.avatar} />
            </span>
            <span>
              <strong>{account.displayName}</strong>
              <small>{account.email}</small>
            </span>
          </div>
          <nav aria-label="Your account">
            <NavLink to="/lists" className="account-link">
              <Icon name="list" />
              Book lists
            </NavLink>
            <NavLink to="/friends" className="account-link">
              <Icon name="friends" />
              Friends
            </NavLink>
            <NavLink to="/settings" className="account-link">
              <Icon name="settings" />
              Settings
            </NavLink>
            <button
              type="button"
              className="account-link account-out"
              disabled={leaving}
              onClick={() => {
                setLeaving(true)
                signOut()
              }}
            >
              <Icon name="logout" />
              {leaving ? 'Signing out...' : 'Sign out'}
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const header = useRef(null)

  // The Library Room fills the window below this header. The header's height
  // changes with the screen width, so it is measured rather than assumed.
  useEffect(() => {
    const element = header.current
    const publish = () =>
      document.documentElement.style.setProperty('--header-height', `${element.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Theme />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header" ref={header}>
        <div className="site-header-inner">
          <NavLink to="/" className="brand" end>
            <img className="brand-logo" src={mark} alt="" />
            Emberary
          </NavLink>
          <EmberBadge />
          {/* On a phone this becomes the tab bar along the bottom. */}
          <nav aria-label="Main" className="site-nav">
            <ul className="nav-links">
              {LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end}>
                    <Icon name={link.icon} />
                    <span className="nav-label-long">{link.label}</span>
                    <span className="nav-label-short">{link.short ?? link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <Account />
        </div>
      </header>

      <main id="main" className="page">
        <DemoNotice />
        <Outlet />
      </main>

      <footer className="site-footer">
        <p className="footer-brand">
          <img className="brand-logo" src={mark} alt="" />
          Emberary · a cozy home for your books
        </p>
        {/* Say what the live app keeps. Demo mode says it in DemoNotice instead. */}
        {!USING_MOCK_API && (
          <p className="privacy-note">
            Emberary saves your shelves, reading activity, notes, lists, profile, settings, room layouts and
            Ember history in its database. Nothing is shared or sold.
          </p>
        )}
        {/* The covers are not ours: they are served by Google Books. */}
        <p>
          Book covers courtesy of{' '}
          <a href="https://books.google.com/" target="_blank" rel="noopener noreferrer">
            Google Books
          </a>
          .
        </p>
      </footer>
    </>
  )
}
