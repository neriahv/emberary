import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Color, ExtrudeGeometry, Object3D, PlaneGeometry, Shape } from 'three'
import { BLOCKS, LOFT, cellBox, cutOut, floorCells, loftCells, roomExtent, stairwells, upperCells, wallFace, walls, wallHeight } from '../../api'
import { Box, Cyl, Shadowed, WOOD, WOOD_DARK } from './parts.jsx'
import { floorTexture, slateTexture, wallpaperTexture } from './textures.js'

// The room itself, as the reader has built it, block by block (see "room
// blocks" in catalog.js): a floor tile for every floor block, a wall panel on
// every edge with walls on it, as many blocks high as were stacked there,
// the shape of the walls' tops, the roof or trim, and the loft if they built
// one. Windows are the reader's own, hung on the walls like furniture
// (windows.jsx). Also the ghost of a block the reader is about to put down.

export const CORNER = -2.5
export const WALL = 0.18 // wall thickness
const TRIM = '#5a2f17'
const SIZE = BLOCKS.floor
const LENGTH = SIZE + 2 * WALL // a wall panel, overlapping its neighbours at the corners

// The room's measurements, for the camera: how far the floor reaches and how
// tall the tallest wall is.
export function roomGeometry(room) {
  const { x, z, height } = roomExtent(room)
  return {
    minX: x[0],
    maxX: x[1],
    minZ: z[0],
    maxZ: z[1],
    width: x[1] - x[0],
    depth: z[1] - z[0],
    height,
    centre: [(x[0] + x[1]) / 2, (z[0] + z[1]) / 2],
  }
}

// How a wall on an edge stands (see wallFace in catalog.js: a wall faces the
// floor beside it), and where its panel goes. The panel is drawn in its own
// space (along it 0..LENGTH, up, and WALL thick towards the room along +z)
// and placed by `position` and `rotation`.
export function wallFrame(room, edge) {
  const face = wallFace(room, edge)
  const { side, facing, behind, start } = face
  const at = face.edge
  if (side === 'x') {
    return facing > 0
      ? { ...face, position: [start - WALL, 0, at - behind], rotation: [0, 0, 0] }
      : { ...face, position: [start + SIZE + WALL, 0, at + behind], rotation: [0, Math.PI, 0] }
  }
  return facing > 0
    ? { ...face, position: [at - behind, 0, start + SIZE + WALL], rotation: [0, Math.PI / 2, 0] }
    : { ...face, position: [at + behind, 0, start - WALL], rotation: [0, -Math.PI / 2, 0] }
}

// Every wall in the room, with its frame and height in metres.
export function wallFrames(room) {
  return walls(room).map((w) => ({ ...w, ...wallFrame(room, w), metres: w.height * BLOCKS.wall }))
}

// ------------------------------------------------------------ wall shapes

// The top edge of a wall `length` long, as [along, height] points from one end
// to the other, for each shape the shop sells.
export function wallProfile(shape, length, height) {
  if (shape === 'shape-gable') {
    const peak = Math.min(1.5, length * 0.22)
    return [[0, height], [length / 2, height + peak], [length, height]]
  }
  if (shape === 'shape-arch') {
    const rise = Math.min(1.3, length * 0.18)
    return Array.from({ length: 33 }, (_, i) => {
      const u = (i / 32) * length
      return [u, height + rise * Math.sin((Math.PI * u) / length)]
    })
  }
  if (shape === 'shape-castle') {
    // Battlements: merlons and gaps of equal width, a merlon at each end.
    const parts = Math.max(5, 2 * Math.round(length / 0.9) + 1)
    const step = length / parts
    const points = []
    for (let k = 0; k < parts; k++) {
      const top = height + (k % 2 === 0 ? 0.38 : 0)
      points.push([k * step, top], [(k + 1) * step, top])
    }
    return points
  }
  if (shape === 'shape-steps') {
    // A Dutch stepped gable: four steps up to the middle and four down.
    const steps = 4
    const rise = Math.min(1.4, length * 0.2) / steps
    const run = length / (2 * steps + 1)
    const points = [[0, height]]
    for (let k = 0; k < steps; k++) points.push([k * run + run, height + k * rise], [k * run + run, height + (k + 1) * rise])
    points.push([length - steps * run, height + steps * rise])
    for (let k = steps - 1; k >= 0; k--) points.push([length - k * run - run, height + (k + 1) * rise], [length - k * run - run, height + k * rise])
    points.push([length, height])
    return points
  }
  if (shape === 'shape-spires') {
    // A row of slender Gothic spires with flat stretches between.
    const spires = Math.max(3, Math.round(length / 1.3))
    const step = length / spires
    const points = [[0, height]]
    for (let k = 0; k < spires; k++) {
      const middle = k * step + step / 2
      points.push([middle - step * 0.22, height], [middle, height + 0.7], [middle + step * 0.22, height])
    }
    points.push([length, height])
    return points
  }
  if (shape === 'shape-crown') {
    // A crown: a tall point in the middle, smaller ones either side, and
    // little ones at the ends.
    const peaks = [[0.12, 0.3], [0.31, 0.55], [0.5, 0.95], [0.69, 0.55], [0.88, 0.3]]
    const points = [[0, height]]
    for (const [at, up] of peaks) {
      const half = length * 0.07
      points.push([at * length - half, height + 0.08], [at * length, height + up], [at * length + half, height + 0.08])
    }
    points.push([length, height])
    return points
  }
  if (shape === 'shape-cloud') {
    // Big puffs of cloud, each a different size.
    const puffs = [0.22, 0.32, 0.46, 0.32, 0.22].map((r) => r * Math.min(1, length / 5))
    const widths = puffs.map((r) => r * 2)
    const scale = length / widths.reduce((a, b) => a + b, 0)
    const points = []
    let start = 0
    for (const r of puffs) {
      const width = r * 2 * scale
      for (let k = 0; k <= 12; k++) {
        const u = start + (k / 12) * width
        points.push([u, height + Math.sin((Math.PI * k) / 12) * r * 1.6])
      }
      start += width
    }
    return points
  }
  if (shape === 'shape-twin') {
    const peak = Math.min(1.1, length * 0.16)
    return [[0, height], [length / 4, height + peak], [length / 2, height], [(3 * length) / 4, height + peak], [length, height]]
  }
  if (shape === 'shape-wave') {
    const scallops = Math.max(3, Math.round(length / 0.85))
    return Array.from({ length: scallops * 10 + 1 }, (_, i) => {
      const u = (i / (scallops * 10)) * length
      return [u, height + 0.24 * Math.abs(Math.sin((Math.PI * u * scallops) / length))]
    })
  }
  return [[0, height], [length, height]]
}

// The height of the wall's top at a point along it.
function topAt(profile, u) {
  for (let i = 1; i < profile.length; i++) {
    const [u0, y0] = profile[i - 1]
    const [u1, y1] = profile[i]
    if (u <= u1 && u1 > u0) return y0 + ((y1 - y0) * (u - u0)) / (u1 - u0)
  }
  return profile.at(-1)[1]
}

// Wallpaper is drawn to repeat across the original 5 m x 3 m wall, so the wall
// faces are mapped at that scale: a taller wall shows more pattern, not a
// stretched one.
function scaleUV(geometry, width, height) {
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / width, uv.getY(i) / height)
  uv.needsUpdate = true
  return geometry
}

// One wall panel, extruded `WALL` thick along +z from its shape.
function Wall({ profile, color, wallpaper }) {
  const geometry = useMemo(() => {
    const outline = new Shape()
    outline.moveTo(0, 0)
    outline.lineTo(LENGTH, 0)
    for (const [u, y] of [...profile].reverse()) outline.lineTo(u, y)
    outline.closePath()
    const extruded = new ExtrudeGeometry(outline, { depth: WALL, bevelEnabled: false, curveSegments: 4 })
    return scaleUV(extruded, 5.18, 3)
  }, [profile])
  const map = wallpaperTexture(wallpaper)
  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial key={wallpaper} color={color} map={map} roughness={0.95} />
    </mesh>
  )
}

// The wooden cap along a wall's top, following its shape: one board for each
// straight run of the edge.
function WallTrim({ profile }) {
  const boards = useMemo(() => {
    const result = []
    for (let i = 1; i < profile.length; i++) {
      const [u0, y0] = profile[i - 1]
      const [u1, y1] = profile[i]
      const length = Math.hypot(u1 - u0, y1 - y0)
      if (length < 0.001) continue
      const angle = Math.atan2(y1 - y0, u1 - u0)
      // Out from the wall's top, so the board sits on it rather than in it.
      const nx = -Math.sin(angle) * 0.03
      const ny = Math.cos(angle) * 0.03
      result.push({ key: i, length, angle, at: [(u0 + u1) / 2 + nx, (y0 + y1) / 2 + ny, WALL / 2] })
    }
    return result
  }, [profile])
  return boards.map(({ key, length, angle, at }) => (
    <mesh key={key} position={at} rotation={[0, 0, angle]}>
      <boxGeometry args={[length + 0.06, 0.06, WALL + 0.04]} />
      <meshStandardMaterial color={TRIM} roughness={0.6} />
    </mesh>
  ))
}

// ------------------------------------------------------------ roofs and trims
//
// Each is drawn along one wall, in the wall's own space, so it follows the
// wall wherever the reader built it and whichever way it faces.

// Slate eaves along the top of a wall, sloping down into the room and
// following the wall's shape.
function Eaves({ profile }) {
  const slates = slateTexture()
  const runs = useMemo(() => {
    const result = []
    for (let i = 1; i < profile.length; i++) {
      const [u0, y0] = profile[i - 1]
      const [u1, y1] = profile[i]
      if (Math.abs(u1 - u0) < 0.01) continue
      result.push({ key: i, length: Math.hypot(u1 - u0, y1 - y0), angle: Math.atan2(y1 - y0, u1 - u0), at: [(u0 + u1) / 2, (y0 + y1) / 2 + 0.1] })
    }
    return result
  }, [profile])
  return runs.map(({ key, length, angle, at }) => (
    <group key={key} position={[at[0], at[1], WALL / 2]} rotation={[0, 0, angle]}>
      <mesh rotation={[0.5, 0, 0]} position={[0, -0.12, 0.28]} castShadow>
        <boxGeometry args={[length + 0.05, 0.06, 0.95]} />
        <meshStandardMaterial map={slates} color="#ffffff" roughness={0.8} />
      </mesh>
    </group>
  ))
}

// A glass lean-to along a wall: white glazing bars sloping into the room with
// a pane between them.
function Conservatory({ height }) {
  const slope = 0.35
  const reach = 1.7
  const drop = Math.sin(slope) * (reach / 2)
  const out = WALL + Math.cos(slope) * (reach / 2)
  const bars = []
  for (let u = 0.3; u <= LENGTH; u += 1.0) bars.push(u)
  return (
    <>
      {bars.map((u) => (
        <Box key={u} s={[0.05, 0.06, reach]} position={[u, height - drop, out]} rotation={[slope, 0, 0]} c="#f2efe6" r={0.4} />
      ))}
      <mesh position={[LENGTH / 2, height - drop, out]} rotation={[slope, 0, 0]}>
        <boxGeometry args={[LENGTH, 0.01, reach]} />
        <meshStandardMaterial color="#cfe8ff" transparent opacity={0.22} roughness={0.05} depthWrite={false} />
      </mesh>
      <Box s={[LENGTH, 0.06, 0.06]} position={[LENGTH / 2, height - 2 * drop, WALL + 2 * (out - WALL)]} c="#f2efe6" r={0.4} />
    </>
  )
}

// Ivy along the top of a wall, trailing down in strands of different lengths,
// as in the cozy references. Many leaves, so they are one instanced mesh.
const jitter = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const IVY_GREENS = ['#3f6b3a', '#4f8a45', '#5f9a4a', '#355e30'].map((c) => new Color(c))

function Ivy({ profile, seed }) {
  const mesh = useRef()
  const leaves = useMemo(() => {
    const result = []
    let n = seed * 1000
    for (let u = 0.12; u < LENGTH - 0.05; u += 0.3) {
      const top = topAt(profile, u)
      const strand = 0.2 + jitter(++n) * 1.4
      for (let d = 0; d < strand; d += 0.085) {
        const sway = Math.sin(d * 5 + u) * 0.05
        result.push({ at: [u + sway, top - d + 0.04, WALL + 0.04 + jitter(n + d) * 0.04], size: 0.05 + jitter(n * 3 + d) * 0.03, n: ++n })
      }
      result.push({ at: [u + 0.15, top + 0.05, WALL / 2], size: 0.08, n: ++n })
    }
    return result
  }, [profile, seed])

  useLayoutEffect(() => {
    const dummy = new Object3D()
    leaves.forEach(({ at, size, n }, i) => {
      dummy.position.set(...at)
      dummy.rotation.set(jitter(n) * 3, jitter(n + 1) * 3, 0)
      dummy.scale.set(size, size * 0.45, size * 1.3)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
      mesh.current.setColorAt(i, IVY_GREENS[n % IVY_GREENS.length])
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [leaves])

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, leaves.length]} key={leaves.length} castShadow>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  )
}

// Exposed timber beams across each floor block at the height of the tallest
// wall, with a brace where each meets the first window wall.
function Beams({ room, height }) {
  return (
    <Shadowed>
      {floorCells(room).map(({ i, j }) => {
        const box = cellBox(i, j)
        return [0.7, 1.95, 3.2, 4.45].map((dz) => (
          <Box key={`${i},${j},${dz}`} s={[SIZE + 0.02, 0.18, 0.14]} position={[(box.x[0] + box.x[1]) / 2, height - 0.12, box.z[0] + dz]} c={WOOD_DARK} r={0.8} />
        ))
      })}
    </Shadowed>
  )
}

// ------------------------------------------------------------ the loft

// Where a railing should open for a staircase arriving at the loft's edge.
// `landings` are the points where each staircase's top step is, in the room.
function railingRuns(landings, from, to) {
  const gaps = landings
    .filter(([x, z]) => Math.abs(x - LOFT.edge) < 0.7 && z > from - 0.5 && z < to + 0.5)
    .map(([, z]) => [z - 0.55, z + 0.55])
    .sort((a, b) => a[0] - b[0])
  const runs = []
  let start = from
  for (const [a, b] of gaps) {
    if (a > start + 0.1) runs.push([start, a])
    start = Math.max(start, b)
  }
  if (to > start + 0.1) runs.push([start, to])
  return runs
}

// A gallery along the first window wall, on posts, with a railing along its
// edge, over every floor block where that wall is tall enough. Its floor is
// the room's floor finish.
function Loft({ room, floorColor, floor, landings }) {
  const cells = loftCells(room)
  const width = LOFT.edge - CORNER
  const midX = (CORNER + LOFT.edge) / 2
  const top = useMemo(() => scaleUV(new PlaneGeometry(width, SIZE), SIZE / width, 1), [width])
  // Stretches of loft without a break, so posts and railings run along each.
  const stretches = []
  for (const { j } of [...cells].sort((a, b) => a.j - b.j)) {
    const { z } = cellBox(0, j)
    const last = stretches.at(-1)
    if (last && Math.abs(last[1] - z[0]) < 0.01) last[1] = z[1]
    else stretches.push([...z])
  }

  return (
    <Shadowed>
      {cells.map(({ j }) => {
        const { z } = cellBox(0, j)
        const midZ = (z[0] + z[1]) / 2
        return (
          <group key={j}>
            <Box s={[width, 0.12, SIZE]} position={[midX, LOFT.y - 0.06, midZ]} c={WOOD} r={0.8} />
            <mesh geometry={top} rotation={[-Math.PI / 2, 0, 0]} position={[midX, LOFT.y + 0.002, midZ]}>
              <meshStandardMaterial key={floor} color={floorColor} map={floorTexture(floor)} roughness={0.8} />
            </mesh>
            <Box s={[0.16, 0.22, SIZE]} position={[LOFT.edge - 0.08, LOFT.y - 0.17, midZ]} c={WOOD_DARK} r={0.7} />
          </group>
        )
      })}
      {stretches.map(([from, to]) => {
        const posts = []
        for (let z = to - 0.15; z > from + 0.1; z -= 2.4) posts.push(z)
        return (
          <group key={from}>
            {posts.map((z) => (
              <group key={z}>
                <Box s={[0.14, LOFT.y - 0.12, 0.14]} position={[LOFT.edge - 0.1, (LOFT.y - 0.12) / 2, z]} c={WOOD_DARK} r={0.7} />
                {[-1, 1].map((side) => (
                  <Box key={side} s={[0.08, 0.5, 0.08]} position={[LOFT.edge - 0.1, LOFT.y - 0.42, z + side * 0.2]} rotation={[side * 0.7, 0, 0]} c={WOOD_DARK} r={0.7} />
                ))}
              </group>
            ))}
            {railingRuns(landings, from + 0.1, to - 0.05).map(([a, b]) => {
              const length = b - a
              const balusters = Math.max(2, Math.round(length / 0.2))
              return (
                <group key={a}>
                  <Box s={[0.08, 0.07, length]} position={[LOFT.edge - 0.06, LOFT.y + 0.95, (a + b) / 2]} c={WOOD} r={0.5} />
                  <Box s={[0.06, 0.05, length]} position={[LOFT.edge - 0.06, LOFT.y + 0.1, (a + b) / 2]} c={WOOD} r={0.5} />
                  {Array.from({ length: balusters + 1 }, (_, k) => (
                    <Cyl key={k} s={[0.022, 0.026, 0.85, 6]} position={[LOFT.edge - 0.06, LOFT.y + 0.52, a + (k * length) / balusters]} c={WOOD_DARK} r={0.6} />
                  ))}
                </group>
              )
            })}
          </group>
        )
      })}
    </Shadowed>
  )
}

// ------------------------------------------------------------ upstairs

// A flat piece of floor finish lying from x0..x1, z0..z1, with its pattern
// placed by where it is in the room, so pieces meet without a seam.
function FloorPiece({ x, z, y, color, finish }) {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(x[1] - x[0], z[1] - z[0])
    const position = plane.attributes.position
    const uv = plane.attributes.uv
    const cx = (x[0] + x[1]) / 2
    const cz = (z[0] + z[1]) / 2
    for (let i = 0; i < uv.count; i++) {
      // The plane lies in x and -z once it is turned flat.
      const wx = cx + position.getX(i)
      const wz = cz - position.getY(i)
      uv.setXY(i, (wx - CORNER) / SIZE, 1 - (wz - CORNER) / SIZE)
    }
    uv.needsUpdate = true
    return plane
  }, [x[0], x[1], z[0], z[1]])
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[(x[0] + x[1]) / 2, y, (z[0] + z[1]) / 2]} receiveShadow>
      <meshStandardMaterial key={finish} color={color} map={floorTexture(finish)} roughness={0.8} />
    </mesh>
  )
}

// A wooden railing from one point to another along x or z, at the upstairs
// floor's height.
function Railing({ from, to }) {
  const alongX = Math.abs(to[0] - from[0]) > Math.abs(to[1] - from[1])
  const length = alongX ? Math.abs(to[0] - from[0]) : Math.abs(to[1] - from[1])
  if (length < 0.15) return null
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  const rail = (y, h, w) => (
    <Box s={alongX ? [length, h, w] : [w, h, length]} position={[mid[0], LOFT.y + y, mid[1]]} c={WOOD} r={0.5} />
  )
  const balusters = Math.max(2, Math.round(length / 0.22))
  return (
    <group>
      {rail(0.95, 0.07, 0.08)}
      {rail(0.1, 0.05, 0.06)}
      {Array.from({ length: balusters + 1 }, (_, k) => {
        const t = k / balusters
        const px = from[0] + (to[0] - from[0]) * t
        const pz = from[1] + (to[1] - from[1]) * t
        return <Cyl key={k} s={[0.022, 0.026, 0.85, 6]} position={[px, LOFT.y + 0.52, pz]} c={WOOD_DARK} r={0.6} />
      })}
    </group>
  )
}

// The upstairs floor: a wooden slab over every square laid, at the loft's
// height, in its own finish and colour, with an opening over each staircase.
// A railing runs along every open edge and round each opening, but not on the
// side the stairs arrive at, and posts hold up the open corners.
function UpperFloor({ room, landings }) {
  const cells = upperCells(room)
  if (cells.length === 0) return null
  const holes = stairwells(room)
  const finish = room.upperFloor ?? 'floor-planks'
  const color = room.upperFloorColor ?? room.floorColor
  const has = (i, j) => cells.some((c) => c.i === i && c.j === j)
  const onUpstairs = (x, z) =>
    cells.some(({ i, j }) => {
      const box = cellBox(i, j)
      return x > box.x[0] && x < box.x[1] && z > box.z[0] && z < box.z[1]
    })

  const pieces = []
  const rails = []
  const posts = new Map()
  for (const { i, j } of cells) {
    const box = cellBox(i, j)
    let parts = [{ x: box.x, z: box.z }]
    for (const hole of holes) parts = parts.flatMap((part) => cutOut(part, hole))
    pieces.push(...parts.map((part, n) => ({ key: `${i},${j},${n}`, ...part })))
    // The open edges: no upstairs floor beyond, and no wall along it.
    const edges = [
      [has(i, j - 1) || wallHeight(room, 'x', i, j) > 0, [box.x[0], box.z[0]], [box.x[1], box.z[0]]],
      [has(i, j + 1) || wallHeight(room, 'x', i, j + 1) > 0, [box.x[0], box.z[1]], [box.x[1], box.z[1]]],
      [has(i - 1, j) || wallHeight(room, 'z', i, j) > 0, [box.x[0], box.z[0]], [box.x[0], box.z[1]]],
      [has(i + 1, j) || wallHeight(room, 'z', i + 1, j) > 0, [box.x[1], box.z[0]], [box.x[1], box.z[1]]],
    ]
    for (const [closed, from, to] of edges) {
      if (closed) continue
      rails.push({ key: `${from}|${to}`, from, to })
      for (const point of [from, to]) posts.set(point.join(','), point)
    }
  }
  // Round each opening, on the sides with floor beyond them, except where
  // the stairs come up.
  for (const hole of holes) {
    const sides = [
      ['x0', [hole.x[0], hole.z[0]], [hole.x[0], hole.z[1]], [hole.x[0] - 0.1, (hole.z[0] + hole.z[1]) / 2]],
      ['x1', [hole.x[1], hole.z[0]], [hole.x[1], hole.z[1]], [hole.x[1] + 0.1, (hole.z[0] + hole.z[1]) / 2]],
      ['z0', [hole.x[0], hole.z[0]], [hole.x[1], hole.z[0]], [(hole.x[0] + hole.x[1]) / 2, hole.z[0] - 0.1]],
      ['z1', [hole.x[0], hole.z[1]], [hole.x[1], hole.z[1]], [(hole.x[0] + hole.x[1]) / 2, hole.z[1] + 0.1]],
    ]
    const landing = landings
      .map(([x, z]) => ({ x, z }))
      .find(({ x, z }) => x > hole.x[0] - 0.6 && x < hole.x[1] + 0.6 && z > hole.z[0] - 0.6 && z < hole.z[1] + 0.6)
    let open = null
    if (landing) {
      const distance = {
        x0: Math.abs(landing.x - hole.x[0]),
        x1: Math.abs(landing.x - hole.x[1]),
        z0: Math.abs(landing.z - hole.z[0]),
        z1: Math.abs(landing.z - hole.z[1]),
      }
      open = Object.keys(distance).sort((a, b) => distance[a] - distance[b])[0]
    }
    for (const [name, from, to, beyond] of sides) {
      if (name === open || !onUpstairs(...beyond)) continue
      rails.push({ key: `hole${hole.id}${name}`, from, to })
    }
  }

  return (
    <Shadowed>
      {pieces.map(({ key, x, z }) => (
        <group key={key}>
          <Box s={[x[1] - x[0], 0.14, z[1] - z[0]]} position={[(x[0] + x[1]) / 2, LOFT.y - 0.07, (z[0] + z[1]) / 2]} c={WOOD} r={0.8} />
          <FloorPiece x={x} z={z} y={LOFT.y + 0.002} color={color} finish={finish} />
        </group>
      ))}
      {rails.map(({ key, from, to }) => (
        <Railing key={key} from={from} to={to} />
      ))}
      {[...posts.values()].map(([x, z]) => (
        <Box key={`${x},${z}`} s={[0.16, LOFT.y, 0.16]} position={[x, LOFT.y / 2, z]} c={WOOD_DARK} r={0.7} />
      ))}
    </Shadowed>
  )
}

// ------------------------------------------------------------ set dressing

// The little built-in shelf of the room's own old volumes: set dressing, not
// the reader's books, so they cannot be opened. It stands where the reader
// puts it (see FIXTURES in catalog.js), facing +z like any model.
export function DecorShelf({ color = '#5e3219' }) {
  const volumes = useMemo(() => {
    const leather = ['#5b2a1e', '#2f4a3a', '#6a4a24', '#3a2c4a', '#7a3a24', '#294056', '#4d3a2a']
    const rows = []
    for (let shelf = 0; shelf < 3; shelf++) {
      let x = -0.4
      let i = shelf * 7
      while (x < 0.36) {
        const thick = 0.045 + ((i * 29) % 7) / 200
        const tall = 0.26 + ((i * 17) % 9) / 100
        rows.push({ key: `${shelf}-${i}`, x: x + thick / 2, y: 0.12 + shelf * 0.55 + tall / 2, size: [thick, tall, 0.22], color: leather[i % leather.length] })
        x += thick + 0.004
        i++
      }
    }
    return rows
  }, [])

  return (
    <group>
      <Shadowed>
        <Box s={[0.95, 1.9, 0.03]} position={[0, 0.95, -0.17]} c={color} r={0.9} />
        {[-1, 1].map((side) => (
          <Box key={side} s={[0.05, 1.9, 0.36]} position={[side * 0.45, 0.95, 0]} c={color} r={0.75} />
        ))}
        {[0.1, 0.65, 1.2, 1.75, 1.91].map((y) => (
          <Box key={y} s={[0.9, 0.035, 0.36]} position={[0, y, 0]} c={color} r={0.75} />
        ))}
        {volumes.map((v) => (
          <Box key={v.key} s={v.size} position={[v.x, v.y, 0]} c={v.color} r={0.7} />
        ))}
        <Cyl s={[0.03, 0.03, 0.14, 12]} position={[0.2, 2.0, 0]} c="#f6ecd6" />
      </Shadowed>
    </group>
  )
}

// ------------------------------------------------------------ a block being placed

// The block the reader is about to put down: see-through, outlined, and
// glowing, like a building game's preview. It is not solid until they click.
// The same, in blue, marks a block they are about to pick up, and in red one
// they are about to take away.
const TONES = { add: '#ffb070', pick: '#7fc8ff', remove: '#ff6b5a' }

// A plain box geometry for an outline, built once per size.
const outlines = new Map()
function outlineOf(args) {
  const key = args.join(',')
  if (!outlines.has(key)) outlines.set(key, new BoxGeometry(...args))
  return outlines.get(key)
}

function GhostBox({ args, position, color }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={args} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[outlineOf(args)]} />
        <lineBasicMaterial color="#fff1dc" />
      </lineSegments>
    </group>
  )
}

// Faint outlines on every spot the block could go (or every block that could
// be picked), so the reader can see their choices before they point at one.
function SpotMarker({ args, position }) {
  return (
    <lineSegments position={position}>
      <edgesGeometry args={[outlineOf(args)]} />
      <lineBasicMaterial color="#fff1dc" transparent opacity={0.35} />
    </lineSegments>
  )
}

// A wall spot is shown as the whole see-through wall it would be, faintly, and
// is itself what the reader points at and clicks.
function WallSpot({ args, position, spot, onHover, onPick }) {
  const pointer = onPick
    ? {
        onPointerOver: (event) => {
          event.stopPropagation()
          onHover(spot)
        },
        onPointerOut: () => onHover((current) => (current === spot ? null : current)),
        onClick: (event) => {
          event.stopPropagation()
          if (event.delta > 6) return
          onPick(spot)
        },
      }
    : {}
  return (
    <group position={position}>
      <mesh {...pointer}>
        <boxGeometry args={args} />
        <meshBasicMaterial color="#fff1dc" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[outlineOf(args)]} />
        <lineBasicMaterial color="#fff1dc" transparent opacity={0.35} />
      </lineSegments>
    </group>
  )
}

// `placing` is { kind, spots, hover, tone }: every spot to choose from, and
// the one under the pointer, if any. A wall spot covers `levels` blocks from
// `level` up (one, unless a whole wall is being picked up). With `onHover`
// and `onPick`, each wall spot answers the pointer itself.
export function BlockGhost({ room, placing, onHover, onPick }) {
  const { kind, spots, hover, tone = 'add' } = placing
  const color = TONES[tone]
  if (kind === 'floor' || kind === 'upper') {
    // An upstairs floor block is seen where it would be laid, at the loft's
    // height.
    const y = kind === 'upper' ? LOFT.y - 0.1 : -0.15
    const at = (s) => {
      const box = cellBox(s.i, s.j)
      return [(box.x[0] + box.x[1]) / 2, y, (box.z[0] + box.z[1]) / 2]
    }
    return (
      <>
        {spots.map((s) => (
          <SpotMarker key={`${s.i},${s.j}`} args={[SIZE - 0.1, 0.34, SIZE - 0.1]} position={at(s)} />
        ))}
        {hover && <GhostBox args={[SIZE + 0.02, 0.36, SIZE + 0.02]} position={at(hover)} color={color} />}
      </>
    )
  }
  // A wall block is seen where it would stand: on its edge, at its level.
  const panel = (s) => {
    const levels = s.levels ?? 1
    const level = s.level ?? 0
    return {
      frame: wallFrame(room, s),
      height: levels * BLOCKS.wall,
      bottom: level * BLOCKS.wall,
    }
  }
  return (
    <>
      {spots.map((s) => {
        const { frame, height, bottom } = panel(s)
        return (
          <group key={`${s.side}${s.i},${s.j}`} position={frame.position} rotation={frame.rotation}>
            <WallSpot
              args={[LENGTH, height, WALL + 0.04]}
              position={[LENGTH / 2, bottom + height / 2, WALL / 2]}
              spot={s}
              onHover={onHover}
              onPick={onPick}
            />
          </group>
        )
      })}
      {hover &&
        (() => {
          const { frame, height, bottom } = panel(hover)
          return (
            <group position={frame.position} rotation={frame.rotation}>
              <GhostBox args={[LENGTH + 0.02, height, WALL + 0.04]} position={[LENGTH / 2, bottom + height / 2, WALL / 2]} color={color} />
            </group>
          )
        })()}
    </>
  )
}

// ------------------------------------------------------------ the shell

// How strongly daylight comes through the windows at each time of day. Only
// windows the reader has hung let it in: a room without one is lit only by
// the sky above and its own lamps.
const WINDOW_LIGHT = {
  day: { intensity: 1.6, color: '#ffe2b8' },
  dusk: { intensity: 1.2, color: '#ffb07a' },
  night: { intensity: 0.7, color: '#8fa6ff' },
}

// `daylight` is where the light from the first windows falls into the room.
// Two lights always stand ready, dark until a window needs one: adding a
// light makes three.js rebuild every material, which would stutter.
export default function RoomShell({ room, time, landings = [], daylight = [], upstairs = true }) {
  const { wallColor, floorColor, wallpaper, floor, wallShape, roof } = room
  const frames = wallFrames(room)
  const tallest = roomExtent(room).height
  const floorPlane = useMemo(() => new PlaneGeometry(SIZE, SIZE), [])
  const floorMap = floorTexture(floor)
  const sunlight = WINDOW_LIGHT[time] ?? WINDOW_LIGHT.day

  return (
    <>
      {/* a slab and a floor finish for every floor block */}
      {floorCells(room).map(({ i, j }) => {
        const box = cellBox(i, j)
        const centre = [(box.x[0] + box.x[1]) / 2, (box.z[0] + box.z[1]) / 2]
        return (
          <group key={`${i},${j}`}>
            <mesh position={[centre[0], -0.16, centre[1]]} receiveShadow>
              <boxGeometry args={[SIZE, 0.32, SIZE]} />
              <meshStandardMaterial color={floorColor} roughness={0.9} />
            </mesh>
            <mesh geometry={floorPlane} rotation={[-Math.PI / 2, 0, 0]} position={[centre[0], 0.001, centre[1]]} receiveShadow>
              <meshStandardMaterial key={floor} color={floorColor} map={floorMap} roughness={0.8} />
            </mesh>
          </group>
        )
      })}

      {/* every wall, with its cap, skirting, and the roof or trim along it */}
      {frames.map((w, n) => (
        <WallPanel key={`${w.side}${w.i},${w.j}`} wall={w} seed={n} shape={wallShape} roof={roof} color={wallColor} wallpaper={wallpaper} />
      ))}

      {/* daylight, dusk or moonlight coming in through the first windows */}
      {[0, 1].map((k) => (
        <pointLight
          key={k}
          position={daylight[k] ?? [0, 1.8, 0]}
          intensity={daylight[k] ? sunlight.intensity : 0}
          distance={5}
          decay={1.5}
          color={sunlight.color}
        />
      ))}

      {roof === 'roof-beams' && <Beams room={room} height={tallest} />}
      <Loft room={room} floorColor={floorColor} floor={floor} landings={landings} />
      {upstairs && <UpperFloor room={room} landings={landings} />}
    </>
  )
}

function WallPanel({ wall, seed, shape, roof, color, wallpaper }) {
  const profile = useMemo(() => wallProfile(shape, LENGTH, wall.metres), [shape, wall.metres])
  return (
    <group position={wall.position} rotation={wall.rotation}>
      <Wall profile={profile} color={color} wallpaper={wallpaper} />
      <WallTrim profile={profile} />
      <Box s={[SIZE, 0.12, 0.02]} position={[LENGTH / 2, 0.06, WALL + 0.01]} c={TRIM} r={0.7} />
      {roof === 'roof-slate' && <Eaves profile={profile} />}
      {roof === 'roof-glass' && <Conservatory height={wall.metres} />}
      {roof === 'roof-ivy' && <Ivy profile={profile} seed={seed} />}
    </group>
  )
}
