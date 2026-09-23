import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { STATUSES, STATUS_LABELS } from '../../api'

// The 3D Library Room. One bookcase with a shelf per reading status, top to
// bottom, so where a book sits tells you where you are with it. Moving a book
// to another status in the detail panel moves it to another shelf.
//
// Units are roughly metres: the bookcase is 1.8 wide and 2.3 tall.

const CASE_WIDTH = 1.8
const CASE_DEPTH = 0.34
const SHELF_GAP = 0.5
const SHELF_BASE = 0.2 // height of the lowest shelf board
const INNER_WIDTH = CASE_WIDTH - 0.16

// Top shelf first, so Currently Reading is at eye level.
const shelfY = (status) => SHELF_BASE + (STATUSES.length - 1 - STATUSES.indexOf(status)) * SHELF_GAP

// Thicker books for longer books, taller for older ones, so a shelf does not
// look like a row of identical bricks.
function bookSize(book) {
  const thickness = 0.035 + Math.min(book.pages, 700) / 700 * 0.05
  const height = 0.3 + ((book.year * 7) % 10) / 100
  return [thickness, height, 0.24]
}

// Lay each shelf's books left to right. Anything that does not fit is left
// off and counted, rather than drawn through the side of the bookcase.
export function layoutShelves(entries) {
  const shelves = Object.fromEntries(STATUSES.map((s) => [s, { placed: [], hidden: 0 }]))
  for (const status of STATUSES) {
    let x = -INNER_WIDTH / 2
    for (const entry of entries.filter((e) => e.status === status)) {
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

function Book({ entry, size, x, y, selected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  // Pull the book towards you when pointed at, further when selected.
  const z = selected ? 0.14 : hovered ? 0.06 : 0

  return (
    <mesh
      position={[x, y + size[1] / 2, z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(entry.bookId)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={entry.book.color}
        roughness={0.7}
        emissive={selected ? '#ffb070' : '#000000'}
        emissiveIntensity={selected ? 0.35 : 0}
      />
      {(hovered || selected) && (
        <Html position={[0, size[1] / 2 + 0.06, 0]} center className="room-tooltip">
          {entry.book.title}
        </Html>
      )}
    </mesh>
  )
}

function Bookcase({ entries, color, selectedId, onSelect }) {
  const shelves = layoutShelves(entries)
  const height = SHELF_BASE + STATUSES.length * SHELF_GAP + 0.05

  return (
    <group position={[0, 0, -1.3]}>
      {/* back panel, sides, top */}
      <mesh position={[0, height / 2, -CASE_DEPTH / 2]}>
        <boxGeometry args={[CASE_WIDTH, height, 0.03]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * (CASE_WIDTH - 0.06)) / 2, height / 2, 0]}>
          <boxGeometry args={[0.06, height, CASE_DEPTH]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[CASE_WIDTH, 0.06, CASE_DEPTH]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {STATUSES.map((status) => {
        const y = shelfY(status)
        const { placed, hidden } = shelves[status]
        return (
          <group key={status}>
            <mesh position={[0, y - 0.02, 0]}>
              <boxGeometry args={[CASE_WIDTH - 0.06, 0.04, CASE_DEPTH]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            {/* On the shelf's front edge, at the right-hand end, clear of the
                books on the shelf below. */}
            <Html
              position={[CASE_WIDTH / 2 - 0.06, y - 0.02, CASE_DEPTH / 2 + 0.01]}
            >
              {/* drei owns the wrapper's transform, so the offset goes on
                  an inner element. */}
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
                y={y}
                selected={entry.bookId === selectedId}
                onSelect={onSelect}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
}

function Rug() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0.3]}>
      <circleGeometry args={[1.1, 48]} />
      <meshStandardMaterial color="#8c3b2a" roughness={1} />
    </mesh>
  )
}

function Plant() {
  return (
    <group position={[-1.4, 0, -0.9]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.4, 24]} />
        <meshStandardMaterial color="#b5653d" roughness={0.9} />
      </mesh>
      {[
        [0, 0.62, 0, 0.28],
        [0.14, 0.78, 0.05, 0.2],
        [-0.12, 0.8, -0.04, 0.2],
      ].map(([x, y, z, r]) => (
        <mesh key={`${x}${y}`} position={[x, y, z]}>
          <sphereGeometry args={[r, 20, 16]} />
          <meshStandardMaterial color="#3f6b3a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Lamp() {
  return (
    <group position={[1.4, 0, -0.8]}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.04, 24]} />
        <meshStandardMaterial color="#2b2320" />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 12]} />
        <meshStandardMaterial color="#2b2320" metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <coneGeometry args={[0.25, 0.3, 24, 1, true]} />
        <meshStandardMaterial color="#f3d9a8" emissive="#f3c07a" emissiveIntensity={0.6} side={2} />
      </mesh>
      <pointLight position={[0, 1.55, 0]} intensity={2.2} distance={5} color="#ffc48a" />
    </group>
  )
}

export default function LibraryScene({ entries, room, selectedId, onSelect }) {
  return (
    <Canvas
      camera={{ position: [0, 1.3, 2.4], fov: 50 }}
      frameloop="demand"
      onPointerMissed={() => onSelect(null)}
      dpr={[1, 2]}
    >
      <color attach="background" args={[room.wallColor]} />
      <hemisphereLight args={['#fff1e0', '#3a2a1e', room.lamp ? 1.1 : 1.4]} />
      <directionalLight position={[1, 3, 4]} intensity={1.6} />

      {/* floor and walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color={room.floorColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.6, -1.5]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial color={room.wallColor} roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 2.6, 1.6, 0.5]} rotation={[0, (-side * Math.PI) / 2, 0]}>
          <planeGeometry args={[4, 3.2]} />
          <meshStandardMaterial color={room.wallColor} roughness={1} />
        </mesh>
      ))}

      <Bookcase entries={entries} color={room.shelfColor} selectedId={selectedId} onSelect={onSelect} />
      {room.rug && <Rug />}
      {room.plant && <Plant />}
      {room.lamp && <Lamp />}

      <OrbitControls
        target={[0, 1.2, -1.2]}
        enablePan={false}
        minDistance={1.2}
        maxDistance={4.2}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
    </Canvas>
  )
}
