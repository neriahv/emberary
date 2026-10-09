import { useEffect } from 'react'
import { getSettings } from '../api'
export function applyTheme(theme) {
  const mode =
    theme === 'system'
      ? window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme
  document.documentElement.dataset.theme = mode
}
export default function Theme() {
  useEffect(() => {
    let alive = true,
      theme = 'system'
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const device = () => applyTheme(theme)
    const changed = (event) => {
      theme = event.detail.theme
      applyTheme(theme)
    }
    getSettings().then(
      (value) => {
        if (alive) {
          theme = value.theme
          applyTheme(theme)
        }
      },
      () => applyTheme('system')
    )
    media?.addEventListener('change', device)
    window.addEventListener('emberary:settings', changed)
    return () => {
      alive = false
      media?.removeEventListener('change', device)
      window.removeEventListener('emberary:settings', changed)
      delete document.documentElement.dataset.theme
    }
  }, [])
  return null
}
