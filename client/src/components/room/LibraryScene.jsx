import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, OrthographicCamera } from '@react-three/drei'
import { MeshStandardMaterial, Plane, Vector3 } from 'three'
import {
  BLOCKS,
  LOFT,
  SHELVED_STATUSES,
  catalogEntry,
  cellBox,
  clearanceOf,
  coverImageUrl,
  floorSpots,
  isSmall,
  moveSpots,
  nearestSpot,
  onWallAt,
  pickSpots,
  wallSpots,
} from '../../api'
import { BookcaseFrame, MODELS, Shadowed, bookRowZ, innerWidth, scaledSpec, shelfGap, shelfLevels, topsOf } from './models.jsx'
import RoomShell, { BlockGhost, CORNER, roomGeometry, wallFrames } from './structure.jsx'
import { alongOf, fitWindow } from './windows.jsx'
import { coverImageTexture, coverSpineTexture, coverTexture, loadCover, spineTexture } from './textures.js'

// The 3D Library Room: a cut-away diorama seen from above one corner, like a
// dollhouse. Two walls meet at the back: the window wall on the left
// (x = -2.5) and the bookcase wall on the right (z = -2.5). The open sides
// face the viewer, and a room bought bigger grows towards them. structure.jsx
// builds the room itself; this file fills it.
//
// Every book the reader has started (reading, read, or set aside) stands on
// the shelves, in the order they arranged it, like a real bookcase: the
// built-in one first, then any bookcases they bought. A book the reader laid
// on a table lies there instead. Want to Read books are not in the room yet.
// Units are roughly metres.

// Only a few lights may shine at once. Every point light costs every pixel of
// every frame, and a room with thirty lanterns should still turn smoothly.
const MAX_ITEM_LIGHTS = 6

// How far a book slides towards you when it is opened.
const PULL = 0.34
// Books lying on a table are drawn smaller than the ones on the shelves,
// which are made big enough to read from across the room.
const LYING = 0.62

// The light at each time of day. At night the room is dark until the reader
// switches its lamps on.
const LIGHTING = {
  day: { background: '#d9764f', ambient: [0.55, '#ffe2c4'], sky: ['#ffe9d0', '#6b3a1f', 0.55], sun: [1.5, '#ffe0b8'] },
  dusk: { background: '#7a4a6e', ambient: [0.4, '#ffc9b0'], sky: ['#ffc4a8', '#4a2a3a', 0.42], sun: [0.95, '#ff9d6b'] },
  night: { background: '#1c1a36', ambient: [0.28, '#8b8fd6'], sky: ['#5a5fa8', '#1a1226', 0.25], sun: [0.35, '#9fb4ff'] },
}

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

// The bookcases, in the order books fill them: the built-in one (if it is in
// the room), then every other bookcase standing there, oldest first, each as
// wide and tall as the reader made it.
export function bookcasesIn(room) {
  const builtInFirst = (i) => (i.kind === 'built-in-bookcase' ? 0 : 1)
  return room.items
    .filter((i) => i.placed && MODELS[i.kind]?.spec)
    .sort((a, b) => builtInFirst(a) - builtInFirst(b) || a.id - b.id)
    .map((i) => ({ id: i.id, kind: i.kind, spec: scaledSpec(MODELS[i.kind].spec, i) }))
}

// The tables standing in the room, and how many books each can hold.
export function tablesIn(room) {
  return room.items
    .filter((i) => i.placed && MODELS[i.kind]?.surfaces)
    .map((i) => ({ id: i.id, slots: MODELS[i.kind].surfaces.length }))
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

// Put the books in the room. A book the reader laid on a table lies there, if
// the table still stands and that spot is free. A book they placed on a shelf
// goes where they put it, if there is still room there; every other book
// fills the free space, left to right along each shelf, top shelf to bottom,
// one bookcase after another. Returns each bookcase's books, each table's,
// and the books that did not fit anywhere (`stored`: they wait in the storage
// room, rather than being drawn through a wall).
export function layoutBookcases(entries, cases, tables = []) {
  const placed = Object.fromEntries(cases.map((c) => [c.id, []]))
  const onTables = Object.fromEntries(tables.map((t) => [t.id, []]))
  const shelves = shelvesOf(cases)
  const onShelf = (shelf) => placed[shelf.id].filter((b) => b.row === shelf.row)
  const put = (entry, size, shelf, x) => placed[shelf.id].push({ entry, size, x, y: shelf.y, row: shelf.row })

  const waiting = []
  for (const entry of shelfOrder(entries)) {
    const spot = entry.shelfSpot
    const size = bookSize(entry.book)
    const table = spot && tables.find((t) => String(t.id) === spot.bookcase)
    if (table) {
      const free = spot.row < table.slots && !onTables[table.id].some((b) => b.slot === spot.row)
      if (free) onTables[table.id].push({ entry, size, slot: spot.row })
      else waiting.push(entry)
      continue
    }
    // "main" is the built-in bookcase, from before it was an item like others.
    const caseId = spot?.bookcase === 'main' ? String(cases.find((c) => c.kind === 'built-in-bookcase')?.id) : spot?.bookcase
    const shelf = spot && shelves.find((s) => String(s.id) === caseId && s.row === spot.row)
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
  // Books with nowhere to stand wait in the storage room.
  const stored = waiting.slice(next)
  return { placed, onTables, stored, overflow: stored.length }
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
function useCover(book, material, paint) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    let alive = true
    loadCover(coverImageUrl(book)).then((image) => {
      if (!alive || !image) return
      material.map = paint(book, image)
      material.needsUpdate = true
      invalidate()
    })
    return () => {
      alive = false
    }
  }, [book, material, paint, invalidate])
}

// Pointer handlers shared by a book on a shelf and a book on a table: click to
// open it, or in Edit room, press to pick it up.
function useBookHandlers({ entry, size, interactive, editing, onSelect, onDragStart }) {
  const [hovered, setHovered] = useState(false)
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
  return { hovered, handlers }
}

// Faded while it is being carried somewhere else; glowing while it is open.
function useBookLook(materials, { selected, dimmed }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    materials.highlight.emissive.set(selected ? '#ff9a4a' : '#000000')
    materials.highlight.emissiveIntensity = selected ? 0.25 : 0
  }, [selected, materials])
  useEffect(() => {
    for (const material of materials.all) {
      material.transparent = dimmed
      material.opacity = dimmed ? 0.3 : 1
    }
    invalidate()
  }, [dimmed, materials, invalidate])
}

function BookTooltip({ book, editing, y, z = 0.1 }) {
  return (
    <Html zIndexRange={[4, 0]} position={[0, y, z]} center className="room-tooltip">
      {editing ? `${book.title} · drag to move` : book.title}
    </Html>
  )
}

function Book({ entry, size, x, y, selected, interactive, editing, dimmed, onSelect, onDragStart }) {
  const ref = useRef()
  const { book } = entry
  const { hovered, handlers } = useBookHandlers({ entry, size, interactive, editing, onSelect, onDragStart })

  // Covers on the sides, paper on top, bottom and back, the printed spine
  // facing the room. Made once per book, not on every render.
  const materials = useMemo(() => {
    const cover = new MeshStandardMaterial({ color: book.color, roughness: 0.7 })
    const pages = new MeshStandardMaterial({ color: '#efe4cc', roughness: 0.95 })
    const spine = new MeshStandardMaterial({ map: spineTexture(book), roughness: 0.6 })
    return { list: [cover, cover, pages, pages, spine, pages], highlight: spine, all: [cover, pages, spine] }
  }, [book])
  useEffect(() => () => materials.all.forEach((m) => m.dispose()), [materials])
  useCover(book, materials.highlight, coverSpineTexture)
  useBookLook(materials, { selected, dimmed })

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

  return (
    <group position={[x, 0, 0]}>
      <mesh ref={ref} material={materials.list} castShadow receiveShadow {...handlers}>
        <boxGeometry args={size} />
        {hovered && !selected && !dimmed && <BookTooltip book={book} editing={editing} y={size[1] / 2 + 0.07} />}
      </mesh>
    </group>
  )
}

// A book lying on a table, its cover up. A book being read lies open at the
// reader's page instead, with a ribbon in it.
function TableBook({ entry, size, at, selected, interactive, editing, dimmed, onSelect, onDragStart }) {
  const ref = useRef()
  const { book } = entry
  const { hovered, handlers } = useBookHandlers({ entry, size, interactive, editing, onSelect, onDragStart })
  const reading = entry.status === 'currently-reading'
  const [x, y, z, turn] = at
  const width = 0.3 * LYING
  const length = size[1] * LYING
  const thick = size[0] * LYING

  const materials = useMemo(() => {
    const cover = new MeshStandardMaterial({ color: book.color, roughness: 0.7 })
    const pages = new MeshStandardMaterial({ color: '#efe4cc', roughness: 0.95 })
    const front = new MeshStandardMaterial({ map: coverTexture(book), roughness: 0.6 })
    return { list: [pages, cover, front, cover, pages, pages], highlight: reading ? pages : front, front, all: [cover, pages, front] }
  }, [book, reading])
  useEffect(() => () => materials.all.forEach((m) => m.dispose()), [materials])
  useCover(book, materials.front, coverImageTexture)
  useBookLook(materials, { selected, dimmed })

  useFrame((state, delta) => {
    const liftTo = selected ? 0.14 : hovered && (interactive || editing) ? 0.03 : 0
    if (approach(ref.current, 'y', liftTo, delta)) state.invalidate()
  })

  return (
    <group position={[x, y, z]} rotation={[0, turn, 0]}>
      <group ref={ref}>
        {reading ? (
          <group {...handlers}>
            {[-1, 1].map((side) => (
              <group key={side} rotation={[0, 0, side * -0.06]}>
                <mesh position={[(side * width) / 2, 0.006, 0]} material={materials.all[0]} castShadow>
                  <boxGeometry args={[width, 0.012, length]} />
                </mesh>
                <mesh position={[(side * (width - 0.01)) / 2, 0.012 + thick / 4, 0]} material={materials.all[1]} castShadow>
                  <boxGeometry args={[width - 0.012, thick / 2, length - 0.02]} />
                </mesh>
              </group>
            ))}
            <mesh position={[0.01, thick / 2 + 0.02, length / 2]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.012, 0.002, 0.12]} />
              <meshStandardMaterial color="#b0262b" />
            </mesh>
          </group>
        ) : (
          <mesh position={[0, thick / 2, 0]} material={materials.list} castShadow receiveShadow {...handlers}>
            <boxGeometry args={[width, thick, length]} />
          </mesh>
        )}
        {hovered && !selected && !dimmed && <BookTooltip book={book} editing={editing} y={0.2} z={0} />}
      </group>
    </group>
  )
}

// Where the carried book would land, drawn in place before it is dropped.
function GhostBook({ book, size, x, y, lying = false }) {
  const materials = useMemo(() => {
    const cover = new MeshStandardMaterial({ color: book.color, transparent: true, opacity: 0.8, emissive: '#ffb070', emissiveIntensity: 0.25 })
    const spine = new MeshStandardMaterial({ map: spineTexture(book), transparent: true, opacity: 0.9, emissive: '#ffb070', emissiveIntensity: 0.2 })
    return { list: [cover, cover, cover, cover, spine, cover], all: [cover, spine] }
  }, [book])
  useEffect(() => () => materials.all.forEach((m) => m.dispose()), [materials])
  if (lying) {
    const thick = size[0] * LYING
    return (
      <mesh position={[0, y + thick / 2 + 0.01, 0]} material={materials.all[0]}>
        <boxGeometry args={[0.3 * LYING, thick, size[1] * LYING]} />
      </mesh>
    )
  }
  return (
    <mesh position={[x, y + size[1] / 2, 0.02]} material={materials.list}>
      <boxGeometry args={size} />
    </mesh>
  )
}

// A board that catches the pointer while a book is carried, glowing when the
// book would land on it (red when there is no room).
function DropTarget({ active, full, onMove, onDrop, args, ...props }) {
  return (
    <mesh
      {...props}
      onPointerMove={(event) => {
        event.stopPropagation()
        onMove(event)
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        onDrop()
      }}
    >
      <boxGeometry args={args} />
      <meshBasicMaterial color={active && full ? '#d96a5a' : '#ffb070'} transparent opacity={active ? 0.22 : 0} depthWrite={false} />
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
      <DropTarget
        key={row}
        position={[0, y + gap / 2, 0.24]}
        args={[width, gap * 0.94, 0.02]}
        active={active}
        full={active && target.x === null}
        onMove={(event) => onHover(caseId, row, frame.current.worldToLocal(event.point.clone()).x)}
        onDrop={onDrop}
      />
    )
  })
}

// A bookcase and the reader's books on it. Used for the built-in one and for
// every bookcase the reader bought.
function Bookcase({ caseId, spec, books, color, paint, selectedId, interactive, editing, onSelect, drag, onDragStart, onHover, onDrop }) {
  const frame = useRef()
  const target = drag?.target
  const ghostHere = target && target.caseId === caseId && target.x !== null && !target.table
  return (
    <>
      <Shadowed>
        <BookcaseFrame spec={spec} color={color} paint={paint ?? undefined} />
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

// The reader's books lying on a table, and, while a book is carried, a pad on
// each free spot to drop it on.
function TableTop({ caseId, surfaces, books, selectedId, interactive, editing, onSelect, drag, onDragStart, onHover, onDrop }) {
  const target = drag?.target
  return (
    <>
      {books.map(({ entry, size, slot }) => (
        <TableBook
          key={entry.bookId}
          entry={entry}
          size={size}
          at={surfaces[slot]}
          selected={entry.bookId === selectedId}
          interactive={interactive}
          editing={editing}
          dimmed={drag?.entry.bookId === entry.bookId}
          onSelect={onSelect}
          onDragStart={onDragStart}
        />
      ))}
      {drag &&
        surfaces.map(([x, y, z, turn], slot) => {
          const active = target?.caseId === caseId && target.row === slot
          return (
            <group key={slot} position={[x, y, z]} rotation={[0, turn, 0]}>
              {active && target.x !== null && <GhostBook book={drag.entry.book} size={drag.size} y={0} lying />}
              <DropTarget
                position={[0, 0.1, 0]}
                args={[0.36, 0.2, 0.42]}
                active={active}
                full={active && target.x === null}
                onMove={() => onHover(caseId, slot, 0, true)}
                onDrop={onDrop}
              />
            </group>
          )
        })}
    </>
  )
}

// ------------------------------------------------------------ furniture

const hit = new Vector3()

// Where a staircase's top step is, in the room, so the loft's railing can
// open there.
function landingOf(item) {
  const [lx, lz] = MODELS[item.kind].landing
  const turn = (item.rotation * Math.PI) / 180
  return [item.x + lx * Math.cos(turn) + lz * Math.sin(turn), item.z - lx * Math.sin(turn) + lz * Math.cos(turn)]
}

function itemTip(def, item, editing) {
  if (editing) return catalogEntry(item.kind)?.name
  if (def.light) return item.lit === false ? 'Click to switch on' : 'Click to switch off'
  return def.interact
}

const wallHit = new Vector3()
const facePlane = new Plane()

// The point on a wall's room-side face under the pointer, if it is on the
// wall itself: { edge, along, y }, the nearest to the viewer.
function pointOnWall(ray, room) {
  let best = null
  for (const wall of wallFrames(room)) {
    const [nx, nz] = wall.normal
    // Only faces turned towards the viewer.
    if (ray.direction.x * nx + ray.direction.z * nz >= 0) continue
    facePlane.normal.set(nx, 0, nz)
    facePlane.constant = -wall.face * (nx + nz)
    if (!ray.intersectPlane(facePlane, wallHit)) continue
    const along = wall.side === 'x' ? wallHit.x : wallHit.z
    if (along < wall.along[0] || along > wall.along[1] || wallHit.y < 0 || wallHit.y > wall.metres) continue
    const distance = ray.origin.distanceTo(wallHit)
    if (!best || distance < best.distance) best = { edge: { side: wall.side, i: wall.i, j: wall.j }, along, y: wallHit.y, distance }
  }
  return best
}

// The wall face nearest a point on the floor, for something that hangs on a
// wall: { edge, along }.
function nearestWall(room, x, z) {
  let best = null
  for (const wall of wallFrames(room)) {
    const along = wall.side === 'x' ? x : z
    const across = wall.side === 'x' ? z : x
    const onIt = Math.min(wall.along[1], Math.max(wall.along[0], along))
    const distance = Math.hypot(along - onIt, across - wall.face)
    if (!best || distance < best.distance) best = { edge: { side: wall.side, i: wall.i, j: wall.j }, along, distance }
  }
  return best
}

// Paint a model in the reader's colour: the colour most of it is made of
// becomes theirs, and the rest (brass, glass, leaves, flames) stays as it is.
// With no colour, it goes back to how it came. Each mesh remembers its own
// colour the first time, so painting twice does not lose it.
function usePaint(ref, color) {
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => {
    const meshes = []
    ref.current?.traverse((object) => {
      const material = object.isMesh && !Array.isArray(object.material) ? object.material : null
      if (material?.color && !material.transparent) meshes.push(object)
    })
    if (meshes.length === 0) return
    const counts = new Map()
    for (const mesh of meshes) {
      if (mesh.userData.ownColor === undefined) mesh.userData.ownColor = mesh.material.color.getHex()
      counts.set(mesh.userData.ownColor, (counts.get(mesh.userData.ownColor) ?? 0) + 1)
    }
    const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    for (const mesh of meshes) {
      const own = mesh.userData.ownColor
      mesh.material.color.setHex(color && own === main ? parseInt(color.slice(1), 16) : own)
    }
    invalidate()
  })
}

const stackHit = new Vector3()
const stackPlane = new Plane(new Vector3(0, 1, 0), 0)

// The highest flat place under the pointer that a small thing could stand on:
// a table's top, a seat, a bookcase's top or one of its shelves. Returns
// { on, x, z, y } (y above the floor it stands on), or null.
function stackSpot(ray, item, others, levelY) {
  let best = null
  for (const other of others) {
    if (other.id === item.id || other.on === item.id || (other.level ?? 0) !== (item.level ?? 0)) continue
    const turn = (other.rotation * Math.PI) / 180
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    for (const [tx, ty, tz, hw, hd] of topsOf(other)) {
      const y = (other.y ?? 0) + ty
      stackPlane.constant = -(levelY + y)
      if (!ray.intersectPlane(stackPlane, stackHit)) continue
      const dx = stackHit.x - other.x
      const dz = stackHit.z - other.z
      const lx = dx * cos - dz * sin
      const lz = dx * sin + dz * cos
      if (Math.abs(lx - tx) > hw || Math.abs(lz - tz) > hd) continue
      if (!best || y > best.y) best = { on: other.id, x: stackHit.x, z: stackHit.z, y }
    }
  }
  return best && { ...best, x: Math.round(best.x * 100) / 100, z: Math.round(best.z * 100) / 100, y: Math.round(best.y * 100) / 100 }
}

// The little toolbar above the selected item while building: undo, turn,
// store, sell. Small, and only over the item itself, so the room stays in
// view. Selling asks once more before it happens.
function ItemTools({ item, tools, height }) {
  const [asking, setAsking] = useState(false)
  const stop = (event) => event.stopPropagation()
  return (
    <Html zIndexRange={[6, 0]} position={[0, height, 0]} center>
      <div className="item-tools" onPointerDown={stop} onPointerUp={stop} onClick={stop}>
        {asking ? (
          <>
            <span className="item-tools-ask">Sell for {tools.sellPrice(item)} Ember?</span>
            <button type="button" className="item-tool is-danger" onClick={() => tools.sell(item)} aria-label="Yes, sell it">
              ✓
            </button>
            <button type="button" className="item-tool" onClick={() => setAsking(false)} aria-label="Keep it">
              ✕
            </button>
          </>
        ) : (
          <>
            <button type="button" className="item-tool" onClick={() => tools.undo(item)} disabled={!tools.canUndo(item)} title="Undo" aria-label="Undo">
              ↶
            </button>
            <button type="button" className="item-tool" onClick={() => tools.turn(item, -45)} title="Turn left" aria-label="Turn left">
              ⟲
            </button>
            <button type="button" className="item-tool" onClick={() => tools.turn(item, 45)} title="Turn right" aria-label="Turn right">
              ⟳
            </button>
            <button type="button" className="item-tool" onClick={() => tools.store(item)} title="Put in storage" aria-label="Put in storage">
              📦
            </button>
            <button type="button" className="item-tool is-danger" onClick={() => setAsking(true)} title="Sell" aria-label="Sell">
              🪙
            </button>
          </>
        )}
      </div>
    </Html>
  )
}

// One piece of furniture. A bookcase also carries its share of the reader's
// books (`shelf`), and a table or seat the books lying on it (`table`); both
// can be clicked like any others. Outside the builder, clicking a light
// switches it, and clicking a globe, a rocking chair or a cat does what you
// would expect. In the builder, a small thing can be set down on a table, a
// seat or a shelf as well as the floor, and the selected item wears a little
// toolbar.
function RoomItem({ item, room, geometry, time, shine, editing, placing, selected, others, tools, onSelect, onChange, onGesture, onToggleLight, shelf, table }) {
  const [hovered, setHovered] = useState(false)
  const [poke, setPoke] = useState(0)
  const drag = useRef(null)
  const paintRef = useRef()
  const def = MODELS[item.kind] ?? MODELS.cushion
  const { Model, radius, height, surfaces } = def
  const spec = def.spec && scaledSpec(def.spec, item)
  const level = item.level === 1 ? 1 : 0
  const ceiling = geometry.height
  const y = level === 1 ? LOFT.y : 0
  // A window hangs at its own height on its wall; a small thing on a table
  // stands at the table's height.
  const lift = item.y ?? 0
  const size = item.size ?? 1
  const scale = def.window ? [size * (item.sx ?? 1), size * (item.sy ?? 1), 1] : 1
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -y), [y])
  const lit = item.lit !== false
  const clickable = !editing && (def.light || def.interact)
  const small = isSmall(item.kind)
  usePaint(paintRef, spec ? null : item.color)

  const hover = {
    onPointerOver: (event) => {
      event.stopPropagation()
      setHovered(true)
      if (!drag.current) document.body.style.cursor = editing ? 'grab' : 'pointer'
    },
    onPointerOut: () => {
      setHovered(false)
      if (!drag.current) document.body.style.cursor = ''
    },
  }

  const begin = (event) => {
    event.stopPropagation()
    onSelect(item.id)
    onGesture(item)
  }

  // A window is dragged over the walls themselves, from one to the other,
  // up and down, but never off them.
  const windowHandlers = {
    ...hover,
    onPointerDown: (event) => {
      begin(event)
      const point = pointOnWall(event.ray, room)
      if (!point) return
      drag.current = { edge: point.edge, along: alongOf(item) - point.along, y: item.y - point.y }
      event.target.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'grabbing'
    },
    onPointerMove: (event) => {
      if (!drag.current) return
      const point = pointOnWall(event.ray, room)
      if (!point) return
      event.stopPropagation()
      const same = ['side', 'i', 'j'].every((key) => point.edge[key] === drag.current.edge[key])
      const next = fitWindow(room, item.kind, {
        edge: point.edge,
        along: point.along + (same ? drag.current.along : 0),
        y: point.y + drag.current.y,
        size,
        sx: item.sx ?? 1,
        sy: item.sy ?? 1,
      })
      if (next.x !== item.x || next.z !== item.z || next.y !== item.y || next.rotation !== item.rotation) {
        onChange(item.id, { x: next.x, z: next.z, y: next.y, rotation: next.rotation })
      }
    },
  }

  // In the builder an item can be picked up and slid across the floor (or the
  // loft it stands on). The pointer is captured so the drag keeps working when
  // it leaves the item. Something that hangs on a wall slides along the
  // nearest wall instead, facing into the room; something small can be set on
  // a table, a seat or a shelf on the way.
  const editHandlers = {
    ...hover,
    onPointerDown: (event) => {
      begin(event)
      if (!event.ray.intersectPlane(plane, hit)) return
      drag.current = { dx: item.x - hit.x, dz: item.z - hit.z }
      event.target.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'grabbing'
    },
    onPointerMove: (event) => {
      if (!drag.current) return
      event.stopPropagation()
      let next
      const onTop = small && stackSpot(event.ray, item, others, y)
      if (onTop) {
        next = { ...onTop, rotation: item.rotation }
      } else {
        if (!event.ray.intersectPlane(plane, hit)) return
        const x = hit.x + drag.current.dx
        const z = hit.z + drag.current.dz
        if (def.wall) {
          const wall = nearestWall(room, x, z)
          if (!wall) return
          next = onWallAt(room, wall.edge, wall.along)
        } else {
          const spot = nearestSpot(room, level, x, z, clearanceOf(item.kind))
          if (!spot) return
          next = { ...spot, rotation: item.rotation }
          if (small && item.on) Object.assign(next, { on: null, y: 0 })
        }
      }
      const changed = Object.keys(next).some((key) => next[key] !== item[key])
      if (changed) onChange(item.id, next)
    },
    onPointerUp: (event) => {
      if (!drag.current) return
      event.stopPropagation()
      drag.current = null
      event.target.releasePointerCapture(event.pointerId)
      document.body.style.cursor = 'grab'
    },
  }
  if (def.window) Object.assign(editHandlers, windowHandlers)

  const viewHandlers = clickable
    ? {
        ...hover,
        onClick: (event) => {
          event.stopPropagation()
          if (def.light) onToggleLight(item)
          else setPoke((n) => n + 1)
        },
      }
    : {}

  const tip = itemTip(def, item, editing)
  const topOf = spec ? spec.height + 0.15 : def.window ? def.window.half[1] * size * (item.sy ?? 1) : Math.min(height, ceiling - y - lift)
  return (
    <group
      position={[item.x, y + lift, item.z]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      {...(placing ? {} : editing ? editHandlers : viewHandlers)}
    >
      <group scale={scale}>
        {spec ? (
          <Bookcase spec={spec} paint={item.color} {...shelf} />
        ) : (
          <group ref={paintRef}>
            {def.window ? (
              <Model time={time} />
            ) : (
              <Shadowed>
                <Model lit={lit} shine={shine} poke={poke} ceiling={ceiling - y} time={time} color={room.shelfColor} />
              </Shadowed>
            )}
          </group>
        )}
      </group>
      {surfaces && <TableTop caseId={item.id} surfaces={surfaces} {...table} />}
      {editing && (selected || hovered) && (
        // On the floor around furniture; flat on the wall around a window.
        <mesh rotation={def.window ? [0, 0, 0] : [-Math.PI / 2, 0, 0]} position={def.window ? [0, 0, -0.2] : [0, 0.02, 0]}>
          <ringGeometry
            args={
              def.window
                ? [Math.max(...def.window.half) * size + 0.05, Math.max(...def.window.half) * size + 0.1, 48]
                : [(spec ? spec.width / 2 + 0.1 : radius), (spec ? spec.width / 2 + 0.1 : radius) + 0.05, 48]
            }
          />
          <meshBasicMaterial color={selected ? '#ffb070' : '#fff1dc'} transparent opacity={0.95} />
        </mesh>
      )}
      {editing && selected && !placing && tools && <ItemTools item={item} tools={tools} height={topOf + 0.35} />}
      {hovered && tip && !(editing && selected) && (
        <Html zIndexRange={[4, 0]} position={[0, Math.max(topOf + 0.25, small ? 0.3 : 0.9), 0]} center className="room-tooltip">
          {tip}
        </Html>
      )}
    </group>
  )
}

// ------------------------------------------------------------ camera

// Fit the whole diorama in the canvas at any window size, however big the
// reader has built it.
function useFitZoom({ width, depth, height }) {
  const { size } = useThree()
  const across = 0.72 * (width + depth)
  const tall = 0.5 * (width + depth) + 0.8 * height
  return Math.max(12, Math.min(size.width / across, size.height / tall))
}

function useView(geometry) {
  const { centre, height, minX, maxX, minZ, maxZ } = geometry
  return useMemo(() => {
    const target = [centre[0], 0.35 * height, centre[1]]
    return {
      target,
      from: [target[0] + 10, target[1] + 7.55, target[2] + 10],
      // How far the view may wander: around the room, never off into space.
      bounds: { x: [minX - 0.1, maxX + 0.1], y: [0.2, height + 0.2], z: [minZ - 0.1, maxZ + 0.1] },
    }
  }, [centre, height, minX, maxX, minZ, maxZ])
}

function Camera({ editing, viewReset, geometry }) {
  const fit = useFitZoom(geometry)
  const view = useView(geometry)
  const camera = useRef()
  const controls = useRef()

  // Fit the room to the window.
  useEffect(() => {
    camera.current.zoom = fit
    camera.current.updateProjectionMatrix()
  }, [fit])

  // "Re-centre" puts the view back exactly where it started; so does building
  // the room bigger or taller, so all of it is in view.
  useEffect(() => {
    if (!controls.current) return
    // With gliding on, the controls only ever shrink the motion left over from
    // the last drag, so it would keep nudging the view after the reset. An
    // update with gliding off clears it; the second pass then lands exactly on
    // the starting view.
    const glide = controls.current.enableDamping
    controls.current.enableDamping = false
    for (let pass = 0; pass < 2; pass += 1) {
      controls.current.target.set(...view.target)
      camera.current.position.set(...view.from)
      camera.current.zoom = fit
      camera.current.updateProjectionMatrix()
      controls.current.update()
    }
    controls.current.enableDamping = glide
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewReset, view])

  // Moving the view moves both the camera and the point it looks at. If that
  // point would leave the room, both are nudged back by the same amount.
  function keepInRoom() {
    const { target, object } = controls.current
    const { bounds } = view
    const before = target.clone()
    target.set(
      Math.min(bounds.x[1], Math.max(bounds.x[0], target.x)),
      Math.min(bounds.y[1], Math.max(bounds.y[0], target.y)),
      Math.min(bounds.z[1], Math.max(bounds.z[0], target.z))
    )
    object.position.add(target.clone().sub(before))
  }

  return (
    <>
      <OrthographicCamera ref={camera} makeDefault position={view.from} near={0.1} far={80} />
      <OrbitControls
        ref={controls}
        target={view.target}
        // Right-drag (or Shift + drag, or two fingers) slides the view; the
        // wheel zooms towards the pointer, so you can zoom straight into a shelf.
        enablePan
        screenSpacePanning
        zoomToCursor
        onChange={keepInRoom}
        // While editing, a left-drag moves furniture and books, not the view.
        enableRotate={!editing}
        minZoom={fit * 0.75}
        maxZoom={fit * 5}
        minPolarAngle={0.75}
        maxPolarAngle={1.2}
        minAzimuthAngle={Math.PI / 4 - 0.55}
        maxAzimuthAngle={Math.PI / 4 + 0.55}
      />
    </>
  )
}

// The sun (or moon), aimed at the middle of the room, its shadows covering the
// whole of it.
function Sun({ geometry, light }) {
  const sun = useRef()
  const { centre, width, depth, height } = geometry
  const reach = Math.max(6, 0.75 * Math.max(width, depth) + 2.5)
  useLayoutEffect(() => {
    sun.current.target.position.set(centre[0], 0, centre[1])
    sun.current.target.updateMatrixWorld()
  }, [centre])
  return (
    <directionalLight
      ref={sun}
      position={[centre[0] + 6, 10 + height, centre[1] + 7]}
      intensity={light[0]}
      color={light[1]}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-reach}
      shadow-camera-right={reach}
      shadow-camera-top={reach}
      shadow-camera-bottom={-reach}
      shadow-camera-far={40 + height}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
  )
}

// ------------------------------------------------------------ placing a block

const ground = new Plane(new Vector3(0, 1, 0), 0)
const groundHit = new Vector3()

// The spot nearest the pointer that a block may go: for floor, the empty
// square under it; for a wall, the floor edge nearest it, within reach.
function spotUnder(kind, spots, point) {
  if (kind === 'floor') {
    const i = Math.floor((point.x - CORNER) / BLOCKS.floor)
    const j = Math.floor((point.z - CORNER) / BLOCKS.floor)
    return spots.find((s) => s.i === i && s.j === j) ?? null
  }
  let best = null
  for (const spot of spots) {
    const box = cellBox(spot.i, spot.j)
    const [along, across, from, edge] =
      spot.side === 'x' ? [point.x, point.z, box.x[0], box.z[0]] : [point.z, point.x, box.z[0], box.x[0]]
    const onIt = Math.min(from + BLOCKS.floor, Math.max(from, along))
    const distance = Math.hypot(along - onIt, across - edge)
    if (!best || distance < best.distance) best = { spot, distance }
  }
  return best && best.distance < 2.5 ? best.spot : null
}

// While the reader builds, the whole ground catches the pointer, and the spot
// nearest it lights up: a see-through block where a new one would go, or the
// block that would be picked up or taken away. A click (not a drag to turn
// the view) chooses it.
//
// `mode` is { action: 'add' | 'move' | 'remove', kind, from?, at? }: moving
// picks a block first (`from`), then where it goes; taking one away picks it
// and waits (`at`) while the reader confirms.
function spotsFor(room, mode) {
  const { action, kind, from } = mode
  if (action === 'add') return kind === 'floor' ? floorSpots(room) : wallSpots(room)
  if (action === 'move' && from) return moveSpots(room, kind, from)
  return pickSpots(room, kind, action)
}

function BlockBuilder({ room, mode, onSpot }) {
  const spots = useMemo(() => spotsFor(room, mode), [room, mode])
  const [hover, setHover] = useState(null)
  const invalidate = useThree((state) => state.invalidate)
  const waiting = Boolean(mode.at)
  useEffect(() => {
    document.body.style.cursor = waiting ? '' : 'crosshair'
    return () => {
      document.body.style.cursor = ''
    }
  }, [waiting])

  const follow = (event) => {
    if (waiting || !event.ray.intersectPlane(ground, groundHit)) return
    const next = spotUnder(mode.kind, spots, groundHit)
    if (next !== hover) {
      setHover(next)
      invalidate()
    }
  }
  const choosing = mode.action === 'add' || (mode.action === 'move' && mode.from)
  const tone = choosing ? 'add' : mode.action === 'remove' ? 'remove' : 'pick'
  // The block being moved stays marked while the reader picks where it goes.
  const picked = mode.from && (mode.kind === 'wall' ? { ...mode.from, level: 0, levels: mode.from.levels } : mode.from)
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
        onPointerMove={follow}
        onClick={(event) => {
          event.stopPropagation()
          if (waiting || event.delta > 6) return
          follow(event)
          const spot = spotUnder(mode.kind, spots, groundHit)
          if (spot) onSpot(spot)
        }}
      >
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <BlockGhost room={room} placing={{ kind: mode.kind, spots: waiting ? [] : spots, hover: waiting ? mode.at : hover, tone }} />
      {picked && <BlockGhost room={room} placing={{ kind: mode.kind, spots: [], hover: picked, tone: 'pick' }} />}
    </>
  )
}

export default function LibraryScene({
  entries,
  room,
  time = 'day',
  selectedBookId,
  onSelectBook,
  editing,
  selectedItemId,
  onSelectItem,
  onItemChange,
  onToggleLight,
  onMoveBook,
  blockMode = null,
  onBlockSpot,
  itemTools,
  onGesture = () => {},
  viewReset = 0,
}) {
  // Stored furniture is not in the room at all.
  const items = room.items.filter((i) => i.placed)
  // Only the blocks shape the room; keyed on them alone so moving a chair
  // does not count as rebuilding the room (which re-centres the view).
  const geometry = useMemo(() => roomGeometry({ blocks: room.blocks }), [room.blocks])
  // Lights that are switched on get the few real lights first.
  const lightItems = items.filter((i) => MODELS[i.kind]?.light)
  const shining = new Set(
    [...lightItems.filter((i) => i.lit !== false), ...lightItems.filter((i) => i.lit === false)]
      .slice(0, MAX_ITEM_LIGHTS)
      .map((i) => i.id)
  )
  const landings = items.filter((i) => MODELS[i.kind]?.landing && (i.level ?? 0) === 0).map(landingOf)
  // Light falls into the room in front of the first two windows.
  const daylight = items
    .filter((i) => MODELS[i.kind]?.window)
    .slice(0, 2)
    .map((i) => {
      const turn = (i.rotation * Math.PI) / 180
      return [i.x + Math.sin(turn) * 0.4, i.y, i.z + Math.cos(turn) * 0.4]
    })
  const cases = bookcasesIn(room)
  const tables = tablesIn(room)
  const { placed: shelved, onTables } = layoutBookcases(entries, cases, tables)
  const lighting = LIGHTING[time] ?? LIGHTING.day

  // The book being carried in Edit room: { entry, size, target }, where target
  // is the shelf or table spot under the pointer and the x the book would land
  // at there (null when there is no room).
  const [drag, setDrag] = useState(null)
  const dragRef = useRef(null)
  dragRef.current = drag

  // Let go anywhere that is not a shelf or table, and the book goes back.
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

  function hoverShelf(caseId, row, desired, table = false) {
    const current = dragRef.current
    if (!current) return
    // Where it fits among the other books, as if it had already left its place.
    const others = layoutBookcases(entries.filter((e) => e.bookId !== current.entry.bookId), cases, tables)
    let x
    if (table) {
      x = others.onTables[caseId]?.some((b) => b.slot === row) ? null : 0
    } else {
      const spec = cases.find((c) => c.id === caseId).spec
      const onRow = (others.placed[caseId] ?? []).filter((b) => b.row === row)
      x = fitOnShelf(onRow, innerWidth(spec), current.size[0], desired)
    }
    const target = current.target
    if (target && target.caseId === caseId && target.row === row && target.x === x) return
    setDrag({ ...current, target: { caseId, row, x, table } })
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

  // While a block is being placed, nothing else in the room answers the
  // pointer.
  const placing = Boolean(blockMode)
  const bookProps = {
    selectedId: selectedBookId,
    interactive: !editing && !placing,
    editing: editing && !placing,
    onSelect: onSelectBook,
    drag,
    onDragStart: (entry, size) => setDrag({ entry, size, target: null }),
    onHover: hoverShelf,
    onDrop: dropBook,
  }
  const shelfProps = (id) => ({ ...bookProps, caseId: id, books: shelved[id] ?? [], color: room.shelfColor })
  const tableProps = (id) => ({ ...bookProps, books: onTables[id] ?? [] })

  return (
    <Canvas
      shadows
      frameloop="demand"
      dpr={[1, 2]}
      onPointerMissed={() => (editing && !placing ? onSelectItem(null) : null)}
    >
      <color attach="background" args={[lighting.background]} />
      <Camera editing={editing} viewReset={viewReset} geometry={geometry} />

      <ambientLight intensity={lighting.ambient[0]} color={lighting.ambient[1]} />
      <hemisphereLight args={lighting.sky} />
      <Sun geometry={geometry} light={lighting.sun} />

      <RoomShell room={room} time={time} landings={landings} daylight={daylight} />
      {items.map((item) => (
        <RoomItem
          key={item.id}
          item={item}
          room={room}
          geometry={geometry}
          time={time}
          shine={shining.has(item.id)}
          editing={editing}
          placing={placing}
          selected={item.id === selectedItemId}
          others={items}
          tools={itemTools}
          onSelect={onSelectItem}
          onChange={onItemChange}
          onGesture={onGesture}
          onToggleLight={onToggleLight}
          shelf={shelfProps(item.id)}
          table={tableProps(item.id)}
        />
      ))}

      {blockMode && <BlockBuilder room={room} mode={blockMode} onSpot={onBlockSpot} />}
    </Canvas>
  )
}
