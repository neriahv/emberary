import { useMemo, useRef } from 'react'
import { Shape, ShapeGeometry } from 'three'
import { BRASS, Ball, Box, Cone, Cyl, FloorPatch, Flame, Glow, IRON, Lit, PAPER, Torus, WOOD, WOOD_DARK, useAlways, usePlay } from './parts.jsx'
import { pictureTexture } from './textures.js'

// The wizard's study and the velvet-and-iron pieces, from the reader's own
// reference pictures: plum wood and gold, glowing crystals, potions and
// spellbooks, and grey wrought iron with pink velvet. Conventions as in
// models.jsx: standing at the origin, facing +z; something that hangs on a
// wall has the wall at z = -0.3.

const PLUM = '#4a2a5e'
const PLUM_WOOD = '#5a3a5e'
const GOLD = '#d9b56a'
const LILAC = '#b07dd8'
const VELVET = '#c2457a'
const NOUVEAU = '#4b4f66' // the grey-blue iron of the nouveau pieces

const Gold = (props) => <Box c={GOLD} m={0.6} r={0.3} {...props} />

// A flat shape's texture spread over its whole outline.
function fitUV(geometry) {
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  const position = geometry.attributes.position
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (position.getX(i) - min.x) / (max.x - min.x), (position.getY(i) - min.y) / (max.y - min.y))
  }
  uv.needsUpdate = true
  return geometry
}

// A rectangle whose edges bulge out in scallops (or waves): `step` apart and
// `amp` deep.
function scallopedOutline(width, depth, step, amp) {
  const points = []
  const edge = (x0, y0, x1, y1, nx, ny) => {
    const count = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step))
    const steps = count * 8
    for (let k = 0; k < steps; k++) {
      const t = k / steps
      const bump = Math.abs(Math.sin(Math.PI * t * count)) * amp
      points.push([x0 + (x1 - x0) * t + nx * bump, y0 + (y1 - y0) * t + ny * bump])
    }
  }
  const hw = width / 2
  const hd = depth / 2
  edge(-hw, -hd, hw, -hd, 0, -1)
  edge(hw, -hd, hw, hd, 1, 0)
  edge(hw, hd, -hw, hd, 0, 1)
  edge(-hw, hd, -hw, -hd, -1, 0)
  const shape = new Shape()
  points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)))
  return shape
}

// A rug of that outline lying on the floor, in a colour or a picture.
function ShapedRug({ outline, y = 0.008, color = '#ffffff', map }) {
  const geometry = useMemo(() => fitUV(new ShapeGeometry(outline, 4)), [outline])
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial color={color} map={map ?? null} roughness={1} />
    </mesh>
  )
}

// A cut crystal: two six-sided points base to base.
function CrystalShape({ size = 0.1, color = LILAC, glow = '#9a5ad0', lit = true, ...props }) {
  return (
    <group {...props}>
      <Lit geometry={Lit.Cone} s={[size * 0.5, size * 1.2, 6]} position={[0, size * 0.6, 0]} lit={lit} c={color} glow={glow} ei={1.2} o={0.85} />
      <Lit geometry={Lit.Cone} s={[size * 0.5, size * 0.6, 6]} position={[0, -size * 0.3, 0]} rotation={[Math.PI, 0, 0]} lit={lit} c={color} glow={glow} ei={1.2} o={0.85} />
    </group>
  )
}

// ------------------------------------------------------------ tables

// A round plum-topped table on turned legs, with a brass orrery on it: the
// sun in the middle and the planets on their rings. A click sets the planets
// going round once.
export function OrreryTable({ poke }) {
  const rings = useRef()
  usePlay(poke, 2.4, (t) => {
    if (rings.current) rings.current.rotation.y = t * Math.PI * 2
  })
  return (
    <>
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + Math.PI / 4
        return (
          <group key={k} position={[Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32]}>
            <Cyl s={[0.03, 0.04, 0.62, 10]} position={[0, 0.31, 0]} c={WOOD} r={0.6} />
            <Ball s={[0.05, 10, 8]} position={[0, 0.4, 0]} c={WOOD} r={0.6} />
          </group>
        )
      })}
      <Torus s={[0.32, 0.02, 6, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} c={WOOD_DARK} />
      <Cyl s={[0.48, 0.46, 0.06, 40]} position={[0, 0.65, 0]} c={WOOD} r={0.6} />
      <Cyl s={[0.44, 0.44, 0.012, 40]} position={[0, 0.686, 0]} c={PLUM} r={0.7} />
      <Torus s={[0.3, 0.006, 4, 40]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.693, 0]} c={GOLD} m={0.6} r={0.3} />
      <Torus s={[0.47, 0.012, 6, 48]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.68, 0]} c={GOLD} m={0.6} r={0.3} />
      <Cyl s={[0.08, 0.11, 0.05, 20]} position={[0, 0.715, 0]} c={GOLD} m={0.6} r={0.3} />
      <Cyl s={[0.015, 0.015, 0.32, 8]} position={[0, 0.88, 0]} c={GOLD} m={0.6} r={0.3} />
      <Ball s={[0.09, 20, 16]} position={[0, 1.05, 0]} c="#ffd76a" e="#ffb83a" ei={0.5} r={0.3} />
      <group ref={rings} position={[0, 1.05, 0]}>
        <group rotation={[0.3, 0, 0]}>
          <Torus s={[0.22, 0.008, 6, 48]} rotation={[Math.PI / 2, 0, 0]} c={GOLD} m={0.6} r={0.3} />
          <Ball s={[0.03, 12, 10]} position={[0.22, 0, 0]} c="#7fb8e8" />
        </group>
        <group rotation={[-0.25, 0, 0.3]}>
          <Torus s={[0.3, 0.008, 6, 48]} rotation={[Math.PI / 2, 0, 0]} c={GOLD} m={0.6} r={0.3} />
          <Ball s={[0.04, 12, 10]} position={[-0.3, 0, 0]} c="#e8907f" />
          <Ball s={[0.022, 10, 8]} position={[0, 0, 0.3]} c="#c9a4f0" />
        </group>
      </group>
    </>
  )
}

// A round stone altar with a gold band and violet gems, a brass bowl on top
// holding a great glowing crystal, and a candle either side.
export function CrystalAltar({ lit, shine }) {
  return (
    <>
      <Cyl s={[0.42, 0.48, 0.12, 32]} position={[0, 0.06, 0]} c="#6b6470" r={0.9} />
      <Cyl s={[0.36, 0.4, 0.4, 32]} position={[0, 0.32, 0]} c="#7d7684" r={0.9} />
      <Torus s={[0.38, 0.015, 6, 40]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.48, 0]} c={GOLD} m={0.6} r={0.3} />
      <Torus s={[0.4, 0.015, 6, 40]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.16, 0]} c={GOLD} m={0.6} r={0.3} />
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k * Math.PI) / 3 + Math.PI / 6
        return (
          <Ball key={k} s={[0.04, 4, 2]} scale={[0.7, 1.2, 0.5]} position={[Math.sin(a) * 0.385, 0.32, Math.cos(a) * 0.385]}
            rotation={[0, a, 0]} c={LILAC} e="#9a5ad0" ei={0.5} r={0.2} />
        )
      })}
      <Cyl s={[0.44, 0.44, 0.06, 32]} position={[0, 0.55, 0]} c="#8a8392" r={0.8} />
      <Cyl s={[0.04, 0.07, 0.08, 12]} position={[0, 0.62, 0]} c={GOLD} m={0.6} r={0.3} />
      <Cyl s={[0.15, 0.08, 0.08, 20]} position={[0, 0.7, 0]} c={GOLD} m={0.6} r={0.3} />
      <CrystalShape size={0.2} position={[0, 0.82, 0]} lit={lit} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.3, 0.58, 0.06]}>
          <Cyl s={[0.05, 0.06, 0.03, 14]} position={[0, 0.015, 0]} c={GOLD} m={0.6} r={0.3} />
          <Cyl s={[0.03, 0.03, 0.16, 12]} position={[0, 0.11, 0]} c="#efe6d6" r={0.6} />
          <Flame lit={lit} position={[0, 0.2, 0]} size={0.018} />
        </group>
      ))}
      <Glow lit={lit} shine={shine} position={[0, 1.0, 0.1]} intensity={1.6} distance={3.5} color="#c99cff" />
    </>
  )
}

// ------------------------------------------------------------ seats

// A worn leather armchair with a plum throw over its back and arm.
export function WizardArmchair() {
  const leather = '#6a3a2a'
  return (
    <>
      {[[-0.3, -0.24], [0.3, -0.24], [-0.3, 0.24], [0.3, 0.24]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.035, 0.025, 0.16, 10]} position={[x, 0.08, z]} c={WOOD_DARK} />
      ))}
      <Box s={[0.72, 0.18, 0.62]} position={[0, 0.25, 0]} c={leather} r={0.55} />
      <Box s={[0.56, 0.1, 0.5]} position={[0, 0.39, 0.04]} c="#7a4632" r={0.55} />
      <Box s={[0.72, 0.78, 0.16]} position={[0, 0.72, -0.25]} rotation={[-0.1, 0, 0]} c={leather} r={0.55} />
      <Cyl s={[0.09, 0.09, 0.74, 16]} rotation={[0, 0, Math.PI / 2]} position={[0, 1.1, -0.29]} c={leather} r={0.55} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.37, 0, 0]}>
          <Box s={[0.12, 0.3, 0.6]} position={[0, 0.45, 0]} c={leather} r={0.55} />
          <Cyl s={[0.075, 0.075, 0.62, 14]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.6, 0]} c={leather} r={0.55} />
        </group>
      ))}
      <Box s={[0.5, 0.02, 0.4]} position={[0.05, 0.9, -0.15]} rotation={[-0.45, 0, 0.05]} c={PLUM} r={1} />
      <Box s={[0.16, 0.3, 0.42]} position={[-0.38, 0.52, 0.02]} c={PLUM} r={1} />
      <Box s={[0.17, 0.02, 0.43]} position={[-0.38, 0.4, 0.02]} c={GOLD} r={0.8} />
    </>
  )
}

// The nouveau chair: grey-blue iron that curls, an oval of pink velvet for a
// back, and a plump velvet seat.
export function NouveauChair() {
  return (
    <>
      {[[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.17], [0.19, 0.17]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <Cyl s={[0.022, 0.035, 0.44, 10]} position={[0, 0.22, 0]} c={NOUVEAU} m={0.4} r={0.4} />
          <Ball s={[0.035, 10, 8]} position={[0, 0.3, 0]} c={NOUVEAU} m={0.4} r={0.4} />
        </group>
      ))}
      <Box s={[0.46, 0.05, 0.42]} position={[0, 0.46, 0]} c={NOUVEAU} m={0.4} r={0.4} />
      <Ball s={[0.25, 20, 12]} scale={[0.95, 0.24, 0.85]} position={[0, 0.5, 0.01]} c={VELVET} r={0.85} />
      {[-1, 1].map((side) => (
        <Cyl key={side} s={[0.018, 0.022, 0.8, 8]} position={[side * 0.19, 0.86, -0.19]} rotation={[-0.08, 0, -side * 0.06]} c={NOUVEAU} m={0.4} r={0.4} />
      ))}
      <Torus s={[0.17, 0.02, 6, 32]} scale={[0.9, 1.35, 1]} position={[0, 0.98, -0.21]} c={NOUVEAU} m={0.4} r={0.4} />
      <Ball s={[0.15, 18, 12]} scale={[0.85, 1.25, 0.25]} position={[0, 0.98, -0.21]} c={VELVET} r={0.85} />
      <Torus s={[0.08, 0.016, 6, 20, Math.PI]} position={[0, 1.25, -0.21]} c={NOUVEAU} m={0.4} r={0.4} />
      {[-1, 1].map((side) => (
        <Torus key={side} s={[0.05, 0.014, 6, 16]} position={[side * 0.13, 1.22, -0.21]} c={NOUVEAU} m={0.4} r={0.4} />
      ))}
    </>
  )
}

// A round tub chair: a curved velvet back all the way round to the arms, a
// fat cushion, and iron legs and arm curls.
export function VelvetTubChair() {
  return (
    <>
      {[[-0.26, -0.22], [0.26, -0.22], [-0.26, 0.22], [0.26, 0.22]].map(([x, z]) => (
        <Cyl key={`${x}${z}`} s={[0.022, 0.03, 0.3, 8]} position={[x, 0.15, z]} rotation={[z > 0 ? 0.15 : -0.15, 0, x > 0 ? -0.15 : 0.15]} c={NOUVEAU} m={0.4} r={0.4} />
      ))}
      <Cyl s={[0.36, 0.34, 0.14, 32]} position={[0, 0.34, 0]} c={NOUVEAU} m={0.4} r={0.4} />
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.38, 0.36, 0.56, 32, 1, true, Math.PI * 0.3, Math.PI * 1.4]} />
        <meshStandardMaterial color={VELVET} roughness={0.85} side={2} />
      </mesh>
      <Torus s={[0.37, 0.05, 10, 32, Math.PI * 1.4]} rotation={[Math.PI / 2, 0, Math.PI * 0.8]} position={[0, 0.94, 0]} c={VELVET} r={0.85} />
      <Ball s={[0.32, 24, 12]} scale={[1, 0.3, 1]} position={[0, 0.44, 0.02]} c="#d4558a" r={0.85} />
      {[-1, 1].map((side) => (
        <Torus key={side} s={[0.12, 0.022, 6, 20, Math.PI * 1.5]} rotation={[0, Math.PI / 2, 0]} position={[side * 0.37, 0.62, 0.18]} c={NOUVEAU} m={0.4} r={0.4} />
      ))}
    </>
  )
}

// A chair whose iron back rises in two swan necks, with curving arms down to
// the front of a plump velvet seat.
export function SwanChair() {
  return (
    <>
      {[[-0.2, -0.18, -1], [0.2, -0.18, -1], [-0.2, 0.18, 1], [0.2, 0.18, 1]].map(([x, z, f]) => (
        <Cyl key={`${x}${z}`} s={[0.018, 0.026, 0.47, 8]} position={[x, 0.23, z]} rotation={[f * 0.12, 0, x > 0 ? -0.08 : 0.08]} c={NOUVEAU} m={0.4} r={0.4} />
      ))}
      <Box s={[0.48, 0.04, 0.42]} position={[0, 0.46, 0]} c={NOUVEAU} m={0.4} r={0.4} />
      <Ball s={[0.27, 20, 12]} scale={[0.95, 0.22, 0.85]} position={[0, 0.5, 0.01]} c={VELVET} r={0.85} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Torus s={[0.24, 0.022, 6, 24, Math.PI]} rotation={[0, 0, side > 0 ? -0.25 : Math.PI + 0.25]} position={[side * 0.02, 0.98, -0.2]} scale={[0.6, 1.4, 1]} c={NOUVEAU} m={0.4} r={0.4} />
          <Torus s={[0.2, 0.02, 6, 20, Math.PI / 2]} rotation={[0, -Math.PI / 2, 0]} position={[side * 0.24, 0.5, -0.02]} c={NOUVEAU} m={0.4} r={0.4} />
          <Torus s={[0.04, 0.015, 6, 14]} position={[side * 0.24, 0.52, 0.2]} rotation={[0, Math.PI / 2, 0]} c={NOUVEAU} m={0.4} r={0.4} />
        </group>
      ))}
      <Box s={[0.4, 0.03, 0.03]} position={[0, 0.62, -0.2]} c={NOUVEAU} m={0.4} r={0.4} />
    </>
  )
}

// ------------------------------------------------------------ lights

// A brass lantern hanging from a curled bracket on the wall.
export function BrassLantern({ lit, shine }) {
  const brass = { c: BRASS, m: 0.7, r: 0.3 }
  return (
    <>
      <Box s={[0.12, 0.24, 0.03]} position={[0, 1.95, -0.29]} {...brass} />
      <Box s={[0.03, 0.03, 0.28]} position={[0, 2.02, -0.15]} {...brass} />
      <Torus s={[0.06, 0.012, 6, 16, Math.PI]} position={[0, 1.97, -0.06]} rotation={[0, Math.PI / 2, Math.PI]} {...brass} />
      <Cyl s={[0.006, 0.006, 0.14, 6]} position={[0, 1.86, -0.02]} c={IRON} />
      <group position={[0, 1.62, -0.02]}>
        <Cone s={[0.1, 0.1, 6]} position={[0, 0.2, 0]} {...brass} />
        <Ball s={[0.022, 8, 6]} position={[0, 0.26, 0]} {...brass} />
        <Cyl s={[0.088, 0.088, 0.02, 6]} position={[0, 0.15, 0]} {...brass} />
        <Lit geometry={Lit.Cyl} s={[0.075, 0.065, 0.2, 6]} position={[0, 0.04, 0]} lit={lit} c="#ffe2a8" glow="#ffb347" ei={1.6} o={0.85} />
        <Cyl s={[0.075, 0.075, 0.02, 6]} position={[0, -0.07, 0]} {...brass} />
        <Cone s={[0.045, 0.08, 6]} position={[0, -0.12, 0]} rotation={[Math.PI, 0, 0]} {...brass} />
        <Flame lit={lit} position={[0, 0.02, 0]} size={0.024} />
      </group>
      <Glow lit={lit} shine={shine} position={[0, 1.7, 0.25]} intensity={1.4} distance={3.5} />
    </>
  )
}

// A tall wrought-iron candelabra on curled feet, with three candles.
export function IronCandelabra({ lit, shine }) {
  const iron = { c: NOUVEAU, m: 0.4, r: 0.4 }
  const candle = (x, y) => (
    <group key={x} position={[x, y, 0]}>
      <Cyl s={[0.05, 0.035, 0.04, 12]} position={[0, 0.02, 0]} {...iron} />
      <Cyl s={[0.032, 0.032, 0.22, 12]} position={[0, 0.15, 0]} c="#e9e4da" r={0.6} />
      <Flame lit={lit} position={[0, 0.28, 0]} size={0.02} />
    </group>
  )
  return (
    <>
      {[0, 1, 2].map((k) => {
        const a = (k * Math.PI * 2) / 3
        return (
          <Torus key={k} s={[0.1, 0.02, 6, 16, Math.PI]} position={[Math.sin(a) * 0.12, 0.08, Math.cos(a) * 0.12]} rotation={[0, a + Math.PI / 2, 0]} {...iron} />
        )
      })}
      <Cyl s={[0.03, 0.045, 1.3, 10]} position={[0, 0.74, 0]} {...iron} />
      {[0.5, 1.0].map((y) => <Ball key={y} s={[0.05, 10, 8]} position={[0, y, 0]} {...iron} />)}
      {[-1, 1].map((side) => (
        <Torus key={side} s={[0.11, 0.018, 6, 16, Math.PI]} position={[side * 0.11, 1.38, 0]} rotation={[0, 0, Math.PI]} {...iron} />
      ))}
      {candle(-0.22, 1.38)}
      {candle(0.22, 1.38)}
      {candle(0, 1.42)}
      <Glow lit={lit} shine={shine} position={[0, 1.8, 0.1]} intensity={1.3} distance={3.5} />
    </>
  )
}

// ------------------------------------------------------------ rugs

export function ArcaneRug() {
  return <FloorPatch s={[2.2, 2.2]} c="#ffffff" map={pictureTexture('arcane-rug')} />
}

export function CheckerRug() {
  const outline = useMemo(() => scallopedOutline(2.3, 1.7, 0.32, 0.09), [])
  return <ShapedRug outline={outline} map={pictureTexture('checker-rug')} />
}

export function WaveRug() {
  const layers = useMemo(
    () => [
      [scallopedOutline(1.55, 2.45, 0.3, 0.08), '#4f7fb8'],
      [scallopedOutline(1.2, 2.1, 0.3, 0.07), '#f1e8d6'],
      [scallopedOutline(0.92, 1.82, 0.3, 0.06), '#4f7fb8'],
      [scallopedOutline(0.78, 1.66, 0.6, 0.03), '#9fc0d6'],
    ],
    []
  )
  return layers.map(([outline, color], k) => <ShapedRug key={k} outline={outline} color={color} y={0.008 + k * 0.003} />)
}

export function StarRug() {
  return <FloorPatch s={[1.8, 2.4]} c="#ffffff" map={pictureTexture('star-rug')} />
}

// ------------------------------------------------------------ the wizard's things

// The crystal broom: a crooked stick, gold straw bound in pink, and a pink
// crystal hanging from the handle on a cord. It leans a little.
export function CrystalBroom() {
  return (
    <group rotation={[0, 0, 0.18]}>
      <Cyl s={[0.024, 0.03, 1.25, 10]} position={[0, 0.85, 0]} c={WOOD} r={0.7} />
      <Ball s={[0.04, 10, 8]} position={[0, 1.48, 0]} c={WOOD} r={0.7} />
      <Torus s={[0.034, 0.012, 6, 14]} rotation={[Math.PI / 2, 0, 0]} position={[0, 1.38, 0]} c="#e2c98a" r={0.9} />
      <Cyl s={[0.004, 0.004, 0.22, 4]} position={[0.035, 1.27, 0]} c="#e2c98a" />
      <CrystalShape size={0.06} color="#ff7ad9" glow="#ff4fc8" position={[0.035, 1.12, 0]} />
      <Cone s={[0.2, 0.46, 14]} position={[0, 0.23, 0]} c="#d9a441" r={0.9} />
      <Cyl s={[0.075, 0.08, 0.06, 14]} position={[0, 0.42, 0]} c="#d14fa0" r={0.6} />
      <Cyl s={[0.05, 0.07, 0.06, 14]} position={[0, 0.48, 0]} c="#e8c45a" r={0.8} />
    </group>
  )
}

export function WizardHat() {
  return (
    <>
      <Cyl s={[0.16, 0.16, 0.012, 32]} position={[0, 0.006, 0]} c={PLUM} r={0.9} />
      <Cone s={[0.09, 0.24, 24]} position={[0, 0.13, 0]} c={PLUM} r={0.9} />
      <Cone s={[0.032, 0.11, 12]} position={[0.035, 0.27, 0]} rotation={[0, 0, -0.9]} c={PLUM} r={0.9} />
      <Cyl s={[0.088, 0.094, 0.03, 24]} position={[0, 0.035, 0]} c={GOLD} m={0.5} r={0.4} />
      <Ball s={[0.016, 4, 2]} position={[0, 0.1, 0.07]} c={GOLD} m={0.6} r={0.3} />
    </>
  )
}

// An open spellbook on a little reading stand, a spark floating over it.
export function Spellbook() {
  return (
    <>
      <Box s={[0.24, 0.025, 0.16]} position={[0, 0.0125, 0]} c={WOOD} r={0.7} />
      <Box s={[0.03, 0.08, 0.03]} position={[0, 0.06, -0.05]} c={WOOD} r={0.7} />
      <group position={[0, 0.1, 0]} rotation={[-0.55, 0, 0]}>
        <Box s={[0.28, 0.012, 0.2]} c={PLUM} r={0.7} />
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.068, 0.016, 0]} rotation={[0, 0, -side * 0.08]}>
            <Box s={[0.125, 0.022, 0.18]} c={PAPER} r={0.9} />
            {[-0.05, -0.02, 0.01, 0.04].map((z) => (
              <Box key={z} s={[0.09, 0.002, 0.006]} position={[0, 0.012, z]} c="#6a5a7a" />
            ))}
          </group>
        ))}
      </group>
      <Ball s={[0.014, 8, 6]} position={[0, 0.24, 0.02]} c="#ffe08a" e="#ffd27a" ei={1.2} />
    </>
  )
}

// A round glass flask of glowing potion with a cork.
export function PotionBottle() {
  return (
    <>
      <Ball s={[0.07, 20, 14]} position={[0, 0.07, 0]} c="#d9c4f0" o={0.4} r={0.1} />
      <Ball s={[0.056, 18, 12]} position={[0, 0.062, 0]} c={LILAC} e="#9a5ad0" ei={0.8} r={0.3} />
      <Cyl s={[0.02, 0.026, 0.065, 12]} position={[0, 0.16, 0]} c="#d9c4f0" o={0.45} r={0.1} />
      <Cyl s={[0.022, 0.02, 0.03, 10]} position={[0, 0.205, 0]} c="#b58a5a" r={0.9} />
    </>
  )
}

// A crystal floating over a brass dish, turning slowly.
export function FloatingCrystal({ sample }) {
  const crystal = useRef()
  useAlways((seconds) => {
    if (!crystal.current) return
    crystal.current.position.y = 0.19 + Math.sin(seconds * 1.4) * 0.02
    crystal.current.rotation.y = seconds * 0.6
  }, !sample)
  return (
    <>
      <Cyl s={[0.07, 0.085, 0.03, 20]} position={[0, 0.015, 0]} c={GOLD} m={0.6} r={0.3} />
      <Torus s={[0.06, 0.008, 6, 24]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.032, 0]} c={GOLD} m={0.6} r={0.3} />
      <group ref={crystal} position={[0, 0.19, 0]}>
        <CrystalShape size={0.1} />
      </group>
    </>
  )
}

// A little brass armillary sphere round a violet orb.
export function Armillary() {
  const gold = { c: GOLD, m: 0.6, r: 0.3 }
  return (
    <>
      <Cyl s={[0.06, 0.07, 0.02, 20]} position={[0, 0.01, 0]} {...gold} />
      <Cyl s={[0.012, 0.016, 0.08, 8]} position={[0, 0.06, 0]} {...gold} />
      <group position={[0, 0.19, 0]}>
        <Torus s={[0.09, 0.006, 6, 32]} {...gold} />
        <Torus s={[0.09, 0.006, 6, 32]} rotation={[0, Math.PI / 2, 0]} {...gold} />
        <Torus s={[0.09, 0.006, 6, 32]} rotation={[Math.PI / 2 - 0.4, 0, 0]} {...gold} />
        <Ball s={[0.038, 16, 12]} c="#8e4fc4" e="#7a3ac0" ei={0.5} r={0.3} />
        <Ball s={[0.015, 8, 6]} position={[0, 0.1, 0]} {...gold} />
      </group>
    </>
  )
}

// An ink pot with a white quill standing in it.
export function QuillInk() {
  return (
    <>
      <Cyl s={[0.035, 0.042, 0.05, 16]} position={[0, 0.025, 0]} c="#2b2350" r={0.2} />
      <Cyl s={[0.018, 0.022, 0.02, 12]} position={[0, 0.06, 0]} c="#2b2350" r={0.2} />
      <group position={[0.006, 0.06, 0]} rotation={[0, 0, -0.32]}>
        <Cyl s={[0.003, 0.003, 0.16, 6]} position={[0, 0.08, 0]} c="#e9dfcf" />
        <Ball s={[0.02, 12, 8]} scale={[0.6, 4, 0.18]} position={[0.008, 0.11, 0]} c="#f4e9f7" r={0.9} />
      </group>
    </>
  )
}

// A plum box with its lid open: a little crystal cat and a gem inside.
export function TrinketBox() {
  return (
    <>
      <Box s={[0.24, 0.08, 0.16]} position={[0, 0.04, 0]} c={PLUM} r={0.6} />
      <Box s={[0.25, 0.012, 0.17]} position={[0, 0.006, 0]} c={GOLD} m={0.6} r={0.3} />
      <Box s={[0.25, 0.01, 0.17]} position={[0, 0.078, 0]} c={GOLD} m={0.6} r={0.3} />
      <group position={[0, 0.08, -0.08]} rotation={[-1.9, 0, 0]}>
        <Box s={[0.24, 0.016, 0.16]} position={[0, 0, 0.08]} c={PLUM} r={0.6} />
      </group>
      <group position={[0.04, 0.085, 0.01]}>
        <Ball s={[0.035, 14, 10]} scale={[0.9, 0.9, 1.2]} position={[0, 0.025, 0]} c="#a9c8ff" o={0.75} e="#7aa6ff" ei={0.4} r={0.1} />
        <Ball s={[0.026, 14, 10]} position={[0, 0.07, 0.025]} c="#a9c8ff" o={0.75} e="#7aa6ff" ei={0.4} r={0.1} />
        {[-1, 1].map((side) => (
          <Cone key={side} s={[0.009, 0.022, 6]} position={[side * 0.013, 0.095, 0.025]} c="#a9c8ff" o={0.75} r={0.1} />
        ))}
      </group>
      <Ball s={[0.025, 4, 2]} scale={[1, 1.3, 1]} position={[-0.06, 0.11, 0]} c={LILAC} e="#9a5ad0" ei={0.5} r={0.2} />
    </>
  )
}

// A round mirror of dark glass in a gold frame, a crescent moon and stars on
// it, a violet drop below.
export function MoonMirror() {
  return (
    <group position={[0, 1.7, -0.27]}>
      <Cyl s={[0.24, 0.24, 0.025, 40]} rotation={[Math.PI / 2, 0, 0]} c="#2b2350" r={0.15} m={0.3} />
      <Torus s={[0.25, 0.025, 8, 48]} c={GOLD} m={0.6} r={0.3} />
      <Cyl s={[0.1, 0.1, 0.01, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0.02, 0.02, 0.016]} c={GOLD} m={0.6} r={0.3} />
      <Cyl s={[0.09, 0.09, 0.012, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0.07, 0.04, 0.02]} c="#2b2350" r={0.15} m={0.3} />
      {[[-0.12, 0.1], [-0.08, -0.12], [0.13, -0.1], [-0.15, -0.02]].map(([x, y]) => (
        <Ball key={`${x}${y}`} s={[0.012, 4, 2]} position={[x, y, 0.016]} c={GOLD} e="#ffd27a" ei={0.6} />
      ))}
      <Torus s={[0.03, 0.008, 6, 16]} position={[0, 0.29, 0]} c={GOLD} m={0.6} r={0.3} />
      <Cone s={[0.03, 0.08, 8]} rotation={[Math.PI, 0, 0]} position={[0, -0.3, 0]} c={GOLD} m={0.6} r={0.3} />
      <Ball s={[0.03, 4, 2]} scale={[1, 1.4, 1]} position={[0, -0.37, 0]} c={LILAC} e="#9a5ad0" ei={0.5} />
    </group>
  )
}

// A framed chart of the wizard's things, hung on the wall.
export function SpellChart() {
  return (
    <group position={[0, 1.6, -0.28]}>
      <Gold s={[0.64, 0.64, 0.035]} />
      <mesh position={[0, 0, 0.019]}>
        <planeGeometry args={[0.54, 0.54]} />
        <meshStandardMaterial map={pictureTexture('spell-chart')} roughness={0.8} />
      </mesh>
    </group>
  )
}

// A green chalkboard on a wooden stand, covered in moons, stars and notes.
export function MoonChalkboard() {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.85, 0, 0]}>
          <Box s={[0.12, 0.06, 0.5]} position={[0, 0.03, 0]} c={PLUM_WOOD} r={0.7} />
          <Box s={[0.07, 1.4, 0.07]} position={[0, 0.7, 0]} c={PLUM_WOOD} r={0.7} />
        </group>
      ))}
      <Box s={[1.72, 1.0, 0.06]} position={[0, 1.0, 0]} c={PLUM_WOOD} r={0.7} />
      <mesh position={[0, 1.0, 0.032]}>
        <planeGeometry args={[1.56, 0.86]} />
        <meshStandardMaterial map={pictureTexture('moon-chalkboard')} roughness={0.95} />
      </mesh>
      <Box s={[1.6, 0.03, 0.08]} position={[0, 0.52, 0.05]} c={PLUM_WOOD} r={0.7} />
      <Box s={[0.08, 0.02, 0.02]} position={[0.4, 0.545, 0.05]} c="#f2efe6" r={0.9} />
    </>
  )
}

// A tall mirror in a curling iron frame.
export function StandingMirror() {
  const iron = { c: NOUVEAU, m: 0.4, r: 0.4 }
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.38, 0, 0]}>
          <Box s={[0.08, 1.8, 0.07]} position={[0, 0.95, 0]} {...iron} />
          <Torus s={[0.08, 0.02, 6, 16, Math.PI]} position={[side * 0.04, 0.05, 0]} rotation={[0, 0, side > 0 ? 0 : Math.PI]} {...iron} />
          <Torus s={[0.07, 0.018, 6, 16]} position={[side * -0.04, 1.86, 0]} {...iron} />
        </group>
      ))}
      <Torus s={[0.36, 0.03, 8, 32, Math.PI]} position={[0, 1.8, 0]} {...iron} />
      <Torus s={[0.12, 0.022, 6, 20, Math.PI]} position={[0, 2.05, 0]} {...iron} />
      <Box s={[0.84, 0.07, 0.07]} position={[0, 0.12, 0]} {...iron} />
      <mesh position={[0, 0.98, 0.01]}>
        <planeGeometry args={[0.68, 1.6]} />
        <meshStandardMaterial color="#c9d6e8" metalness={0.9} roughness={0.08} />
      </mesh>
      <Box s={[0.6, 0.02, 0.01]} position={[0.05, 1.3, 0.016]} rotation={[0, 0, 0.7]} c="#ffffff" o={0.35} />
    </>
  )
}

// A chest of pink velvet in iron bands, with a round iron lock.
export function VelvetChest() {
  const iron = { c: NOUVEAU, m: 0.4, r: 0.4 }
  return (
    <>
      {[[-0.36, -0.2], [0.36, -0.2], [-0.36, 0.2], [0.36, 0.2]].map(([x, z]) => (
        <Ball key={`${x}${z}`} s={[0.05, 10, 8]} position={[x, 0.05, z]} {...iron} />
      ))}
      <Box s={[0.8, 0.42, 0.48]} position={[0, 0.29, 0]} c={VELVET} r={0.85} />
      <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.24, 0.24, 0.8, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={VELVET} roughness={0.85} />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Box s={[0.04, 0.44, 0.5]} position={[0, 0.29, 0]} {...iron} />
          <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.04, 24, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={NOUVEAU} metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <Box s={[0.82, 0.04, 0.5]} position={[0, 0.5, 0]} {...iron} />
      <Cyl s={[0.09, 0.09, 0.04, 24]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.42, 0.25]} {...iron} />
      <Box s={[0.02, 0.05, 0.01]} position={[0, 0.41, 0.275]} c="#1a1820" />
      <Ball s={[0.012, 8, 6]} position={[0, 0.44, 0.275]} c="#1a1820" />
    </>
  )
}

// An iron cauldron on three feet, a green potion glowing in it. A click
// stirs it and the bubbles rise.
export function IronCauldron({ poke }) {
  const bubbles = useRef([])
  usePlay(poke, 1.6, (t) => {
    bubbles.current.forEach((bubble, i) => {
      if (!bubble) return
      const phase = (t * 2 + i * 0.3) % 1
      bubble.position.y = 0.62 + (t < 1 ? phase * 0.25 : 0)
      bubble.scale.setScalar(t < 1 ? 1 - phase * 0.6 : 1)
    })
  })
  const iron = { c: '#3a3d4e', m: 0.5, r: 0.45 }
  return (
    <>
      {[0, 1, 2].map((k) => {
        const a = (k * Math.PI * 2) / 3
        return <Cyl key={k} s={[0.03, 0.02, 0.22, 8]} position={[Math.sin(a) * 0.24, 0.1, Math.cos(a) * 0.24]} rotation={[Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]} {...iron} />
      })}
      <Ball s={[0.36, 28, 18]} scale={[1, 0.78, 1]} position={[0, 0.38, 0]} {...iron} />
      <Torus s={[0.3, 0.045, 10, 36]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.62, 0]} {...iron} />
      <Cyl s={[0.28, 0.28, 0.02, 32]} position={[0, 0.6, 0]} c="#7ae08f" e="#4fd06a" ei={0.7} r={0.3} />
      {[[0.08, 0.05], [-0.1, -0.06], [0.02, -0.12]].map(([x, z], i) => (
        <mesh key={i} ref={(el) => (bubbles.current[i] = el)} position={[x, 0.62, z]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#a8f0b5" emissive="#4fd06a" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <Torus key={side} s={[0.07, 0.018, 6, 16]} position={[side * 0.37, 0.48, 0]} rotation={[0, Math.PI / 2, 0]} {...iron} />
      ))}
    </>
  )
}
