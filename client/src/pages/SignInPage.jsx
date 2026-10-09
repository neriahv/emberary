import { useEffect, useState } from 'react'
import { EMAIL_PATTERN, PASSWORD_RULES, USING_MOCK_API, checkEmail, logIn, signUp } from '../api'
import mark from '../assets/emberary-mark.svg'

// Sign in, or make an account. Making one, everything is checked as it is
// typed: the email (and, once it looks complete, whether its domain can
// receive mail), each password rule ticking off as it is met, and the second
// password matching the first. The button waits until all of that is true,
// and the server checks it all again. A new reader starts with
// an empty shelf, a fresh Library Room and the welcome Ember.
export default function SignInPage({ onSignedIn }) {
  const [creating, setCreating] = useState(false)
  const [fields, setFields] = useState({ email: '', password: '', confirm: '', displayName: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (event) => setFields((prev) => ({ ...prev, [key]: event.target.value }))
  const touch = (key) => () => setTouched((prev) => ({ ...prev, [key]: true }))

  const email = fields.email.trim()
  const emailOk = EMAIL_PATTERN.test(email)
  const rules = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(fields.password, email) }))
  const passwordOk = rules.every((rule) => rule.met) && fields.password.length <= 200
  const matches = fields.confirm === fields.password
  const nameOk = fields.displayName.trim().length > 0

  // The email's domain, asked a moment after typing stops: { email, status }
  // with status 'checking', 'ok', 'none' (no such domain, or it takes no
  // mail) or 'unknown' (could not tell; the server tries again on sign-up).
  const [domain, setDomain] = useState({ email: '', status: null })
  useEffect(() => {
    if (!creating || !emailOk) return undefined
    let current = true
    setDomain({ email, status: 'checking' })
    const timer = setTimeout(() => {
      checkEmail(email).then(
        (result) => current && setDomain({ email, status: result.status }),
        () => current && setDomain({ email, status: 'unknown' })
      )
    }, 600)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [creating, emailOk, email])
  const domainStatus = emailOk && domain.email === email ? domain.status : null
  const domainName = email.split('@')[1] ?? ''

  const ready = creating
    ? emailOk && domainStatus !== 'none' && passwordOk && matches && nameOk
    : email && fields.password

  async function submit(event) {
    event.preventDefault()
    setTouched({ email: true, confirm: true, displayName: true })
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      const account = creating
        ? await signUp({ email, password: fields.password, displayName: fields.displayName })
        : await logIn({ email, password: fields.password })
      onSignedIn(account)
    } catch (failure) {
      setError(failure)
      setBusy(false)
    }
  }

  function switchTo(next) {
    setCreating(next)
    setError(null)
    setTouched({})
    setFields((prev) => ({ ...prev, password: '', confirm: '' }))
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

        <form className="auth-form" onSubmit={submit} noValidate>
          {creating && (
            <label>
              Your name
              <input type="text" autoComplete="nickname" maxLength={60} value={fields.displayName} onChange={set('displayName')} onBlur={touch('displayName')} />
              {touched.displayName && !nameOk && <span className="auth-field-error">Tell us what to call you.</span>}
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              value={fields.email}
              onChange={set('email')}
              onBlur={touch('email')}
              aria-invalid={creating && ((touched.email && !emailOk) || domainStatus === 'none')}
            />
            {creating && email && !emailOk && (
              <span className={touched.email ? 'auth-field-error' : 'auth-hint'}>
                {touched.email ? '✗ ' : ''}An email address looks like name@example.com.
              </span>
            )}
            {creating && domainStatus === 'checking' && <span className="auth-hint">Checking that {domainName} can receive email...</span>}
            {creating && domainStatus === 'ok' && <span className="auth-ok">✓ {domainName} can receive email</span>}
            {creating && domainStatus === 'none' && (
              <span className="auth-field-error">✗ {domainName} does not receive email. Check it for a typo.</span>
            )}
            {creating && domainStatus === 'unknown' && (
              <span className="auth-hint">Could not check {domainName} just now. It is checked again when you sign up.</span>
            )}
          </label>
          <label>
            Password
            <span className="auth-password">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={creating ? 'new-password' : 'current-password'}
                maxLength={200}
                value={fields.password}
                onChange={set('password')}
              />
              <button type="button" className="auth-show" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          {creating && (
            <>
              <ul className="auth-rules" aria-label="Your password needs">
                {rules.map((rule) => (
                  <li key={rule.id} className={rule.met ? 'is-met' : ''}>
                    <span aria-hidden="true">{rule.met ? '✓' : '○'}</span> {rule.label}
                    <span className="visually-hidden">{rule.met ? ': done' : ': not yet'}</span>
                  </li>
                ))}
              </ul>
              <label>
                Type the password again
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  maxLength={200}
                  value={fields.confirm}
                  onChange={set('confirm')}
                  onBlur={touch('confirm')}
                  aria-invalid={Boolean(fields.confirm) && !matches}
                />
                {fields.confirm && !matches && <span className="auth-field-error">✗ The two passwords are different.</span>}
                {fields.confirm && matches && passwordOk && <span className="auth-ok">✓ The passwords match</span>}
              </label>
            </>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error.message}
            </p>
          )}
          <button type="submit" className="auth-submit" disabled={busy || !ready}>
            {busy ? (creating ? 'Making your library...' : 'Signing in...') : creating ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {USING_MOCK_API && (
          <p className="auth-demo">
            <strong>Demo mode:</strong> any email and a password of 8 or more characters opens the demo library, kept in
            this browser. Making an account checks the same rules as the real one.
          </p>
        )}
      </section>
    </main>
  )
}
