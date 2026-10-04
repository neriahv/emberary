// Flat illustrations in Emberary's palette for the Library Room card and the
// My Books banner. Purely decorative, so hidden from screen readers. The
// colours are fixed: they are pictures, and read the same in light and dark
// mode.
const EMBER = '#a4431f'
const HONEY = '#c7771c'
const AMBER = '#e2a35a'
const WOOD = '#5a3a22'
const DARK_WOOD = '#3a2a1e'
const BRICK = '#6b3f2a'
const PAPER = '#fff8ef'

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
