// Flat illustrations in Emberary's palette for the Home hero, the Library Room
// card and the My Books banner. Purely decorative, so hidden from screen
// readers. The colours are fixed: they are pictures, and read the same in
// light and dark mode.
const EMBER = '#a4431f'
const HONEY = '#c7771c'
const AMBER = '#e2a35a'
const WOOD = '#5a3a22'
const DARK_WOOD = '#3a2a1e'
const BRICK = '#6b3f2a'
const PAPER = '#fff8ef'
const GLOW = '#f6e2d6'

// A reading nook: a window of warm light, a stack of books, a mug, and leaves
// drifting past.
export function HeroArt({ className }) {
  return (
    <svg className={className} viewBox="0 0 260 180" aria-hidden="true">
      <circle cx="160" cy="78" r="74" fill={GLOW} opacity="0.75" />
      <path d="M118 120V58a42 42 0 0 1 84 0v62Z" fill={PAPER} stroke={WOOD} strokeWidth="6" />
      <path d="M160 18v102M118 76h84" stroke={WOOD} strokeWidth="4" />
      <circle cx="182" cy="44" r="10" fill={AMBER} opacity="0.55" />
      <rect x="40" y="138" width="196" height="10" rx="5" fill={WOOD} />
      <rect x="54" y="148" width="10" height="26" rx="3" fill={DARK_WOOD} />
      <rect x="212" y="148" width="10" height="26" rx="3" fill={DARK_WOOD} />
      <rect x="60" y="120" width="78" height="18" rx="4" fill={EMBER} />
      <path d="M66 129h64" stroke={PAPER} strokeWidth="2" opacity="0.5" />
      <rect x="68" y="104" width="66" height="16" rx="4" fill={HONEY} />
      <path d="M74 112h54" stroke={PAPER} strokeWidth="2" opacity="0.5" />
      <rect x="62" y="90" width="70" height="14" rx="4" fill={BRICK} />
      <rect x="156" y="106" width="34" height="32" rx="7" fill={PAPER} stroke={EMBER} strokeWidth="4" />
      <path d="M190 114a8 8 0 0 1 0 16" fill="none" stroke={EMBER} strokeWidth="4" />
      <path d="M166 98c-4-6 4-8 0-14M178 98c-4-6 4-8 0-14" fill="none" stroke={HONEY} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <Leaf x={34} y={40} rotate={-30} fill={HONEY} />
      <Leaf x={226} y={60} rotate={40} fill={EMBER} />
      <Leaf x={90} y={30} rotate={15} fill={AMBER} scale={0.7} />
      <Leaf x={238} y={118} rotate={-60} fill={AMBER} scale={0.8} />
    </svg>
  )
}

// A tiny version of the 3D room: two walls, a round window, a bookcase and a rug.
export function RoomArt({ className }) {
  const books = [EMBER, HONEY, BRICK, AMBER, EMBER, PAPER, HONEY]
  return (
    <svg className={className} viewBox="0 0 200 160" aria-hidden="true">
      {/* the base under the floor, like the diorama's cut-away edge */}
      <path d="M20 104 100 142 180 104V112L100 150 20 112Z" fill={DARK_WOOD} />
      {/* back walls, lit from the window */}
      <path d="M20 104 100 66V10L20 48Z" fill="#f2d2a6" />
      <path d="M100 66 180 104V48L100 10Z" fill="#e3b77f" />
      <path d="M20 48 100 10 180 48" fill="none" stroke={WOOD} strokeWidth="5" strokeLinejoin="round" />
      {/* the planked floor */}
      <path d="M100 66 180 104 100 142 20 104Z" fill="#b8733f" />
      {[1, 2, 3, 4].map((n) => (
        <path key={n} d={`M${20 + n * 16} ${104 - n * 7.6}l80 38`} stroke={BRICK} strokeWidth="1.2" opacity="0.45" />
      ))}
      {/* the round window, with a pool of light under it */}
      <ellipse cx="56" cy="58" rx="14" ry="17" transform="rotate(-25 56 58)" fill={PAPER} stroke={WOOD} strokeWidth="3" />
      <path d="M56 42v32M44 60l24-6" stroke={WOOD} strokeWidth="2" />
      <ellipse cx="74" cy="104" rx="22" ry="8" fill="#fff3df" opacity="0.35" />
      {/* the bookcase against the right wall */}
      <path d="M116 30 160 51V96L116 75Z" fill={DARK_WOOD} />
      {[0, 1, 2].map((shelf) =>
        books.map((color, i) => (
          <path
            key={`${shelf}-${i}`}
            d={`M${119 + i * 5.6} ${37 + shelf * 14 + i * 2.7}v10l4.6 2.2v-10Z`}
            fill={(i + shelf) % 3 === 0 ? books[(i + 2) % books.length] : color}
          />
        )),
      )}
      {/* the rug */}
      <ellipse cx="100" cy="108" rx="30" ry="13" fill={EMBER} />
      <ellipse cx="100" cy="108" rx="20" ry="8" fill={HONEY} />
    </svg>
  )
}

// Three books leaning on each other, for the My Books banner.
export function BooksArt({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true">
      <ellipse cx="60" cy="92" rx="50" ry="6" fill={WOOD} opacity="0.15" />
      <rect x="22" y="18" width="20" height="72" rx="3" fill={EMBER} />
      <path d="M26 30h12M26 76h12" stroke={PAPER} strokeWidth="2.5" opacity="0.6" />
      <rect x="45" y="28" width="22" height="62" rx="3" fill={HONEY} />
      <path d="M49 40h14M49 78h14" stroke={PAPER} strokeWidth="2.5" opacity="0.6" />
      <rect x="74" y="20" width="20" height="72" rx="3" fill={BRICK} transform="rotate(14 84 90)" />
      <Leaf x={100} y={22} rotate={30} fill={AMBER} scale={0.7} />
    </svg>
  )
}

function Leaf({ x, y, rotate = 0, scale = 1, fill }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0 -12C8 -6 8 6 0 12C-8 6 -8 -6 0 -12Z" fill={fill} />
      <path d="M0 -10V12" stroke={PAPER} strokeWidth="1.2" opacity="0.6" />
    </g>
  )
}
