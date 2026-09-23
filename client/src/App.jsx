import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import DiscoverPage from './pages/DiscoverPage.jsx'
import MyBooksPage from './pages/MyBooksPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'

// three.js is several times the size of the rest of the app, so the Library
// Room is split into its own chunk and only downloaded when someone opens it.
const LibraryRoomPage = lazy(() => import('./pages/LibraryRoomPage.jsx'))

// BASE_URL is "/" locally and "/<repo>/" on GitHub Pages (see vite.config.js),
// so routes work in both places without hardcoding the repository name.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route
            path="library-room"
            element={
              <Suspense fallback={<p className="muted">Loading the Library Room...</p>}>
                <LibraryRoomPage />
              </Suspense>
            }
          />
          <Route path="my-books" element={<MyBooksPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="page-head">
      <h1>Page not found</h1>
      <p className="lede">
        That shelf is empty. <Link to="/">Back to Home</Link>.
      </p>
    </div>
  )
}
