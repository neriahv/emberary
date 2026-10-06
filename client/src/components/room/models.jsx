import { useRef } from 'react'
import { LOFT } from '../../api'
import { BRASS, Ball, Box, Candle, Cyl, Glow, IRON, PAPER, Shadowed, WOOD, WOOD_DARK, usePlay } from './parts.jsx'
import * as more from './furniture.jsx'
import { checkTexture } from './textures.js'
import * as lights from './lights.jsx'
import { WINDOW_MODELS } from './windows.jsx'
import { DecorShelf } from './structure.jsx'

export { Shadowed }

// The Library Room's furniture, built from simple shapes.
//
// Each model stands on the floor at its own origin and faces +z (towards the
// open side of the room) at rotation 0, so RoomItem can place and turn any of
// them the same way. A wall-mounted model's back is at z = -0.3, so standing
// at the edge of the floor (0.3 m from a wall) puts it flat against the wall.
// See parts.jsx for the props a model is given.

function Rug() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <planeGeometry args={[2.6, 1.8]} />
        <meshStandardMaterial color="#8c3b2a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <planeGeometry args={[2.3, 1.5]} />
        <meshStandardMaterial color="#b0552f" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[2.0, 1.2]} />
        <meshStandardMaterial color="#8c3b2a" roughness={1} />
      </mesh>
    </>
  )
}

function Plant() {
  return (
    <>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.4, 24]} />
        <meshStandardMaterial color="#b5653d" roughness={0.9} />
      </mesh>
      {[
        [0, 0.62, 0, 0.28],
        [0.14, 0.78, 0.05, 0.2],
        [-0.12, 0.8, -0.04, 0.2],
      ].map(([x, y, z, r]) => (
        <mesh key={`${x}${y}`} position={[x, y, z]}>
          <sphereGeometry args={[r, 20, 16]} />
          <meshStandardMaterial color="#3f6b3a" roughness={0.9} />
        </mesh>
      ))}
    </>
  )
}

function Lamp({ lit, shine }) {
  return (
    <>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.04, 24]} />
        <meshStandardMaterial color="#2b2320" />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 12]} />
        <meshStandardMaterial color="#2b2320" metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <coneGeometry args={[0.25, 0.3, 24, 1, true]} />
        <meshStandardMaterial color="#f3d9a8" emissive="#f3c07a" emissiveIntensity={lit ? 0.8 : 0} side={2} />
      </mesh>
      <Glow lit={lit} shine={shine} position={[0, 1.5, 0]} intensity={2.4} distance={5} decay={1.4} color="#ffc48a" />
    </>
  )
}

function Armchair({ fabric = '#6d2f2a', map }) {
  return (
    <>
      {[[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.06, z]}>
          <cylinderGeometry args={[0.025, 0.02, 0.12, 8]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      <Box s={[0.72, 0.24, 0.66]} position={[0, 0.24, 0.02]} c={map ? '#ffffff' : fabric} map={map} r={0.95} />
      <Box s={[0.72, 0.62, 0.14]} position={[0, 0.62, -0.28]} rotation={[-0.12, 0, 0]} c={map ? '#ffffff' : fabric} map={map} r={0.95} />
      {[-1, 1].map((side) => (
        <Box key={side} s={[0.1, 0.22, 0.66]} position={[side * 0.33, 0.44, 0.02]} c={map ? '#ffffff' : fabric} map={map} r={0.95} />
      ))}
    </>
  )
}

// The armchair again, in a rust-and-brown autumn check.
const PlaidArmchair = () => <Armchair map={checkTexture('#c86a2c', '#5a2a14', 3)} />

// A round pedestal table. Its top holds one of the reader's books.
function SideTable() {
  return (
    <>
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 32]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.13, 0.17, 0.52, 20]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.03, 24]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
    </>
  )
}

function Cushion() {
  return (
    <mesh position={[0, 0.09, 0]} scale={[1, 0.38, 1]}>
      <sphereGeometry args={[0.3, 24, 16]} />
      <meshStandardMaterial color="#b0703a" roughness={1} />
    </mesh>
  )
}

// The writing desk from the reference: a drawer, a candle on a brass stand,
// and room on top for two of the reader's books.
function Desk({ lit, shine }) {
  return (
    <>
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[1.3, 0.06, 0.75]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      {[[-0.58, -0.3], [0.58, -0.3], [-0.58, 0.3], [0.58, 0.3]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.36, z]}>
          <boxGeometry args={[0.07, 0.72, 0.07]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.64, 0.02]}>
        <boxGeometry args={[1.12, 0.14, 0.62]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.64, 0.34]}>
        <boxGeometry args={[0.03, 0.03, 0.02]} />
        <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* a quill in its inkwell */}
      <Cyl s={[0.03, 0.035, 0.05, 12]} position={[0.5, 0.795, -0.25]} c="#1d2a3a" r={0.2} />
      <Box s={[0.012, 0.24, 0.04]} position={[0.5, 0.9, -0.25]} rotation={[0, 0, 0.35]} c="#f4efe6" r={0.9} />
      <group position={[-0.45, 0.77, -0.15]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.03, 16]} />
          <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
          <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
        </mesh>
        <Candle position={[0, 0.2, 0]} lit={lit} shine={shine} intensity={1.6} />
      </group>
    </>
  )
}

// A rocking chair: curved rockers, a slatted back and a cushion. Click it and
// it rocks, slower and slower.
function RockingChair({ poke }) {
  const chair = useRef()
  usePlay(poke, 3.2, (t) => {
    chair.current.rotation.x = Math.sin(t * Math.PI * 6) * 0.16 * (1 - t)
  })
  return (
    <group ref={chair}>
      {/* Each rocker is the bottom slice of a big ring, standing on its edge. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.27, 0.52, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh rotation={[0, 0, (3 * Math.PI) / 2 - 0.55]}>
            <torusGeometry args={[0.5, 0.025, 8, 24, 1.1]} />
            <meshStandardMaterial color={WOOD} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {[[-0.25, -0.2], [0.25, -0.2], [-0.25, 0.2], [0.25, 0.2]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.25, z]}>
          <cylinderGeometry args={[0.022, 0.022, 0.34, 8]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.58, 0.05, 0.5]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.49, 0.02]}>
        <boxGeometry args={[0.5, 0.06, 0.44]} />
        <meshStandardMaterial color="#e6d6b8" roughness={1} />
      </mesh>
      {/* back posts and slats, leaning back */}
      <group position={[0, 0.46, -0.24]} rotation={[-0.22, 0, 0]}>
        {[-0.26, 0.26].map((x) => (
          <mesh key={x} position={[x, 0.42, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.84, 8]} />
            <meshStandardMaterial color={WOOD} roughness={0.6} />
          </mesh>
        ))}
        {[-0.13, 0, 0.13].map((x) => (
          <mesh key={x} position={[x, 0.42, 0]}>
            <boxGeometry args={[0.05, 0.7, 0.02]} />
            <meshStandardMaterial color={WOOD} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.84, 0]}>
          <boxGeometry args={[0.6, 0.07, 0.05]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.45, 0.05]}>
          <boxGeometry args={[0.44, 0.44, 0.06]} />
          <meshStandardMaterial color="#e6d6b8" roughness={1} />
        </mesh>
      </group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.3, 0.66, 0]}>
          <boxGeometry args={[0.05, 0.04, 0.5]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// A floor globe on a three-legged stand. Click it and it spins.
function Globe({ poke }) {
  const ball = useRef()
  usePlay(poke, 2.4, (t) => {
    // Fast at first, easing to a stop a little over two turns later.
    ball.current.rotation.y = (1 - (1 - t) ** 3) * Math.PI * 4.5
  })
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.12, 0.2, Math.sin((i * 2 * Math.PI) / 3) * 0.12]}
          rotation={[Math.sin((i * 2 * Math.PI) / 3) * 0.35, 0, -Math.cos((i * 2 * Math.PI) / 3) * 0.35]}>
          <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      <group position={[0, 0.66, 0]} rotation={[0, 0, 0.41]}>
        <group ref={ball}>
          <mesh>
            <sphereGeometry args={[0.24, 32, 24]} />
            <meshStandardMaterial color="#3e5f73" roughness={0.45} />
          </mesh>
          {/* continents, roughly */}
          <mesh rotation={[0.3, 0.8, 0]} scale={[1.01, 1.01, 1.01]}>
            <sphereGeometry args={[0.24, 16, 12, 0, 1.4, 0.5, 1.1]} />
            <meshStandardMaterial color="#c9a766" roughness={0.6} />
          </mesh>
          <mesh rotation={[-0.4, 3.4, 0]} scale={[1.01, 1.01, 1.01]}>
            <sphereGeometry args={[0.24, 16, 12, 0, 0.9, 0.9, 0.9]} />
            <meshStandardMaterial color="#c9a766" roughness={0.6} />
          </mesh>
        </group>
        <mesh>
          <torusGeometry args={[0.29, 0.012, 8, 48]} />
          <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.06, 12]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  )
}

// A low chest of drawers with a candle in a glass on top, and room for a book.
function Dresser({ lit, shine }) {
  return (
    <>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.9, 0.78, 0.5]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.83, 0]}>
        <boxGeometry args={[0.96, 0.04, 0.54]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
      </mesh>
      {[0.2, 0.44, 0.66].map((y) => (
        <group key={y} position={[0, y, 0.255]}>
          <mesh>
            <boxGeometry args={[0.8, 0.19, 0.02]} />
            <meshStandardMaterial color="#7d4526" roughness={0.55} />
          </mesh>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0, 0.02]}>
              <sphereGeometry args={[0.022, 10, 8]} />
              <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      {[[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.02, z]}>
          <boxGeometry args={[0.06, 0.04, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      <mesh position={[0.25, 0.92, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.14, 16]} />
        <meshStandardMaterial color="#fff2d8" transparent opacity={0.35} roughness={0.1} />
      </mesh>
      <Candle position={[0.25, 0.86, 0]} lit={lit} shine={shine} intensity={1.1} />
    </>
  )
}

// A hexagonal floor lantern with a candle glowing inside.
function Lantern({ lit, shine }) {
  return (
    <>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.16, 0.17, 0.06, 6]} />
        <meshStandardMaterial color={IRON} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.28, 6, 1, true]} />
        <meshStandardMaterial color="#ffd89a" emissive="#ffb45e" emissiveIntensity={lit ? 0.9 : 0} transparent opacity={0.75} side={2} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <coneGeometry args={[0.17, 0.12, 6]} />
        <meshStandardMaterial color={IRON} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <torusGeometry args={[0.04, 0.008, 6, 16]} />
        <meshStandardMaterial color={IRON} metalness={0.4} />
      </mesh>
      <Candle position={[0, 0.06, 0]} lit={lit} shine={shine} intensity={1.8} />
    </>
  )
}

// ------------------------------------------------------------ bookcases

// The built-in bookcase against the right-hand wall, and the ones the shop
// sells. The scene fills them with the reader's books in this order. A
// bookcase with its own `color` keeps it; the rest take the room's bookcase
// colour. `crown` dresses the top.
export const BOOKCASES = {
  main: { width: 2.3, height: 2.8, depth: 0.42, shelves: 4 },
  'bookcase-tall': { width: 1.3, height: 2.5, depth: 0.38, shelves: 4 },
  'bookcase-small': { width: 1.0, height: 1.35, depth: 0.36, shelves: 2 },
  'bookcase-wall': { width: 2.4, height: 3.6, depth: 0.42, shelves: 6, crown: 'cornice' },
  'bookcase-crate': { width: 1.0, height: 1.4, depth: 0.4, shelves: 2, color: '#b8743a', crown: 'crate' },
  'bookcase-pastel': { width: 1.1, height: 1.8, depth: 0.36, shelves: 3, color: '#f1b9c6', crown: 'scallop' },
  'bookcase-birch': { width: 1.4, height: 2.4, depth: 0.38, shelves: 4, color: '#d9b48a', crown: 'vines' },
  'bookcase-arched': { width: 1.3, height: 2.7, depth: 0.4, shelves: 4, color: '#3a2433', crown: 'arch' },
}

const SHELF_BASE = 0.16 // height of the lowest shelf board
const SIDE = 0.07 // thickness of the sides

// The height books stand at on each shelf, top shelf first.
export function shelfLevels({ height, shelves }) {
  const gap = (height - SHELF_BASE - 0.08) / shelves
  return Array.from({ length: shelves }, (_, i) => SHELF_BASE + (shelves - 1 - i) * gap)
}

// The height of the space for books on each shelf.
export const shelfGap = ({ height, shelves }) => (height - SHELF_BASE - 0.08) / shelves

// The width of a shelf between the sides, and how far forward a book stands so
// its back touches the back panel.
export const innerWidth = ({ width }) => width - 2 * SIDE
export const bookRowZ = ({ depth }) => -depth / 2 + 0.03 + 0.15

const SAMPLE_COLOURS = ['#7a2e3b', '#2f5d6b', '#c9a24e', '#3a4a2c', '#5b2a1e', '#294056']

// What sits on top of a bookcase, or makes it look like the one in the shop.
function Crown({ spec, color }) {
  const { width, height, depth, crown } = spec
  const top = height + 0.065
  if (crown === 'arch') {
    return (
      <>
        {/* A half-disc standing on the top, and a gilt star at its peak. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, top, 0]}>
          <cylinderGeometry args={[width / 2, width / 2, depth, 32, 1, false, -Math.PI / 2, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, top, depth / 2 + 0.005]}>
          <torusGeometry args={[width / 2 - 0.08, 0.02, 8, 32, Math.PI]} />
          <meshStandardMaterial color="#d9b56a" metalness={0.6} roughness={0.3} />
        </mesh>
        <Ball s={[0.06, 12, 8]} position={[0, top + width / 2 + 0.04, 0]} c="#ffe08a" e="#ffd27a" ei={0.6} />
      </>
    )
  }
  if (crown === 'vines') {
    return [-0.55, -0.3, -0.05, 0.2, 0.45, 0.6].map((x, i) => (
      <group key={x}>
        <Ball s={[0.11 + (i % 3) * 0.03, 12, 10]} position={[x * (width / 1.4), top + 0.06, 0.05]} c={i % 2 ? '#4f8a45' : '#3f6b3a'} r={0.9} />
        {i % 2 === 0 &&
          [0.2, 0.4, 0.6].map((d) => (
            <Ball key={d} s={[0.05, 8, 6]} position={[x * (width / 1.4) + d * 0.05, top - d, depth / 2 + 0.03]} c="#4f8a45" r={0.9} />
          ))}
      </group>
    ))
  }
  if (crown === 'scallop') {
    return Array.from({ length: 7 }, (_, i) => (
      <mesh key={i} rotation={[Math.PI / 2, 0, 0]} position={[-width / 2 + (width / 7) * (i + 0.5), top - 0.04, depth / 2 + 0.03]}>
        <cylinderGeometry args={[width / 14, width / 14, 0.02, 16, 1, false, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#fff4f6" roughness={0.6} />
      </mesh>
    ))
  }
  if (crown === 'cornice') {
    return (
      <>
        <Box s={[width + 0.2, 0.12, depth + 0.1]} position={[0, top + 0.08, 0.02]} c={color} r={0.6} />
        {/* the rail a library ladder would hang from */}
        <Cyl s={[0.015, 0.015, width, 8]} rotation={[0, 0, Math.PI / 2]} position={[0, height - 0.15, depth / 2 + 0.06]} c={BRASS} m={0.7} r={0.3} />
      </>
    )
  }
  if (crown === 'crate') {
    // Slats across each side, as on a fruit crate.
    return [-1, 1].flatMap((side) =>
      [0.35, 0.75, 1.15].map((y) => (
        <Box key={`${side}${y}`} s={[0.01, 0.05, depth]} position={[(side * (width + 0.005)) / 2, y, 0]} c="#7d4a22" />
      ))
    )
  }
  return null
}

// The carcass: back, sides, top and a board under every shelf. `sample` fills
// it with a few made-up books, for the shop's preview picture.
export function BookcaseFrame({ spec, color = '#5e3219', sample = false }) {
  const { width, height, depth } = spec
  const wood = spec.color ?? color
  return (
    <>
      <mesh position={[0, height / 2, -depth / 2 + 0.015]}>
        <boxGeometry args={[width, height, 0.03]} />
        <meshStandardMaterial color={wood} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * (width - SIDE)) / 2, height / 2, 0]}>
          <boxGeometry args={[SIDE, height, depth]} />
          <meshStandardMaterial color={wood} roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.03, 0.01]}>
        <boxGeometry args={[width + 0.1, 0.07, depth + 0.04]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      {shelfLevels(spec).map((y) => (
        <mesh key={y} position={[0, y - 0.02, 0]}>
          <boxGeometry args={[width - SIDE, 0.04, depth]} />
          <meshStandardMaterial color={wood} roughness={0.75} />
        </mesh>
      ))}
      <Crown spec={spec} color={wood} />
      {sample &&
        shelfLevels(spec).map((y, shelf) =>
          Array.from({ length: Math.floor(innerWidth(spec) / 0.14) }, (_, i) => {
            const tall = 0.36 + ((i * 7 + shelf * 3) % 5) * 0.03
            return (
              <mesh
                key={`${shelf}-${i}`}
                position={[-innerWidth(spec) / 2 + 0.07 + i * 0.12, y + tall / 2, bookRowZ(spec)]}
              >
                <boxGeometry args={[0.1, tall, 0.28]} />
                <meshStandardMaterial color={SAMPLE_COLOURS[(i + shelf * 2) % SAMPLE_COLOURS.length]} roughness={0.7} />
              </mesh>
            )
          })
        )}
    </>
  )
}

// ------------------------------------------------------------ more furniture

function CoffeeTable() {
  return (
    <>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.0, 0.05, 0.55]} />
        <meshStandardMaterial color={WOOD} roughness={0.5} />
      </mesh>
      {[[-0.44, -0.22], [0.44, -0.22], [-0.44, 0.22], [0.44, 0.22]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.9, 0.03, 0.45]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[0.3, 0.49, -0.1]}>
        <cylinderGeometry args={[0.045, 0.04, 0.09, 16]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.4} />
      </mesh>
    </>
  )
}

function Stool() {
  return (
    <>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.05, 24]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i * 2 * Math.PI) / 3
        return (
          <mesh key={i} position={[Math.cos(a) * 0.1, 0.22, Math.sin(a) * 0.1]}
            rotation={[Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18]}>
            <cylinderGeometry args={[0.018, 0.022, 0.46, 8]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
          </mesh>
        )
      })}
    </>
  )
}

function Chair() {
  return (
    <>
      {[[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.22, z]}>
          <boxGeometry args={[0.04, 0.44, 0.04]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.46, 0.05, 0.46]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      {[-0.19, 0.19].map((x) => (
        <mesh key={x} position={[x, 0.75, -0.2]}>
          <boxGeometry args={[0.04, 0.55, 0.04]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
      ))}
      {[0.66, 0.84, 1.0].map((y) => (
        <mesh key={y} position={[0, y, -0.2]}>
          <boxGeometry args={[0.42, 0.05, 0.03]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
      ))}
    </>
  )
}

function Candelabra({ lit, shine }) {
  return (
    <>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.14, 0.17, 0.06, 20]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.018, 0.025, 1.0, 10]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[0.44, 0.025, 0.025]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
      {[-0.2, 0, 0.2].map((x) => (
        <group key={x} position={[x, x === 0 ? 1.08 : 1.03, 0]}>
          <mesh>
            <cylinderGeometry args={[0.035, 0.03, 0.03, 12]} />
            <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
          </mesh>
          <Candle position={[0, 0.015, 0]} lit={lit} shine={shine && x === 0} intensity={1.6} />
        </group>
      ))}
    </>
  )
}

function RoundRug() {
  return (
    <>
      {[[0.95, '#2f5d6b'], [0.8, '#d9a55b'], [0.72, '#2f5d6b'], [0.3, '#8c3b2a']].map(([r, color], i) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006 + i * 0.002, 0]}>
          <circleGeometry args={[r, 48]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      ))}
    </>
  )
}

function RunnerRug() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <planeGeometry args={[0.8, 2.4]} />
        <meshStandardMaterial color="#3a4a2c" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <planeGeometry args={[0.62, 2.2]} />
        <meshStandardMaterial color="#b98a4a" roughness={1} />
      </mesh>
      {[-0.7, 0, 0.7].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.01, z]}>
          <planeGeometry args={[0.24, 0.24]} />
          <meshStandardMaterial color="#3a4a2c" roughness={1} />
        </mesh>
      ))}
    </>
  )
}

function Vase() {
  return (
    <>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 0.36, 20]} />
        <meshStandardMaterial color="#3e6d8c" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 0.06, 20]} />
        <meshStandardMaterial color="#3e6d8c" roughness={0.3} />
      </mesh>
      {[[0, 0.62, 0, '#d9534f'], [0.08, 0.56, 0.04, '#f0ad4e'], [-0.07, 0.58, -0.03, '#f7e1a0']].map(
        ([x, y, z, color]) => (
          <group key={color}>
            <mesh position={[x / 2, (y + 0.4) / 2, z / 2]} rotation={[z * 3, 0, -x * 3]}>
              <cylinderGeometry args={[0.008, 0.008, y - 0.4, 6]} />
              <meshStandardMaterial color="#3f6b3a" />
            </mesh>
            <mesh position={[x, y, z]}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
          </group>
        )
      )}
    </>
  )
}

function Clock() {
  return (
    <>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.42, 1.8, 0.28]} />
        <meshStandardMaterial color={WOOD} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.88, 0]}>
        <boxGeometry args={[0.5, 0.16, 0.32]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.55, 0.145]}>
        <circleGeometry args={[0.15, 32]} />
        <meshStandardMaterial color={PAPER} roughness={0.6} />
      </mesh>
      {[[0, 0.07, 0.3], [0.05, 0, 1.2]].map(([x, y, turn]) => (
        <mesh key={turn} position={[0, 1.55, 0.15]} rotation={[0, 0, turn]}>
          <boxGeometry args={[0.012, 0.11 + y, 0.005]} />
          <meshStandardMaterial color="#2b2320" />
        </mesh>
      ))}
      {/* the glass door, and the brass pendulum behind it */}
      <mesh position={[0, 0.85, 0.141]}>
        <planeGeometry args={[0.26, 0.9]} />
        <meshStandardMaterial color="#2b1a12" roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.62, 0.143]}>
        <circleGeometry args={[0.06, 20]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.95, 0.143]}>
        <planeGeometry args={[0.012, 0.6]} />
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.25} />
      </mesh>
    </>
  )
}

// ------------------------------------------------------------ the registry

// Every piece of furniture, by catalogue id.
//   radius:   how far the selection ring sits from the item's centre
//   height:   roughly how tall it is, so the shop's picture can frame it
//   light:    it gives light, and can be switched on and off
//   spec:     it is a bookcase, of this size
//   surfaces: it is a table; where the reader's books can lie on it
//             ([x, y, z, turn] each, in the model's own space)
//   wall:     it hangs on a wall, and snaps to the nearest one
//   hang:     it hangs from above, and is told how high the walls are
//   interact: what clicking it does, for the tooltip
//   landing:  a staircase; where you step off at the top, so the loft's
//             railing can open there
//   fixture:  built into the room: moved and turned, never sold or stored
//   window:   it is a window: hung on a wall, at the reader's height and
//             size; `half` is how far it reaches [across, up] from its middle
const bookcase = (id) => ({
  Model: (props) => <BookcaseFrame spec={BOOKCASES[id]} {...props} />,
  radius: BOOKCASES[id].width / 2 + 0.1,
  height: BOOKCASES[id].height + (BOOKCASES[id].crown === 'arch' ? BOOKCASES[id].width / 2 : 0.07),
  spec: BOOKCASES[id],
})

const windowItem = ({ Model, half }) => ({ Model, radius: half[0], height: half[1] * 2, wall: true, window: { half } })

export const MODELS = {
  'built-in-bookcase': { ...bookcase('main'), fixture: true },
  'built-in-shelf': { Model: DecorShelf, radius: 0.55, height: 2.1, fixture: true },
  ...Object.fromEntries(Object.entries(WINDOW_MODELS).map(([kind, def]) => [kind, windowItem(def)])),
  'bookcase-small': bookcase('bookcase-small'),
  'bookcase-tall': bookcase('bookcase-tall'),
  'bookcase-wall': bookcase('bookcase-wall'),
  'bookcase-crate': bookcase('bookcase-crate'),
  'bookcase-pastel': bookcase('bookcase-pastel'),
  'bookcase-birch': bookcase('bookcase-birch'),
  'bookcase-arched': bookcase('bookcase-arched'),

  'side-table': { Model: SideTable, radius: 0.3, height: 0.72, surfaces: [[0, 0.585, 0, 0.3]] },
  'coffee-table': { Model: CoffeeTable, radius: 0.6, height: 0.5, surfaces: [[-0.22, 0.445, 0.05, 0.15], [0.08, 0.445, 0.06, -0.2]] },
  desk: { Model: Desk, radius: 0.8, height: 1.0, light: true, surfaces: [[-0.02, 0.77, 0.08, 0.12], [0.3, 0.77, 0.1, -0.3]] },
  dresser: { Model: Dresser, radius: 0.55, height: 1.05, light: true, surfaces: [[-0.18, 0.85, 0, 0.1]] },
  'reading-table': { Model: more.ReadingTable, radius: 1.0, height: 1.2, light: true, surfaces: [[-0.55, 0.8, 0.05, 0.1], [-0.12, 0.8, 0.1, -0.15], [0.3, 0.8, 0.16, 0.25]] },
  'tea-table': { Model: more.TeaTable, radius: 0.55, height: 0.7, surfaces: [[0.18, 0.575, 0.12, 0.3], [-0.2, 0.575, 0.16, -0.25]] },
  'pastel-desk': { Model: more.PastelDesk, radius: 0.7, height: 1.0, surfaces: [[-0.3, 0.78, 0.05, 0.1], [0.05, 0.78, 0.08, -0.15]] },
  'stump-table': { Model: more.StumpTable, radius: 0.4, height: 0.55, surfaces: [[0, 0.51, 0, 0.4]] },
  'moon-table': { Model: more.MoonTable, radius: 0.4, height: 0.7, surfaces: [[0.04, 0.62, 0.02, -0.3]] },

  stool: { Model: Stool, radius: 0.24, height: 0.48 },
  chair: { Model: Chair, radius: 0.36, height: 1.03 },
  cushion: { Model: Cushion, radius: 0.34, height: 0.2 },
  armchair: { Model: Armchair, radius: 0.5, height: 0.95 },
  'rocking-chair': { Model: RockingChair, radius: 0.5, height: 1.35, interact: 'Give it a rock' },
  wingback: { Model: more.Wingback, radius: 0.55, height: 1.25 },
  sofa: { Model: more.Sofa, radius: 1.0, height: 0.9 },
  'plaid-armchair': { Model: PlaidArmchair, radius: 0.5, height: 0.95 },
  'pink-chair': { Model: more.PinkChair, radius: 0.35, height: 0.95 },
  pouf: { Model: more.Pouf, radius: 0.32, height: 0.36 },
  'stump-stool': { Model: more.StumpStool, radius: 0.26, height: 0.42 },
  'velvet-sofa': { Model: more.VelvetSofa, radius: 1.0, height: 0.9 },

  lantern: { Model: Lantern, radius: 0.22, height: 0.5, light: true },
  lamp: { Model: Lamp, radius: 0.28, height: 1.8, light: true },
  candelabra: { Model: Candelabra, radius: 0.24, height: 1.2, light: true },
  sconce: { Model: lights.Sconce, radius: 0.22, height: 2.0, light: true, wall: true },
  chandelier: { Model: lights.Chandelier, radius: 0.5, height: 3.0, light: true, hang: true },
  fireplace: { Model: lights.Fireplace, radius: 0.8, height: 1.5, light: true },
  'pumpkin-lantern': { Model: lights.PumpkinLantern, radius: 0.28, height: 0.45, light: true },
  'wood-stove': { Model: lights.WoodStove, radius: 0.45, height: 2.6, light: true },
  'fairy-lights': { Model: lights.FairyLights, radius: 0.9, height: 2.5, light: true, wall: true },
  'paper-lantern': { Model: lights.PaperLantern, radius: 0.35, height: 3.0, light: true, hang: true },
  'mushroom-lamp': { Model: lights.MushroomLamp, radius: 0.35, height: 1.0, light: true },
  'firefly-jar': { Model: lights.FireflyJar, radius: 0.2, height: 0.45, light: true },
  'orb-lamp': { Model: lights.OrbLamp, radius: 0.3, height: 1.7, light: true },
  'crystal-cluster': { Model: lights.CrystalCluster, radius: 0.35, height: 0.7, light: true },

  rug: { Model: Rug, radius: 1.3, height: 0.02 },
  'round-rug': { Model: RoundRug, radius: 0.98, height: 0.02 },
  'runner-rug': { Model: RunnerRug, radius: 1.25, height: 0.02 },
  'leaf-rug': { Model: more.LeafRug, radius: 1.0, height: 0.02 },
  'cloud-rug': { Model: more.CloudRug, radius: 1.1, height: 0.04 },
  'moss-rug': { Model: more.MossRug, radius: 1.1, height: 0.04 },
  'moon-rug': { Model: more.MoonRug, radius: 1.0, height: 0.03 },

  plant: { Model: Plant, radius: 0.3, height: 0.95 },
  monstera: { Model: more.Monstera, radius: 0.5, height: 1.2 },
  'indoor-tree': { Model: more.IndoorTree, radius: 0.8, height: 2.8 },
  'pebble-planter': { Model: more.PebblePlanter, radius: 0.75, height: 0.7 },
  'hanging-plant': { Model: more.HangingPlant, radius: 0.3, height: 3.0, hang: true },
  'maple-tree': { Model: more.MapleTree, radius: 0.6, height: 1.9 },
  'tulip-vase': { Model: more.TulipVase, radius: 0.2, height: 0.65 },

  vase: { Model: Vase, radius: 0.2, height: 0.7 },
  globe: { Model: Globe, radius: 0.32, height: 0.95, interact: 'Spin the globe' },
  clock: { Model: Clock, radius: 0.35, height: 1.96 },
  'book-stack': { Model: more.BookStack, radius: 0.3, height: 0.5 },
  'cat-bed': { Model: more.CatBed, radius: 0.4, height: 0.35, interact: 'Pet the cat' },
  'library-ladder': { Model: more.LibraryLadder, radius: 0.4, height: 2.7 },
  'picture-frames': { Model: more.PictureFrames, radius: 0.6, height: 1.9, wall: true },
  pumpkins: { Model: more.Pumpkins, radius: 0.5, height: 0.45 },
  'apple-crate': { Model: more.AppleCrate, radius: 0.4, height: 0.45 },
  'wall-shelf': { Model: more.WallShelf, radius: 0.5, height: 2.0, wall: true },
  birdcage: { Model: more.Birdcage, radius: 0.3, height: 1.7 },
  telescope: { Model: more.Telescope, radius: 0.45, height: 1.5, interact: 'Look at the stars' },
  'floating-books': { Model: more.FloatingBooks, radius: 0.5, height: 1.6 },

  'stairs-straight': { Model: more.StairsStraight, radius: 1.5, height: LOFT.y + 0.9, landing: [0, -1.45] },
  'stairs-spiral': { Model: more.StairsSpiral, radius: 0.85, height: LOFT.y + 0.9, landing: more.SPIRAL_LANDING },
}
