import { useMemo } from 'react'
import { ExtrudeGeometry, Path, PlaneGeometry, Shape, ShapeGeometry } from 'three'
import { BRASS, Box, Cyl, Torus } from './parts.jsx'
import { pictureTexture, skyTexture } from './textures.js'
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

// A pointed Gothic arch: two arcs, each as wide as the opening, meeting at
// the top.
function pointedOutline(width, height, Kind = Shape) {
  const half = width / 2
  const spring = height / 2 - width * Math.sin(Math.PI / 3)
  const outline = new Kind()
  outline.moveTo(-half, -height / 2)
  outline.lineTo(half, -height / 2)
  outline.lineTo(half, spring)
  outline.absarc(-half, spring, width, 0, Math.PI / 3, false)
  outline.absarc(half, spring, width, (2 * Math.PI) / 3, Math.PI, false)
  outline.lineTo(-half, -height / 2)
  return outline
}

// Coloured glass laid over the sky: a picture with see-through panes.
function Glass({ geometry, picture }) {
  return (
    <mesh geometry={geometry} position={[0, 0, 0.02]}>
      <meshStandardMaterial map={pictureTexture(picture)} transparent roughness={0.3} depthWrite={false} />
    </mesh>
  )
}

// The noble lancet window: a pointed opening of blue stained glass with gold
// and green tracery, set in dressed stone with a sill on a corbel.
function LancetWindow({ time }) {
  const stone = '#8a8580'
  const { glass, outer, inner } = useMemo(
    () => ({
      glass: fitUV(new ShapeGeometry(pointedOutline(0.86, 1.86), 24)),
      outer: pointedOutline(1.18, 2.1),
      inner: pointedOutline(0.86, 1.86, Path),
    }),
    []
  )
  return (
    <>
      <Sky geometry={glass} time={time} />
      <Glass geometry={glass} picture="stained-lancet" />
      <Frame outer={outer} inner={inner} color={stone} depth={0.16} />
      {[-0.75, -0.35, 0.05].map((y, k) => (
        <group key={y}>
          {[-1, 1].map((side) => (
            <Box key={side} s={[k % 2 ? 0.16 : 0.24, 0.24, 0.2]} position={[side * (0.6 + (k % 2 ? 0.02 : 0.06)), y, 0.08]} c={k % 2 ? '#7d7873' : '#969089'} r={0.95} />
          ))}
        </group>
      ))}
      <Box s={[1.3, 0.1, 0.26]} position={[0, -1.02, 0.12]} c="#969089" r={0.95} />
      <Box s={[0.7, 0.14, 0.2]} position={[0, -1.14, 0.08]} c={stone} r={0.95} />
    </>
  )
}

// A cottage window in dark wood under a rounded hood, with leaded panes.
function CottageWindow({ time }) {
  const wood = '#5a4030'
  const glass = useMemo(() => new PlaneGeometry(0.72, 1.0), [])
  return (
    <>
      <Sky geometry={glass} time={time} />
      <Glass geometry={glass} picture="leaded-glass" />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.44, 0, 0.07]}>
          <Box s={[0.14, 1.2, 0.14]} c={wood} r={0.7} />
          <Box s={[0.18, 0.1, 0.18]} position={[0, 0.5, 0.01]} c="#4a3426" r={0.7} />
        </group>
      ))}
      <Box s={[1.06, 0.1, 0.14]} position={[0, 0.55, 0.07]} c={wood} r={0.7} />
      <Box s={[1.24, 0.1, 0.32]} position={[0, 0.66, 0.14]} c="#4a3426" r={0.7} />
      <Cyl s={[0.17, 0.17, 1.3, 20]} rotation={[0, 0, Math.PI / 2]} position={[0, 0.78, 0.1]} c={wood} r={0.7} />
      <Box s={[1.1, 0.12, 0.28]} position={[0, -0.58, 0.12]} c={wood} r={0.7} />
      <Cyl s={[0.06, 0.06, 1.1, 12]} rotation={[0, 0, Math.PI / 2]} position={[0, -0.66, 0.24]} c="#4a3426" r={0.7} />
      <Bar s={[0.03, 1.0]} color="#2b2320" />
    </>
  )
}

// An arched French window in cream, two doors of small panes under a fan,
// with gold handles.
function FrenchWindow({ time }) {
  const cream = '#f1e6d4'
  const spring = 2.1 / 2 - 0.68
  const { glass, outer, inner } = useMemo(
    () => ({
      glass: fitUV(new ShapeGeometry(archOutline(1.36, 2.1), 24)),
      outer: archOutline(1.52, 2.24),
      inner: archOutline(1.36, 2.1, Path),
    }),
    []
  )
  return (
    <>
      <Sky geometry={glass} time={time} />
      <Frame outer={outer} inner={inner} color={cream} depth={0.12} />
      <Bar s={[0.07, 1.4]} color={cream} position={[0, -0.33, 0.04]} />
      {[-0.34, 0.34].map((x) => <Bar key={x} s={[0.035, 1.4]} color={cream} position={[x, -0.33, 0.04]} />)}
      {[-0.7, -0.35, 0, spring].map((y) => <Bar key={y} s={[1.36, y === spring ? 0.05 : 0.035]} color={cream} position={[0, y, 0.04]} />)}
      <Torus s={[0.36, 0.022, 6, 24, Math.PI]} position={[0, spring, 0.05]} c={cream} r={0.6} />
      {[1, 2, 3, 4, 5].map((k) => {
        const a = (k * Math.PI) / 6
        return (
          <Bar key={k} s={[0.03, 0.68]} color={cream} position={[Math.cos(a) * 0.34, spring + Math.sin(a) * 0.34, 0.04]} rotation={[0, 0, a - Math.PI / 2]} />
        )
      })}
      {[-1, 1].map((side) => (
        <Cyl key={side} s={[0.012, 0.012, 0.22, 8]} position={[side * 0.06, -0.3, 0.1]} c={BRASS} m={0.7} r={0.3} />
      ))}
      <Box s={[1.6, 0.06, 0.18]} position={[0, -1.1, 0.08]} c={cream} r={0.6} />
    </>
  )
}

// The sakura window: a tall arch in honey wood between pink pillars with dark
// capitals, a cherry branch in blossom outside, petals on the sill.
function SakuraWindow({ time }) {
  const honey = '#e3a052'
  const dark = '#4a2c2a'
  const { glass, outer, inner } = useMemo(
    () => ({
      glass: fitUV(new ShapeGeometry(archOutline(0.9, 1.9), 24)),
      outer: archOutline(1.04, 2.02),
      inner: archOutline(0.9, 1.9, Path),
    }),
    []
  )
  return (
    <>
      <Sky geometry={glass} time={time} />
      {[[-0.22, 0.3], [-0.12, 0.42], [-0.3, 0.1], [-0.05, 0.18], [-0.2, -0.05], [-0.34, 0.38]].map(([x, y]) => (
        <mesh key={`${x}${y}`} position={[x, y, 0.015]}>
          <circleGeometry args={[0.07, 12]} />
          <meshStandardMaterial color="#f6a9c4" roughness={0.9} />
        </mesh>
      ))}
      <Bar s={[0.025, 0.7]} color="#6b4a3a" position={[-0.25, 0.2, 0.012]} rotation={[0, 0, 0.6]} />
      <Frame outer={outer} inner={inner} color={honey} depth={0.12} />
      <Bar s={[0.03, 1.9]} color={honey} position={[0.1, 0, 0.04]} />
      {[-0.6, -0.3, 0, 0.3].map((y) => <Bar key={y} s={[0.35, 0.025]} color={honey} position={[0.27, y, 0.04]} />)}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.66, -0.1, 0.08]}>
          <Box s={[0.16, 1.6, 0.16]} c="#f2c4cc" r={0.7} />
          <Box s={[0.24, 0.12, 0.2]} position={[0, 0.84, 0]} c={dark} r={0.6} />
          <Box s={[0.24, 0.12, 0.2]} position={[0, -0.84, 0]} c={dark} r={0.6} />
          <Box s={[0.26, 0.02, 0.22]} position={[0, 0.78, 0]} c={honey} m={0.4} r={0.4} />
        </group>
      ))}
      <Torus s={[0.6, 0.06, 8, 32, Math.PI]} position={[0, 0.5, 0.1]} c={honey} m={0.3} r={0.5} />
      <Torus s={[0.53, 0.035, 8, 32, Math.PI]} position={[0, 0.5, 0.1]} c={dark} r={0.6} />
      <Box s={[1.5, 0.08, 0.26]} position={[0, -1.02, 0.12]} c={dark} r={0.6} />
      {[[-0.3, 0.05], [0.12, 0.1], [0.4, 0.02]].map(([x, z]) => (
        <Box key={x} s={[0.05, 0.005, 0.04]} position={[x, -0.975, 0.12 + z]} rotation={[0, x * 3, 0]} c="#f6a9c4" />
      ))}
    </>
  )
}

// An arched window in lavender stone blocks, teal glass in dark bars.
function StoneWindow({ time }) {
  const stone = '#b9b2c6'
  const { glass, outer, inner } = useMemo(
    () => ({
      glass: fitUV(new ShapeGeometry(archOutline(0.9, 1.7), 24)),
      outer: archOutline(1.16, 1.96),
      inner: archOutline(0.9, 1.7, Path),
    }),
    []
  )
  const bar = '#3a3550'
  return (
    <>
      <Sky geometry={glass} time={time} />
      <mesh geometry={glass} position={[0, 0, 0.02]}>
        <meshStandardMaterial color="#5fd0c8" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <Frame outer={outer} inner={inner} color={stone} depth={0.14} />
      {[-0.7, -0.3, 0.1].map((y) =>
        [-1, 1].map((side) => <Box key={`${y}${side}`} s={[0.15, 0.025, 0.15]} position={[side * 0.52, y, 0.08]} c="#8f88a0" r={0.9} />)
      )}
      {[-0.15, 0.15].map((x) => <Bar key={x} s={[0.035, 1.2]} color={bar} position={[x, -0.25, 0.04]} />)}
      {[-0.55, -0.2, 0.15].map((y) => <Bar key={y} s={[0.9, 0.035]} color={bar} position={[0, y, 0.04]} />)}
      {[-1, 1].map((side) => (
        <Bar key={side} s={[0.035, 0.62]} color={bar} position={[side * 0.12, 0.5, 0.04]} rotation={[0, 0, side * 0.75]} />
      ))}
      <Box s={[1.2, 0.1, 0.24]} position={[0, -0.93, 0.1]} c="#a9a2b8" r={0.9} />
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
  'window-lancet': { Model: onWall(LancetWindow), half: [0.72, 1.2] },
  'window-cottage': { Model: onWall(CottageWindow), half: [0.66, 0.96] },
  'window-french': { Model: onWall(FrenchWindow), half: [0.8, 1.14] },
  'window-sakura': { Model: onWall(SakuraWindow), half: [0.8, 1.08] },
  'window-stone': { Model: onWall(StoneWindow), half: [0.6, 1.0] },
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
