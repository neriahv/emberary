import { useLayoutEffect, useRef } from 'react'

// The Library Room's furniture, built from simple shapes.
//
// Each model stands on the floor at its own origin and faces +z (towards the
// open side of the room) at rotation 0, so RoomItem can place and turn any of
// them the same way. Light-giving models take `lit`: only a few lights may
// shine at once, so the scene decides which.

const WOOD = '#6b3a1f'
const WOOD_DARK = '#3d2213'
const BRASS = '#b8893d'
const PAPER = '#f3e7cf'

// Turn shadows on for every mesh inside, so each model does not have to.
export function Shadowed({ children, receiveOnly = false }) {
  const ref = useRef()
  useLayoutEffect(() => {
    ref.current.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = !receiveOnly
        object.receiveShadow = true
      }
    })
  })
  return <group ref={ref}>{children}</group>
}

function Candle({ position = [0, 0, 0], lit, intensity = 1.2 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 12]} />
        <meshStandardMaterial color="#f6ecd6" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.115, 0]}>
        <sphereGeometry args={[0.014, 10, 8]} />
        <meshBasicMaterial color="#ffd27a" />
      </mesh>
      {lit && <pointLight position={[0, 0.2, 0]} intensity={intensity} distance={3} decay={1.6} color="#ffb45e" />}
    </group>
  )
}

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

function Lamp({ lit }) {
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
        <meshStandardMaterial color="#f3d9a8" emissive="#f3c07a" emissiveIntensity={0.6} side={2} />
      </mesh>
      {lit && <pointLight position={[0, 1.5, 0]} intensity={2.4} distance={5} decay={1.4} color="#ffc48a" />}
    </>
  )
}

function Armchair() {
  const fabric = '#6d2f2a'
  return (
    <>
      {[[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.06, z]}>
          <cylinderGeometry args={[0.025, 0.02, 0.12, 8]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      <mesh position={[0, 0.24, 0.02]}>
        <boxGeometry args={[0.72, 0.24, 0.66]} />
        <meshStandardMaterial color={fabric} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.62, -0.28]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.72, 0.62, 0.14]} />
        <meshStandardMaterial color={fabric} roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.33, 0.44, 0.02]}>
          <boxGeometry args={[0.1, 0.22, 0.66]} />
          <meshStandardMaterial color={fabric} roughness={0.95} />
        </mesh>
      ))}
    </>
  )
}

// A round pedestal table with a small stack of books on it.
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
      {[['#2f5d6b', 0.61, 0.1], ['#e0d4b8', 0.65, -0.2], ['#7a2e3b', 0.69, 0.25]].map(([color, y, turn]) => (
        <mesh key={color} position={[0, y, 0]} rotation={[0, turn, 0]}>
          <boxGeometry args={[0.24, 0.04, 0.17]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
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

// The writing desk from the reference: a drawer, an open book, a candle and a
// little lamp.
function Desk({ lit }) {
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
      {/* the open book, two pages angled up from the spine */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.13, 0.785, 0.05]} rotation={[-Math.PI / 2, side * 0.12, 0]}>
          <planeGeometry args={[0.25, 0.34]} />
          <meshStandardMaterial color={PAPER} roughness={0.9} side={2} />
        </mesh>
      ))}
      <mesh position={[0.45, 0.79, -0.05]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.28]} />
        <meshStandardMaterial color="#7a2e3b" roughness={0.7} />
      </mesh>
      <group position={[-0.45, 0.77, -0.15]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.03, 16]} />
          <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
          <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} />
        </mesh>
        <Candle position={[0, 0.2, 0]} lit={lit} intensity={1.6} />
      </group>
    </>
  )
}

// A rocking chair: curved rockers, a slatted back and a cushion.
function RockingChair() {
  return (
    <>
      {/* Each rocker is the bottom slice of a big ring, standing on its edge. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.27, 0.52, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh rotation={[0, 0, (3 * Math.PI) / 2 - 0.55]}>
            <torusGeometry args={[0.5, 0.025, 8, 24, 1.1]} />
            <meshStandardMaterial color={WOOD} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <group rotation={[0, 0, 0]}>
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
        {/* arms */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.3, 0.66, 0]}>
            <boxGeometry args={[0.05, 0.04, 0.5]} />
            <meshStandardMaterial color={WOOD} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </>
  )
}

// A floor globe on a three-legged stand.
function Globe() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.12, 0.2, Math.sin((i * 2 * Math.PI) / 3) * 0.12]}
          rotation={[Math.sin((i * 2 * Math.PI) / 3) * 0.35, 0, -Math.cos((i * 2 * Math.PI) / 3) * 0.35]}>
          <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, 0]} rotation={[0, 0, 0.41]}>
        <sphereGeometry args={[0.24, 32, 24]} />
        <meshStandardMaterial color="#3e5f73" roughness={0.45} />
      </mesh>
      {/* continents, roughly */}
      <mesh position={[0, 0.66, 0]} rotation={[0.3, 0.8, 0.41]} scale={[1.01, 1.01, 1.01]}>
        <sphereGeometry args={[0.24, 16, 12, 0, 1.4, 0.5, 1.1]} />
        <meshStandardMaterial color="#c9a766" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[0, 0, 0.41]}>
        <torusGeometry args={[0.29, 0.012, 8, 48]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.06, 12]} />
        <meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  )
}

// A low chest of drawers with a candle in a glass on top.
function Dresser({ lit }) {
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
      <Candle position={[0.25, 0.86, 0]} lit={lit} intensity={1.1} />
    </>
  )
}

// A hexagonal floor lantern with a candle glowing inside.
function Lantern({ lit }) {
  return (
    <>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.16, 0.17, 0.06, 6]} />
        <meshStandardMaterial color="#2b2320" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.28, 6, 1, true]} />
        <meshStandardMaterial color="#ffd89a" emissive="#ffb45e" emissiveIntensity={lit ? 0.9 : 0.3} transparent opacity={0.75} side={2} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <coneGeometry args={[0.17, 0.12, 6]} />
        <meshStandardMaterial color="#2b2320" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <torusGeometry args={[0.04, 0.008, 6, 16]} />
        <meshStandardMaterial color="#2b2320" metalness={0.4} />
      </mesh>
      <Candle position={[0, 0.06, 0]} lit={lit} intensity={1.8} />
    </>
  )
}

// radius: how far the selection ring sits from the item's centre.
export const MODELS = {
  rug: { Model: Rug, radius: 1.3, flat: true },
  plant: { Model: Plant, radius: 0.3 },
  lamp: { Model: Lamp, radius: 0.28, light: true },
  armchair: { Model: Armchair, radius: 0.5 },
  'side-table': { Model: SideTable, radius: 0.3 },
  cushion: { Model: Cushion, radius: 0.34 },
  desk: { Model: Desk, radius: 0.8, light: true },
  'rocking-chair': { Model: RockingChair, radius: 0.5 },
  globe: { Model: Globe, radius: 0.32 },
  dresser: { Model: Dresser, radius: 0.55, light: true },
  lantern: { Model: Lantern, radius: 0.22, light: true },
}
