import { useMemo } from 'react'
import { ExtrudeGeometry, Path, PlaneGeometry, Shape, ShapeGeometry } from 'three'
import { BRASS, Box, Cyl, Torus } from './parts.jsx'
import { skyTexture } from './textures.js'
import { BLOCKS, alongOf, onWallAt, wallHeight, wallOf } from '../../api'

// The windows the reader buys, one at a time, and hangs on a wall: each is
// drawn on the wall's face with the sky (at the reader's time of day) behind
// its glass. Like every wall-mounted model, the wall is at z = -0.3; unlike
// the rest, a window is drawn around its own middle, and the room lifts it to
// the height the reader chose and scales it to their size.

// Map a flat shape's texture across its whole outline, so the sky fills it.
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

// An opening with a round top: `width` wide and `height` tall, centred on 0.
function archOutline(width, height, Kind = Shape) {
  const half = width / 2
  const spring = height / 2 - half
  const outline = new Kind()
  outline.moveTo(-half, -height / 2)
  outline.lineTo(half, -height / 2)
  outline.lineTo(half, spring)
  outline.absarc(0, spring, half, 0, Math.PI, false)
  outline.lineTo(-half, -height / 2)
  return outline
}

function polygonOutline(radius, sides, turn, Kind = Shape) {
  const outline = new Kind()
  for (let i = 0; i <= sides; i++) {
    const a = turn + (i * 2 * Math.PI) / sides
    if (i === 0) outline.moveTo(Math.cos(a) * radius, Math.sin(a) * radius)
    else outline.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
  }
  return outline
}

// The sky through the window: glowing a little, so the windows still read as
// windows at night.
const SKY_GLOW = { day: 0.85, dusk: 0.7, night: 0.55 }

function Sky({ geometry, time }) {
  const sky = skyTexture(time)
  return (
    <mesh geometry={geometry} position={[0, 0, 0.012]}>
      <meshStandardMaterial key={time} map={sky} emissive="#ffffff" emissiveMap={sky} emissiveIntensity={SKY_GLOW[time]} />
    </mesh>
  )
}

// A frame: the outline with the glass cut out of it, standing out from the
// wall.
function Frame({ outer, inner, color, depth = 0.1 }) {
  const geometry = useMemo(() => {
    const shape = outer.clone ? outer.clone() : outer
    shape.holes = [inner]
    return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 })
  }, [outer, inner, depth])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  )
}

const Bar = ({ s, color, ...props }) => <Box s={[s[0], s[1], 0.04]} position={[0, 0, 0.04]} c={color} r={0.6} {...props} />

function RoundWindow({ time }) {
  const frame = '#c98a4b'
  const glass = useMemo(() => fitUV(new ShapeGeometry(polygonOutline(0.74, 48, 0), 1)), [])
  return (
    <>
      <Sky geometry={glass} time={time} />
      <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.76, 0.76, 0.12, 48, 1, true]} />
        <meshStandardMaterial color="#e0a868" side={2} roughness={0.8} />
      </mesh>
      <Torus s={[0.77, 0.06, 12, 64]} position={[0, 0, 0.12]} c={frame} r={0.6} />
      <Bar s={[0.05, 1.5]} color={frame} />
      <Bar s={[1.5, 0.05]} color={frame} position={[0, 0.05, 0.04]} />
      <Box s={[0.7, 0.05, 0.14]} position={[0, -0.8, 0.06]} c={frame} r={0.6} />
    </>
  )
}

// A tall window of small panes, with cream curtains drawn back either side.
function PanedWindow({ time }) {
  const frame = '#5a3a24'
  const glass = useMemo(() => new PlaneGeometry(1.0, 1.6), [])
  return (
    <>
      <Sky geometry={glass} time={time} />
      {[[-0.54, 0], [0.54, 0]].map(([x]) => (
        <Box key={x} s={[0.08, 1.76, 0.1]} position={[x, 0, 0.05]} c={frame} r={0.6} />
      ))}
      {[-0.84, 0.84].map((y) => (
        <Box key={y} s={[1.16, 0.08, 0.1]} position={[0, y, 0.05]} c={frame} r={0.6} />
      ))}
      {[-0.167, 0.167].map((x) => <Bar key={x} s={[0.03, 1.6]} color={frame} position={[x, 0, 0.04]} />)}
      {[-0.4, 0, 0.4].map((y) => <Bar key={y} s={[1.0, 0.03]} color={frame} position={[0, y, 0.04]} />)}
      <Box s={[1.3, 0.06, 0.16]} position={[0, -0.88, 0.08]} c={frame} r={0.6} />
      <Cyl s={[0.015, 0.015, 1.7, 8]} rotation={[0, 0, Math.PI / 2]} position={[0, 0.98, 0.14]} c={BRASS} m={0.6} r={0.3} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.7, 0.02, 0.13]}>
          {[-0.06, 0, 0.06].map((dx, i) => (
            <Box key={dx} s={[0.08, 1.9 - i * 0.02, 0.05]} position={[side * dx, 0, i % 2 ? 0.02 : 0]} c="#f3e7cf" r={1} />
          ))}
        </group>
      ))}
    </>
  )
}

// The octagonal window from the green-walled reference.
function OctagonWindow({ time }) {
  const frame = '#d9a55b'
  const { glass, outer, inner } = useMemo(
    () => ({
      glass: fitUV(new ShapeGeometry(polygonOutline(0.72, 8, Math.PI / 8))),
      outer: polygonOutline(0.84, 8, Math.PI / 8),
      inner: polygonOutline(0.72, 8, Math.PI / 8, Path),
    }),
    []
  )
  return (
    <>
      <Sky geometry={glass} time={time} />
      <Frame outer={outer} inner={inner} color={frame} />
      {[0, 1, 2, 3].map((i) => (
        <Bar key={i} s={[0.04, 1.44]} color={frame} rotation={[0, 0, (i * Math.PI) / 4]} position={[0, 0, 0.04]} />
      ))}
      <mesh position={[0, 0, 0.05]} rotation={[0, 0, Math.PI / 8]}>
        <torusGeometry args={[0.36, 0.025, 4, 8]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
    </>
  )
}

// A tall round-topped window with tracery, from the night library reference.
function CathedralWindow({ time }) {
  const frame = '#e8dcc6'
  const { glass, outer, inner } = useMemo(
    () => ({
      glass: fitUV(new ShapeGeometry(archOutline(1.1, 1.8), 24)),
      outer: archOutline(1.3, 1.96),
      inner: archOutline(1.1, 1.8, Path),
    }),
    []
  )
  return (
    <>
      <Sky geometry={glass} time={time} />
      <Frame outer={outer} inner={inner} color={frame} depth={0.14} />
      <Bar s={[0.045, 1.8]} color={frame} />
      {[-0.3, 0.35].map((y) => <Bar key={y} s={[1.1, 0.04]} color={frame} position={[0, y, 0.04]} />)}
      <Torus s={[0.28, 0.022, 6, 24, Math.PI]} position={[0, 0.35, 0.05]} c={frame} r={0.6} />
      <Box s={[1.4, 0.07, 0.2]} position={[0, -0.98, 0.1]} c={frame} r={0.6} />
    </>
  )
}

// Two open arches between columns, with a little balustrade, as on the
// starlit terrace reference.
function ArcadeWindow({ time }) {
  const stone = '#ece6f0'
  const glass = useMemo(() => fitUV(new ShapeGeometry(archOutline(0.72, 1.9), 24)), [])
  return (
    <>
      {[-0.46, 0.46].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Sky geometry={glass} time={time} />
          <Torus s={[0.38, 0.04, 8, 24, Math.PI]} position={[0, 0.59, 0.06]} c={stone} r={0.7} />
          {Array.from({ length: 6 }, (_, i) => (
            <Cyl key={i} s={[0.025, 0.03, 0.34, 8]} position={[-0.28 + i * 0.112, -0.78, 0.1]} c={stone} r={0.7} />
          ))}
          <Box s={[0.76, 0.05, 0.1]} position={[0, -0.59, 0.1]} c={stone} r={0.7} />
        </group>
      ))}
      {[-0.92, 0, 0.92].map((x) => (
        <group key={x} position={[x, 0, 0.08]}>
          <Cyl s={[0.07, 0.08, 1.9, 14]} c={stone} r={0.7} />
          <Box s={[0.2, 0.08, 0.2]} position={[0, 0.95, 0]} c={stone} r={0.7} />
          <Box s={[0.2, 0.08, 0.2]} position={[0, -0.95, 0]} c={stone} r={0.7} />
          {[0.2, 0.45, 0.65].map((y) => (
            <mesh key={y} position={[0.07 * Math.sin(y * 9), y - 0.3, 0.08]}>
              <sphereGeometry args={[0.045, 8, 6]} />
              <meshStandardMaterial color={y > 0.4 ? '#b07dd8' : '#4f7a32'} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

// Each window as a room item: flat against the wall behind it.
const onWall = (Window) =>
  function WallWindow({ time = 'day' }) {
    return (
      <group position={[0, 0, -0.29]}>
        <Window time={time} />
      </group>
    )
  }

// half: how far the window reaches above and below its middle, and either
// side of it, at size 1, so the room can keep it on its wall.
export const WINDOW_MODELS = {
  'window-round': { Model: onWall(RoundWindow), half: [0.84, 0.84] },
  'window-paned': { Model: onWall(PanedWindow), half: [0.82, 0.98] },
  'window-octagon': { Model: onWall(OctagonWindow), half: [0.85, 0.85] },
  'window-cathedral': { Model: onWall(CathedralWindow), half: [0.72, 1.0] },
  'window-arcade': { Model: onWall(ArcadeWindow), half: [1.02, 1.0] },
}

// ------------------------------------------------------------ hanging one

const round2 = (n) => Math.round(n * 100) / 100
const within = (value, low, high) => (low > high ? (low + high) / 2 : Math.min(high, Math.max(low, value)))

// Which wall a window hangs on, and how far along it, are wallOf and alongOf
// in catalog.js, shared with the server, which moves windows with their wall.
export { alongOf, wallOf }

// Where a window of this kind and size may hang: wholly on its wall, between
// the wall's ends, and between the floor and the wall's top, however wide and
// tall the reader made it (sx, sy). Returns { x, z, rotation, y, size }.
export function fitWindow(room, kind, { edge, along, y, size = 1, sx = 1, sy = 1 }) {
  const { half } = WINDOW_MODELS[kind]
  const across = half[0] * size * sx
  const up = half[1] * size * sy
  const top = wallHeight(room, edge.side, edge.i, edge.j) * BLOCKS.wall
  const spot = onWallAt(room, edge, along, across + 0.05)
  const height = round2(within(y, Math.max(0.3, up + 0.05), top - up - 0.05))
  return { ...spot, y: height, size }
}
