import { NavLink, Outlet } from 'react-router-dom'
import DemoNotice from './DemoNotice.jsx'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/discover', label: 'Discover' },
  { to: '/library-room', label: 'Library Room' },
  { to: '/my-books', label: 'My Books' },
  { to: '/profile', label: 'Profile' },
]

export default function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="brand" end>
            <span className="brand-mark" aria-hidden="true">
              ◆
            </span>
            Emberary
          </NavLink>
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
    </>
  )
}
