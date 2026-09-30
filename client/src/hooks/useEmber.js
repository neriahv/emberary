import { useEffect } from 'react'
import { getEmber, onEmberChange } from '../api'
import { useAsync } from './useAsync.js'

// The reader's Ember wallet, kept current: anything that earns or spends Ember
// (a book saved, a check-in, a purchase) announces it, and every wallet on the
// page quietly fetches the new balance without flashing a loading state.
export function useEmber() {
  const wallet = useAsync(getEmber)
  const { setData } = wallet
  useEffect(
    () =>
      onEmberChange(() => {
        getEmber()
          .then(setData)
          .catch(() => {})
      }),
    [setData]
  )
  return wallet
}
