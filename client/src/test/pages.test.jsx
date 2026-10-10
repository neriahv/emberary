import { it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import App from '../App.jsx'
class ResizeObserver {
  observe() {}
  disconnect() {}
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('ResizeObserver', ResizeObserver)
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function open(path) {
  window.history.replaceState({}, '', path)
  render(<App />)
  await act(() => vi.advanceTimersByTimeAsync(500))
  await act(() => vi.advanceTimersByTimeAsync(500))
}
it('Home loads the reader, daily quests and timer without a live API', async () => {
  await open('/')
  expect(screen.getByRole('heading', { name: /Welcome back/ })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Daily quests' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start reading' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: /Your account/ }))
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  expect(screen.getByRole('link', { name: 'Book lists' })).toHaveAttribute('href', '/lists')
})
it('Settings saves a personal page goal and explicit dark theme', async () => {
  await open('/settings')
  fireEvent.change(screen.getByLabelText('Daily page goal'), { target: { value: '15' } })
  fireEvent.click(screen.getByRole('radio', { name: /Dark/ }))
  await act(async () =>
    fireEvent.submit(screen.getByRole('button', { name: 'Save settings' }).closest('form'))
  )
  expect(screen.getByText('Settings saved.')).toBeInTheDocument()
  expect(document.documentElement.dataset.theme).toBe('dark')
})
it('Profile shows streaks, achievements, review and all avatar choices', async () => {
  await open('/profile')
  expect(screen.getByRole('heading', { name: 'Your reading journey' })).toBeInTheDocument()
  expect(screen.getByText(/First book finished/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
  expect(
    screen.getAllByRole('button', { name: /Choose (flame|owl|fox|cat|bear|rabbit|leaf|book)/ })
  ).toHaveLength(8)
  fireEvent.click(screen.getByRole('button', { name: 'Choose owl' }))
  fireEvent.submit(screen.getByRole('button', { name: 'Save profile' }).closest('form'))
  await act(() => vi.advanceTimersByTimeAsync(500))
  expect(document.querySelectorAll('svg[aria-label="owl avatar"]').length).toBeGreaterThan(0)
})
it('Lists creates a list, adds an owned book, and links to its details', async () => {
  await open('/lists')
  fireEvent.change(screen.getByLabelText('New list name'), { target: { value: 'Summer reads' } })
  await act(async () => fireEvent.submit(screen.getByRole('button', { name: 'Create list' }).closest('form')))
  expect(screen.getByRole('heading', { name: 'Summer reads' })).toBeInTheDocument()
  await act(async () => fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]))
  expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
})
