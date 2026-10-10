// Small line icons, drawn on a 24px grid in the current text colour, so an
// icon always matches the text beside it. Decorative unless given a label.
const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v10h13V10M10 20v-5.5h4V20',
  discover: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8Z',
  room: 'M4 20V8.5L12 4l8 4.5V20M3 20h18M7.5 20v-6.5h4V20M14 11h3.5v3.5H14Z',
  books: 'M4.5 19.5v-15h3.5v15ZM8 19.5v-13h4v13ZM13.2 6.4l3.3-.9 3.6 13.4-3.3.9Z',
  profile: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4.5 20.5c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  leaf: 'M5 19C5 11 10 6 19 5c0 9-5 14-14 14ZM5 19l7.5-7.5',
  settings:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  logout: 'M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h10',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.5V12l3 2',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-3.9 2.5-5 0 1.8.6 3 1.8 3.5C11 9 10.5 5.5 12 3Z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0ZM8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4M8.5 20h7',
  quote: 'M5 11.5C5 8.5 6.5 6.5 9 6M5 11.5h4V17H5ZM14 11.5c0-3 1.5-5 4-5.5M14 11.5h4V17h-4Z',
  note: 'M6 3.5h9l3 3v14H6ZM9 10h6M9 13.5h6M9 17h3',
  layers: 'M12 4 3 8.5l9 4.5 9-4.5ZM3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M6 9l6 6 6-6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  moon: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z',
  device: 'M4 5h16v11H4ZM9 20h6M12 16v4',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 11.5v1',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z',
  lock: 'M6 11h12v9H6ZM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  pencil: 'M15 5l4 4L9 19H5v-4ZM13 7l4 4',
}

export default function Icon({ name, label, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
