import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, OrthographicCamera } from '@react-three/drei'
import { MeshStandardMaterial, Plane, Vector3 } from 'three'
import { STATUSES, STATUS_LABELS, ROOM_ITEM_LABELS, ROOM_BOUNDS } from '../../api'
import { MODELS, Shadowed } from './models.jsx'
import { plankTexture, skyTexture, spineTexture } from './textures.js'

// The 3D Library Room: a cut-away diorama seen from above one corner, like a
// dollhouse. Two walls meet at the back: the window wall on the left (x = -2.5)
// and the bookcase wall on the right (z = -2.5). The open sides face the viewer.
//
// The tall bookcase has a shelf per reading status, top to bottom, so where a
// book sits tells you where you are with it. Units are roughly metres.

const HALF = 2.5 // the floor runs -HALF..HALF on x and z
const WALL_HEIGHT = 3
const WALL = 0.18 // wall thickness
const BACKDROP = '#d9764f'

// Only a few lights may shine at once. Every point light costs every pixel of
// every frame, and a room with thirty lanterns should still turn smoothly.
const MAX_ITEM_LIGHTS = 4

// The status bookcase, against the right-hand wall.
const CASE = { x: 1.05, width: 2.3, height: 2.8, depth: 0.42 }
CASE.z = -HALF + CASE.depth / 2 + 0.02
const SHELF_BASE = 0.16 // height of the lowest shelf board
const SHELF_GAP = 0.64
const INNER_WIDTH = CASE.width - 0.14
// How far a book slides towards you when it is opened.
const PULL = 0.34

const shelfY = (status) => SHELF_BASE + (STATUSES.length - 1 - STATUSES.indexOf(status)) * SHELF_GAP

// Thicker books for longer books, taller for older ones, so a shelf does not
// look like a row of identical bricks.
function bookSize(book) {
  const thickness = 0.075 + (Math.min(book.pages, 700) / 700) * 0.07
  const height = 0.42 + ((book.year * 7) % 10) / 100
  return [thickness, height, 0.3]
}

// One shelf's books, left to right. Books the reader has arranged come first,
// in their saved order; the rest follow in the order they were added, so a new
// book appears at the right-hand end rather than shuffling the shelf.
export function shelfOrder(entries, status) {
  return entries
    .filter((e) => e.status === status)
    .sort(
      (a, b) =>
        (a.shelfPosition ?? Infinity) - (b.shelfPosition ?? Infinity) ||
        a.addedAt.localeCompare(b.addedAt) ||
        a.bookId.localeCompare(b.bookId)
    )
}

// Lay each shelf's books left to right. Anything that does not fit is left
// off and counted, rather than drawn through the side of the bookcase.
export function layoutShelves(entries) {
  const shelves = Object.fromEntries(STATUSES.map((s) => [s, { placed: [], hidden: 0 }]))
  for (const status of STATUSES) {
    let x = -INNER_WIDTH / 2
    for (const entry of shelfOrder(entries, status)) {
      const size = bookSize(entry.book)
      if (x + size[0] > INNER_WIDTH / 2) {
        shelves[status].hidden += 1
        continue
      }
      shelves[status].placed.push({ entry, size, x: x + size[0] / 2 })
      x += size[0] + 0.006
    }
  }
  return shelves
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

function Book({ entry, size, x, y, selected, interactive, onSelect }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
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

  // Glow while it is the open book.
  useEffect(() => {
    materials.spine.emissive.set(selected ? '#ff9a4a' : '#000000')
    materials.spine.emissiveIntensity = selected ? 0.25 : 0
  }, [selected, materials])

  const restY = y + size[1] / 2
  useLayoutEffect(() => {
    ref.current.position.set(0, restY, 0)
  }, [restY])

  useFrame((state, delta) => {
    const pullTo = selected ? PULL : hovered && interactive ? 0.05 : 0
    const liftTo = selected ? restY + 0.03 : restY
    const moving = approach(ref.current, 'z', pullTo, delta) | approach(ref.current, 'y', liftTo, delta)
    if (moving) state.invalidate()
  })

  const handlers = interactive
    ? {
        onClick: (event) => {
          event.stopPropagation()
          onSelect(entry.bookId)
        },
        onPointerOver: (event) => {
          event.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        },
        onPointerOut: () => {
          setHovered(false)
          document.body.style.cursor = ''
        },
      }
    : {}

  return (
    <group position={[x, 0, 0]}>
      <mesh ref={ref} material={materials.list} castShadow receiveShadow {...handlers}>
        <boxGeometry args={size} />
        {hovered && interactive && !selected && (
          <Html zIndexRange={[4, 0]} position={[0, size[1] / 2 + 0.07, 0.1]} center className="room-tooltip">
            {book.title}
          </Html>
        )}
      </mesh>
    </group>
  )
}

function Bookcase({ entries, color, selectedId, interactive, onSelect }) {
  const shelves = layoutShelves(entries)
  const { width, height, depth } = CASE

  return (
    <group position={[CASE.x, 0, CASE.z]}>
      <Shadowed>
        <mesh position={[0, height / 2, -depth / 2 + 0.015]}>
          <boxGeometry args={[width, height, 0.03]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[(side * (width - 0.07)) / 2, height / 2, 0]}>
            <boxGeometry args={[0.07, height, depth]} />
            <meshStandardMaterial color={color} roughness={0.75} />
          </mesh>
        ))}
        <mesh position={[0, height + 0.03, 0.01]}>
          <boxGeometry args={[width + 0.1, 0.07, depth + 0.04]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        {STATUSES.map((status) => (
          <mesh key={status} position={[0, shelfY(status) - 0.02, 0]}>
            <boxGeometry args={[width - 0.07, 0.04, depth]} />
            <meshStandardMaterial color={color} roughness={0.75} />
          </mesh>
        ))}
      </Shadowed>

      {STATUSES.map((status) => {
        const { placed, hidden } = shelves[status]
        return (
          <group key={status} position={[0, 0, -depth / 2 + 0.03 + 0.15]}>
            {/* On the shelf's front edge, at the right-hand end. */}
            <Html zIndexRange={[4, 0]} position={[width / 2 - 0.08, shelfY(status) - 0.03, depth / 2 - 0.03]}>
              <span className="shelf-label">
                {STATUS_LABELS[status]}
                {hidden > 0 && ` (+${hidden} more)`}
              </span>
            </Html>
            {placed.map(({ entry, size, x }) => (
              <Book
                key={entry.bookId}
                entry={entry}
                size={size}
                x={x}
                y={shelfY(status)}
                selected={entry.bookId === selectedId}
                interactive={interactive}
                onSelect={onSelect}
              />
            ))}
          </group>
        )
      })}
    </group>
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

function RoomShell({ wallColor, floorColor }) {
  const trim = '#5a2f17'
  const planks = plankTexture()
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
        <meshStandardMaterial color={floorColor} map={planks} roughness={0.8} />
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
          <meshStandardMaterial color={wallColor} roughness={0.95} />
        </mesh>
        <mesh position={[-WALL / 2, WALL_HEIGHT / 2, -HALF - WALL / 2]}>
          <boxGeometry args={[span, WALL_HEIGHT, WALL]} />
          <meshStandardMaterial color={wallColor} roughness={0.95} />
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

function RoomItem({ item, lit, editing, selected, onSelect, onChange }) {
  const [hovered, setHovered] = useState(false)
  const drag = useRef(null)
  const { Model, radius } = MODELS[item.kind] ?? MODELS.cushion

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
      <Shadowed>
        <Model lit={lit} />
      </Shadowed>
      {editing && (selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[radius, radius + 0.05, 48]} />
          <meshBasicMaterial color={selected ? '#ffb070' : '#fff1dc'} transparent opacity={0.95} />
        </mesh>
      )}
      {editing && hovered && !selected && (
        <Html zIndexRange={[4, 0]} position={[0, 1.2, 0]} center className="room-tooltip">
          {ROOM_ITEM_LABELS[item.kind]}
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

function Camera({ editing }) {
  const fit = useFitZoom()
  const camera = useRef()
  useEffect(() => {
    camera.current.zoom = fit
    camera.current.updateProjectionMatrix()
  }, [fit])

  return (
    <>
      <OrthographicCamera ref={camera} makeDefault position={[10, 8.6, 10]} near={0.1} far={60} />
      <OrbitControls
        target={[0, 1.05, 0]}
        enablePan={false}
        // While editing, a drag moves furniture, not the view.
        enableRotate={!editing}
        minZoom={fit * 0.75}
        maxZoom={fit * 3}
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
}) {
  const lights = new Set(
    room.items.filter((i) => MODELS[i.kind]?.light).slice(0, MAX_ITEM_LIGHTS).map((i) => i.id)
  )

  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      onPointerMissed={() => (editing ? onSelectItem(null) : null)}
    >
      <color attach="background" args={[BACKDROP]} />
      <Camera editing={editing} />

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

      <RoomShell wallColor={room.wallColor} floorColor={room.floorColor} />
      <DecorBookcase color={room.shelfColor} />
      <Bookcase
        entries={entries}
        color={room.shelfColor}
        selectedId={selectedBookId}
        interactive={!editing}
        onSelect={onSelectBook}
      />

      {room.items.map((item) => (
        <RoomItem
          key={item.id}
          item={item}
          lit={lights.has(item.id)}
          editing={editing}
          selected={item.id === selectedItemId}
          onSelect={onSelectItem}
          onChange={onItemChange}
        />
      ))}
    </Canvas>
  )
}
