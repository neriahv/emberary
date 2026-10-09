import { useState } from 'react'
import { USING_MOCK_API, logIn, signUp } from '../api'
import mark from '../assets/emberary-mark.svg'

// Sign in, or make an account. A new reader starts with an empty shelf, a
// fresh Library Room and the welcome Ember.
export default function SignInPage({ onSignedIn }) {
  const [creating, setCreating] = useState(false)
  const [fields, setFields] = useState({ email: '', password: '', displayName: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (event) => setFields((prev) => ({ ...prev, [key]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const account = creating ? await signUp(fields) : await logIn(fields)
      onSignedIn(account)
    } catch (failure) {
      setError(failure)
      setBusy(false)
    }
  }

  function switchTo(next) {
    setCreating(next)
    setError(null)
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <p className="auth-brand">
          <img className="brand-logo" src={mark} alt="" />
          Emberary
        </p>
        <h1 id="auth-heading">{creating ? 'Make your library' : 'Welcome back'}</h1>
        <p className="muted">
          {creating
            ? 'Your own shelves, reading goals and a Library Room to build, a block at a time.'
            : 'Sign in to your shelves and your Library Room.'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Sign in or make an account">
          <button type="button" role="tab" aria-selected={!creating} className="auth-tab" onClick={() => switchTo(false)}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={creating} className="auth-tab" onClick={() => switchTo(true)}>
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {creating && (
            <label>
              Your name
              <input type="text" autoComplete="nickname" maxLength={60} required value={fields.displayName} onChange={set('displayName')} />
            </label>
          )}
          <label>
            Email
            <input type="email" autoComplete="email" maxLength={254} required value={fields.email} onChange={set('email')} />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              minLength={creating ? 8 : undefined}
              maxLength={200}
              required
              value={fields.password}
              onChange={set('password')}
            />
            {creating && <span className="auth-hint">At least 8 characters.</span>}
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error.message}
            </p>
          )}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? (creating ? 'Making your library...' : 'Signing in...') : creating ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {USING_MOCK_API && (
          <p className="auth-demo">
            <strong>Demo mode:</strong> any email and a password of 8 or more characters opens the demo library, kept
            in this browser.
          </p>
        )}
      </section>
    </main>
  )
}
