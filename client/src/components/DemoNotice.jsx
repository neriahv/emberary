import { useState } from 'react'
import { USING_MOCK_API, resetDemo } from '../api'

// Shown only while the simulated backend is switched on. It disappears by
// itself once VITE_USE_MOCK_API=false, because it reads the same variable the
// API layer does.
export default function DemoNotice() {
  const [resetting, setResetting] = useState(false)

  if (!USING_MOCK_API) return null

  async function handleReset() {
    if (!window.confirm('Put every book, rating and room setting back to the demo data?')) return
    setResetting(true)
    await resetDemo()
    window.location.reload()
  }

  return (
    <div className="demo-notice" role="status">
      <strong>Demo mode.</strong> Emberary is running on a{' '}
      <strong>simulated backend</strong>: the books and changes you make are stored in
      your own browser, shared with nobody, and gone when you clear your browsing data.
      The Express API and PostgreSQL database arrive in Week 2.{' '}
      <button type="button" className="button-link" onClick={handleReset} disabled={resetting}>
        {resetting ? 'Resetting...' : 'Reset demo data'}
      </button>
    </div>
  )
}
