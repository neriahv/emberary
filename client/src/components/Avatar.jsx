export const AVATARS = ['flame', 'owl', 'fox', 'cat', 'bear', 'rabbit', 'leaf', 'book']
const colors = {
  flame: '#d56736',
  owl: '#886545',
  fox: '#c97443',
  cat: '#8f7c91',
  bear: '#937052',
  rabbit: '#d4a0a2',
  leaf: '#759763',
  book: '#75999d',
}
export default function Avatar({ name = 'flame', ...props }) {
  const choice = AVATARS.includes(name) ? name : 'flame'
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={`${choice} avatar`} {...props}>
      <circle cx="32" cy="32" r="31" fill="#f4e5cf" />
      <g fill={colors[choice]} stroke="#503a30" strokeWidth="1.5" strokeLinejoin="round">
        {choice === 'flame' ? (
          <>
            <path d="M32 8C43 21 25 23 43 30C53 44 41 55 32 55C13 55 10 40 20 28C20 39 30 25 32 8Z" />
            <path fill="#efbe62" d="M32 32C23 42 23 49 32 50C41 49 39 40 32 32Z" />
          </>
        ) : choice === 'leaf' ? (
          <>
            <path d="M15 48C8 17 40 11 51 13C54 37 44 55 15 48Z" />
            <path fill="none" d="M13 52L43 23M25 39L23 27M34 30L44 32" />
          </>
        ) : choice === 'book' ? (
          <>
            <path d="M9 18Q21 13 32 22Q44 13 55 18V48Q43 43 32 51Q20 43 9 48Z" />
            <path fill="none" d="M32 22V51M15 25L25 26M15 32L25 33M39 26L49 25M39 33L49 32" />
          </>
        ) : (
          <>
            {choice === 'rabbit' ? (
              <>
                <ellipse cx="23" cy="19" rx="7" ry="16" />
                <ellipse cx="41" cy="19" rx="7" ry="16" />
              </>
            ) : choice === 'bear' ? (
              <>
                <circle cx="17" cy="19" r="9" />
                <circle cx="47" cy="19" r="9" />
              </>
            ) : (
              <path
                d={
                  choice === 'owl'
                    ? 'M12 30L12 9L28 20M36 20L52 9L52 30'
                    : 'M13 29L15 9L29 22M35 22L49 9L51 29'
                }
              />
            )}
            <ellipse cx="32" cy="36" rx="22" ry="20" />
            {choice === 'owl' ? (
              <>
                <circle cx="22" cy="33" r="10" fill="#fff4db" />
                <circle cx="42" cy="33" r="10" fill="#fff4db" />
                <path fill="#e3a350" d="M28 42L32 49L36 42Z" />
              </>
            ) : (
              <ellipse cx="32" cy="45" rx="13" ry="9" fill="#fff4db" />
            )}
            <circle cx="23" cy="34" r="2.4" fill="#36281f" />
            <circle cx="41" cy="34" r="2.4" fill="#36281f" />
            {choice !== 'owl' && <path fill="#503a30" d="M29 41L35 41L32 45Z" />}
            {choice === 'cat' && <path fill="none" d="M9 41L22 44M9 48L22 47M42 44L55 41M42 47L55 48" />}
          </>
        )}
      </g>
    </svg>
  )
}
