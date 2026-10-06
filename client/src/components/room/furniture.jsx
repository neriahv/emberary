import { useMemo, useRef } from 'react'
import { Quaternion, Shape, Vector3 } from 'three'
import { LOFT } from '../../api'
import {
  BRASS, Ball, Box, Cone, Cyl, FloorPatch, Glow, IRON, LEAF, Lit, PAPER, Torus, WOOD, WOOD_DARK, WOOD_LIGHT,
  useAlways, usePlay,
} from './parts.jsx'
import { checkTexture } from './textures.js'

// The furniture for every vibe beyond the original cozy study: tables, seats,
// rugs, plants, decorations and the staircases. Lights are in lights.jsx.
// Conventions as in models.jsx: standing on the floor at the origin, facing +z.

const BARK = '#6b4a2e'
const RING = '#d9b48a'

// ------------------------------------------------------------ tables

// A long library table with a green-shaded banker's lamp, as in the
// isometric library reference. Room for three books.
export function ReadingTable({ lit, shine }) {
  return (
    <>
      <Box s={[1.8, 0.06, 0.8]} position={[0, 0.77, 0]} c={WOOD} r={0.5} />
      <Box s={[1.6, 0.1, 0.66]} position={[0, 0.69, 0]} c={WOOD_DARK} r={0.6} />
      {[[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.04, 0.032, 0.74, 10]} position={[x, 0.37, z]} c={WOOD_DARK} r={0.6} />
      ))}
      <group position={[0.62, 0.8, -0.22]}>
        <Cyl s={[0.08, 0.09, 0.03, 16]} position={[0, 0.015, 0]} c={BRASS} m={0.7} r={0.3} />
        <Cyl s={[0.012, 0.012, 0.3, 8]} position={[0, 0.17, 0]} c={BRASS} m={0.7} r={0.3} />
        <Lit geometry={Lit.Cyl} s={[0.075, 0.075, 0.34, 16, 1, false, 0, Math.PI]} rotation={[0, 0, Math.PI / 2]}
          position={[0, 0.33, 0]} lit={lit} c="#1f5c3a" glow="#4fd08a" ei={0.7} />
        <Lit s={[0.03, 10, 8]} position={[0, 0.3, 0]} lit={lit} c="#fff4d6" glow="#ffd27a" ei={2} />
      </group>
      <Glow lit={lit} shine={shine} position={[0.62, 1.0, -0.1]} intensity={1.6} distance={3.5} color="#ffd9a0" />
    </>
  )
}

// A little round table under a gingham cloth, with a teapot.
export function TeaTable() {
  const cloth = checkTexture('#f2ece0', '#c23b3b', 4)
  return (
    <>
      <Cyl s={[0.22, 0.25, 0.04, 24]} position={[0, 0.02, 0]} c={WOOD_DARK} />
      <Cyl s={[0.06, 0.08, 0.5, 12]} position={[0, 0.27, 0]} c={WOOD_DARK} />
      <Cyl s={[0.45, 0.45, 0.04, 32]} position={[0, 0.54, 0]} c={WOOD} />
      <Cyl s={[0.47, 0.47, 0.02, 32]} position={[0, 0.565, 0]} c="#ffffff" map={cloth} r={1} />
      <Cyl s={[0.48, 0.5, 0.18, 32, 1, true]} position={[0, 0.47, 0]} c="#ffffff" map={cloth} r={1} side={2} />
      <group position={[-0.02, 0.575, -0.22]}>
        <Ball s={[0.08, 16, 12]} position={[0, 0.065, 0]} scale={[1, 0.8, 1]} c="#f4dfe6" r={0.3} />
        <Ball s={[0.025, 8, 6]} position={[0, 0.13, 0]} c="#f4dfe6" r={0.3} />
        <Cone s={[0.022, 0.1, 8]} position={[0.1, 0.08, 0]} rotation={[0, 0, -1.1]} c="#f4dfe6" r={0.3} />
        <Torus s={[0.04, 0.01, 6, 16]} position={[-0.085, 0.07, 0]} c="#f4dfe6" r={0.3} />
      </group>
    </>
  )
}

// The cream desk from the pastel reference: drawers on one side, a tablet on
// a stand and a pink mug.
export function PastelDesk() {
  return (
    <>
      <Box s={[1.2, 0.05, 0.6]} position={[0, 0.755, 0]} c="#f6eee2" r={0.5} />
      <Box s={[0.4, 0.7, 0.55]} position={[0.38, 0.38, 0]} c="#f1e6d6" r={0.6} />
      {[0.22, 0.52].map((y) => (
        <group key={y} position={[0.38, y, 0.28]}>
          <Box s={[0.34, 0.24, 0.02]} c="#efdcc8" r={0.6} />
          <Ball s={[0.02, 8, 6]} position={[0, 0, 0.02]} c="#f08aa6" r={0.4} />
        </group>
      ))}
      {[-0.25, 0.25].map((z) => (
        <Box key={z} s={[0.05, 0.73, 0.05]} position={[-0.55, 0.365, z]} c={WOOD_LIGHT} r={0.6} />
      ))}
      <group position={[0.3, 0.78, -0.18]} rotation={[-0.3, -0.2, 0]}>
        <Box s={[0.36, 0.24, 0.02]} position={[0, 0.14, 0]} c="#e8e2dc" r={0.4} />
        <Box s={[0.32, 0.2, 0.005]} position={[0, 0.14, 0.012]} c="#2d3540" r={0.2} />
      </group>
      <group position={[0.48, 0.78, 0.12]}>
        <Cyl s={[0.04, 0.04, 0.09, 16]} position={[0, 0.045, 0]} c="#f08aa6" r={0.4} />
        <Torus s={[0.025, 0.008, 6, 12]} position={[0.045, 0.045, 0]} c="#f08aa6" r={0.4} />
      </group>
    </>
  )
}

// A sawn tree stump with its rings on top, and two toadstools at its foot.
export function StumpTable() {
  return (
    <>
      <Cyl s={[0.3, 0.36, 0.5, 20]} position={[0, 0.25, 0]} c={BARK} r={1} />
      <Cyl s={[0.29, 0.29, 0.012, 28]} position={[0, 0.504, 0]} c={RING} r={0.8} />
      {[0.08, 0.15, 0.22].map((r) => (
        <Torus key={r} s={[r, 0.005, 6, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.511, 0]} c="#b98a5a" />
      ))}
      {[[0.3, 0.2, 0.06], [0.36, -0.1, 0.045]].map(([x, z, r]) => (
        <group key={x} position={[x, 0, z]}>
          <Cyl s={[r * 0.35, r * 0.4, r * 1.6, 8]} position={[0, r * 0.8, 0]} c="#f3e7cf" />
          <Ball s={[r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, r * 1.5, 0]} c="#c23b2a" r={0.5} />
        </group>
      ))}
    </>
  )
}

// A midnight-blue round table with a gilt crescent set into its top.
export function MoonTable() {
  return (
    <>
      <Cyl s={[0.2, 0.22, 0.03, 24]} position={[0, 0.015, 0]} c="#c9a24e" m={0.6} r={0.35} />
      <Cyl s={[0.025, 0.025, 0.56, 10]} position={[0, 0.3, 0]} c="#c9a24e" m={0.6} r={0.35} />
      <Cyl s={[0.32, 0.32, 0.035, 40]} position={[0, 0.6, 0]} c="#1f2547" r={0.35} />
      <Torus s={[0.24, 0.018, 6, 32, Math.PI * 1.15]} rotation={[Math.PI / 2, 0, 2.2]} position={[0, 0.619, 0]}
        c="#e0bd62" m={0.6} r={0.3} />
    </>
  )
}

// ------------------------------------------------------------ seating

// The red wingback chairs by the fire in the green-walled reference.
export function Wingback({ fabric = '#9b2a2a' }) {
  return (
    <>
      {[[-0.32, -0.28], [0.32, -0.28], [-0.32, 0.3], [0.32, 0.3]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.03, 0.02, 0.12, 8]} position={[x, 0.06, z]} c={WOOD_DARK} />
      ))}
      <Box s={[0.8, 0.3, 0.75]} position={[0, 0.27, 0]} c={fabric} r={0.85} />
      <Box s={[0.6, 0.1, 0.6]} position={[0, 0.47, 0.06]} c={fabric} r={0.85} />
      <Box s={[0.8, 0.9, 0.16]} position={[0, 0.85, -0.3]} rotation={[-0.08, 0, 0]} c={fabric} r={0.85} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box s={[0.12, 0.45, 0.36]} position={[side * 0.36, 0.98, -0.16]} rotation={[0, side * 0.3, 0]} c={fabric} r={0.85} />
          <Cyl s={[0.08, 0.08, 0.68, 16]} rotation={[Math.PI / 2, 0, 0]} position={[side * 0.36, 0.52, 0.04]} c={fabric} r={0.85} />
        </group>
      ))}
    </>
  )
}

// A buttoned sofa with rolled arms and two cushions.
export function Sofa({ fabric = '#7a3324', pillow = '#e0b77a' }) {
  return (
    <>
      {[[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.035, 0.025, 0.1, 8]} position={[x, 0.05, z]} c={WOOD_DARK} />
      ))}
      <Box s={[1.8, 0.35, 0.85]} position={[0, 0.27, 0]} c={fabric} r={0.85} />
      {[-0.55, 0, 0.55].map((x) => (
        <Box key={x} s={[0.54, 0.12, 0.62]} position={[x, 0.5, 0.08]} c={fabric} r={0.85} />
      ))}
      <Box s={[1.8, 0.48, 0.2]} position={[0, 0.66, -0.33]} c={fabric} r={0.85} />
      {[-0.5, -0.17, 0.17, 0.5].flatMap((x) =>
        [0.58, 0.76].map((y) => <Ball key={`${x}${y}`} s={[0.018, 6, 6]} position={[x, y, -0.225]} c="#2a120c" />)
      )}
      {[-1, 1].map((side) => (
        <Cyl key={side} s={[0.13, 0.13, 0.85, 16]} rotation={[Math.PI / 2, 0, 0]} position={[side * 0.86, 0.52, 0]} c={fabric} r={0.85} />
      ))}
      {[-1, 1].map((side) => (
        <Box key={side} s={[0.36, 0.32, 0.1]} position={[side * 0.52, 0.7, -0.17]} rotation={[-0.2, side * 0.25, side * 0.08]} c={pillow} r={1} />
      ))}
    </>
  )
}

export const VelvetSofa = () => <Sofa fabric="#5b3a7a" pillow="#c77dff" />

// The pink chair at the pastel desk.
export function PinkChair() {
  return (
    <>
      {[[-0.18, -0.16, 1], [0.18, -0.16, -1], [-0.18, 0.16, 1], [0.18, 0.16, -1]].map(([x, z, lean]) => (
        <Box key={`${x}${z}`} s={[0.035, 0.44, 0.035]} position={[x, 0.22, z]} rotation={[z * 0.4, 0, lean * 0.08]} c={WOOD_LIGHT} />
      ))}
      <Box s={[0.46, 0.1, 0.44]} position={[0, 0.47, 0]} c="#e98aa6" r={0.9} />
      <Box s={[0.46, 0.38, 0.09]} position={[0, 0.78, -0.2]} rotation={[-0.12, 0, 0]} c="#e98aa6" r={0.9} />
    </>
  )
}

export function Pouf() {
  return (
    <>
      <Cyl s={[0.28, 0.28, 0.28, 24]} position={[0, 0.15, 0]} c="#a8dcc8" r={1} />
      <Torus s={[0.24, 0.05, 10, 28]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.29, 0]} c="#a8dcc8" r={1} />
      <Cyl s={[0.25, 0.25, 0.04, 24]} position={[0, 0.31, 0]} c="#b7e4d2" r={1} />
    </>
  )
}

export function StumpStool() {
  return (
    <>
      <Cyl s={[0.2, 0.23, 0.4, 16]} position={[0, 0.2, 0]} c={BARK} r={1} />
      <Cyl s={[0.19, 0.19, 0.01, 20]} position={[0, 0.403, 0]} c={RING} r={0.8} />
      <Torus s={[0.1, 0.005, 6, 24]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.41, 0]} c="#b98a5a" />
    </>
  )
}

// ------------------------------------------------------------ rugs

function mapleLeaf(size) {
  const leaf = new Shape()
  const points = 11
  for (let i = 0; i <= points * 2; i++) {
    const a = Math.PI / 2 + (i / (points * 2)) * Math.PI * 2
    const lobe = i % 2 === 0 ? 1 - Math.abs(Math.sin(a - Math.PI / 2)) * 0.25 : 0.45
    const r = size * (i === points ? 0.2 : lobe)
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) leaf.moveTo(x, y)
    else leaf.lineTo(x, y)
  }
  return leaf
}

export function LeafRug() {
  const leaf = useMemo(() => mapleLeaf(0.62), [])
  return (
    <>
      <FloorPatch s={0.95} round c="#c8743a" />
      <FloorPatch s={0.85} round c="#e09a52" y={0.008} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <shapeGeometry args={[leaf]} />
        <meshStandardMaterial color="#9c3f1e" roughness={1} />
      </mesh>
    </>
  )
}

// Puffs of flattened spheres, like the fluffy rugs in the pastel references.
function Puffs({ puffs, height = 0.05 }) {
  return puffs.map(([x, z, r, c]) => (
    <Ball key={`${x}${z}`} s={[r, 24, 12]} position={[x, 0.004, z]} scale={[1, height / r, 1]} c={c} r={1} />
  ))
}

export function CloudRug() {
  return (
    <Puffs
      puffs={[
        [-0.55, 0.05, 0.42, '#fbf3f7'], [0, -0.12, 0.5, '#fbf3f7'], [0.55, 0.02, 0.44, '#fbf3f7'],
        [-0.25, 0.3, 0.38, '#fbf3f7'], [0.3, 0.3, 0.36, '#fbf3f7'], [0, 0.1, 0.3, '#f6dbe6'],
      ]}
    />
  )
}

export function MossRug() {
  return (
    <>
      <Puffs
        puffs={[
          [-0.5, 0, 0.45, '#5f8a3a'], [0.05, -0.15, 0.5, '#4f7a32'], [0.55, 0.05, 0.42, '#6d9a44'],
          [-0.15, 0.32, 0.4, '#77a04a'], [0.35, 0.35, 0.3, '#5f8a3a'],
        ]}
        height={0.06}
      />
      {[[-0.4, 0.2, '#f7e1a0'], [0.2, -0.3, '#f4f4f4'], [0.5, 0.25, '#e8a0c0'], [-0.1, 0.05, '#f7e1a0']].map(([x, z, c]) => (
        <Ball key={`${x}${z}`} s={[0.03, 8, 6]} position={[x, 0.07, z]} c={c} r={0.8} />
      ))}
    </>
  )
}

export function MoonRug() {
  return (
    <>
      <Ball s={[0.95, 40, 12]} position={[0, 0.004, 0]} scale={[1, 0.03, 1]} c="#8e4fc4" r={1} />
      <FloorPatch s={0.7} round c="#a66be0" y={0.033} />
    </>
  )
}

// ------------------------------------------------------------ plants

function Pot({ r = 0.2, h = 0.35, c = '#b5653d' }) {
  return (
    <>
      <Cyl s={[r, r * 0.8, h, 24]} position={[0, h / 2, 0]} c={c} r={0.8} />
      <Cyl s={[r * 0.92, r * 0.92, 0.02, 20]} position={[0, h - 0.02, 0]} c="#3a2618" r={1} />
    </>
  )
}

// A leaf on a stem, tilted out from the pot towards `angle`.
function Leaf({ angle, height, reach, size = 0.18, c = '#2f6b3a' }) {
  return (
    <group rotation={[0, angle, 0]}>
      <Cyl s={[0.008, 0.01, height, 6]} position={[0, height / 2, reach / 2]} rotation={[reach / height, 0, 0]} c="#4f7a32" />
      <Ball s={[size, 16, 10]} position={[0, height, reach]} rotation={[0.5, 0, 0]} scale={[1, 0.08, 1.35]} c={c} r={0.8} />
    </group>
  )
}

export function Monstera() {
  return (
    <>
      <Pot r={0.2} h={0.36} c="#ebe4d8" />
      {Array.from({ length: 7 }, (_, i) => (
        <Leaf key={i} angle={(i * 2 * Math.PI) / 7 + 0.3} height={0.6 + (i % 3) * 0.2} reach={0.22 + (i % 2) * 0.12} size={0.2} />
      ))}
    </>
  )
}

export function IndoorTree() {
  return (
    <>
      <Box s={[0.6, 0.5, 0.6]} position={[0, 0.25, 0]} c="#8a5a3a" r={0.8} />
      <Box s={[0.66, 0.06, 0.66]} position={[0, 0.5, 0]} c={WOOD_DARK} />
      <Cyl s={[0.07, 0.11, 1.0, 10]} position={[0.03, 1.0, 0]} rotation={[0, 0, -0.08]} c={BARK} r={1} />
      <Cyl s={[0.05, 0.07, 0.9, 10]} position={[0.02, 1.85, 0.02]} rotation={[0.06, 0, 0.1]} c={BARK} r={1} />
      {[[0, 2.35, 0, 0.55, '#3f6b3a'], [0.4, 2.1, 0.12, 0.42, '#4f7a32'], [-0.36, 2.15, -0.1, 0.44, '#355e30'],
        [0.12, 2.65, -0.16, 0.38, '#4f8a45'], [-0.1, 2.0, 0.35, 0.32, '#4f7a32']].map(([x, y, z, r, c]) => (
        <Ball key={`${x}${y}`} s={[r, 18, 14]} position={[x, y, z]} c={c} r={0.9} />
      ))}
    </>
  )
}

// A low bed of pebbles with a plant at one end, like the one by the door in
// the pastel reference.
export function PebblePlanter() {
  const pebbles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const r = (n) => {
          const x = Math.sin((i + 1) * n * 12.9898) * 43758.5453
          return x - Math.floor(x)
        }
        return [-0.55 + r(1) * 0.85, 0.13, -0.14 + r(2) * 0.28, 0.035 + r(3) * 0.03, 110 + Math.round(r(4) * 60)]
      }),
    []
  )
  return (
    <>
      <Box s={[1.4, 0.12, 0.45]} position={[0, 0.06, 0]} c="#6a4a32" r={0.8} />
      <Box s={[1.32, 0.02, 0.37]} position={[0, 0.115, 0]} c="#3a2a1e" />
      {pebbles.map(([x, y, z, r, g]) => (
        <Ball key={`${x}${z}`} s={[r, 10, 8]} position={[x, y, z]} scale={[1, 0.6, 1]} c={`rgb(${g},${g},${g + 6})`} r={0.6} />
      ))}
      <group position={[0.48, 0.12, 0]}>
        <Pot r={0.13} h={0.22} c="#d9cfc0" />
        {Array.from({ length: 5 }, (_, i) => (
          <Leaf key={i} angle={(i * 2 * Math.PI) / 5} height={0.32 + (i % 2) * 0.1} reach={0.14} size={0.11} c="#4f8a45" />
        ))}
      </group>
    </>
  )
}

// A pot in a macramé hanger, hung from above, with vines trailing down.
export function HangingPlant({ ceiling = 3 }) {
  const y = Math.min(ceiling - 0.8, 2.3)
  return (
    <>
      <Cyl s={[0.006, 0.006, ceiling - y - 0.45, 4]} position={[0, (ceiling + y + 0.45) / 2, 0]} c="#e8dcc0" />
      {[0, 1, 2].map((i) => {
        const a = (i * 2 * Math.PI) / 3
        return (
          <Cyl key={i} s={[0.005, 0.005, 0.5, 4]} position={[Math.sin(a) * 0.07, y + 0.22, Math.cos(a) * 0.07]}
            rotation={[Math.cos(a) * 0.28, 0, -Math.sin(a) * 0.28]} c="#e8dcc0" />
        )
      })}
      <group position={[0, y - 0.1, 0]}>
        <Cyl s={[0.15, 0.1, 0.18, 16]} c="#c96f43" r={0.8} />
        <Ball s={[0.15, 12, 10]} position={[0, 0.1, 0]} scale={[1, 0.5, 1]} c={LEAF} r={0.9} />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i * 2 * Math.PI) / 5 + 0.4
          return Array.from({ length: 3 + (i % 3) }, (_, k) => (
            <Ball key={`${i}${k}`} s={[0.045, 8, 6]} position={[Math.sin(a) * 0.15, 0.04 - k * 0.13, Math.cos(a) * 0.15]}
              scale={[1, 0.6, 1]} c={k % 2 ? '#4f8a45' : LEAF} r={0.9} />
          ))
        })}
      </group>
    </>
  )
}

export function MapleTree() {
  return (
    <>
      <Pot r={0.24} h={0.4} c="#7a4a2a" />
      <Cyl s={[0.035, 0.06, 1.0, 8]} position={[0, 0.9, 0]} c={BARK} r={1} />
      {[[0, 1.5, 0, 0.42, '#d4572a'], [0.28, 1.35, 0.1, 0.3, '#e8892f'], [-0.24, 1.4, -0.06, 0.32, '#c23b22'],
        [0.06, 1.78, -0.1, 0.28, '#f0a83a'], [-0.08, 1.3, 0.25, 0.24, '#e06a2a']].map(([x, y, z, r, c]) => (
        <Ball key={`${x}${y}`} s={[r, 16, 12]} position={[x, y, z]} c={c} r={0.9} />
      ))}
      {[[0.4, 0.2, '#d4572a'], [-0.35, 0.3, '#f0a83a'], [0.15, -0.42, '#c23b22']].map(([x, z, c]) => (
        <Ball key={`${x}${z}`} s={[0.05, 8, 6]} position={[x, 0.005, z]} scale={[1, 0.1, 0.7]} c={c} r={1} />
      ))}
    </>
  )
}

export function TulipVase() {
  const tulips = [[0, 0.56, 0, '#f49ac0'], [0.06, 0.5, 0.03, '#ffd56a'], [-0.06, 0.52, 0.02, '#ffb3a0'],
    [0.02, 0.48, -0.06, '#f49ac0'], [-0.03, 0.46, 0.06, '#fff2f6']]
  return (
    <>
      <Cyl s={[0.07, 0.1, 0.26, 20]} position={[0, 0.13, 0]} c="#f4eef8" r={0.3} />
      {tulips.map(([x, y, z, c]) => (
        <group key={`${x}${z}`}>
          <Cyl s={[0.006, 0.006, y - 0.24, 6]} position={[x / 2, (y + 0.24) / 2, z / 2]} rotation={[z * 2, 0, -x * 2]} c="#4f8a45" />
          <Ball s={[0.04, 12, 10]} position={[x, y, z]} scale={[1, 1.35, 1]} c={c} r={0.7} />
        </group>
      ))}
    </>
  )
}

// ------------------------------------------------------------ decorations

export function BookStack() {
  const books = [['#7a2e3b', 0.32, 0.1], ['#2f5d6b', 0.3, -0.15], ['#c9a24e', 0.28, 0.25], ['#3a4a2c', 0.3, -0.05], ['#e0d4b8', 0.26, 0.3]]
  return (
    <>
      {books.map(([c, w, turn], i) => (
        <Box key={c} s={[w, 0.065, 0.22]} position={[0, 0.033 + i * 0.066, 0]} rotation={[0, turn, 0]} c={c} r={0.7} />
      ))}
      <Box s={[0.05, 0.3, 0.22]} position={[0.24, 0.15, 0.02]} rotation={[0, 0, -0.28]} c="#5b2a1e" r={0.7} />
      <Box s={[0.045, 0.26, 0.2]} position={[0.29, 0.13, 0.02]} rotation={[0, 0, -0.32]} c="#294056" r={0.7} />
    </>
  )
}

// A ginger cat asleep in its basket. Click it and it stirs, purrs, and a heart
// floats up.
export function CatBed({ poke }) {
  const body = useRef()
  const head = useRef()
  const heart = useRef()
  usePlay(poke, 1.8, (t) => {
    body.current.scale.y = 1 + Math.sin(t * Math.PI * 9) * 0.06 * (1 - t)
    head.current.rotation.z = Math.sin(t * Math.PI) * 0.35
    heart.current.visible = t < 1
    heart.current.position.y = 0.4 + t * 0.5
    heart.current.scale.setScalar(Math.sin(t * Math.PI) * 1.1)
  })
  return (
    <>
      <Cyl s={[0.27, 0.27, 0.05, 28]} position={[0, 0.025, 0]} c="#e6d3b3" r={1} />
      <Torus s={[0.26, 0.08, 12, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} c="#c9a27a" r={1} />
      <group ref={body} position={[0, 0.07, 0]}>
        <Ball s={[0.17, 20, 14]} position={[0, 0.08, 0]} scale={[1.25, 0.6, 1]} c="#e08a3a" r={0.9} />
        <Torus s={[0.15, 0.03, 8, 20, Math.PI * 0.9]} rotation={[Math.PI / 2, 0, 0.3]} position={[0, 0.07, 0]} c="#c86f2a" r={0.9} />
      </group>
      <group ref={head} position={[0.17, 0.16, 0.08]}>
        <Ball s={[0.085, 16, 12]} c="#e08a3a" r={0.9} />
        {[-1, 1].map((side) => (
          <Cone key={side} s={[0.03, 0.06, 4]} position={[0.02, 0.07, side * 0.045]} c="#c86f2a" />
        ))}
        {[-1, 1].map((side) => (
          <Box key={side} s={[0.004, 0.004, 0.025]} position={[0.08, 0.01, side * 0.03]} c="#2a1a10" />
        ))}
      </group>
      <group ref={heart} visible={false} position={[0.15, 0.4, 0.05]}>
        <Ball s={[0.035, 10, 8]} position={[-0.025, 0.02, 0]} c="#ff6f91" e="#ff6f91" ei={0.5} />
        <Ball s={[0.035, 10, 8]} position={[0.025, 0.02, 0]} c="#ff6f91" e="#ff6f91" ei={0.5} />
        <Cone s={[0.055, 0.07, 12]} position={[0, -0.025, 0]} rotation={[0, 0, Math.PI]} c="#ff6f91" e="#ff6f91" ei={0.5} />
      </group>
    </>
  )
}

// A rolling ladder leaning back against the wall or a bookcase.
export function LibraryLadder() {
  return (
    <group position={[0, 0, 0.32]} rotation={[-0.24, 0, 0]}>
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          <Box s={[0.05, 2.75, 0.06]} position={[x, 1.375, 0]} c={WOOD} r={0.6} />
          <Cyl s={[0.03, 0.03, 0.03, 10]} rotation={[0, 0, Math.PI / 2]} position={[x, 0.03, 0.02]} c={IRON} m={0.5} />
        </group>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i} s={[0.42, 0.035, 0.05]} position={[0, 0.3 + i * 0.32, 0]} c={WOOD_DARK} r={0.6} />
      ))}
      {[-0.22, 0.22].map((x) => (
        <Torus key={x} s={[0.04, 0.01, 6, 12, Math.PI]} position={[x, 2.75, -0.03]} rotation={[0, Math.PI / 2, 0]} c={BRASS} m={0.7} r={0.3} />
      ))}
    </group>
  )
}

// Three little framed paintings for a wall: a sunset, a meadow, a night sky.
export function PictureFrames() {
  const pictures = [
    { x: -0.42, y: 1.65, w: 0.36, h: 0.46, sky: '#f4b183', land: '#c8743a', sun: '#fff1c4' },
    { x: 0.08, y: 1.78, w: 0.44, h: 0.34, sky: '#a9d3e8', land: '#6d9a44', sun: '#ffffff' },
    { x: 0.42, y: 1.42, w: 0.26, h: 0.32, sky: '#2b2f66', land: '#3a2a4a', sun: '#fff4d0' },
  ]
  return pictures.map(({ x, y, w, h, sky, land, sun }) => (
    <group key={x} position={[x, y, -0.28]}>
      <Box s={[w + 0.06, h + 0.06, 0.03]} c="#b8893d" m={0.4} r={0.4} />
      <Box s={[w, h, 0.005]} position={[0, 0, 0.016]} c={sky} r={0.9} />
      <Box s={[w, h * 0.35, 0.005]} position={[0, -h * 0.325, 0.018]} c={land} r={0.9} />
      <Ball s={[w * 0.12, 12, 8]} position={[w * 0.2, h * 0.2, 0.02]} scale={[1, 1, 0.1]} c={sun} r={0.7} />
    </group>
  ))
}

function Pumpkin({ r, c, position }) {
  return (
    <group position={position}>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 7
        return (
          <Ball key={i} s={[r * 0.62, 14, 10]} position={[Math.sin(a) * r * 0.42, r * 0.72, Math.cos(a) * r * 0.42]}
            scale={[0.8, 1, 0.8]} c={c} r={0.7} />
        )
      })}
      <Cyl s={[r * 0.08, r * 0.12, r * 0.4, 6]} position={[0, r * 1.45, 0]} rotation={[0, 0, 0.2]} c="#5a4a22" />
    </group>
  )
}

export function Pumpkins() {
  return (
    <>
      <Pumpkin r={0.22} c="#e8792b" position={[-0.12, 0, -0.05]} />
      <Pumpkin r={0.15} c="#f0a03a" position={[0.25, 0, 0.1]} />
      <Pumpkin r={0.12} c="#e6dccb" position={[0.02, 0, 0.28]} />
      <Ball s={[0.12, 10, 6]} position={[0.3, 0.01, -0.2]} scale={[1, 0.08, 0.6]} rotation={[0, 0.6, 0]} c="#4f7a32" />
    </>
  )
}

export function AppleCrate() {
  const apples = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => [
        -0.18 + (i % 4) * 0.12 + ((i * 7) % 3) * 0.01,
        0.36 + Math.floor(i / 8) * 0.06,
        -0.12 + (Math.floor(i / 4) % 2) * 0.13 + (i > 7 ? 0.06 : 0),
        i % 5 === 0 ? '#9cbf3a' : '#c0392b',
      ]),
    []
  )
  return (
    <>
      <Box s={[0.6, 0.03, 0.4]} position={[0, 0.03, 0]} c="#b8743a" />
      {[0.1, 0.24].map((y) =>
        [-1, 1].map((side) => (
          <group key={`${y}${side}`}>
            <Box s={[0.6, 0.08, 0.02]} position={[0, y, side * 0.19]} c="#b8743a" />
            <Box s={[0.02, 0.08, 0.4]} position={[side * 0.29, y, 0]} c="#b8743a" />
          </group>
        ))
      )}
      <Box s={[0.54, 0.2, 0.34]} position={[0, 0.2, 0]} c="#7a3a1e" />
      {apples.map(([x, y, z, c]) => (
        <Ball key={`${x}${y}${z}`} s={[0.055, 12, 10]} position={[x, y, z]} c={c} r={0.4} />
      ))}
      <Ball s={[0.055, 12, 10]} position={[0.38, 0.055, 0.15]} c="#c0392b" r={0.4} />
    </>
  )
}

// A little shelf for a wall, with a trailing plant, books and a clock.
export function WallShelf() {
  return (
    <>
      <Box s={[0.9, 0.04, 0.24]} position={[0, 1.6, -0.18]} c="#f6eee2" r={0.5} />
      {[-0.35, 0.35].map((x) => (
        <Box key={x} s={[0.03, 0.12, 0.18]} position={[x, 1.52, -0.21]} c="#e8dcc8" />
      ))}
      <group position={[-0.3, 1.62, -0.18]}>
        <Cyl s={[0.07, 0.055, 0.1, 14]} position={[0, 0.05, 0]} c="#f4c7d0" r={0.6} />
        {[0, 1, 2, 3].map((k) => (
          <Ball key={k} s={[0.035, 8, 6]} position={[0.03 * (k % 2 ? 1 : -1), 0.08 - k * 0.1, 0.06]} c={LEAF} r={0.9} />
        ))}
        <Ball s={[0.07, 10, 8]} position={[0, 0.12, 0]} c="#4f8a45" r={0.9} />
      </group>
      {['#a8dcc8', '#f4c7d0', '#ffe1a8', '#c9b8f0'].map((c, i) => (
        <Box key={c} s={[0.04, 0.2 - (i % 2) * 0.03, 0.14]} position={[-0.05 + i * 0.05, 1.72 - (i % 2) * 0.015, -0.2]} c={c} r={0.7} />
      ))}
      <group position={[0.28, 1.7, -0.2]}>
        <Cyl s={[0.08, 0.08, 0.04, 20]} rotation={[Math.PI / 2, 0, 0]} c="#f08aa6" r={0.5} />
        <Cyl s={[0.065, 0.065, 0.01, 20]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.022]} c={PAPER} />
      </group>
    </>
  )
}

// A brass dome birdcage on a stand, with a canary inside.
export function Birdcage() {
  const y = 1.15
  return (
    <>
      {[0, 1, 2].map((i) => {
        const a = (i * 2 * Math.PI) / 3
        return (
          <Cyl key={i} s={[0.012, 0.012, 0.3, 6]} position={[Math.sin(a) * 0.1, 0.1, Math.cos(a) * 0.1]}
            rotation={[Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9]} c={BRASS} m={0.7} r={0.3} />
        )
      })}
      <Cyl s={[0.015, 0.015, 1.6, 8]} position={[0, 0.8, 0]} c={BRASS} m={0.7} r={0.3} />
      <Box s={[0.32, 0.015, 0.015]} position={[0.16, 1.6, 0]} c={BRASS} m={0.7} r={0.3} />
      <group position={[0.3, y, 0]}>
        <Cyl s={[0.18, 0.18, 0.025, 24]} c={BRASS} m={0.7} r={0.3} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 2 * Math.PI) / 12
          return <Cyl key={i} s={[0.004, 0.004, 0.25, 4]} position={[Math.sin(a) * 0.17, 0.125, Math.cos(a) * 0.17]} c={BRASS} m={0.7} r={0.3} />
        })}
        {[0, 1, 2].map((i) => (
          <Torus key={i} s={[0.17, 0.005, 4, 20, Math.PI]} position={[0, 0.25, 0]} rotation={[0, (i * Math.PI) / 3, 0]} c={BRASS} m={0.7} r={0.3} />
        ))}
        <Cyl s={[0.003, 0.003, 0.2, 4]} position={[0, 0.33, 0]} c={BRASS} />
        <Box s={[0.2, 0.01, 0.01]} position={[0, 0.1, 0]} c={WOOD} />
        <Ball s={[0.04, 10, 8]} position={[0, 0.145, 0]} scale={[1.3, 1, 1]} c="#f6d04d" r={0.6} />
        <Ball s={[0.027, 10, 8]} position={[0.045, 0.18, 0]} c="#f6d04d" r={0.6} />
        <Cone s={[0.01, 0.03, 6]} position={[0.075, 0.18, 0]} rotation={[0, 0, -Math.PI / 2]} c="#e8892f" />
      </group>
    </>
  )
}

// A brass telescope on a tripod. Click it and it swings round to another
// part of the sky.
export function Telescope({ poke }) {
  const mount = useRef()
  const aim = useRef({ from: 0.6, to: 0.6 })
  usePlay(poke, 1.4, (t) => {
    if (t === 0 || aim.current.to === aim.current.from) {
      aim.current.from = mount.current.rotation.y
      aim.current.to = aim.current.from + 0.9 + Math.random() * 1.6
    }
    const ease = 1 - (1 - t) ** 3
    mount.current.rotation.y = aim.current.from + (aim.current.to - aim.current.from) * ease
    if (t >= 1) aim.current.from = aim.current.to
  })
  return (
    <>
      {[0, 1, 2].map((i) => {
        const a = (i * 2 * Math.PI) / 3
        return (
          <Cyl key={i} s={[0.015, 0.02, 1.0, 6]} position={[Math.sin(a) * 0.2, 0.46, Math.cos(a) * 0.2]}
            rotation={[Math.cos(a) * 0.42, 0, -Math.sin(a) * 0.42]} c={WOOD} r={0.6} />
        )
      })}
      <group ref={mount} position={[0, 0.95, 0]} rotation={[0, 0.6, 0]}>
        <Ball s={[0.05, 10, 8]} c={BRASS} m={0.7} r={0.3} />
        <group rotation={[-0.6, 0, 0]}>
          <Cyl s={[0.055, 0.085, 0.9, 16]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.15]} c="#22305a" r={0.4} />
          <Torus s={[0.07, 0.012, 6, 20]} position={[0, 0, 0.4]} c={BRASS} m={0.7} r={0.3} />
          <Torus s={[0.088, 0.012, 6, 20]} position={[0, 0, 0.58]} c={BRASS} m={0.7} r={0.3} />
          <Cyl s={[0.02, 0.025, 0.12, 10]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.35]} c={BRASS} m={0.7} r={0.3} />
        </group>
      </group>
    </>
  )
}

// Spellbooks drifting open in the air above a faint circle of light, as in
// the reference with the round window. They never stop moving.
export function FloatingBooks({ sample }) {
  const books = useRef([])
  useAlways((seconds) => {
    books.current.forEach((book, i) => {
      if (!book) return
      book.position.y = 0.95 + i * 0.25 + Math.sin(seconds * 1.3 + i * 2.1) * 0.06
      book.rotation.y = 0.4 + i * 2.2 + Math.sin(seconds * 0.4 + i) * 0.25
    })
  }, !sample)
  const covers = ['#3a6b8a', '#7a2e3b', '#3a4a2c']
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[0.36, 0.42, 48]} />
        <meshStandardMaterial color="#b896ff" emissive="#9a6bff" emissiveIntensity={0.8} transparent opacity={0.7} />
      </mesh>
      {covers.map((c, i) => (
        <group key={c} ref={(node) => (books.current[i] = node)} position={[Math.sin(i * 2.1) * 0.22, 0.95 + i * 0.25, Math.cos(i * 2.1) * 0.22]}>
          <group rotation={[-0.5, 0, 0]}>
            {[-1, 1].map((side) => (
              <group key={side} rotation={[0, 0, side * 0.18]}>
                <Box s={[0.17, 0.008, 0.24]} position={[side * 0.085, 0, 0]} c={c} r={0.7} />
                <Box s={[0.16, 0.02, 0.22]} position={[side * 0.08, 0.014, 0]} c={PAPER} r={0.9} />
              </group>
            ))}
          </group>
          <Ball s={[0.012, 6, 6]} position={[0.12, 0.12, 0.05]} c="#fff1c4" e="#ffe08a" ei={1.5} />
        </group>
      ))}
      <Box s={[0.012, 0.26, 0.04]} position={[0.3, 1.25, -0.1]} rotation={[0.2, 0, 0.5]} c="#f4efe6" r={0.9} />
    </>
  )
}

// ------------------------------------------------------------ stairs

// Both staircases climb to the loft's height. Built for the loft, but welcome
// in any room: a staircase to the top of a bookcase is still a staircase.
const STEPS = 12
const RISE = LOFT.y / STEPS
const RUN = 0.24
const RUN_TOTAL = STEPS * RUN

// A straight oak staircase with a green runner, as in the reference with the
// octagonal window. You walk up it away from you (towards -z).
export function StairsStraight() {
  const angle = Math.atan2(RISE, RUN)
  const rail = useMemo(() => {
    const z0 = RUN_TOTAL / 2 - 0.5 * RUN
    const z1 = RUN_TOTAL / 2 - (STEPS - 0.5) * RUN
    const y0 = RISE + 0.9
    const y1 = STEPS * RISE + 0.9
    return { length: Math.hypot(z0 - z1, y1 - y0) + 0.1, mid: [(z0 + z1) / 2, (y0 + y1) / 2] }
  }, [])
  return (
    <>
      {Array.from({ length: STEPS }, (_, i) => {
        const top = (i + 1) * RISE
        const z = RUN_TOTAL / 2 - (i + 0.5) * RUN
        return (
          <group key={i}>
            <Box s={[0.9, top, RUN]} position={[0, top / 2, z]} c={WOOD} r={0.6} />
            <Box s={[0.94, 0.03, RUN + 0.03]} position={[0, top - 0.015, z + 0.01]} c={WOOD_DARK} r={0.5} />
            <Box s={[0.52, 0.012, RUN]} position={[0, top + 0.006, z]} c="#5f9a7a" r={1} />
            <Box s={[0.52, RISE, 0.012]} position={[0, top - RISE / 2, z + RUN / 2 + 0.012]} c="#5f9a7a" r={1} />
          </group>
        )
      })}
      {Array.from({ length: STEPS / 2 }, (_, k) => {
        const i = k * 2
        return (
          <Cyl key={i} s={[0.02, 0.02, 0.9, 6]} position={[0.42, (i + 1) * RISE + 0.45, RUN_TOTAL / 2 - (i + 0.5) * RUN]} c={WOOD_DARK} />
        )
      })}
      <Box s={[0.07, 1.1, 0.07]} position={[0.42, RISE + 0.5, RUN_TOTAL / 2 - 0.5 * RUN]} c={WOOD_DARK} />
      <Box s={[0.06, 0.06, rail.length]} position={[0.42, rail.mid[1], rail.mid[0]]} rotation={[angle, 0, 0]} c={WOOD} r={0.5} />
    </>
  )
}

// A wrought-iron spiral staircase around a central pole: a turn and a quarter
// to the loft, as in the bookshop reference.
const SPIRAL_STEPS = 14
const SPIRAL_TURN = Math.PI * 2.5
const SPIRAL_STEP = SPIRAL_TURN / SPIRAL_STEPS
const SPIRAL_RISE = LOFT.y / SPIRAL_STEPS
const SPIRAL_R = 0.78
const exitAngle = (SPIRAL_STEPS - 0.5) * SPIRAL_STEP
export const SPIRAL_LANDING = [Math.sin(exitAngle) * 0.5, Math.cos(exitAngle) * 0.5]

export function StairsSpiral() {
  const rails = useMemo(() => {
    const point = (i) => {
      const a = (i + 0.5) * SPIRAL_STEP
      return new Vector3(Math.sin(a) * (SPIRAL_R - 0.04), (i + 1) * SPIRAL_RISE + 0.85, Math.cos(a) * (SPIRAL_R - 0.04))
    }
    const forward = new Vector3(0, 0, 1)
    return Array.from({ length: SPIRAL_STEPS - 1 }, (_, i) => {
      const from = point(i)
      const to = point(i + 1)
      const direction = to.clone().sub(from)
      const length = direction.length()
      return {
        mid: from.clone().add(to).multiplyScalar(0.5).toArray(),
        length,
        quaternion: new Quaternion().setFromUnitVectors(forward, direction.normalize()),
      }
    })
  }, [])
  return (
    <>
      <Cyl s={[0.07, 0.07, LOFT.y + 1.0, 12]} position={[0, (LOFT.y + 1.0) / 2, 0]} c={IRON} m={0.5} r={0.5} />
      {Array.from({ length: SPIRAL_STEPS }, (_, i) => {
        const a = i * SPIRAL_STEP
        const y = (i + 1) * SPIRAL_RISE
        return (
          <group key={i}>
            <mesh position={[0, y, 0]}>
              <cylinderGeometry args={[SPIRAL_R, SPIRAL_R, 0.05, 6, 1, false, a, SPIRAL_STEP * 1.04]} />
              <meshStandardMaterial color={WOOD} roughness={0.6} />
            </mesh>
            <Cyl s={[0.01, 0.01, 0.85, 4]} position={[Math.sin(a + SPIRAL_STEP / 2) * (SPIRAL_R - 0.04), y + 0.43, Math.cos(a + SPIRAL_STEP / 2) * (SPIRAL_R - 0.04)]} c={IRON} m={0.5} />
          </group>
        )
      })}
      {rails.map(({ mid, length, quaternion }, i) => (
        <mesh key={i} position={mid} quaternion={quaternion}>
          <boxGeometry args={[0.04, 0.04, length + 0.02]} />
          <meshStandardMaterial color={IRON} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <Ball s={[0.09, 12, 10]} position={[0, LOFT.y + 1.02, 0]} c={BRASS} m={0.7} r={0.3} />
    </>
  )
}
