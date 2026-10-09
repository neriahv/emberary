import { useMemo, useRef } from 'react'
import { Quaternion, Shape, Vector3 } from 'three'
import { LOFT } from '../../api'
import { Ball, Box, Cone, Cyl, FloorPatch, Glow, Lit, Torus, WOOD, WOOD_DARK, useAlways } from './parts.jsx'
import { pictureTexture } from './textures.js'
import { ShapedRug, scallopedOutline } from './wizardry.jsx'

// Library furniture in more styles, from the reader's reference pictures: a
// bright modern public library, a minimalist room with terracotta arches, a
// cosy two-floor bookshop, and pastel bedrooms made for reading. Everything
// here is for reading in, studying at, or keeping books. Conventions as in
// models.jsx: standing at the origin, facing +z; something that hangs on a
// wall has the wall at z = -0.3.

const BIRCH = '#e8d2a8'
const CREAM = '#f4f1ea'
const BOOK_COLOURS = ['#7a2e3b', '#2f5d6b', '#c9a24e', '#3a4a2c', '#5b2a1e', '#294056', '#d98fa8', '#8fb8d9']
const PASTEL_BOOKS = ['#f4b6c6', '#bfe3f0', '#f6eba3', '#c9b6e4', '#c9e8b8', '#f6d1a8']

// A row of books standing side by side, `width` long, their spines facing +z.
function Books({ width, position = [0, 0, 0], rotation, depth = 0.16, seed = 1, palette = BOOK_COLOURS }) {
  const books = useMemo(() => {
    const list = []
    let u = -width / 2
    let k = seed
    for (;;) {
      const thick = 0.03 + ((k * 37) % 5) / 100
      const tall = 0.16 + ((k * 53) % 7) / 100
      if (u + thick > width / 2) break
      list.push({ u: u + thick / 2, thick, tall, color: palette[k % palette.length] })
      u += thick + 0.004
      k++
    }
    return list
  }, [width, seed, palette])
  return (
    <group position={position} rotation={rotation}>
      {books.map((book, i) => (
        <Box key={i} s={[book.thick, book.tall, depth]} position={[book.u, book.tall / 2, 0]} c={book.color} r={0.8} />
      ))}
    </group>
  )
}

// A simple modern chair, facing +z.
function StudyChair({ position, rotation, color = CREAM }) {
  return (
    <group position={position} rotation={rotation}>
      {[[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.018, 0.018, 0.44, 8]} position={[x, 0.22, z]} c="#b9b2a6" m={0.4} r={0.4} />
      ))}
      <Box s={[0.42, 0.05, 0.4]} position={[0, 0.465, 0]} c={color} r={0.6} />
      <Box s={[0.42, 0.42, 0.04]} position={[0, 0.72, -0.2]} rotation={[-0.08, 0, 0]} c={color} r={0.6} />
    </group>
  )
}

// ------------------------------------------------------------ tables

// The librarian's front desk: a long counter with a computer for the
// catalogue, a date stamp and a little pile of returns.
export function LibrarianDesk() {
  return (
    <>
      <Box s={[1.5, 0.98, 0.5]} position={[0, 0.49, 0.04]} c={BIRCH} r={0.6} />
      <Box s={[1.4, 0.08, 0.02]} position={[0, 0.3, 0.3]} c="#d6bd92" r={0.6} />
      <Box s={[1.6, 0.05, 0.64]} position={[0, 1.005, 0]} c="#d6bd92" r={0.5} />
      <Cyl s={[0.08, 0.1, 0.02, 16]} position={[-0.35, 1.04, -0.08]} c="#3a3a40" r={0.4} />
      <Box s={[0.04, 0.2, 0.03]} position={[-0.35, 1.13, -0.1]} c="#3a3a40" r={0.4} />
      <Box s={[0.52, 0.32, 0.03]} position={[-0.35, 1.36, -0.08]} c="#2a2a30" r={0.3} />
      <mesh position={[-0.35, 1.36, -0.064]}>
        <planeGeometry args={[0.48, 0.28]} />
        <meshStandardMaterial color="#9fd0e8" emissive="#6fb8e0" emissiveIntensity={0.5} />
      </mesh>
      <Box s={[0.4, 0.02, 0.14]} position={[-0.35, 1.04, 0.14]} c="#e8e4dc" r={0.5} />
      <Cyl s={[0.03, 0.04, 0.08, 10]} position={[0.2, 1.07, 0.1]} c={WOOD} r={0.6} />
      <Box s={[0.07, 0.03, 0.05]} position={[0.2, 1.045, 0.1]} c="#3a3a40" />
      <Books width={0.22} position={[0.55, 1.03, 0.05]} rotation={[0, 0, Math.PI / 2]} depth={0.18} seed={3} />
    </>
  )
}

// A long study table with four chairs round it, as in a public library.
export function StudyTable() {
  return (
    <>
      {[[-0.82, -0.38], [0.82, -0.38], [-0.82, 0.38], [0.82, 0.38]].map(([x, z]) => (
        <Box key={`${x}${z}`} s={[0.06, 0.72, 0.06]} position={[x, 0.36, z]} c="#d6bd92" r={0.6} />
      ))}
      <Box s={[1.8, 0.06, 0.9]} position={[0, 0.75, 0]} c={BIRCH} r={0.5} />
      {[-0.45, 0.45].map((x) => (
        <group key={x}>
          <StudyChair position={[x, 0, 0.72]} rotation={[0, Math.PI, 0]} />
          <StudyChair position={[x, 0, -0.72]} />
        </group>
      ))}
    </>
  )
}

// A round white pebble of a coffee table on a single pedestal.
export function PebbleTable() {
  return (
    <>
      <Cyl s={[0.22, 0.3, 0.34, 28]} position={[0, 0.17, 0]} c={CREAM} r={0.5} />
      <Cyl s={[0.5, 0.5, 0.08, 40]} position={[0, 0.38, 0]} c={CREAM} r={0.4} />
    </>
  )
}

// The old card catalogue: a cabinet of small drawers, each with a brass pull
// and a label.
export function CardCatalog() {
  const drawers = []
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) drawers.push([-0.36 + col * 0.24, 0.17 + row * 0.14])
  }
  return (
    <>
      {[[-0.45, -0.2], [0.45, -0.2], [-0.45, 0.2], [0.45, 0.2]].map(([x, z]) => (
        <Box key={`${x}${z}`} s={[0.06, 0.08, 0.06]} position={[x, 0.04, z]} c={WOOD_DARK} />
      ))}
      <Box s={[1.0, 0.9, 0.5]} position={[0, 0.53, 0]} c="#8a5a2e" r={0.6} />
      <Box s={[1.06, 0.04, 0.54]} position={[0, 1.0, 0]} c="#6b4420" r={0.6} />
      {drawers.map(([x, y]) => (
        <group key={`${x}${y}`} position={[x, y, 0.255]}>
          <Box s={[0.21, 0.12, 0.012]} c="#9c6a38" r={0.6} />
          <Box s={[0.07, 0.03, 0.004]} position={[0, 0.025, 0.008]} c="#f3e7cf" />
          <Box s={[0.05, 0.012, 0.02]} position={[0, -0.02, 0.012]} c="#b8893d" m={0.7} r={0.3} />
        </group>
      ))}
    </>
  )
}

// A pastel mint cabinet: an open cubby of books on one side, a cream door on
// the other, on little round legs.
export function MintCabinet() {
  return (
    <>
      {[[-0.32, -0.15], [0.32, -0.15], [-0.32, 0.15], [0.32, 0.15]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.03, 0.03, 0.08, 10]} position={[x, 0.04, z]} c="#f2e2b8" r={0.6} />
      ))}
      <Box s={[0.8, 0.04, 0.42]} position={[0, 0.1, 0]} c="#8fd6cf" r={0.5} />
      <Box s={[0.8, 0.04, 0.42]} position={[0, 0.585, 0]} c="#8fd6cf" r={0.5} />
      <Box s={[0.8, 0.5, 0.03]} position={[0, 0.345, -0.195]} c="#8fd6cf" r={0.5} />
      {[-0.385, 0, 0.385].map((x) => (
        <Box key={x} s={[0.03, 0.5, 0.42]} position={[x, 0.345, 0]} c="#8fd6cf" r={0.5} />
      ))}
      <Books width={0.34} position={[-0.19, 0.12, 0]} seed={5} palette={PASTEL_BOOKS} />
      <Box s={[0.36, 0.44, 0.02]} position={[0.19, 0.345, 0.2]} c="#f6ead0" r={0.5} />
      <Ball s={[0.025, 12, 10]} position={[0.07, 0.35, 0.22]} c="#5fb8b0" r={0.4} />
    </>
  )
}

// A little library café: a counter with a coffee machine and cups.
export function CoffeeCorner() {
  return (
    <>
      <Box s={[1.3, 0.9, 0.55]} position={[0, 0.45, 0]} c="#7a4a2a" r={0.7} />
      <Box s={[1.36, 0.05, 0.6]} position={[0, 0.925, 0]} c="#5a3420" r={0.5} />
      {[-0.45, -0.15, 0.15, 0.45].map((x) => (
        <Box key={x} s={[0.02, 0.8, 0.01]} position={[x, 0.45, 0.28]} c="#5a3420" r={0.7} />
      ))}
      <group position={[-0.35, 0.95, -0.05]}>
        <Box s={[0.3, 0.36, 0.26]} position={[0, 0.18, 0]} c="#c9c9c9" m={0.6} r={0.3} />
        <Box s={[0.22, 0.06, 0.08]} position={[0, 0.24, 0.16]} c="#3a3a40" r={0.4} />
        <Cyl s={[0.012, 0.012, 0.05, 8]} position={[0, 0.19, 0.17]} c="#3a3a40" />
        <Cyl s={[0.035, 0.03, 0.06, 12]} position={[0, 0.03, 0.15]} c={CREAM} r={0.4} />
      </group>
      {[0.1, 0.24].map((x) => (
        <group key={x} position={[x, 0.95, 0.12]}>
          <Cyl s={[0.04, 0.035, 0.08, 14]} position={[0, 0.04, 0]} c={CREAM} r={0.4} />
          <Cyl s={[0.035, 0.035, 0.005, 14]} position={[0, 0.078, 0]} c="#6b3a1f" />
        </group>
      ))}
      <Box s={[0.26, 0.2, 0.02]} position={[0.45, 1.05, -0.2]} rotation={[-0.2, 0, 0]} c="#2f4a3a" r={0.9} />
    </>
  )
}

// ------------------------------------------------------------ seats

// A low modular sofa in rust velvet, with cushions.
export function RustSofa() {
  const rust = '#b8562c'
  return (
    <>
      {[[-0.9, -0.3], [0.9, -0.3], [-0.9, 0.3], [0.9, 0.3]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.03, 0.03, 0.08, 8]} position={[x, 0.04, z]} c={WOOD_DARK} />
      ))}
      <Box s={[2.0, 0.24, 0.85]} position={[0, 0.2, 0]} c={rust} r={0.9} />
      {[-0.62, 0, 0.62].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Box s={[0.6, 0.14, 0.66]} position={[0, 0.39, 0.08]} c="#c4602f" r={0.9} />
          <Box s={[0.6, 0.42, 0.2]} position={[0, 0.6, -0.3]} rotation={[-0.12, 0, 0]} c={rust} r={0.9} />
        </group>
      ))}
      {[-1, 1].map((side) => (
        <Box key={side} s={[0.18, 0.5, 0.85]} position={[side * 1.0, 0.3, 0]} c={rust} r={0.9} />
      ))}
      <Box s={[0.3, 0.3, 0.1]} position={[0.55, 0.6, -0.15]} rotation={[-0.2, -0.2, 0.1]} c={CREAM} r={1} />
      <Box s={[0.28, 0.28, 0.1]} position={[-0.6, 0.6, -0.15]} rotation={[-0.2, 0.2, -0.1]} c="#a84a24" r={1} />
    </>
  )
}

// A round bouclé tub chair in cream.
export function BoucleChair() {
  return (
    <>
      <Cyl s={[0.42, 0.4, 0.42, 32]} position={[0, 0.21, 0]} c="#efe8dc" r={1} />
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.43, 0.42, 0.36, 32, 1, true, Math.PI * 0.3, Math.PI * 1.4]} />
        <meshStandardMaterial color="#efe8dc" roughness={1} side={2} />
      </mesh>
      <Torus s={[0.425, 0.06, 10, 32, Math.PI * 1.4]} rotation={[Math.PI / 2, 0, Math.PI * 0.8]} position={[0, 0.78, 0]} c="#efe8dc" r={1} />
      <Cyl s={[0.37, 0.37, 0.1, 32]} position={[0, 0.47, 0.02]} c="#f6f1e8" r={1} />
    </>
  )
}

// A window seat for reading: a cushioned bench over three cubbies of books.
export function WindowSeat() {
  const wood = '#f2e6d0'
  return (
    <>
      <Box s={[1.6, 0.05, 0.55]} position={[0, 0.425, 0]} c={wood} r={0.6} />
      <Box s={[1.6, 0.05, 0.55]} position={[0, 0.025, 0]} c={wood} r={0.6} />
      <Box s={[1.6, 0.4, 0.03]} position={[0, 0.225, -0.26]} c={wood} r={0.6} />
      {[-0.78, -0.26, 0.26, 0.78].map((x) => (
        <Box key={x} s={[0.04, 0.4, 0.55]} position={[x, 0.225, 0]} c={wood} r={0.6} />
      ))}
      {[-0.52, 0, 0.52].map((x, k) => (
        <Books key={x} width={0.44} position={[x, 0.05, 0]} seed={k * 7 + 2} />
      ))}
      <Box s={[1.56, 0.1, 0.5]} position={[0, 0.5, 0.01]} c="#9cc9a8" r={1} />
      <Box s={[0.34, 0.3, 0.12]} position={[-0.5, 0.68, -0.18]} rotation={[-0.2, 0.1, 0]} c="#f4b6c6" r={1} />
      <Box s={[0.32, 0.28, 0.12]} position={[0.5, 0.67, -0.18]} rotation={[-0.2, -0.1, 0]} c={CREAM} r={1} />
    </>
  )
}

// A reading nest under a sheer canopy strung with fairy lights: a floor
// mattress, a flower pillow and a checked blanket.
export function CanopyNest({ lit, shine }) {
  const lights = useMemo(
    () => Array.from({ length: 18 }, (_, k) => {
      const t = k / 17
      const a = t * Math.PI * 4
      const r = 0.12 + t * 0.62
      return [Math.sin(a) * r, 2.35 - t * 1.75, Math.cos(a) * r]
    }),
    []
  )
  return (
    <>
      <Box s={[1.4, 0.22, 1.0]} position={[0, 0.11, 0]} c="#f6f2ff" r={1} />
      <Box s={[0.95, 0.03, 0.96]} position={[0.2, 0.235, 0]} c="#9ab0e8" r={1} />
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k * Math.PI * 2) / 5
        return <Ball key={k} s={[0.11, 14, 10]} scale={[1, 0.4, 1]} position={[-0.42 + Math.sin(a) * 0.12, 0.3, Math.cos(a) * 0.12]} c="#f5a3c0" r={1} />
      })}
      <Ball s={[0.07, 12, 10]} scale={[1, 0.6, 1]} position={[-0.42, 0.33, 0]} c="#f6e08a" r={1} />
      <Box s={[0.24, 0.03, 0.17]} position={[0.3, 0.26, 0.15]} rotation={[0, 0.3, 0]} c="#5fb8b0" r={0.6} />
      <group position={[-0.1, 0, 0]}>
        <Cyl s={[0.005, 0.005, 0.4, 4]} position={[0, 2.6, 0]} c="#e8e4dc" />
        <Torus s={[0.12, 0.012, 6, 20]} rotation={[Math.PI / 2, 0, 0]} position={[0, 2.4, 0]} c="#e8e4dc" />
        <mesh position={[0, 1.5, 0]}>
          <coneGeometry args={[0.78, 1.8, 28, 1, true]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.28} side={2} depthWrite={false} />
        </mesh>
        {lights.map(([x, y, z], k) => (
          <mesh key={k} position={[x, y, z]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshStandardMaterial color="#fff3c4" emissive="#ffd27a" emissiveIntensity={lit ? 1.6 : 0} />
          </mesh>
        ))}
      </group>
      <Glow lit={lit} shine={shine} position={[0, 1.3, 0.3]} intensity={1.0} distance={3} color="#ffe0a8" />
    </>
  )
}

// A floor pillow shaped like a daisy.
export function DaisyPillow() {
  return (
    <>
      {Array.from({ length: 6 }, (_, k) => {
        const a = (k * Math.PI) / 3
        return <Ball key={k} s={[0.13, 14, 10]} scale={[1, 0.35, 1]} position={[Math.sin(a) * 0.16, 0.05, Math.cos(a) * 0.16]} c="#f5a3c0" r={1} />
      })}
      <Ball s={[0.1, 14, 10]} scale={[1, 0.45, 1]} position={[0, 0.07, 0]} c="#f6d86a" r={1} />
    </>
  )
}

// A round pleated pouf in pink.
export function PleatedPouf() {
  return (
    <>
      <Ball s={[0.3, 24, 16]} scale={[1, 0.8, 1]} position={[0, 0.24, 0]} c="#f4b6c8" r={0.9} />
      {Array.from({ length: 12 }, (_, k) => (
        <Torus key={k} s={[0.29, 0.01, 6, 24, Math.PI]} scale={[1, 0.82, 1]} rotation={[0, (k * Math.PI) / 12, Math.PI / 2]} position={[0, 0.24, 0]} c="#e89ab0" r={0.9} />
      ))}
      <Ball s={[0.04, 10, 8]} position={[0, 0.48, 0]} c="#e89ab0" r={0.9} />
    </>
  )
}

// A big squashy bean bag to sink into with a book.
export function BeanBag() {
  return (
    <>
      <Ball s={[0.42, 24, 16]} scale={[1, 0.5, 1]} position={[0, 0.2, 0.02]} c="#3f6fb5" r={1} />
      <Ball s={[0.34, 22, 14]} scale={[1, 0.95, 0.6]} position={[0, 0.4, -0.2]} c="#3f6fb5" r={1} />
    </>
  )
}

// A racer-style reading chair in black and blue, on a five-star base.
export function RacerChair() {
  const black = '#2a2a33'
  const blue = '#3f7fd0'
  return (
    <>
      {Array.from({ length: 5 }, (_, k) => {
        const a = (k * Math.PI * 2) / 5
        return (
          <group key={k}>
            <Box s={[0.05, 0.04, 0.3]} position={[Math.sin(a) * 0.15, 0.08, Math.cos(a) * 0.15]} rotation={[0, a, 0]} c={black} />
            <Ball s={[0.03, 8, 6]} position={[Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29]} c={black} />
          </group>
        )
      })}
      <Cyl s={[0.03, 0.03, 0.36, 10]} position={[0, 0.28, 0]} c="#8a8a90" m={0.6} r={0.3} />
      <Box s={[0.5, 0.1, 0.48]} position={[0, 0.5, 0.02]} c={black} r={0.6} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box s={[0.08, 0.12, 0.48]} position={[side * 0.25, 0.56, 0.02]} c={blue} r={0.6} />
          <Box s={[0.06, 0.25, 0.06]} position={[side * 0.3, 0.68, 0.05]} c={black} />
          <Box s={[0.08, 0.03, 0.26]} position={[side * 0.3, 0.8, 0.05]} c={black} />
        </group>
      ))}
      <group position={[0, 0.98, -0.24]} rotation={[-0.12, 0, 0]}>
        <Box s={[0.5, 0.9, 0.1]} c={black} r={0.6} />
        {[-1, 1].map((side) => (
          <Box key={side} s={[0.07, 0.86, 0.11]} position={[side * 0.2, 0, 0]} c={blue} r={0.6} />
        ))}
        <Box s={[0.26, 0.12, 0.06]} position={[0, 0.3, 0.07]} c={blue} r={0.8} />
      </group>
    </>
  )
}

// ------------------------------------------------------------ lights

// A lava lamp: warm blobs rising and falling in purple light.
export function LavaLamp({ lit, shine, sample }) {
  const blobs = useRef([])
  useAlways((seconds) => {
    blobs.current.forEach((blob, i) => {
      if (blob) blob.position.y = 0.17 + Math.sin(seconds * (0.5 + i * 0.2) + i * 2) * 0.06
    })
  }, lit && !sample)
  return (
    <>
      <Cyl s={[0.05, 0.08, 0.1, 18]} position={[0, 0.05, 0]} c="#c9c9d6" m={0.7} r={0.3} />
      <Lit geometry={Lit.Cyl} s={[0.04, 0.06, 0.22, 18]} position={[0, 0.21, 0]} lit={lit} c="#c9a4f0" glow="#9a6ad0" ei={0.8} o={0.7} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (blobs.current[i] = el)} position={[0, 0.17 + i * 0.03, 0]}>
          <sphereGeometry args={[0.022 - i * 0.004, 12, 10]} />
          <meshStandardMaterial color="#ff9a6a" emissive="#ff7a4a" emissiveIntensity={lit ? 1.2 : 0.1} />
        </mesh>
      ))}
      <Cyl s={[0.025, 0.04, 0.05, 18]} position={[0, 0.345, 0]} c="#c9c9d6" m={0.7} r={0.3} />
      <Glow lit={lit} shine={shine} position={[0, 0.3, 0.15]} intensity={0.9} distance={2.5} color="#d9a4ff" />
    </>
  )
}

// A cube of frosted glass glowing warm, as on the lavender bookshelf.
export function CubeLantern({ lit, shine }) {
  return (
    <>
      <Lit geometry={Lit.Box} s={[0.16, 0.16, 0.16]} position={[0, 0.08, 0]} lit={lit} c="#fff1d6" glow="#ffcf8a" ei={1.4} o={0.9} />
      <Glow lit={lit} shine={shine} position={[0, 0.2, 0.12]} intensity={0.8} distance={2.5} />
    </>
  )
}

// A garland of glowing stars and a crescent moon, strung along a wall.
export function StarGarland({ lit, shine }) {
  const sag = (x) => 2.35 - 0.22 * (1 - (x / 0.9) ** 2)
  const hangers = [-0.7, -0.35, 0, 0.35, 0.7]
  return (
    <>
      {Array.from({ length: 9 }, (_, k) => {
        const x0 = -0.9 + k * 0.2
        const x1 = x0 + 0.2
        const y0 = sag(x0)
        const y1 = sag(x1)
        return (
          <Box key={k} s={[Math.hypot(0.2, y1 - y0), 0.008, 0.008]} position={[(x0 + x1) / 2, (y0 + y1) / 2, -0.27]} rotation={[0, 0, Math.atan2(y1 - y0, 0.2)]} c="#e8e4dc" />
        )
      })}
      {hangers.map((x, k) => {
        const drop = 0.18 + (k % 2) * 0.14
        const y = sag(x) - drop
        return (
          <group key={x}>
            <Box s={[0.004, drop, 0.004]} position={[x, sag(x) - drop / 2, -0.27]} c="#e8e4dc" />
            {k === 2 ? (
              <mesh position={[x, y - 0.06, -0.26]} rotation={[0, 0, -0.6]}>
                <torusGeometry args={[0.07, 0.025, 8, 20, Math.PI * 1.2]} />
                <meshStandardMaterial color="#fff6d0" emissive="#ffe08a" emissiveIntensity={lit ? 1.4 : 0.1} />
              </mesh>
            ) : (
              <Ball s={[0.055, 5, 2]} position={[x, y - 0.04, -0.26]} rotation={[Math.PI / 2, 0, 0]} c="#fff6d0" e="#ffe08a" ei={lit ? 1.4 : 0.1} />
            )}
          </group>
        )
      })}
      <Glow lit={lit} shine={shine} position={[0, 2.0, 0]} intensity={0.9} distance={3} color="#ffe8b0" />
    </>
  )
}

// A white globe pendant hanging from the top of the walls.
export function GlobePendant({ lit, shine, ceiling = 3 }) {
  const y = Math.min(ceiling - 0.8, 2.3)
  return (
    <>
      <Cyl s={[0.006, 0.006, ceiling - y, 4]} position={[0, (ceiling + y) / 2, 0]} c="#3a3a40" />
      <Cyl s={[0.05, 0.06, 0.06, 14]} position={[0, y + 0.2, 0]} c="#3a3a40" m={0.5} r={0.4} />
      <Lit s={[0.2, 24, 18]} position={[0, y, 0]} lit={lit} c="#fbf7ee" glow="#ffe6b8" ei={1.3} />
      <Glow lit={lit} shine={shine} position={[0, y - 0.25, 0]} intensity={1.5} distance={4} />
    </>
  )
}

// ------------------------------------------------------------ rugs

function blobOutline(width, depth, wobble) {
  const shape = new Shape()
  for (let k = 0; k <= 64; k++) {
    const a = (k / 64) * Math.PI * 2
    const r = 1 + wobble * Math.sin(3 * a) + wobble * 0.6 * Math.cos(5 * a + 1)
    const x = Math.cos(a) * r * (width / 2)
    const y = Math.sin(a) * r * (depth / 2)
    if (k === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  return shape
}

// A soft pastel blue rug in a rounded puddle shape.
export function PuddleRug() {
  const outline = useMemo(() => blobOutline(2.0, 1.4, 0.07), [])
  return (
    <>
      <ShapedRug outline={outline} color="#a9c8ec" y={0.01} />
      <ShapedRug outline={useMemo(() => blobOutline(1.85, 1.28, 0.07), [])} color="#bcd6f2" y={0.016} />
    </>
  )
}

// A sand-coloured rug with a pool of blue across it, as in the minimalist
// room.
export function PoolRug() {
  const water = useMemo(() => blobOutline(1.7, 0.8, 0.12), [])
  return (
    <>
      <FloorPatch s={[2.4, 1.6]} c="#d9cdb8" y={0.008} />
      <group position={[0.15, 0, 0.1]} rotation={[0, 0.3, 0]}>
        <ShapedRug outline={water} color="#8fb8cc" y={0.012} />
      </group>
    </>
  )
}

// ------------------------------------------------------------ for the books

// A library trolley: two sloping shelves of books on top and a shelf of them
// underneath, on four wheels.
export function BookCart() {
  const frame = '#4a6a8a'
  return (
    <>
      {[[-0.38, -0.16], [0.38, -0.16], [-0.38, 0.16], [0.38, 0.16]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.05, 0.05, 0.03, 12]} rotation={[0, 0, Math.PI / 2]} position={[x, 0.05, z]} c="#2a2a30" />
      ))}
      <Box s={[0.9, 0.04, 0.4]} position={[0, 0.14, 0]} c={frame} m={0.3} r={0.5} />
      {[-1, 1].map((side) => (
        <Box key={side} s={[0.04, 0.8, 0.4]} position={[side * 0.45, 0.52, 0]} c={frame} m={0.3} r={0.5} />
      ))}
      <Books width={0.84} position={[0, 0.16, 0]} seed={9} depth={0.3} />
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0.72, side * 0.1]} rotation={[side * 0.4, 0, 0]}>
          <Box s={[0.88, 0.03, 0.2]} c={frame} m={0.3} r={0.5} />
          <Books width={0.84} position={[0, 0.015, 0]} seed={side > 0 ? 4 : 13} depth={0.15} />
        </group>
      ))}
      <Cyl s={[0.015, 0.015, 0.94, 8]} rotation={[0, 0, Math.PI / 2]} position={[0, 0.94, 0]} c="#c9c9d6" m={0.6} r={0.3} />
    </>
  )
}

// A tower of books stacked in a slow spiral round a pole.
export function BookTower() {
  return (
    <>
      <Cyl s={[0.2, 0.22, 0.04, 24]} position={[0, 0.02, 0]} c={WOOD_DARK} r={0.6} />
      <Cyl s={[0.02, 0.02, 1.7, 8]} position={[0, 0.87, 0]} c={WOOD_DARK} r={0.6} />
      {Array.from({ length: 14 }, (_, k) => (
        <group key={k} position={[0, 0.1 + k * 0.115, 0]} rotation={[0, k * 0.55, 0]}>
          <Box s={[0.32, 0.03, 0.22]} position={[0.08, 0, 0]} c={WOOD} r={0.6} />
          <Books width={0.26} position={[0.08, 0.015, 0]} seed={k * 3 + 1} depth={0.18} />
        </group>
      ))}
    </>
  )
}

// A little record player in pastel blue, for music while reading.
export function RecordPlayer() {
  return (
    <>
      <Box s={[0.34, 0.08, 0.3]} position={[0, 0.04, 0]} c="#7fb8c9" r={0.5} />
      <Cyl s={[0.13, 0.13, 0.01, 32]} position={[-0.03, 0.085, 0]} c="#2a2a30" r={0.3} />
      <Cyl s={[0.04, 0.04, 0.012, 20]} position={[-0.03, 0.087, 0]} c="#f4b6c6" r={0.6} />
      <Box s={[0.012, 0.012, 0.18]} position={[0.12, 0.1, -0.02]} rotation={[0, 0.4, 0]} c="#e8e4dc" m={0.6} r={0.3} />
      <Cyl s={[0.02, 0.02, 0.03, 10]} position={[0.14, 0.095, -0.1]} c="#e8e4dc" m={0.6} r={0.3} />
    </>
  )
}

// A soft green dinosaur hugging a book: a reading buddy.
export function DinoPlush() {
  const green = '#8fd18a'
  return (
    <>
      <Ball s={[0.1, 18, 14]} scale={[1, 1, 1.15]} position={[0, 0.1, 0]} c={green} r={1} />
      <Ball s={[0.068, 16, 12]} position={[0, 0.23, 0.05]} c={green} r={1} />
      <Ball s={[0.035, 12, 10]} position={[0, 0.215, 0.11]} c="#a8e0a3" r={1} />
      {[-1, 1].map((side) => (
        <Ball key={side} s={[0.012, 8, 6]} position={[side * 0.03, 0.25, 0.11]} c="#2a2a30" />
      ))}
      {[0.16, 0.22, 0.27].map((y, k) => (
        <Cone key={y} s={[0.025, 0.05, 6]} position={[0, y, -0.06 - k * 0.01]} rotation={[-0.5, 0, 0]} c="#6fb86a" r={1} />
      ))}
      <Cone s={[0.04, 0.14, 10]} position={[0, 0.07, -0.15]} rotation={[-1.9, 0, 0]} c={green} r={1} />
      <Box s={[0.1, 0.13, 0.025]} position={[0, 0.12, 0.11]} rotation={[-0.2, 0, 0]} c="#f4b6c6" r={0.6} />
    </>
  )
}

// A cork notice board of reading lists and notes, on the wall.
export function NoticeBoard() {
  return (
    <group position={[0, 1.6, -0.28]}>
      <Box s={[0.94, 0.66, 0.03]} c={WOOD} r={0.6} />
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[0.86, 0.58]} />
        <meshStandardMaterial map={pictureTexture('notice-board')} roughness={0.95} />
      </mesh>
    </group>
  )
}

// A painted sign hanging from an iron bracket, out from the wall.
export function LibrarySign() {
  const iron = { c: '#2b2320', m: 0.5, r: 0.4 }
  return (
    <>
      <Box s={[0.08, 0.24, 0.03]} position={[0, 2.4, -0.29]} {...iron} />
      <Box s={[0.03, 0.03, 0.72]} position={[0, 2.42, 0.06]} {...iron} />
      <Torus s={[0.04, 0.008, 6, 14]} position={[0, 2.45, 0.4]} rotation={[0, Math.PI / 2, 0]} {...iron} />
      {[-0.22, 0.22].map((z) => (
        <Box key={z} s={[0.006, 0.12, 0.006]} position={[0, 2.35, 0.15 + z + 0.04]} c="#2b2320" />
      ))}
      <group position={[0, 2.08, 0.19]} rotation={[0, Math.PI / 2, 0]}>
        <Box s={[0.6, 0.38, 0.04]} c="#5a3420" r={0.7} />
        {[1, -1].map((side) => (
          <mesh key={side} position={[0, 0, side * 0.021]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
            <planeGeometry args={[0.54, 0.32]} />
            <meshStandardMaterial map={pictureTexture('library-sign')} roughness={0.8} />
          </mesh>
        ))}
      </group>
    </>
  )
}

// A tall standing mirror in a wavy mint frame, leaning a little.
export function WavyMirror() {
  const frame = useMemo(() => scallopedOutline(0.78, 1.7, 0.5, 0.06), [])
  const glass = useMemo(() => scallopedOutline(0.6, 1.5, 0.5, 0.05), [])
  return (
    <group position={[0, 0.88, -0.05]} rotation={[-0.1, 0, 0]}>
      <mesh>
        <shapeGeometry args={[frame]} />
        <meshStandardMaterial color="#bfe3c0" roughness={0.6} side={2} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <shapeGeometry args={[glass]} />
        <meshStandardMaterial color="#d6e6f2" metalness={0.9} roughness={0.08} side={2} />
      </mesh>
    </group>
  )
}

// A world map for a young explorer's reading corner.
export function WorldMap() {
  return (
    <group position={[0, 1.6, -0.28]}>
      <Box s={[0.98, 0.68, 0.03]} c="#3a5a7a" r={0.6} />
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[0.92, 0.62]} />
        <meshStandardMaterial map={pictureTexture('world-map')} roughness={0.9} />
      </mesh>
    </group>
  )
}

// ------------------------------------------------------------ stairs
//
// Each staircase climbs LOFT.y to the upstairs floor. The straight ones run
// 12 steps from +z (the bottom) to -z (the top), as the oak staircase does.

const STEPS = 12
const RISE = LOFT.y / STEPS
const RUN = 0.24
const RUN_TOTAL = STEPS * RUN
const stepZ = (i) => RUN_TOTAL / 2 - (i + 0.5) * RUN
const SLOPE = Math.atan2(RISE, RUN)
const DIAGONAL = Math.hypot(RUN_TOTAL, LOFT.y)

// A rail along the stairs' slope at height `above` over the steps' noses.
function SlopeRail({ x, above, thick = 0.06, color = WOOD, ...props }) {
  return (
    <Box
      s={[thick, thick, DIAGONAL + 0.1]}
      position={[x, LOFT.y / 2 + above, 0]}
      rotation={[SLOPE, 0, 0]}
      c={color}
      r={0.5}
      {...props}
    />
  )
}

// Solid steps from the floor up, each its own colour if `colors` is given.
function SolidSteps({ width = 0.9, color, colors }) {
  return Array.from({ length: STEPS }, (_, i) => {
    const top = (i + 1) * RISE
    return <Box key={i} s={[width, top, RUN]} position={[0, top / 2, stepZ(i)]} c={colors ? colors[i % colors.length] : color} r={0.7} />
  })
}

// The cottage staircase: honey wood, closed sides and a railing either side.
export function StairsCottage() {
  const wood = '#e0b07a'
  return (
    <>
      <SolidSteps width={0.9} color={wood} />
      {Array.from({ length: STEPS }, (_, i) => (
        <Box key={i} s={[0.92, 0.025, RUN + 0.02]} position={[0, (i + 1) * RISE, stepZ(i) + 0.01]} c="#c99060" r={0.5} />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box s={[0.07, 1.0, 0.07]} position={[side * 0.47, (RISE + 1.0) / 2, stepZ(0)]} c={wood} r={0.6} />
          {Array.from({ length: STEPS / 2 }, (_, k) => (
            <Box key={k} s={[0.03, 0.85, 0.03]} position={[side * 0.47, (k * 2 + 1) * RISE + 0.43, stepZ(k * 2)]} c={wood} r={0.6} />
          ))}
          <SlopeRail x={side * 0.47} above={0.9} color="#c99060" />
        </group>
      ))}
    </>
  )
}

// A floating modern staircase: thin oak treads on one steel stringer, with a
// glass balustrade.
export function StairsFloating() {
  return (
    <>
      {Array.from({ length: STEPS }, (_, i) => (
        <Box key={i} s={[0.9, 0.05, RUN - 0.02]} position={[0, (i + 1) * RISE - 0.025, stepZ(i)]} c="#d9b98a" r={0.5} />
      ))}
      <Box s={[0.14, 0.14, DIAGONAL]} position={[0, LOFT.y / 2 - 0.15, 0]} rotation={[SLOPE, 0, 0]} c="#3a3a40" m={0.6} r={0.35} />
      <Box s={[0.012, 0.9, DIAGONAL]} position={[0.46, LOFT.y / 2 + 0.45, 0]} rotation={[SLOPE, 0, 0]} c="#cfe6f0" o={0.3} r={0.05} />
      <SlopeRail x={0.46} above={0.92} thick={0.04} color="#9a9aa0" m={0.6} />
    </>
  )
}

// A staircase for a library: every step has a shelf of books in its side.
export function StairsBookcase() {
  const shades = ['#f2e6d0', '#ecdcc0']
  return (
    <>
      <SolidSteps width={0.9} colors={shades} />
      {Array.from({ length: STEPS - 1 }, (_, i) => {
        const top = (i + 1) * RISE
        return (
          <group key={i}>
            <Box s={[0.02, 0.24, RUN]} position={[0.455, top - 0.13, stepZ(i)]} c="#c9b28e" r={0.8} />
            <Books width={RUN - 0.03} position={[0.5, top - 0.24, stepZ(i)]} rotation={[0, Math.PI / 2, 0]} depth={0.08} seed={i * 5 + 1} palette={i % 2 ? BOOK_COLOURS : PASTEL_BOOKS} />
          </group>
        )
      })}
      <Box s={[0.06, 1.0, 0.06]} position={[-0.46, RISE + 0.5, stepZ(0)]} c="#c9b28e" r={0.6} />
      <SlopeRail x={-0.46} above={0.9} color="#c9b28e" />
    </>
  )
}

// Castle stone stairs, each block a slightly different grey, with a rope
// rail on iron posts.
export function StairsStone() {
  const greys = ['#9a958e', '#8a857f', '#a39e96', '#928d86']
  return (
    <>
      <SolidSteps width={0.95} colors={greys} />
      {[0, 4, 8, 11].map((i) => (
        <Cyl key={i} s={[0.025, 0.025, 0.9, 8]} position={[0.5, (i + 1) * RISE + 0.45, stepZ(i)]} c="#2b2320" m={0.5} r={0.4} />
      ))}
      <Box s={[0.035, 0.035, DIAGONAL]} position={[0.5, LOFT.y / 2 + 0.85, 0]} rotation={[SLOPE, 0, 0]} c="#c9a46a" r={1} />
    </>
  )
}

// A curved oak staircase: a half turn round a newel post, with a railing on
// the outside, as in the two-floor bookshop.
const CURVE_STEPS = 14
const CURVE_R = 0.6
export const CURVE_LANDING = [0, -1.1]
export function StairsCurved() {
  const rails = useMemo(() => {
    const point = (i) => {
      const a = (i * Math.PI) / (CURVE_STEPS - 1)
      return new Vector3(Math.sin(a) * 1.02, ((i + 1) * LOFT.y) / CURVE_STEPS + 0.9, Math.cos(a) * 1.02)
    }
    const forward = new Vector3(0, 0, 1)
    return Array.from({ length: CURVE_STEPS - 1 }, (_, i) => {
      const from = point(i)
      const to = point(i + 1)
      const direction = to.clone().sub(from)
      const length = direction.length()
      return {
        position: from.clone().add(to).multiplyScalar(0.5).toArray(),
        quaternion: new Quaternion().setFromUnitVectors(forward, direction.normalize()).toArray(),
        length,
      }
    })
  }, [])
  return (
    <>
      <Cyl s={[0.1, 0.12, LOFT.y + 1.0, 14]} position={[0, (LOFT.y + 1.0) / 2, 0]} c={WOOD_DARK} r={0.6} />
      {Array.from({ length: CURVE_STEPS }, (_, i) => {
        const a = (i * Math.PI) / (CURVE_STEPS - 1)
        const top = ((i + 1) * LOFT.y) / CURVE_STEPS
        return (
          <group key={i} rotation={[0, a, 0]}>
            <Box s={[0.32, top, 0.9]} position={[0, top / 2, CURVE_R]} c="#c98a4b" r={0.7} />
            <Box s={[0.34, 0.03, 0.92]} position={[0, top, CURVE_R + 0.01]} c="#a86a34" r={0.5} />
            <Cyl s={[0.018, 0.018, 0.9, 6]} position={[0, top + 0.45, 1.02]} c={WOOD_DARK} />
          </group>
        )
      })}
      {rails.map((rail, k) => (
        <mesh key={k} position={rail.position} quaternion={rail.quaternion}>
          <boxGeometry args={[0.06, 0.06, rail.length + 0.02]} />
          <meshStandardMaterial color="#a86a34" roughness={0.5} />
        </mesh>
      ))}
    </>
  )
}
