import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, OrthographicCamera } from '@react-three/drei'
import { MeshStandardMaterial, Plane, Vector3 } from 'three'
import { ROOM_BOUNDS, SHELVED_STATUSES, catalogEntry, coverImageUrl } from '../../api'
import { BOOKCASES, BookcaseFrame, MODELS, Shadowed, bookRowZ, innerWidth, shelfGap, shelfLevels } from './models.jsx'
import { coverSpineTexture, floorTexture, loadCover, skyTexture, spineTexture, wallpaperTexture } from './textures.js'

// The 3D Library Room: a cut-away diorama seen from above one corner, like a
// dollhouse. Two walls meet at the back: the window wall on the left (x = -2.5)
// and the bookcase wall on the right (z = -2.5). The open sides face the viewer.
//
// Every book the reader has started (reading, read, or set aside) stands on
// the shelves, in the order they arranged it, like a real bookcase: the
// built-in one first, then any bookcases they bought. Want to Read books are
// not on the shelves yet. Units are roughly metres.

const HALF = 2.5 // the floor runs -HALF..HALF on x and z
const WALL_HEIGHT = 3
const WALL = 0.18 // wall thickness
const BACKDROP = '#d9764f'

// Only a few lights may shine at once. Every point light costs every pixel of
// every frame, and a room with thirty lanterns should still turn smoothly.
const MAX_ITEM_LIGHTS = 4

// The built-in bookcase, against the right-hand wall.
const MAIN = BOOKCASES.main
const MAIN_AT = [1.05, 0, -HALF + MAIN.depth / 2 + 0.02]
// How far a book slides towards you when it is opened.
const PULL = 0.34

// Thicker books for longer books, taller for older ones, so a shelf does not
// look like a row of identical bricks.
function bookSize(book) {
  const thickness = 0.075 + (Math.min(book.pages, 700) / 700) * 0.07
  const height = 0.42 + ((book.year * 7) % 10) / 100
  return [thickness, height, 0.3]
}

// The books on the shelves, first to last. Books the reader has arranged come
// first, in their saved order; the rest follow in the order they were added,
// so a newly started book appears at the end rather than shuffling the rest.
export function shelfOrder(entries) {
  return entries
    .filter((e) => SHELVED_STATUSES.includes(e.status))
    .sort(
      (a, b) =>
        (a.shelfPosition ?? Infinity) - (b.shelfPosition ?? Infinity) ||
        a.addedAt.localeCompare(b.addedAt) ||
        a.bookId.localeCompare(b.bookId)
    )
}

// The bookcases, in the order books fill them: the built-in one, then every
// bought bookcase standing in the room, oldest first.
export function bookcasesIn(room) {
  const bought = room.items.filter((i) => i.placed && MODELS[i.kind]?.spec)
  return [{ id: 'main', spec: MAIN }, ...bought.map((i) => ({ id: i.id, spec: MODELS[i.kind].spec }))]
}

const GAP = 0.006 // between neighbouring books

// Where a book of this thickness can stand on a shelf, as close to `desired`
// as the books already there allow: the centre of the nearest free space, or
// null if no space is wide enough. A `desired` of -Infinity means leftmost.
export function fitOnShelf(occupied, width, thickness, desired) {
  const sorted = [...occupied].sort((a, b) => a.x - b.x)
  let best = null
  const consider = (from, to) => {
    if (to - from < thickness - 1e-9) return
    const x = Math.min(to - thickness / 2, Math.max(from + thickness / 2, desired))
    if (best === null || Math.abs(x - desired) < Math.abs(best - desired)) best = x
  }
  let start = -width / 2
  for (const book of sorted) {
    consider(start, book.x - book.size[0] / 2 - GAP)
    start = book.x + book.size[0] / 2 + GAP
  }
  consider(start, width / 2)
  return best
}

// Every shelf in the room, top shelf first, one bookcase after another.
function shelvesOf(cases) {
  return cases.flatMap(({ id, spec }) =>
    shelfLevels(spec).map((y, row) => ({ id, row, y, width: innerWidth(spec) }))
  )
}

// Put the books on the shelves. A book the reader placed goes where they put
// it, if there is still room there; every other book fills the free space,
// left to right along each shelf, top shelf to bottom, one bookcase after
// another. Returns each bookcase's books, and how many did not fit anywhere
// (the room says so, rather than drawing them through a wall).
export function layoutBookcases(entries, cases) {
  const placed = Object.fromEntries(cases.map((c) => [c.id, []]))
  const shelves = shelvesOf(cases)
  const onShelf = (shelf) => placed[shelf.id].filter((b) => b.row === shelf.row)
  const put = (entry, size, shelf, x) => placed[shelf.id].push({ entry, size, x, y: shelf.y, row: shelf.row })

  const waiting = []
  for (const entry of shelfOrder(entries)) {
    const spot = entry.shelfSpot
    const shelf = spot && shelves.find((s) => String(s.id) === spot.bookcase && s.row === spot.row)
    const size = bookSize(entry.book)
    const x = shelf ? fitOnShelf(onShelf(shelf), shelf.width, size[0], spot.x) : null
    if (x === null) waiting.push(entry)
    else put(entry, size, shelf, x)
  }

  let next = 0
  for (const shelf of shelves) {
    while (next < waiting.length) {
      const size = bookSize(waiting[next].book)
      const x = fitOnShelf(onShelf(shelf), shelf.width, size[0], -Infinity)
      if (x === null) break
      put(waiting[next], size, shelf, x)
      next += 1
    }
  }
  return { placed, overflow: waiting.length - next }
}

// Ease `current` towards `target`; true while there is still somewhere to go.
// delta is capped because with an on-demand frame loop the first frame after a
// pause can report seconds, which would make every animation jump.
function approach(object, axis, target, delta, speed = 9) {
  const k = 1 - Math.exp(-Math.min(delta, 1 / 30) * speed)
  object.position[axis] += (target - object.position[axis]) * k
  if (Math.abs(target - object.position[axis]) < 0.0005) {
    object.position[axis] = target
    return false
  }
  return true
}

// ------------------------------------------------------------ books

// The spine starts as the drawn one; in the live app the real cover is then
// fetched through the server and painted on instead.
function useSpine(book, material) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    let alive = true
    loadCover(coverImageUrl(book)).then((image) => {
      if (!alive || !image) return
      material.map = coverSpineTexture(book, image)
      material.needsUpdate = true
      invalidate()
    })
    return () => {
      alive = false
    }
  }, [book, material, invalidate])
}

function Book({ entry, size, x, y, selected, interactive, editing, dimmed, onSelect, onDragStart }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const invalidate = useThree((state) => state.invalidate)
  const { book } = entry

  // Covers on the sides, paper on top, bottom and back, the printed spine
  // facing the room. Made once per book, not on every render.
  const materials = useMemo(() => {
    const cover = new MeshStandardMaterial({ color: book.color, roughness: 0.7 })
    const pages = new MeshStandardMaterial({ color: '#efe4cc', roughness: 0.95 })
    const spine = new MeshStandardMaterial({ map: spineTexture(book), roughness: 0.6 })
    return { list: [cover, cover, pages, pages, spine, pages], spine, all: [cover, pages, spine] }
  }, [book])
  useEffect(() => () => materials.all.forEach((m) => m.dispose()), [materials])
  useSpine(book, materials.spine)

  // Glow while it is the open book.
  useEffect(() => {
    materials.spine.emissive.set(selected ? '#ff9a4a' : '#000000')
    materials.spine.emissiveIntensity = selected ? 0.25 : 0
  }, [selected, materials])

  // Faded while it is being carried somewhere else.
  useEffect(() => {
    for (const material of materials.all) {
      material.transparent = dimmed
      material.opacity = dimmed ? 0.3 : 1
    }
    invalidate()
  }, [dimmed, materials, invalidate])

  const restY = y + size[1] / 2
  useLayoutEffect(() => {
    ref.current.position.set(0, restY, 0)
  }, [restY])

  useFrame((state, delta) => {
    const pullTo = selected ? PULL : hovered && (interactive || editing) ? 0.05 : 0
    const liftTo = selected ? restY + 0.03 : restY
    const moving = approach(ref.current, 'z', pullTo, delta) | approach(ref.current, 'y', liftTo, delta)
    if (moving) state.invalidate()
  })

  const hover = {
    onPointerOver: (event) => {
      event.stopPropagation()
      setHovered(true)
      document.body.style.cursor = editing ? 'grab' : 'pointer'
    },
    onPointerOut: () => {
      setHovered(false)
      document.body.style.cursor = ''
    },
  }
  let handlers = {}
  if (editing) {
    // In Edit room a book is picked up and carried to any shelf.
    handlers = {
      ...hover,
      onPointerDown: (event) => {
        event.stopPropagation()
        setHovered(false)
        document.body.style.cursor = 'grabbing'
        onDragStart(entry, size)
      },
    }
  } else if (interactive) {
    handlers = {
      ...hover,
      onClick: (event) => {
        event.stopPropagation()
        onSelect(entry.bookId)
      },
    }
  }

  return (
    <group position={[x, 0, 0]}>
      <mesh ref={ref} material={materials.list} castShadow receiveShadow {...handlers}>
        <boxGeometry args={size} />
        {hovered && !selected && !dimmed && (
          <Html zIndexRange={[4, 0]} position={[0, size[1] / 2 + 0.07, 0.1]} center className="room-tooltip">
            {editing ? `${book.title} · drag to move` : book.title}
          </Html>
        )}
      </mesh>
    </group>
  )
}

// Where the carried book would land, drawn in place before it is dropped.
function GhostBook({ book, size, x, y }) {
  const materials = useMemo(() => {
    const cover = new MeshStandardMaterial({ color: book.color, transparent: true, opacity: 0.8, emissive: '#ffb070', emissiveIntensity: 0.25 })
    const spine = new MeshStandardMaterial({ map: spineTexture(book), transparent: true, opacity: 0.9, emissive: '#ffb070', emissiveIntensity: 0.2 })
    return { list: [cover, cover, cover, cover, spine, cover], all: [cover, spine] }
  }, [book])
  useEffect(() => () => materials.all.forEach((m) => m.dispose()), [materials])
  return (
    <mesh position={[x, y + size[1] / 2, 0.02]} material={materials.list}>
      <boxGeometry args={size} />
    </mesh>
  )
}

// While a book is carried, every shelf becomes a drop target. The targets are
// invisible boards in front of the books, so they catch the pointer first; the
// one under the pointer glows.
function ShelfTargets({ caseId, spec, frame, target, onHover, onDrop }) {
  const width = innerWidth(spec)
  const gap = shelfGap(spec)
  return shelfLevels(spec).map((y, row) => {
    const active = target?.caseId === caseId && target.row === row
    return (
      <mesh
        key={row}
        position={[0, y + gap / 2, 0.24]}
        onPointerMove={(event) => {
          event.stopPropagation()
          const local = frame.current.worldToLocal(event.point.clone())
          onHover(caseId, row, local.x)
        }}
        onPointerUp={(event) => {
          event.stopPropagation()
          onDrop()
        }}
      >
        <boxGeometry args={[width, gap * 0.94, 0.02]} />
        <meshBasicMaterial
          color={active && target.x === null ? '#d96a5a' : '#ffb070'}
          transparent
          opacity={active ? 0.22 : 0}
          depthWrite={false}
        />
      </mesh>
    )
  })
}

// A bookcase and the reader's books on it. Used for the built-in one and for
// every bookcase the reader bought.
function Bookcase({ caseId, spec, books, color, selectedId, interactive, editing, onSelect, drag, onDragStart, onHover, onDrop }) {
  const frame = useRef()
  const target = drag?.target
  const ghostHere = target && target.caseId === caseId && target.x !== null
  return (
    <>
      <Shadowed>
        <BookcaseFrame spec={spec} color={color} />
      </Shadowed>
      <group ref={frame} position={[0, 0, bookRowZ(spec)]}>
        {books.map(({ entry, size, x, y }) => (
          <Book
            key={entry.bookId}
            entry={entry}
            size={size}
            x={x}
            y={y}
            selected={entry.bookId === selectedId}
            interactive={interactive}
            editing={editing}
            dimmed={drag?.entry.bookId === entry.bookId}
            onSelect={onSelect}
            onDragStart={onDragStart}
          />
        ))}
        {ghostHere && (
          <GhostBook book={drag.entry.book} size={drag.size} x={target.x} y={shelfLevels(spec)[target.row]} />
        )}
        {drag && (
          <ShelfTargets caseId={caseId} spec={spec} frame={frame} target={target} onHover={onHover} onDrop={onDrop} />
        )}
      </group>
    </>
  )
}

// A smaller bookcase on the window wall, filled with the room's own old
// volumes: set dressing, not the reader's books, so they cannot be opened.
function DecorBookcase({ color }) {
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
    <group position={[-HALF + 0.19, 0, -1.8]} rotation={[0, Math.PI / 2, 0]}>
      <Shadowed>
        <mesh position={[0, 0.95, -0.17]}>
          <boxGeometry args={[0.95, 1.9, 0.03]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.45, 0.95, 0]}>
            <boxGeometry args={[0.05, 1.9, 0.36]} />
            <meshStandardMaterial color={color} roughness={0.75} />
          </mesh>
        ))}
        {[0.1, 0.65, 1.2, 1.75, 1.91].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.9, 0.035, 0.36]} />
            <meshStandardMaterial color={color} roughness={0.75} />
          </mesh>
        ))}
        {volumes.map((v) => (
          <mesh key={v.key} position={[v.x, v.y, 0]}>
            <boxGeometry args={v.size} />
            <meshStandardMaterial color={v.color} roughness={0.7} />
          </mesh>
        ))}
        {/* a candle on the top, as in the reference */}
        <mesh position={[0.2, 2.0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.14, 12]} />
          <meshStandardMaterial color="#f6ecd6" />
        </mesh>
      </Shadowed>
    </group>
  )
}

// ------------------------------------------------------------ the room itself

function RoundWindow() {
  const frame = '#c98a4b'
  return (
    <group position={[-HALF + 0.01, 1.75, -0.35]} rotation={[0, Math.PI / 2, 0]}>
      {/* The wall is solid, so the "opening" is drawn on its face: sky glass,
          a deep frame standing out from the wall, and the cross of glazing bars. */}
      <mesh position={[0, 0, 0.012]}>
        <circleGeometry args={[0.74, 48]} />
        <meshStandardMaterial map={skyTexture()} emissive="#ffffff" emissiveMap={skyTexture()} emissiveIntensity={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.76, 0.76, 0.12, 48, 1, true]} />
        <meshStandardMaterial color="#e0a868" side={2} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <torusGeometry args={[0.77, 0.06, 12, 64]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.05, 1.5, 0.04]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.05, 0.04]}>
        <boxGeometry args={[1.5, 0.05, 0.04]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
      {/* sill */}
      <mesh position={[0, -0.8, 0.06]}>
        <boxGeometry args={[0.7, 0.05, 0.14]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
    </group>
  )
}

// The walls and floor, in the reader's colours and whatever wallpaper and
// floor they have put down. The patterns are pale, so the colour tints them.
function RoomShell({ wallColor, floorColor, wallpaper, floor }) {
  const trim = '#5a2f17'
  const floorMap = floorTexture(floor)
  const wallMap = wallpaperTexture(wallpaper)
  const span = HALF * 2 + WALL

  return (
    <>
      {/* floor slab, and the planked floor on top of it */}
      <mesh position={[-WALL / 2, -0.16, -WALL / 2]} receiveShadow>
        <boxGeometry args={[span, 0.32, span]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial key={floor} color={floorColor} map={floorMap} roughness={0.8} />
      </mesh>
      {/* a thin dark edge along the slab's top, as on a diorama base */}
      <mesh position={[HALF, 0.005, -WALL / 2]}>
        <boxGeometry args={[0.02, 0.02, span]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      <mesh position={[-WALL / 2, 0.005, HALF]}>
        <boxGeometry args={[span, 0.02, 0.02]} />
        <meshStandardMaterial color={trim} />
      </mesh>

      <Shadowed receiveOnly>
        {/* window wall (left) and bookcase wall (right) */}
        <mesh position={[-HALF - WALL / 2, WALL_HEIGHT / 2, -WALL / 2]}>
          <boxGeometry args={[WALL, WALL_HEIGHT, span]} />
          <meshStandardMaterial key={wallpaper} color={wallColor} map={wallMap} roughness={0.95} />
        </mesh>
        <mesh position={[-WALL / 2, WALL_HEIGHT / 2, -HALF - WALL / 2]}>
          <boxGeometry args={[span, WALL_HEIGHT, WALL]} />
          <meshStandardMaterial key={wallpaper} color={wallColor} map={wallMap} roughness={0.95} />
        </mesh>
      </Shadowed>
      {/* wooden caps along the top of both walls */}
      <mesh position={[-HALF - WALL / 2, WALL_HEIGHT + 0.03, -WALL / 2]}>
        <boxGeometry args={[WALL + 0.04, 0.06, span + 0.04]} />
        <meshStandardMaterial color={trim} roughness={0.6} />
      </mesh>
      <mesh position={[-WALL / 2, WALL_HEIGHT + 0.03, -HALF - WALL / 2]}>
        <boxGeometry args={[span + 0.04, 0.06, WALL + 0.04]} />
        <meshStandardMaterial color={trim} roughness={0.6} />
      </mesh>
      {/* skirting boards */}
      <mesh position={[-HALF + 0.01, 0.06, 0]}>
        <boxGeometry args={[0.02, 0.12, HALF * 2]} />
        <meshStandardMaterial color={trim} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.06, -HALF + 0.01]}>
        <boxGeometry args={[HALF * 2, 0.12, 0.02]} />
        <meshStandardMaterial color={trim} roughness={0.7} />
      </mesh>

      <RoundWindow />
      {/* afternoon light coming in through the window */}
      <pointLight position={[-HALF + 0.5, 1.8, -0.35]} intensity={1.6} distance={5} decay={1.5} color="#ffe2b8" />
    </>
  )
}

// ------------------------------------------------------------ furniture

const floorPlane = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()
const clamp = (value, [min, max]) => Math.round(Math.min(max, Math.max(min, value)) * 100) / 100

// One piece of furniture. A bookcase also carries its share of the reader's
// books (`shelf`), which can be clicked like any others.
function RoomItem({ item, lit, editing, selected, onSelect, onChange, shelf }) {
  const [hovered, setHovered] = useState(false)
  const drag = useRef(null)
  const { Model, radius, height, spec } = MODELS[item.kind] ?? MODELS.cushion

  // In edit mode an item can be picked up and slid across the floor. The
  // pointer is captured so the drag keeps working when it leaves the item.
  const handlers = editing
    ? {
        onPointerDown: (event) => {
          event.stopPropagation()
          onSelect(item.id)
          if (!event.ray.intersectPlane(floorPlane, hit)) return
          drag.current = { dx: item.x - hit.x, dz: item.z - hit.z }
          event.target.setPointerCapture(event.pointerId)
          document.body.style.cursor = 'grabbing'
        },
        onPointerMove: (event) => {
          if (!drag.current || !event.ray.intersectPlane(floorPlane, hit)) return
          event.stopPropagation()
          const x = clamp(hit.x + drag.current.dx, ROOM_BOUNDS.x)
          const z = clamp(hit.z + drag.current.dz, ROOM_BOUNDS.z)
          if (x !== item.x || z !== item.z) onChange(item.id, { x, z })
        },
        onPointerUp: (event) => {
          if (!drag.current) return
          event.stopPropagation()
          drag.current = null
          event.target.releasePointerCapture(event.pointerId)
          document.body.style.cursor = 'grab'
        },
        onPointerOver: (event) => {
          event.stopPropagation()
          setHovered(true)
          if (!drag.current) document.body.style.cursor = 'grab'
        },
        onPointerOut: () => {
          setHovered(false)
          if (!drag.current) document.body.style.cursor = ''
        },
      }
    : {}

  return (
    <group position={[item.x, 0, item.z]} rotation={[0, (item.rotation * Math.PI) / 180, 0]} {...handlers}>
      {spec ? (
        <Bookcase spec={spec} {...shelf} />
      ) : (
        <Shadowed>
          <Model lit={lit} />
        </Shadowed>
      )}
      {editing && (selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[radius, radius + 0.05, 48]} />
          <meshBasicMaterial color={selected ? '#ffb070' : '#fff1dc'} transparent opacity={0.95} />
        </mesh>
      )}
      {editing && hovered && !selected && (
        <Html zIndexRange={[4, 0]} position={[0, Math.max(height + 0.25, 0.9), 0]} center className="room-tooltip">
          {catalogEntry(item.kind)?.name}
        </Html>
      )}
    </group>
  )
}

// ------------------------------------------------------------ camera

// Fit the whole diorama in the canvas at any window size.
function useFitZoom() {
  const { size } = useThree()
  return Math.max(20, Math.min(size.width / 7.2, size.height / 7.4))
}

// How far the view may wander: around the room, never off into empty space.
const VIEW_BOUNDS = { x: [-2.6, 2.6], y: [0.2, 3.2], z: [-2.6, 2.6] }
// Where the view starts, and where Re-centre brings it back to.
const VIEW_FROM = [10, 8.6, 10]
const VIEW_TARGET = [0, 1.05, 0]

function Camera({ editing, viewReset }) {
  const fit = useFitZoom()
  const camera = useRef()
  const controls = useRef()

  // Fit the room to the window.
  useEffect(() => {
    camera.current.zoom = fit
    camera.current.updateProjectionMatrix()
  }, [fit])

  // "Re-centre" puts the view back exactly where it started.
  useEffect(() => {
    if (!viewReset || !controls.current) return
    // With gliding on, the controls only ever shrink the motion left over from
    // the last drag, so it would keep nudging the view after the reset. An
    // update with gliding off clears it; the second pass then lands exactly on
    // the starting view.
    const glide = controls.current.enableDamping
    controls.current.enableDamping = false
    for (let pass = 0; pass < 2; pass += 1) {
      controls.current.target.set(...VIEW_TARGET)
      camera.current.position.set(...VIEW_FROM)
      camera.current.zoom = fit
      camera.current.updateProjectionMatrix()
      controls.current.update()
    }
    controls.current.enableDamping = glide
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewReset])

  // Moving the view moves both the camera and the point it looks at. If that
  // point would leave the room, both are nudged back by the same amount.
  function keepInRoom() {
    const { target, object } = controls.current
    const before = target.clone()
    target.set(
      Math.min(VIEW_BOUNDS.x[1], Math.max(VIEW_BOUNDS.x[0], target.x)),
      Math.min(VIEW_BOUNDS.y[1], Math.max(VIEW_BOUNDS.y[0], target.y)),
      Math.min(VIEW_BOUNDS.z[1], Math.max(VIEW_BOUNDS.z[0], target.z))
    )
    object.position.add(target.clone().sub(before))
  }

  return (
    <>
      <OrthographicCamera ref={camera} makeDefault position={VIEW_FROM} near={0.1} far={60} />
      <OrbitControls
        ref={controls}
        target={VIEW_TARGET}
        // Right-drag (or Shift + drag, or two fingers) slides the view; the
        // wheel zooms towards the pointer, so you can zoom straight into a shelf.
        enablePan
        screenSpacePanning
        zoomToCursor
        onChange={keepInRoom}
        // While editing, a left-drag moves furniture and books, not the view.
        enableRotate={!editing}
        minZoom={fit * 0.75}
        maxZoom={fit * 4}
        minPolarAngle={0.75}
        maxPolarAngle={1.2}
        minAzimuthAngle={Math.PI / 4 - 0.55}
        maxAzimuthAngle={Math.PI / 4 + 0.55}
      />
    </>
  )
}

export default function LibraryScene({
  entries,
  room,
  selectedBookId,
  onSelectBook,
  editing,
  selectedItemId,
  onSelectItem,
  onItemChange,
  onMoveBook,
  viewReset = 0,
}) {
  // Stored furniture is not in the room at all.
  const items = room.items.filter((i) => i.placed)
  const lights = new Set(
    items.filter((i) => MODELS[i.kind]?.light).slice(0, MAX_ITEM_LIGHTS).map((i) => i.id)
  )
  const cases = bookcasesIn(room)
  const { placed: shelved } = layoutBookcases(entries, cases)

  // The book being carried in Edit room: { entry, size, target }, where target
  // is the shelf under the pointer and the x the book would land at there
  // (null when that shelf is full).
  const [drag, setDrag] = useState(null)
  const dragRef = useRef(null)
  dragRef.current = drag

  // Let go anywhere that is not a shelf, and the book goes back where it was.
  useEffect(() => {
    if (!drag) return
    const cancel = () => {
      setDrag(null)
      document.body.style.cursor = ''
    }
    window.addEventListener('pointerup', cancel)
    return () => window.removeEventListener('pointerup', cancel)
  }, [Boolean(drag)])
  useEffect(() => {
    if (!editing) setDrag(null)
  }, [editing])

  function hoverShelf(caseId, row, desired) {
    const current = dragRef.current
    if (!current) return
    // Where it fits among the other books, as if it had already left its place.
    const others = layoutBookcases(entries.filter((e) => e.bookId !== current.entry.bookId), cases).placed
    const spec = cases.find((c) => c.id === caseId).spec
    const onRow = (others[caseId] ?? []).filter((b) => b.row === row)
    const x = fitOnShelf(onRow, innerWidth(spec), current.size[0], desired)
    setDrag({ ...current, target: { caseId, row, x } })
  }

  function dropBook() {
    const current = dragRef.current
    setDrag(null)
    document.body.style.cursor = ''
    const target = current?.target
    if (!target || target.x === null) return
    onMoveBook(current.entry.bookId, {
      bookcase: String(target.caseId),
      row: target.row,
      x: Math.round(target.x * 1000) / 1000,
    })
  }

  const shelfProps = (id) => ({
    caseId: id,
    books: shelved[id] ?? [],
    color: room.shelfColor,
    selectedId: selectedBookId,
    interactive: !editing,
    editing,
    onSelect: onSelectBook,
    drag,
    onDragStart: (entry, size) => setDrag({ entry, size, target: null }),
    onHover: hoverShelf,
    onDrop: dropBook,
  })

  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      onPointerMissed={() => (editing ? onSelectItem(null) : null)}
    >
      <color attach="background" args={[BACKDROP]} />
      <Camera editing={editing} viewReset={viewReset} />

      <ambientLight intensity={0.55} color="#ffe2c4" />
      <hemisphereLight args={['#ffe9d0', '#6b3a1f', 0.55]} />
      <directionalLight
        position={[6, 10, 7]}
        intensity={1.5}
        color="#ffe0b8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      <RoomShell
        wallColor={room.wallColor}
        floorColor={room.floorColor}
        wallpaper={room.wallpaper}
        floor={room.floor}
      />
      <DecorBookcase color={room.shelfColor} />
      <group position={MAIN_AT}>
        <Bookcase spec={MAIN} {...shelfProps('main')} />
      </group>

      {items.map((item) => (
        <RoomItem
          key={item.id}
          item={item}
          lit={lights.has(item.id)}
          editing={editing}
          selected={item.id === selectedItemId}
          onSelect={onSelectItem}
          onChange={onItemChange}
          shelf={shelfProps(item.id)}
        />
      ))}
    </Canvas>
  )
}
