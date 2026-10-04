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
  flame: 'M12 3c1.2 3.2 5 5.2 5 10a5 5 0 0 1-10 0c0-2.2 1-3.7 2.2-4.8.2 2 1.1 3.1 2.3 3.3-.3-3.2-.7-5.6.5-8.5Z',
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
