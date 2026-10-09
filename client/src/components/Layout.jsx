import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { USING_MOCK_API } from '../api'
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

// Who is signed in, and a way out.
function Account() {
  const { account, signOut } = useAuth()
  const [leaving, setLeaving] = useState(false)
  const initial = (account.displayName || account.email || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="account">
      <span className="account-avatar" title={`Signed in as ${account.email}`} aria-hidden="true">
        {initial}
      </span>
      <span className="visually-hidden">Signed in as {account.email}.</span>
      <button
        type="button"
        className="button-quiet button-small account-out"
        disabled={leaving}
        onClick={() => {
          setLeaving(true)
          signOut()
        }}
      >
        {leaving ? 'Signing out...' : 'Sign out'}
      </button>
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
            Emberary saves your shelves, reading progress, ratings, reviews, profile, room and
            Ember history in its database, and nothing else. Nothing is shared or sold.
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
