import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import StarRating from '../components/StarRating.jsx'
import Avatar, { AVATARS } from '../components/Avatar.jsx'
import SignInPage from '../pages/SignInPage.jsx'
import MyBooksPage from '../pages/MyBooksPage.jsx'
vi.mock('../api', () => ({
  USING_MOCK_API: false,
  STATUSES: ['read', 'currently-reading', 'want-to-read', 'did-not-finish'],
  STATUS_LABELS: { read: 'Read' },
  listMyBooks: vi.fn(async () => []),
  logIn: vi.fn(),
  signUp: vi.fn(),
  checkEmail: vi.fn(async () => ({ status: 'ok' })),
  EMAIL_PATTERN: /^[^@]+@[^@]+\.[^@]+$/,
  PASSWORD_RULES: [
    {
      id: 'length',
      label: 'At least 8 characters',
      test: (p) => p.length >= 8,
    },
  ],
}))
import { logIn, listMyBooks } from '../api'
it('renders accessible progress including an empty max', () => {
  render(<ProgressBar value={0} max={0} label="Book progress" />)
  expect(screen.getByRole('progressbar', { name: 'Book progress' })).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByText(/0%/)).toBeInTheDocument()
})
it('allows a reader to rate and clear a book', async () => {
  const change = vi.fn()
  render(<StarRating value={3} onChange={change} />)
  await userEvent.click(screen.getByRole('radio', { name: '5 of 5' }))
  expect(change).toHaveBeenCalledWith(5)
  await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(change).toHaveBeenCalledWith(null)
})
it.each(AVATARS)('draws the %s avatar accessibly', (name) => {
  render(<Avatar name={name} />)
  expect(screen.getByRole('img', { name: `${name} avatar` })).toBeInTheDocument()
})
it('signs in with a normalized email and preserves password', async () => {
  const signed = vi.fn()
  logIn.mockResolvedValue({ id: 2 })
  render(<SignInPage onSignedIn={signed} />)
  await userEvent.type(screen.getByLabelText('Email'), ' Me@Example.com ')
  await userEvent.type(screen.getByLabelText('Password'), 'Secret-77')
  await userEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1))
  expect(logIn).toHaveBeenCalledWith(
    expect.objectContaining({ email: 'me@example.com', password: 'Secret-77' })
  )
  expect(signed).toHaveBeenCalledWith({ id: 2 })
})
it('displays a sign-in error and makes retry possible', async () => {
  logIn.mockRejectedValue(Error('Wrong password'))
  render(<SignInPage onSignedIn={vi.fn()} />)
  await userEvent.type(screen.getByLabelText('Email'), 'me@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'bad')
  await userEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1))
  expect(await screen.findByRole('alert')).toHaveTextContent('Wrong password')
  expect(screen.getAllByRole('button', { name: 'Sign in' }).at(-1)).toBeEnabled()
})
it('keeps genre, rating and sort in the URL, and Clear filters keeps the sort', async () => {
  listMyBooks.mockResolvedValue([
    {
      bookId: 'a',
      status: 'read',
      rating: 5,
      currentPage: 100,
      updatedAt: '2026-01-01',
      book: {
        id: 'a',
        title: 'Moon',
        author: 'Ada',
        genre: 'Fantasy',
        pages: 100,
        color: '#123456',
      },
    },
  ])
  function Location() {
    return <output data-testid="location">{useLocation().search}</output>
  }
  render(
    <MemoryRouter initialEntries={['/my-books?genre=Fantasy&rating=4&sort=title']}>
      <MyBooksPage />
      <Location />
    </MemoryRouter>
  )
  expect(await screen.findByText(/Showing 1 of 1 books/)).toBeInTheDocument()
  await userEvent.type(screen.getByRole('searchbox'), 'zzz')
  expect(screen.getByTestId('location').textContent).not.toContain('q=')
  expect(screen.getByText('No books match these filters.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByTestId('location').textContent).toBe('?sort=title')
  expect(screen.getByRole('searchbox')).toHaveValue('')
})
