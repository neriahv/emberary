import { useRef } from 'react'
import { BRASS, Ball, Box, Candle, Cone, Cyl, Flame, Glow, IRON, Lit, Torus, WOOD, useAlways } from './parts.jsx'

// Every kind of light the shop sells beyond the original lantern, lamp and
// candelabra. Each glows while `lit`, and casts real light too when it may
// (`shine`); clicking one in the room switches it. Conventions as in
// models.jsx.

// A brass wall sconce: a candle in a glass chimney, on a curled arm.
export function Sconce({ lit, shine }) {
  return (
    <>
      <Box s={[0.12, 0.26, 0.02]} position={[0, 1.8, -0.29]} c={BRASS} m={0.7} r={0.3} />
      <Box s={[0.025, 0.025, 0.15]} position={[0, 1.74, -0.21]} c={BRASS} m={0.7} r={0.3} />
      <Cyl s={[0.055, 0.035, 0.04, 14]} position={[0, 1.76, -0.14]} c={BRASS} m={0.7} r={0.3} />
      <Candle position={[0, 1.78, -0.14]} lit={lit} shine={shine} intensity={1.4} />
      <Cyl s={[0.05, 0.05, 0.18, 14, 1, true]} position={[0, 1.88, -0.14]} c="#fff6e0" o={0.3} r={0.1} side={2} />
    </>
  )
}

// A ring of candles hanging on a chain from the top of the walls. In a tall
// room it hangs on a longer chain rather than out of reach.
export function Chandelier({ lit, shine, ceiling = 3 }) {
  const y = Math.min(ceiling - 0.7, 2.5)
  return (
    <>
      <Cyl s={[0.01, 0.01, ceiling - y, 4]} position={[0, (ceiling + y) / 2, 0]} c={IRON} m={0.5} />
      <Torus s={[0.4, 0.025, 8, 40]} rotation={[Math.PI / 2, 0, 0]} position={[0, y, 0]} c={BRASS} m={0.7} r={0.3} />
      <Ball s={[0.07, 12, 10]} position={[0, y - 0.04, 0]} c={BRASS} m={0.7} r={0.3} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3
        return (
          <group key={i}>
            <Box s={[0.4, 0.015, 0.015]} position={[Math.cos(a) * 0.2, y, Math.sin(a) * 0.2]} rotation={[0, -a, 0]} c={BRASS} m={0.7} />
            <Candle position={[Math.cos(a) * 0.4, y + 0.02, Math.sin(a) * 0.4]} lit={lit} />
          </group>
        )
      })}
      <Glow lit={lit} shine={shine} position={[0, y - 0.15, 0]} intensity={3} distance={7} decay={1.3} color="#ffc27a" />
    </>
  )
}

// A brick fireplace with a wooden mantel, as in the green-walled reference.
// Switched off, the logs lie dark in the grate.
export function Fireplace({ lit, shine }) {
  return (
    <>
      <Box s={[1.6, 0.08, 0.7]} position={[0, 0.04, 0.05]} c="#8a8278" r={0.9} />
      <Box s={[1.4, 1.2, 0.5]} position={[0, 0.6, -0.05]} c="#a65a3e" r={0.95} />
      {[0.25, 0.55, 0.85].map((y) => (
        <Box key={y} s={[1.41, 0.012, 0.51]} position={[0, y, -0.05]} c="#d9b8a0" r={1} />
      ))}
      <Box s={[0.8, 0.6, 0.06]} position={[0, 0.38, 0.19]} c="#1a0f0a" r={1} />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.68, 0.19]}>
        <cylinderGeometry args={[0.4, 0.4, 0.06, 24, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#1a0f0a" roughness={1} />
      </mesh>
      <Box s={[1.6, 0.08, 0.62]} position={[0, 1.24, 0]} c={WOOD} r={0.5} />
      {[-0.12, 0.12].map((x) => (
        <Cyl key={x} s={[0.06, 0.06, 0.55, 10]} position={[x, 0.16, 0.08]} rotation={[0, x * 4, Math.PI / 2]} c="#4a2a18" r={1} />
      ))}
      {[[0, 0.38, 0.32], [-0.13, 0.3, 0.22], [0.14, 0.31, 0.24]].map(([x, y, h]) => (
        <Lit key={x} geometry={Lit.Cone} s={[0.09, h, 10]} position={[x, y, 0.1]} lit={lit}
          c={lit ? '#ffb347' : '#3a2a22'} glow="#ff7a1a" ei={1.8} />
      ))}
      {[-0.6, 0.6].map((x) => (
        <group key={x} position={[x, 1.28, 0.05]}>
          <Cyl s={[0.03, 0.03, 0.18, 10]} position={[0, 0.09, 0]} c="#f6ecd6" />
          <Flame lit={lit} position={[0, 0.2, 0]} />
        </group>
      ))}
      <Box s={[0.34, 0.26, 0.03]} position={[0, 1.42, -0.2]} c="#b8893d" m={0.4} r={0.4} />
      <Box s={[0.28, 0.2, 0.01]} position={[0, 1.42, -0.18]} c="#6d9a44" r={0.9} />
      <Glow lit={lit} shine={shine} position={[0, 0.45, 0.45]} intensity={2.6} distance={5} color="#ff8a3d" />
    </>
  )
}

// A carved pumpkin with a candle inside: its face glows while lit.
export function PumpkinLantern({ lit, shine }) {
  const r = 0.2
  const face = lit ? '#ffcf5a' : '#3a1a08'
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4
        return (
          <Ball key={i} s={[r * 0.6, 14, 10]} position={[Math.sin(a) * r * 0.42, r * 0.75, Math.cos(a) * r * 0.42]}
            scale={[0.8, 1, 0.8]} c="#e8792b" r={0.7} />
        )
      })}
      <Cyl s={[0.018, 0.025, 0.08, 6]} position={[0, r * 1.5, 0]} rotation={[0, 0, 0.2]} c="#5a4a22" />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.065, r * 0.95, r * 0.86]} rotation={[0, side * 0.3, 0]}>
          <circleGeometry args={[0.035, 3, Math.PI / 2]} />
          <meshBasicMaterial color={face} />
        </mesh>
      ))}
      <mesh position={[0, r * 0.55, r * 0.9]} scale={[1.8, 0.6, 1]}>
        <circleGeometry args={[0.04, 3, -Math.PI / 2]} />
        <meshBasicMaterial color={face} />
      </mesh>
      <Glow lit={lit} shine={shine} position={[0, 0.2, 0.25]} intensity={1.4} distance={3} color="#ff9a3c" />
    </>
  )
}

// A cast-iron stove with its pipe going up, a kettle on top and the fire
// showing through its little window.
export function WoodStove({ lit, shine }) {
  return (
    <>
      {[[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]].map(([x, z]) => (
        <Box key={`${x}${z}`} s={[0.05, 0.16, 0.05]} position={[x, 0.08, z]} c={IRON} m={0.4} />
      ))}
      <Box s={[0.56, 0.56, 0.48]} position={[0, 0.44, 0]} c="#26211f" m={0.4} r={0.6} />
      <Box s={[0.62, 0.04, 0.54]} position={[0, 0.74, 0]} c="#1c1816" m={0.4} r={0.5} />
      <Box s={[0.34, 0.3, 0.02]} position={[0, 0.42, 0.245]} c="#1c1816" m={0.4} />
      <Lit geometry={Lit.Box} s={[0.26, 0.22, 0.01]} position={[0, 0.42, 0.256]} lit={lit}
        c={lit ? '#ffb347' : '#2a2422'} glow="#ff6a1a" ei={1.6} />
      <Cyl s={[0.07, 0.07, 1.9, 14]} position={[0, 1.71, -0.08]} c="#1c1816" m={0.4} r={0.5} />
      <group position={[0.13, 0.76, 0.08]}>
        <Ball s={[0.08, 14, 10]} position={[0, 0.06, 0]} scale={[1, 0.75, 1]} c="#3e8a86" r={0.4} />
        <Cone s={[0.018, 0.08, 6]} position={[0.08, 0.08, 0]} rotation={[0, 0, -1]} c="#3e8a86" />
        <Torus s={[0.05, 0.008, 6, 16, Math.PI]} position={[0, 0.11, 0]} c={IRON} />
      </group>
      <Glow lit={lit} shine={shine} position={[0, 0.45, 0.4]} intensity={2.2} distance={4.5} color="#ff7a2e" />
    </>
  )
}

// A string of warm bulbs looped across a wall, as in the bookshop and pastel
// references.
export function FairyLights({ lit, shine }) {
  const strand = (half, top, sag, count) =>
    Array.from({ length: count }, (_, i) => {
      const x = -half + (i * 2 * half) / (count - 1)
      return [x, top - sag * (1 - (x / half) ** 2)]
    })
  const loops = [strand(0.85, 2.35, 0.3, 15), strand(0.55, 2.05, 0.18, 9)]
  return (
    <>
      {[-0.85, 0.85].map((x) => (
        <Ball key={x} s={[0.02, 8, 6]} position={[x, 2.35, -0.28]} c={BRASS} m={0.6} />
      ))}
      {loops.map((points, k) =>
        points.map(([x, y], i) => {
          const next = points[i + 1]
          return (
            <group key={`${k}-${i}`}>
              <Lit s={[0.025, 10, 8]} position={[x, y - 0.03, -0.25]} lit={lit} c="#fff4d0" glow="#ffd27a" ei={2.2} />
              {next && (
                <Box s={[Math.hypot(next[0] - x, next[1] - y), 0.006, 0.006]} position={[(x + next[0]) / 2, (y + next[1]) / 2, -0.26]}
                  rotation={[0, 0, Math.atan2(next[1] - y, next[0] - x)]} c="#3a3a2a" />
              )}
            </group>
          )
        })
      )}
      <Glow lit={lit} shine={shine} position={[0, 2.0, 0.1]} intensity={1.4} distance={3.5} color="#ffd9a0" />
    </>
  )
}

// A round paper lantern on a cord from above.
export function PaperLantern({ lit, shine, ceiling = 3 }) {
  const y = Math.min(ceiling - 0.6, 2.3)
  return (
    <>
      <Cyl s={[0.005, 0.005, ceiling - y - 0.22, 4]} position={[0, (ceiling + y + 0.22) / 2, 0]} c="#3a3a2a" />
      <Lit s={[0.26, 24, 18]} position={[0, y, 0]} scale={[1, 0.85, 1]} lit={lit} c="#ffd6e2" glow="#ffc2d4" ei={0.9} />
      {[-0.12, 0, 0.12].map((dy) => (
        <Torus key={dy} s={[Math.sqrt(0.26 ** 2 - (dy / 0.85) ** 2) + 0.002, 0.003, 4, 32]} rotation={[Math.PI / 2, 0, 0]}
          position={[0, y + dy, 0]} c="#f2b8c8" />
      ))}
      <Cyl s={[0.06, 0.06, 0.03, 12]} position={[0, y + 0.22, 0]} c="#3a3a2a" />
      <Glow lit={lit} shine={shine} position={[0, y - 0.1, 0]} intensity={1.8} distance={4.5} color="#ffd0c0" />
    </>
  )
}

// A big pink toadstool whose cap is the lampshade.
export function MushroomLamp({ lit, shine }) {
  return (
    <>
      <Cyl s={[0.13, 0.15, 0.04, 20]} position={[0, 0.02, 0]} c="#fff3e6" r={0.5} />
      <Cyl s={[0.05, 0.08, 0.62, 16]} position={[0, 0.34, 0]} c="#fff3e6" r={0.6} />
      <Lit s={[0.32, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} position={[0, 0.62, 0]} scale={[1, 0.75, 1]} lit={lit}
        c="#f4a3b8" glow="#ff9fbf" ei={0.8} />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.62, 0]}>
        <circleGeometry args={[0.32, 28]} />
        <meshStandardMaterial color="#fff3e6" emissive="#ffd9c4" emissiveIntensity={lit ? 1 : 0} side={2} />
      </mesh>
      {[[0.12, 0.8, 0.12], [-0.15, 0.78, 0.05], [0.02, 0.85, -0.14], [0.2, 0.7, -0.1], [-0.08, 0.72, 0.22]].map(([x, y, z]) => (
        <Ball key={`${x}${z}`} s={[0.035, 8, 6]} position={[x, y, z]} c="#ffffff" />
      ))}
      <Glow lit={lit} shine={shine} position={[0, 0.5, 0]} intensity={1.6} distance={3.5} color="#ffc3d3" />
    </>
  )
}

// A jar of fireflies on a log. While lit, they drift about inside.
export function FireflyJar({ lit, shine, sample }) {
  const flies = useRef([])
  useAlways((seconds) => {
    flies.current.forEach((fly, i) => {
      if (!fly) return
      const a = seconds * (0.6 + i * 0.13) + i * 2.4
      const rise = (i * 0.037 + seconds * 0.05 * (i % 2 ? 1 : -1)) % 0.16
      fly.position.set(Math.sin(a) * 0.06, 0.24 + (rise + 0.16) % 0.16, Math.cos(a) * 0.06)
    })
  }, lit && !sample)
  return (
    <>
      <Cyl s={[0.16, 0.18, 0.18, 14]} position={[0, 0.09, 0]} c="#6b4a2e" r={1} />
      <Cyl s={[0.15, 0.15, 0.01, 18]} position={[0, 0.183, 0]} c="#d9b48a" r={0.8} />
      <Cyl s={[0.1, 0.1, 0.26, 20, 1, true]} position={[0, 0.32, 0]} c="#e8f4ee" o={0.28} r={0.1} side={2} />
      <Cyl s={[0.085, 0.095, 0.05, 16]} position={[0, 0.47, 0]} c="#b98a5a" r={0.9} />
      <Torus s={[0.1, 0.006, 6, 20]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.44, 0]} c="#c9b28a" />
      {Array.from({ length: 7 }, (_, i) => (
        <Lit key={i} s={[0.012, 6, 6]} lit={lit} c={lit ? '#f2ff9a' : '#6a6a40'} glow="#d8ff5a" ei={2.5}
          position={[Math.sin(i * 2.4) * 0.06, 0.24 + (i % 4) * 0.04, Math.cos(i * 2.4) * 0.06]}
          onUpdate={(mesh) => (flies.current[i] = mesh)} />
      ))}
      <Glow lit={lit} shine={shine} position={[0, 0.35, 0.1]} intensity={1.0} distance={2.5} color="#d8ff8a" />
    </>
  )
}

// A lamp whose light is a glowing orb hanging free under a crescent hook. It
// bobs gently while lit.
export function OrbLamp({ lit, shine, sample }) {
  const orb = useRef()
  useAlways((seconds) => {
    if (orb.current) orb.current.position.y = 1.32 + Math.sin(seconds * 1.6) * 0.04
  }, lit && !sample)
  return (
    <>
      <Cyl s={[0.16, 0.18, 0.04, 20]} position={[0, 0.02, 0]} c="#2a2040" m={0.3} r={0.4} />
      <Cyl s={[0.015, 0.015, 1.5, 8]} position={[0, 0.77, -0.1]} c="#2a2040" m={0.3} r={0.4} />
      <Torus s={[0.14, 0.012, 6, 24, Math.PI * 1.3]} position={[0, 1.42, 0]} rotation={[0, Math.PI / 2, -0.5]} c="#c9a24e" m={0.6} r={0.3} />
      <group ref={orb} position={[0, 1.32, 0]}>
        <Lit s={[0.12, 24, 18]} lit={lit} c="#e9d7ff" glow="#b67dff" ei={1.6} />
        {[0, 1, 2].map((i) => (
          <Ball key={i} s={[0.012, 6, 6]} position={[Math.sin(i * 2.1) * 0.2, (i - 1) * 0.06, Math.cos(i * 2.1) * 0.2]}
            c="#fff1ff" e="#e0b8ff" ei={lit ? 1.5 : 0} />
        ))}
      </group>
      <Glow lit={lit} shine={shine} position={[0, 1.3, 0.1]} intensity={1.8} distance={4} color="#c49bff" />
    </>
  )
}

// Violet and teal crystals growing out of a rock, glowing from within.
export function CrystalCluster({ lit, shine }) {
  const crystals = [[0, 0.5, 0, 0, 0, '#b48cff'], [0.12, 0.36, 0.05, 0.4, -0.2, '#7ee0e0'], [-0.13, 0.4, 0.02, -0.45, 0.1, '#c9a8ff'],
    [0.04, 0.3, 0.14, 0.2, 0.5, '#9a6bff'], [-0.05, 0.28, -0.13, -0.15, -0.5, '#7ee0e0']]
  return (
    <>
      <Ball s={[0.24, 14, 10]} position={[0, 0.05, 0]} scale={[1.3, 0.45, 1]} c="#5a5466" r={0.9} />
      {crystals.map(([x, h, z, tiltZ, tiltX, c]) => (
        <group key={`${x}${z}`} position={[x, 0.08, z]} rotation={[tiltX, 0, tiltZ]}>
          <Lit geometry={Lit.Cyl} s={[0.045, 0.06, h, 6]} position={[0, h / 2, 0]} lit={lit} c={c} glow={c} ei={0.9} o={0.9} />
          <Lit geometry={Lit.Cone} s={[0.045, 0.1, 6]} position={[0, h + 0.05, 0]} lit={lit} c={c} glow={c} ei={0.9} o={0.9} />
        </group>
      ))}
      <Glow lit={lit} shine={shine} position={[0, 0.5, 0.15]} intensity={1.6} distance={3.5} color="#b07dff" />
    </>
  )
}
