import { useRef } from 'react'
import { Ball, Box, Cone, Cyl, Glow, Lit, Torus, usePlay } from './parts.jsx'

// The collector's pieces, from the reader's own reference pictures: soft,
// rounded, glossy things in pinks, sages and honey wood. They cost more than
// the rest of the shop. Conventions as in models.jsx: standing at the origin,
// facing +z. Most are small enough to stand on a table, a shelf or a seat.

const GLOSS = 0.25 // a glazed, shiny finish
const SOFT = 0.75 // a matte, clay-like finish
const HONEY = '#d9a05b'
const HONEY_DARK = '#b97c3a'

// ------------------------------------------------------------ lights

// A pink anglepoise desk lamp with a round foot and a button.
export function PinkDeskLamp({ lit, shine }) {
  const pink = '#f2a7a0'
  return (
    <>
      <Cyl s={[0.11, 0.12, 0.045, 28]} position={[0, 0.0225, 0]} c={pink} r={SOFT} />
      <Cyl s={[0.014, 0.014, 0.03, 12]} position={[0.06, 0.055, 0.03]} c={pink} r={SOFT} />
      <Cyl s={[0.016, 0.016, 0.24, 10]} position={[0, 0.16, -0.03]} rotation={[-0.25, 0, 0]} c={pink} r={SOFT} />
      <group position={[0, 0.27, -0.06]}>
        <Ball s={[0.03, 14, 10]} c={pink} r={SOFT} />
        <Cyl s={[0.03, 0.03, 0.05, 16]} rotation={[0, 0, Math.PI / 2]} c={pink} r={SOFT} />
      </group>
      <Cyl s={[0.015, 0.015, 0.19, 10]} position={[0, 0.31, 0.02]} rotation={[1.05, 0, 0]} c={pink} r={SOFT} />
      <group position={[0, 0.33, 0.12]} rotation={[-1.0, 0, 0]}>
        <Cyl s={[0.04, 0.05, 0.06, 20]} position={[0, 0.04, 0]} c={pink} r={SOFT} />
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.05, 0.11, 0.1, 24, 1, true]} />
          <meshStandardMaterial color={pink} roughness={SOFT} side={2} />
        </mesh>
        <Lit s={[0.045, 14, 10]} position={[0, -0.05, 0]} lit={lit} c="#fff1c4" glow="#ffd27a" ei={2} />
      </group>
      <Glow lit={lit} shine={shine} position={[0, 0.25, 0.22]} intensity={1.4} distance={3} color="#ffd6a8" />
    </>
  )
}

// A buttercup lamp: a ribbed yellow foot, a sage neck curving over, and a
// flower for a shade.
export function FlowerLamp({ lit, shine }) {
  const yellow = '#f5b82e'
  return (
    <>
      <Cyl s={[0.14, 0.15, 0.04, 28]} position={[-0.06, 0.02, 0]} c={yellow} r={GLOSS} />
      {[0.06, 0.09, 0.12].map((y) => (
        <Cyl key={y} s={[0.04, 0.04, 0.022, 16]} position={[-0.1, y, 0]} c={yellow} r={GLOSS} />
      ))}
      <Cyl s={[0.016, 0.016, 0.22, 10]} position={[-0.1, 0.24, 0]} c="#9cc9a8" r={GLOSS} />
      <Torus s={[0.1, 0.016, 8, 24, Math.PI]} position={[0, 0.35, 0]} c="#9cc9a8" r={GLOSS} />
      <group position={[0.1, 0.3, 0.02]} rotation={[0.3, 0, -0.5]}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI) / 3
          return (
            <Ball key={i} s={[0.05, 12, 10]} position={[Math.cos(a) * 0.05, -0.02, Math.sin(a) * 0.05]}
              scale={[1, 0.6, 1]} c="#ffd34d" r={GLOSS} />
          )
        })}
        <Cyl s={[0.025, 0.03, 0.05, 12]} position={[0, 0.03, 0]} c="#e89a1e" r={GLOSS} />
        <Lit s={[0.04, 14, 10]} position={[0, -0.05, 0]} lit={lit} c="#fff3d0" glow="#ffcf6a" ei={2} />
      </group>
      <Glow lit={lit} shine={shine} position={[0.1, 0.2, 0.15]} intensity={1.4} distance={3} color="#ffd88a" />
    </>
  )
}

// A soft white bear night light on a wooden stand.
export function BearLight({ lit, shine }) {
  return (
    <>
      <Cyl s={[0.13, 0.13, 0.025, 28]} position={[0, 0.0125, 0]} c="#c8763a" r={0.5} />
      <Lit geometry={Lit.Cyl} s={[0.09, 0.1, 0.17, 24]} position={[0, 0.11, 0]} lit={lit} c="#fbf7f0" glow="#ffe9c4" ei={0.9} />
      <Lit s={[0.09, 24, 16]} position={[0, 0.195, 0]} scale={[1, 0.85, 0.9]} lit={lit} c="#fbf7f0" glow="#ffe9c4" ei={0.9} />
      {[-1, 1].map((side) => (
        <Ball key={side} s={[0.028, 12, 10]} position={[side * 0.06, 0.255, 0]} c="#fbf7f0" r={0.6} />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Ball s={[0.007, 8, 6]} position={[side * 0.028, 0.21, 0.078]} c="#2b2320" />
          <Ball s={[0.014, 8, 6]} position={[side * 0.05, 0.19, 0.072]} scale={[1, 0.6, 0.4]} c="#ef7d6a" />
        </group>
      ))}
      <Ball s={[0.018, 10, 8]} position={[0, 0.195, 0.082]} scale={[1.3, 0.9, 0.6]} c="#f0d9a8" />
      <Glow lit={lit} shine={shine} position={[0, 0.2, 0.15]} intensity={1.1} distance={2.5} color="#ffe2b0" />
    </>
  )
}

// A turned wooden mushroom that glows from under its cap.
export function WoodMushroom({ lit, shine }) {
  return (
    <>
      <Cyl s={[0.04, 0.07, 0.2, 20]} position={[0, 0.1, 0]} c={HONEY} r={0.55} />
      <mesh position={[0, 0.2, 0]} scale={[1, 0.85, 1]}>
        <sphereGeometry args={[0.13, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={HONEY_DARK} roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <circleGeometry args={[0.13, 28]} />
        <meshStandardMaterial color="#f3dcb4" emissive="#ffd9a0" emissiveIntensity={lit ? 1 : 0} side={2} />
      </mesh>
      <Glow lit={lit} shine={shine} position={[0, 0.15, 0.12]} intensity={1.1} distance={2.5} color="#ffd8a0" />
    </>
  )
}

// ------------------------------------------------------------ plants

// A glossy pink tulip in a ringed vase.
export function GlossyTulip() {
  const pink = '#f07fb0'
  return (
    <>
      {[0.035, 0.1, 0.165].map((y) => (
        <Torus key={y} s={[0.075, 0.035, 14, 28]} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]} c={pink} r={GLOSS} />
      ))}
      <Cyl s={[0.07, 0.07, 0.2, 24]} position={[0, 0.1, 0]} c={pink} r={GLOSS} />
      <Cyl s={[0.006, 0.006, 0.18, 6]} position={[0, 0.28, 0]} c="#c8d94a" />
      {[-1, 1].map((side) => (
        <Ball key={side} s={[0.06, 12, 10]} position={[side * 0.06, 0.27, 0]} rotation={[0, 0, side * -0.5]}
          scale={[0.35, 1.5, 0.2]} c="#e2e65a" r={0.5} />
      ))}
      <Ball s={[0.065, 20, 16]} position={[0, 0.38, 0]} scale={[1, 1.1, 1]} c="#f6a3c8" r={GLOSS} />
      {Array.from({ length: 4 }, (_, i) => (
        <Cone key={i} s={[0.025, 0.05, 8]} position={[Math.sin((i * Math.PI) / 2) * 0.04, 0.44, Math.cos((i * Math.PI) / 2) * 0.04]}
          c="#f6a3c8" r={GLOSS} />
      ))}
    </>
  )
}

// White tulips in a clear glass of water.
export function WhiteTulips() {
  const heads = [[0, 0.36, 0], [0.05, 0.33, 0.03], [-0.05, 0.34, -0.02], [0.02, 0.31, -0.05]]
  return (
    <>
      <Cyl s={[0.065, 0.065, 0.2, 20, 1, true]} position={[0, 0.1, 0]} c="#eef6f0" o={0.3} r={0.1} side={2} />
      <Cyl s={[0.06, 0.06, 0.13, 20]} position={[0, 0.065, 0]} c="#cfe6d4" o={0.35} r={0.1} />
      {heads.map(([x, y, z]) => (
        <group key={`${x}${z}`}>
          <Cyl s={[0.005, 0.005, y - 0.03, 6]} position={[x / 2, (y + 0.03) / 2, z / 2]} rotation={[z * 2, 0, -x * 2]} c="#8fbf7f" />
          <Ball s={[0.035, 14, 10]} position={[x, y, z]} scale={[1, 1.35, 1]} c="#fbfbf6" r={0.4} />
        </group>
      ))}
      <Ball s={[0.05, 10, 8]} position={[0.04, 0.24, 0.04]} rotation={[0.3, 0, -0.5]} scale={[0.3, 1.5, 0.2]} c="#8fbf7f" />
    </>
  )
}

// A cheerful sunflower in a terracotta pot.
export function SunflowerPot() {
  return (
    <>
      <Cyl s={[0.1, 0.075, 0.13, 24]} position={[0, 0.065, 0]} c="#d9824a" r={SOFT} />
      <Torus s={[0.1, 0.015, 8, 28]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.13, 0]} c="#d9824a" r={SOFT} />
      <Cyl s={[0.09, 0.09, 0.01, 20]} position={[0, 0.125, 0]} c="#5a3a22" />
      <Cyl s={[0.012, 0.012, 0.18, 8]} position={[0, 0.22, 0]} c="#5f9a4a" />
      {[-1, 1].map((side) => (
        <Ball key={side} s={[0.05, 12, 10]} position={[side * 0.05, 0.21, 0]} rotation={[0, 0, side * 0.6]}
          scale={[1, 0.5, 0.25]} c="#6fae58" r={SOFT} />
      ))}
      <group position={[0, 0.33, 0.01]}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6
          return (
            <Ball key={i} s={[0.03, 10, 8]} position={[Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0]}
              rotation={[0, 0, a]} scale={[1.4, 0.7, 0.35]} c="#f6c32c" r={SOFT} />
          )
        })}
        <Ball s={[0.05, 16, 12]} position={[0, 0, 0.01]} scale={[1, 1, 0.45]} c="#8b5a2b" r={SOFT} />
      </group>
    </>
  )
}

// A plump succulent in a bright orange pot.
export function SucculentPot() {
  return (
    <>
      <Cyl s={[0.1, 0.075, 0.13, 24]} position={[0, 0.065, 0]} c="#ef8a2c" r={SOFT} />
      <Cyl s={[0.105, 0.105, 0.03, 24]} position={[0, 0.13, 0]} c="#ef8a2c" r={SOFT} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 7
        return (
          <Ball key={i} s={[0.045, 12, 10]} position={[Math.sin(a) * 0.05, 0.19, Math.cos(a) * 0.05]}
            rotation={[Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6]} scale={[0.8, 1.4, 0.6]} c={i % 2 ? '#7fb848' : '#9cc95a'} r={SOFT} />
        )
      })}
      <Ball s={[0.04, 12, 10]} position={[0, 0.23, 0]} scale={[0.8, 1.3, 0.8]} c="#a9d36a" r={SOFT} />
    </>
  )
}

// Broad glossy leaves in a cream pot.
export function LeafyPot() {
  return (
    <>
      <Cyl s={[0.11, 0.09, 0.14, 24]} position={[0, 0.07, 0]} c="#ece2c4" r={SOFT} />
      <Cyl s={[0.1, 0.1, 0.01, 20]} position={[0, 0.135, 0]} c="#5a3a22" />
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 5
        return (
          <group key={i} rotation={[0, a, 0]}>
            <Ball s={[0.08, 14, 10]} position={[0, 0.22, 0.07]} rotation={[0.7, 0, 0]} scale={[0.7, 0.12, 1.3]} c="#5fae4a" r={0.45} />
          </group>
        )
      })}
      <Cyl s={[0.008, 0.008, 0.1, 6]} position={[0, 0.18, 0]} c="#4f8a3a" />
    </>
  )
}

// ------------------------------------------------------------ desk things

// A little teal game console with a face, sitting with its legs out. Click
// it and it hops.
export function GameBuddy({ poke }) {
  const body = useRef()
  usePlay(poke, 0.9, (t) => {
    body.current.position.y = Math.sin(t * Math.PI * 2) ** 2 * 0.08 * (1 - t)
  })
  const teal = '#4fb8b0'
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Cyl s={[0.02, 0.02, 0.16, 10]} rotation={[Math.PI / 2, 0, 0]} position={[side * 0.05, 0.03, 0.12]} c="#6a7480" r={SOFT} />
          <Box s={[0.035, 0.05, 0.02]} position={[side * 0.05, 0.05, 0.2]} c="#6a7480" r={SOFT} />
        </group>
      ))}
      <group ref={body}>
        <Box s={[0.2, 0.26, 0.13]} position={[0, 0.17, 0]} c={teal} r={SOFT} />
        {[-1, 1].map((side) => (
          <Cyl key={side} s={[0.016, 0.016, 0.1, 8]} position={[side * 0.11, 0.1, 0.02]} rotation={[0, 0, side * 0.9]} c={teal} r={SOFT} />
        ))}
        <Box s={[0.15, 0.1, 0.005]} position={[0, 0.235, 0.066]} c="#eef3ea" r={0.5} />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Ball s={[0.009, 8, 6]} position={[side * 0.035, 0.245, 0.07]} c="#2b2320" />
            <Ball s={[0.012, 8, 6]} position={[side * 0.05, 0.225, 0.069]} scale={[1, 0.6, 0.3]} c="#f4a6b0" />
          </group>
        ))}
        <Torus s={[0.022, 0.004, 6, 16, Math.PI]} rotation={[0, 0, Math.PI]} position={[0, 0.228, 0.07]} c="#2b2320" />
        <Box s={[0.1, 0.008, 0.005]} position={[-0.02, 0.17, 0.066]} c="#2b6f6a" />
        <Box s={[0.04, 0.012, 0.01]} position={[-0.05, 0.12, 0.068]} c="#f4cf3a" />
        <Box s={[0.012, 0.04, 0.01]} position={[-0.05, 0.12, 0.068]} c="#f4cf3a" />
        <Cyl s={[0.016, 0.016, 0.01, 14]} rotation={[Math.PI / 2, 0, 0]} position={[0.05, 0.09, 0.068]} c="#e85a4a" />
        <Ball s={[0.009, 8, 6]} position={[0.07, 0.12, 0.068]} c="#6cc070" />
        <Cone s={[0.012, 0.02, 3]} rotation={[Math.PI / 2, 0, 0]} position={[0.035, 0.135, 0.07]} c="#5fa8e0" />
        {[-0.07, -0.035].map((x) => (
          <Box key={x} s={[0.025, 0.008, 0.008]} position={[x, 0.08, 0.068]} c="#4a4f6a" />
        ))}
      </group>
    </>
  )
}

// A tiny sage computer with a dark screen and a keyboard step.
export function RetroComputer() {
  return (
    <>
      <Box s={[0.22, 0.05, 0.12]} position={[0, 0.025, 0.06]} c="#bcd8b8" r={SOFT} />
      {[0, 1].map((row) =>
        [0, 1, 2, 3].map((k) => (
          <Box key={`${row}${k}`} s={[0.03, 0.01, 0.025]} position={[-0.06 + k * 0.04, 0.055, 0.04 + row * 0.04]}
            c={row === 0 && k === 3 ? '#f4cf3a' : '#e8f0e4'} r={0.5} />
        ))
      )}
      <Box s={[0.18, 0.17, 0.15]} position={[0, 0.135, -0.05]} c="#bcd8b8" r={SOFT} />
      <Box s={[0.12, 0.1, 0.01]} position={[0, 0.15, 0.026]} c="#2a2a2a" r={0.2} />
      <Box s={[0.06, 0.006, 0.01]} position={[0.03, 0.075, 0.026]} c="#6a8a68" />
    </>
  )
}

// A mint and white mechanical keyboard.
export function Keyboard() {
  return (
    <>
      <Box s={[0.44, 0.025, 0.16]} position={[0, 0.0125, 0]} c="#f6f6f0" r={0.5} />
      {Array.from({ length: 4 }, (_, row) =>
        Array.from({ length: 12 }, (_, k) => (
          <Box key={`${row}-${k}`} s={[0.028, 0.018, 0.028]} position={[-0.19 + k * 0.0345, 0.034, -0.05 + row * 0.034]}
            c={(k + row) % 3 === 0 ? '#9fd4b0' : '#e9f4ec'} r={0.5} />
        ))
      )}
    </>
  )
}

// White headphones on a little stand with a sprout on top.
export function Headphones() {
  return (
    <>
      <Cyl s={[0.075, 0.08, 0.018, 24]} position={[0, 0.009, 0]} c="#e8d4b0" r={0.5} />
      <Cyl s={[0.008, 0.008, 0.3, 8]} position={[0, 0.16, 0]} c="#5a5048" m={0.4} />
      <Box s={[0.13, 0.02, 0.045]} position={[0, 0.315, 0]} c="#e8d4b0" r={0.5} />
      {[-1, 1].map((side) => (
        <Ball key={side} s={[0.02, 8, 6]} position={[side * 0.015, 0.34, 0]} rotation={[0, 0, side * 0.8]} scale={[1, 0.4, 0.6]} c="#8cc98a" />
      ))}
      <Torus s={[0.095, 0.016, 8, 24, Math.PI]} position={[0, 0.235, 0]} c="#f6f4ee" r={0.4} />
      {[-1, 1].map((side) => (
        <Cyl key={side} s={[0.055, 0.055, 0.04, 20]} rotation={[0, 0, Math.PI / 2]} position={[side * 0.095, 0.22, 0]} c="#f6f4ee" r={0.4} />
      ))}
    </>
  )
}

// A studio microphone on a short stand.
export function Microphone() {
  return (
    <>
      <Cyl s={[0.07, 0.08, 0.03, 24]} position={[0, 0.015, 0]} c="#f2f2ec" r={0.4} />
      <Cyl s={[0.012, 0.012, 0.12, 8]} position={[0, 0.09, 0]} c="#4a4842" m={0.4} />
      {[-1, 1].map((side) => (
        <Box key={side} s={[0.012, 0.12, 0.012]} position={[side * 0.05, 0.2, 0]} c="#4a4842" m={0.4} />
      ))}
      <Box s={[0.11, 0.012, 0.012]} position={[0, 0.145, 0]} c="#4a4842" m={0.4} />
      <Cyl s={[0.04, 0.04, 0.12, 20]} position={[0, 0.22, 0]} c="#e8efe2" r={0.4} />
      <Cyl s={[0.042, 0.042, 0.07, 20]} position={[0, 0.3, 0]} c="#5e6a5a" r={0.6} />
      <Ball s={[0.042, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 0.335, 0]} c="#5e6a5a" r={0.6} />
    </>
  )
}

// An iced matcha latte on a cream coaster.
export function Matcha() {
  return (
    <>
      <Cyl s={[0.07, 0.07, 0.01, 20]} position={[0, 0.005, 0]} c="#efe4c8" r={0.5} />
      <Cyl s={[0.045, 0.04, 0.12, 20]} position={[0, 0.07, 0]} c="#a8c97f" r={0.3} />
      <Cyl s={[0.05, 0.045, 0.15, 20, 1, true]} position={[0, 0.085, 0]} c="#f2f8ee" o={0.3} r={0.1} side={2} />
      <Cyl s={[0.004, 0.004, 0.2, 6]} position={[0.015, 0.16, 0]} rotation={[0, 0, -0.12]} c="#9aa0a0" m={0.5} />
    </>
  )
}

// A yellow pencil case with an orange charm and two pencils peeking out.
export function PencilCase() {
  return (
    <>
      <Box s={[0.26, 0.08, 0.09]} position={[0, 0.04, 0]} c="#f6c84a" r={SOFT} />
      <Box s={[0.2, 0.05, 0.01]} position={[-0.02, 0.04, 0.05]} c="#fbf0cc" r={SOFT} />
      <Ball s={[0.016, 10, 8]} position={[0.02, 0.055, 0.058]} c="#f08a2a" />
      {[[0.08, '#f4a6b0'], [0.1, '#c9a8f0']].map(([x, c]) => (
        <group key={x} position={[x, 0.1, 0]} rotation={[0, 0, -0.3]}>
          <Cyl s={[0.008, 0.008, 0.08, 6]} c="#f3d9a8" />
          <Cyl s={[0.009, 0.009, 0.015, 6]} position={[0, 0.045, 0]} c={c} />
        </group>
      ))}
    </>
  )
}

// A little standing desk calendar with stickers for days.
export function DeskCalendar() {
  const dots = ['#f4a6b0', '#ffd34d', '#9fd4b0', '#f08a2a', '#c9a8f0', '#f4a6b0']
  return (
    <>
      <Box s={[0.2, 0.2, 0.01]} position={[0, 0.1, -0.03]} rotation={[-0.25, 0, 0]} c="#c8e07a" r={SOFT} />
      <Box s={[0.19, 0.19, 0.008]} position={[0, 0.1, 0.0]} rotation={[0.18, 0, 0]} c="#fbf3ea" r={SOFT} />
      {dots.map((c, i) => (
        <Cyl key={i} s={[0.018, 0.018, 0.003, 12]} rotation={[Math.PI / 2 + 0.18, 0, 0]}
          position={[-0.05 + (i % 3) * 0.05, 0.08 + Math.floor(i / 3) * 0.05, 0.01 - Math.floor(i / 3) * 0.009]} c={c} />
      ))}
      {[-0.05, 0, 0.05].map((x) => (
        <Torus key={x} s={[0.015, 0.004, 6, 14]} rotation={[0, Math.PI / 2, 0]} position={[x, 0.2, -0.01]} c="#f6f4ee" />
      ))}
    </>
  )
}

// ------------------------------------------------------------ furniture

// A honey-wood desk with a stack of three drawers.
export function WoodenDesk() {
  return (
    <>
      <Box s={[1.1, 0.06, 0.65]} position={[0, 0.74, 0]} c={HONEY} r={0.45} />
      <Box s={[0.06, 0.71, 0.58]} position={[-0.5, 0.355, 0]} c={HONEY_DARK} r={0.5} />
      <Box s={[0.4, 0.71, 0.58]} position={[0.32, 0.355, 0]} c={HONEY_DARK} r={0.5} />
      {[0.14, 0.36, 0.58].map((y) => (
        <group key={y} position={[0.32, y, 0.29]}>
          <Box s={[0.34, 0.18, 0.03]} c={HONEY} r={0.45} />
          <Ball s={[0.025, 10, 8]} position={[0, 0, 0.025]} c="#c25a1e" r={0.4} />
        </group>
      ))}
    </>
  )
}

// An orange desk chair on five castors.
export function OfficeChair() {
  const orange = '#f39a3a'
  const frame = '#4f4a46'
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 5
        return (
          <group key={i} rotation={[0, a, 0]}>
            <Box s={[0.04, 0.03, 0.28]} position={[0, 0.07, 0.14]} c={frame} r={0.5} />
            <Ball s={[0.03, 10, 8]} position={[0, 0.03, 0.27]} c={frame} />
          </group>
        )
      })}
      <Cyl s={[0.03, 0.035, 0.32, 10]} position={[0, 0.24, 0]} c={frame} m={0.3} />
      <Box s={[0.5, 0.06, 0.48]} position={[0, 0.42, 0]} c={frame} r={0.5} />
      <Box s={[0.46, 0.09, 0.44]} position={[0, 0.49, 0.02]} c={orange} r={0.6} />
      <Box s={[0.46, 0.46, 0.06]} position={[0, 0.8, -0.24]} rotation={[-0.08, 0, 0]} c={frame} r={0.5} />
      <Box s={[0.4, 0.4, 0.06]} position={[0, 0.8, -0.2]} rotation={[-0.08, 0, 0]} c={orange} r={0.6} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box s={[0.04, 0.2, 0.04]} position={[side * 0.25, 0.55, -0.02]} c={frame} />
          <Box s={[0.08, 0.04, 0.24]} position={[side * 0.25, 0.66, 0.02]} c={frame} r={0.5} />
        </group>
      ))}
    </>
  )
}

// A coral egg chair on a pedestal, buttoned and piped in white.
export function EggChair() {
  const coral = '#f07870'
  return (
    <>
      <Cyl s={[0.2, 0.24, 0.05, 32]} position={[0, 0.025, 0]} c={coral} r={0.4} />
      <Cyl s={[0.06, 0.09, 0.22, 20]} position={[0, 0.16, 0]} c={coral} r={0.4} />
      <mesh position={[0, 0.6, 0]} scale={[1, 0.85, 0.95]}>
        <sphereGeometry args={[0.44, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.4]} />
        <meshStandardMaterial color={coral} roughness={0.4} side={2} />
      </mesh>
      <mesh position={[0, 0.6, 0]} scale={[1, 1.15, 0.95]}>
        <sphereGeometry args={[0.44, 32, 16, Math.PI * 1.05, Math.PI * 0.9, Math.PI * 0.12, Math.PI * 0.4]} />
        <meshStandardMaterial color={coral} roughness={0.4} side={2} />
      </mesh>
      <Torus s={[0.43, 0.012, 6, 40]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.6, 0]} scale={[1, 0.95, 1]} c="#f6f2ee" m={0.3} r={0.3} />
      <Cyl s={[0.32, 0.32, 0.09, 32]} position={[0, 0.5, 0.03]} c="#f4948c" r={0.8} />
      <Ball s={[0.02, 8, 6]} position={[0, 0.55, 0.03]} c="#d85a52" />
    </>
  )
}

// A chair like a flower: lilac petals around a cream seat on a fluted foot.
export function PetalChair() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 6
        return (
          <Cyl key={i} s={[0.05, 0.08, 0.42, 12]} position={[Math.sin(a) * 0.1, 0.2, Math.cos(a) * 0.1]}
            rotation={[Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25]} c="#efe6d6" r={SOFT} />
        )
      })}
      <Torus s={[0.4, 0.07, 10, 36]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.48, 0]} c="#efe6d6" r={SOFT} />
      <Cyl s={[0.36, 0.36, 0.08, 32]} position={[0, 0.5, 0.02]} c="#f3ead8" r={SOFT} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * (0.62 + (i * 0.76) / 6)
        return (
          <group key={i} position={[Math.cos(a) * 0.36, 0.72, -Math.sin(a) * 0.36 + 0.02]} rotation={[0, a - Math.PI / 2, 0]}>
            <Ball s={[0.24, 18, 14]} rotation={[-0.35, 0, 0]} scale={[0.6, 1, 0.28]} c={i % 2 ? '#c3a6e8' : '#b897e0'} r={SOFT} />
          </group>
        )
      })}
    </>
  )
}

// A swing chair like half an avocado, hung from a wooden stand.
export function AvocadoSwing() {
  return (
    <>
      <Torus s={[0.45, 0.03, 8, 40]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} c={HONEY_DARK} r={0.5} />
      {[-1, 1].map((side) => (
        <Cyl key={side} s={[0.025, 0.03, 1.12, 10]} position={[side * 0.5, 0.58, 0]} rotation={[0, 0, side * -0.09]} c={HONEY_DARK} r={0.5} />
      ))}
      <group position={[0, 1.12, 0]} scale={[1, 1.6, 1]}>
        <Torus s={[0.55, 0.026, 8, 32, Math.PI]} c={HONEY_DARK} r={0.5} />
      </group>
      <Cyl s={[0.006, 0.006, 0.18, 4]} position={[0, 1.88, 0]} c="#d9b54a" m={0.7} r={0.3} />
      <Ball s={[0.5, 28, 20]} position={[0, 1.08, -0.05]} scale={[0.9, 1.35, 0.8]} c="#4a5e2c" r={0.9} />
      <Ball s={[0.46, 28, 20]} position={[0, 1.06, 0.2]} scale={[0.86, 1.3, 0.25]} c="#a8c868" r={SOFT} />
      <Ball s={[0.16, 18, 14]} position={[0, 1.08, 0.3]} scale={[1, 1.15, 0.6]} c="#e6d468" r={SOFT} />
      <Box s={[0.5, 0.08, 0.3]} position={[0, 0.7, 0.24]} c="#cfe08a" r={SOFT} />
    </>
  )
}
