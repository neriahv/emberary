// Read-only when there is no onChange. Editable as a group of five radio
// buttons, so it works with a keyboard and a screen reader without extra code.
export default function StarRating({ value, onChange, name = 'rating', disabled = false }) {
  if (!onChange) {
    if (!value) return <span className="muted stars-none">Not rated</span>
    return (
      <span className="stars" aria-label={`Rated ${value} of 5`}>
        {'★'.repeat(value)}
        <span className="stars-empty">{'★'.repeat(5 - value)}</span>
      </span>
    )
  }

  return (
    <fieldset className="star-input" disabled={disabled}>
      <legend>Rating</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className={n <= (value ?? 0) ? 'on' : ''}>
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
          />
          <span aria-hidden="true">★</span>
          <span className="visually-hidden">{n} of 5</span>
        </label>
      ))}
      {value ? (
        <button type="button" className="button-link" onClick={() => onChange(null)}>
          Clear
        </button>
      ) : null}
    </fieldset>
  )
}
