// Ten original geometric designs for Emberary's autumn reading nook.
// Standing models face +z; small pieces fit on existing tables and shelves.
import { Box, Ball, Cyl, Cone, Torus, Glow, WOOD, WOOD_DARK, BRASS } from './parts.jsx'
const ember = '#c5693d',
  cream = '#f2d9af',
  sage = '#64846b',
  ink = '#43342c'
function Legs({ height = 0.45, width = 0.65, depth = 0.4 }) {
  return [-1, 1].flatMap((x) =>
    [-1, 1].map((z) => (
      <Cyl
        key={`${x}:${z}`}
        s={[0.035, 0.045, height, 8]}
        position={[(x * width) / 2, height / 2, (z * depth) / 2]}
        c={WOOD_DARK}
      />
    ))
  )
}
export function ReadingBench() {
  return (
    <>
      <Legs height={0.5} width={1.3} depth={0.5} />
      <Box s={[1.5, 0.12, 0.65]} position={[0, 0.54, 0]} c={WOOD} />
      <Box s={[1.4, 0.15, 0.57]} position={[0, 0.67, 0]} c={sage} />
      <Box s={[1.5, 0.55, 0.09]} position={[0, 0.88, -0.3]} c={WOOD} />
      {[-0.7, 0.7].map((x) => (
        <Box key={x} s={[0.09, 0.3, 0.66]} position={[x, 0.77, 0]} c={WOOD} />
      ))}
    </>
  )
}
export function TeacupLamp({ lit = true, shine }) {
  return (
    <>
      <Cyl s={[0.25, 0.3, 0.05, 24]} position={[0, 0.025, 0]} c={BRASS} />
      <Cyl s={[0.23, 0.17, 0.3, 24]} position={[0, 0.2, 0]} c={cream} />
      <Torus s={[0.12, 0.03, 8, 24]} position={[0.25, 0.21, 0]} c={cream} />
      <Ball s={[0.13, 16, 12]} position={[0, 0.34, 0]} c="#f9be70" e={lit ? '#efb566' : undefined} ei={0.6} />
      <Glow lit={lit} shine={shine} position={[0, 0.4, 0]} intensity={0.8} distance={3} />
    </>
  )
}
export function OwlBookends() {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.22, 0, 0]}>
          <Box s={[0.25, 0.03, 0.25]} position={[0, 0.015, 0]} c={WOOD_DARK} />
          <Ball s={[0.13, 12, 10]} scale={[1, 1.35, 0.7]} position={[0, 0.17, 0]} c={ember} />
          {[-0.055, 0.055].map((x) => (
            <group key={x}>
              <Ball s={[0.055, 10, 8]} position={[x, 0.23, 0.085]} c={cream} />
              <Ball s={[0.02, 8, 6]} position={[x, 0.23, 0.13]} c={ink} />
            </group>
          ))}
          <Cone s={[0.035, 0.07, 3]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.18, 0.11]} c={BRASS} />
        </group>
      ))}
    </>
  )
}
export function EmberTerrarium() {
  return (
    <>
      <Cyl s={[0.27, 0.27, 0.07, 16]} position={[0, 0.035, 0]} c={WOOD} />
      <Ball s={[0.27, 20, 16]} position={[0, 0.3, 0]} c="#b9dfcc" o={0.35} />
      <Cyl s={[0.22, 0.22, 0.08, 16]} position={[0, 0.1, 0]} c={sage} />
      {[-0.1, 0.06, 0.12].map((x, i) => (
        <group key={x} position={[x, 0.13, i * 0.06 - 0.06]}>
          <Cyl s={[0.008, 0.015, 0.15, 6]} position={[0, 0.075, 0]} c={sage} />
          <Ball s={[0.06, 8, 6]} scale={[1, 0.6, 1]} position={[0, 0.15, 0]} c={i === 1 ? ember : sage} />
        </group>
      ))}
    </>
  )
}
export function MoonMobile() {
  return (
    <>
      <Cyl s={[0.2, 0.2, 0.04, 20]} position={[0, 0.02, 0]} c={WOOD_DARK} />
      <Cyl s={[0.012, 0.012, 0.65, 8]} position={[0, 0.35, 0]} c={BRASS} />
      <Torus s={[0.22, 0.025, 8, 32]} position={[0, 0.57, 0]} c={BRASS} />
      {[-0.15, 0, 0.15].map((x, i) => (
        <group key={x}>
          <Box s={[0.005, 0.12 + i * 0.05, 0.005]} position={[x, 0.43 - i * 0.025, 0]} c={BRASS} />
          <Ball s={[0.055, 8, 6]} position={[x, 0.33 - i * 0.05, 0]} c={i === 1 ? cream : ember} />
        </group>
      ))}
    </>
  )
}
export function BookTrolley() {
  return (
    <>
      <Box s={[0.65, 0.07, 0.4]} position={[0, 0.15, 0]} c={sage} />
      <Box s={[0.65, 0.07, 0.4]} position={[0, 0.63, 0]} c={sage} />
      {[-0.28, 0.28].map((x) => (
        <group key={x}>
          <Box s={[0.04, 0.7, 0.04]} position={[x, 0.4, -0.16]} c={BRASS} />
          <Ball key={`wheel${x}`} s={[0.07, 12, 8]} position={[x, 0.07, 0.13]} c={ink} />
          <Ball key={`back${x}`} s={[0.07, 12, 8]} position={[x, 0.07, -0.13]} c={ink} />
        </group>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          s={[0.075, 0.26, 0.24]}
          position={[-0.2 + i * 0.1, 0.31, 0]}
          rotation={[0, 0, 0.05 * i]}
          c={[ember, cream, sage, ink][i]}
        />
      ))}
    </>
  )
}
export function FoxCushion() {
  return (
    <>
      <Ball s={[0.28, 16, 12]} scale={[1, 0.36, 0.8]} position={[0, 0.11, 0]} c={ember} />
      {[-0.16, 0.16].map((x) => (
        <Cone key={x} s={[0.095, 0.16, 3]} position={[x, 0.2, -0.11]} c={ember} />
      ))}
      <Ball s={[0.16, 12, 8]} scale={[1, 0.2, 0.8]} position={[0, 0.18, 0.06]} c={cream} />
      {[-0.09, 0.09].map((x) => (
        <Ball key={x} s={[0.014, 8, 6]} position={[x, 0.19, 0.05]} c={ink} />
      ))}
      <Ball s={[0.022, 8, 6]} position={[0, 0.21, 0.14]} c={ink} />
    </>
  )
}
export function StarTable() {
  return (
    <>
      <Legs width={0.4} depth={0.4} height={0.55} />
      <Cyl s={[0.42, 0.42, 0.07, 5]} position={[0, 0.58, 0]} c={WOOD} />
      {Array.from({ length: 5 }, (_, i) => (
        <Box
          key={i}
          s={[0.25, 0.02, 0.1]}
          position={[Math.sin(i * Math.PI * 0.4) * 0.25, 0.63, Math.cos(i * Math.PI * 0.4) * 0.25]}
          rotation={[0, i * Math.PI * 0.4, 0]}
          c={BRASS}
        />
      ))}
    </>
  )
}
export function RainVase() {
  return (
    <>
      <Ball s={[0.15, 16, 12]} scale={[1, 1.3, 1]} position={[0, 0.18, 0]} c="#7195a5" />
      <Cyl s={[0.08, 0.09, 0.17, 16]} position={[0, 0.36, 0]} c="#7195a5" />
      {[-0.05, 0.02, 0.07].map((x, i) => (
        <group key={x}>
          <Cyl s={[0.006, 0.006, 0.3, 6]} position={[x, 0.55, 0]} c={sage} />
          <Ball s={[0.05, 10, 8]} position={[x, 0.72 - i * 0.03, 0]} c={cream} />
        </group>
      ))}
    </>
  )
}
export function MushroomFootstool() {
  return (
    <>
      <Cyl s={[0.16, 0.22, 0.28, 12]} position={[0, 0.14, 0]} c={cream} />
      <Ball s={[0.36, 20, 12]} scale={[1, 0.45, 1]} position={[0, 0.35, 0]} c={ember} />
      {[
        [0, 0.51, 0],
        [0.18, 0.47, 0.1],
        [-0.19, 0.46, -0.1],
      ].map((p, i) => (
        <Ball key={i} s={[0.045, 8, 6]} scale={[1, 0.25, 1]} position={p} c={cream} />
      ))}
    </>
  )
}
export const EMBER_MODELS = {
  'ember-reading-bench': { Model: ReadingBench, radius: 0.8, height: 1.16 },
  'ember-teacup-lamp': {
    Model: TeacupLamp,
    radius: 0.39,
    height: 0.48,
    light: true,
  },
  'ember-owl-bookends': { Model: OwlBookends, radius: 0.38, height: 0.35 },
  'ember-terrarium': { Model: EmberTerrarium, radius: 0.28, height: 0.57 },
  'ember-moon-mobile': { Model: MoonMobile, radius: 0.25, height: 0.82 },
  'ember-book-trolley': { Model: BookTrolley, radius: 0.4, height: 0.78 },
  'ember-fox-cushion': { Model: FoxCushion, radius: 0.3, height: 0.3 },
  'ember-star-table': { Model: StarTable, radius: 0.43, height: 0.65 },
  'ember-rain-vase': { Model: RainVase, radius: 0.2, height: 0.77 },
  'ember-mushroom-stool': {
    Model: MushroomFootstool,
    radius: 0.36,
    height: 0.52,
  },
}
