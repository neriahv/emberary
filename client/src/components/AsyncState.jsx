// The loading and error halves of the four states, shared by every screen.
// Empty is different per screen, so each page writes its own.
//
// Returns null once the data is ready, so a page can write
//   <AsyncState {...result} /> {result.status === 'ready' && ...}

export default function AsyncState({ status, error, slow, reload, label = 'Loading' }) {
  if (status === 'loading') {
    return (
      <p className="muted" role="status">
        {label}
        {slow ? '. The server may be waking up, which can take up to a minute.' : '...'}
      </p>
    )
  }

  if (status === 'error') {
    return (
      <p className="error" role="alert">
        Could not load this: {error?.message ?? 'unknown error'}.{' '}
        <button type="button" className="button-small" onClick={reload}>
          Try again
        </button>
      </p>
    )
  }

  return null
}
