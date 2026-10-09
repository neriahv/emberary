import { useEffect, useState } from 'react'
import { EMAIL_PATTERN, PASSWORD_RULES, USING_MOCK_API, checkEmail, logIn, signUp } from '../api'
import mark from '../assets/emberary-mark.svg'

// Authentication form contract: trim addresses and names, preserve passwords,
// show each signup rule, debounce domain checks, and report server failures.
export default function SignInPage({ onSignedIn }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmation: '',
    displayName: '',
  })
  const [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const [domain, setDomain] = useState({ address: '', status: 'unknown' })
  const creating = mode === 'signup',
    email = form.email.trim().toLowerCase()
  const emailOk = email.length <= 254 && EMAIL_PATTERN.test(email)
  const rules = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(form.password, email),
  }))
  const passwordOk = form.password.length <= 200 && rules.every((r) => r.met)
  const domainStatus = domain.address === email ? domain.status : 'unknown'
  useEffect(() => {
    if (!creating || !emailOk) return
    let cancelled = false
    setDomain({ address: email, status: 'checking' })
    const timer = setTimeout(
      () =>
        checkEmail(email).then(
          (result) => {
            if (!cancelled) setDomain({ address: email, status: result.status })
          },
          () => {
            if (!cancelled) setDomain({ address: email, status: 'unknown' })
          }
        ),
      600
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [creating, email, emailOk])
  const ready = creating
    ? emailOk &&
      domainStatus !== 'none' &&
      passwordOk &&
      form.password === form.confirmation &&
      form.displayName.trim().length > 0 &&
      form.displayName.trim().length <= 60
    : Boolean(email && form.password && form.password.length <= 200)
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  })
  function switchMode(next) {
    setMode(next)
    setForm((prev) => ({ ...prev, password: '', confirmation: '' }))
    setError('')
    setVisible(false)
  }
  async function submit(e) {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      const values = {
        email,
        password: form.password,
        displayName: form.displayName.trim(),
      }
      onSignedIn(await (creating ? signUp(values) : logIn(values)))
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
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
        <div className="auth-tabs" aria-label="Account options">
          {[
            ['login', 'Sign in'],
            ['signup', 'Create account'],
          ].map(([value, label]) => (
            <button
              type="button"
              className="auth-tab"
              aria-pressed={mode === value}
              key={value}
              onClick={() => switchMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <form className="auth-form" onSubmit={submit} noValidate>
          {creating && (
            <label>
              Your name
              <input autoComplete="nickname" maxLength={60} {...field('displayName')} />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              maxLength={254}
              {...field('email')}
              aria-invalid={creating && Boolean(email) && (!emailOk || domainStatus === 'none')}
            />
            {creating && email && !emailOk && (
              <span className="auth-field-error">Use an address like name@example.com.</span>
            )}
            {creating && emailOk && (
              <span className={domainStatus === 'none' ? 'auth-field-error' : 'auth-hint'}>
                {domainStatus === 'checking'
                  ? 'Checking email domain…'
                  : domainStatus === 'none'
                    ? 'This domain does not receive email. Check for a typo.'
                    : domainStatus === 'ok'
                      ? '✓ This domain receives email.'
                      : 'The server will check the domain when you sign up.'}
              </span>
            )}
          </label>
          <label>
            Password
            <span className="auth-password">
              <input
                type={visible ? 'text' : 'password'}
                autoComplete={creating ? 'new-password' : 'current-password'}
                maxLength={200}
                {...field('password')}
              />
              <button
                type="button"
                className="auth-show"
                aria-pressed={visible}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          {creating && (
            <>
              <ul className="auth-rules" aria-label="Your password needs">
                {rules.map((r) => (
                  <li key={r.id} className={r.met ? 'is-met' : ''}>
                    <span aria-hidden="true">{r.met ? '✓' : '○'}</span> {r.label}
                    <span className="visually-hidden">{r.met ? ': done' : ': not yet'}</span>
                  </li>
                ))}
              </ul>
              <label>
                Type the password again
                <input
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  maxLength={200}
                  {...field('confirmation')}
                  aria-invalid={Boolean(form.confirmation) && form.confirmation !== form.password}
                />
                {form.confirmation && form.confirmation !== form.password && (
                  <span className="auth-field-error">The two passwords are different.</span>
                )}
              </label>
            </>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="auth-submit" disabled={!ready || busy}>
            {busy
              ? creating
                ? 'Making your library…'
                : 'Signing in…'
              : creating
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
        {USING_MOCK_API && (
          <p className="auth-demo">
            <strong>Demo mode:</strong> any email and a password of 8 or more characters opens the demo
            library in this browser. Sign-up checks the same password rules as the server.
          </p>
        )}
      </section>
    </main>
  )
}
