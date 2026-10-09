import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMe, logOut, onSignedOut } from '../api'
import SignInPage from '../pages/SignInPage.jsx'

// Who is signed in, for the parts of the app that show it.
const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// Nothing of the app is shown until a reader is signed in: until then, the
// sign-in page. A session that ends while the app is open (the API answers
// 401) brings the sign-in page back. Signing out, or in as someone else,
// unmounts the whole app, so nothing of one reader's is left on screen for
// the next.
export default function AuthGate({ children }) {
  const [state, setState] = useState({ status: 'checking', account: null, error: null })

  const check = useCallback(() => {
    setState({ status: 'checking', account: null, error: null })
    getMe().then(
      (account) => setState({ status: 'in', account, error: null }),
      (error) =>
        setState(error.status === 401 ? { status: 'out', account: null, error: null } : { status: 'failed', account: null, error })
    )
  }, [])

  useEffect(check, [check])
  useEffect(() => onSignedOut(() => setState({ status: 'out', account: null, error: null })), [])

  const signOut = useCallback(async () => {
    try {
      await logOut()
    } finally {
      setState({ status: 'out', account: null, error: null })
    }
  }, [])

  if (state.status === 'checking') {
    return <p className="auth-checking muted">Opening Emberary...</p>
  }
  if (state.status === 'failed') {
    return (
      <div className="auth-checking">
        <p>Could not reach Emberary: {state.error.message}</p>
        <button type="button" onClick={check}>
          Try again
        </button>
      </div>
    )
  }
  if (state.status === 'out') {
    return <SignInPage onSignedIn={(account) => setState({ status: 'in', account, error: null })} />
  }
  return <AuthContext.Provider value={{ account: state.account, signOut }}>{children}</AuthContext.Provider>
}
