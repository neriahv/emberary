import { useCallback, useEffect, useRef, useState } from 'react'

// Loads data for a screen and tracks the four states every screen has:
// loading, error, empty (the caller checks the data), and ready.
//
// `slow` turns on after three seconds, so a sleeping free-tier API gets a
// message instead of a spinner that looks broken.
export function useAsync(load, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [slow, setSlow] = useState(false)
  const latest = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  const reload = useCallback(async () => {
    const id = ++latest.current
    setState((prev) => ({ ...prev, status: 'loading', error: null }))
    const timer = setTimeout(() => setSlow(true), 3000)
    try {
      const data = await run()
      // A newer request started while this one was in flight; drop this one.
      if (id === latest.current) setState({ status: 'ready', data, error: null })
    } catch (error) {
      if (id === latest.current) setState({ status: 'error', data: null, error })
    } finally {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [run])

  useEffect(() => {
    reload()
  }, [reload])

  // For optimistic updates: change the data without reloading it.
  const setData = useCallback(
    (update) =>
      setState((prev) => ({
        ...prev,
        data: typeof update === 'function' ? update(prev.data) : update,
      })),
    []
  )

  return { ...state, slow, reload, setData }
}
