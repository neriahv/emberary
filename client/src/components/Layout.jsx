import { useEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { USING_MOCK_API } from '../api'
import DemoNotice from './DemoNotice.jsx'
import EmberBadge from './EmberBadge.jsx'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/discover', label: 'Discover' },
  { to: '/library-room', label: 'Library Room' },
  { to: '/my-books', label: 'My Books' },
  { to: '/profile', label: 'Profile' },
]

export default function Layout() {
  const header = useRef(null)

  // The Library Room fills the window below this header. The header wraps onto
  // two lines on a phone, so its height is measured rather than assumed.
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
            <span className="brand-mark" aria-hidden="true">
              ◆
            </span>
            Emberary
          </NavLink>
          <EmberBadge />
          <nav aria-label="Main">
            <ul className="nav-links">
              {LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.end}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="page">
        <DemoNotice />
        <Outlet />
      </main>

      <footer className="site-footer">
        {/* Say what the live app keeps. Demo mode says it in DemoNotice instead. */}
        {!USING_MOCK_API && (
          <p className="privacy-note">
            Emberary saves your shelves, reading progress, ratings, reviews, profile, room and
            Ember history in its database, and nothing else. Nothing is shared or sold.
          </p>
        )}
        {/* The covers are not ours: they are served by Google Books. */}
        Book covers courtesy of{' '}
        <a href="https://books.google.com/" target="_blank" rel="noopener noreferrer">
          Google Books
        </a>
        .
      </footer>
    </>
  )
}
