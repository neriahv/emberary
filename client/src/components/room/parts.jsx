import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// The pieces every Library Room model is built from: a handful of colours,
// shorthand for the simple shapes, and the parts that give light.
//
// Models take these props from the room:
//   lit    the light is switched on (the reader clicks a lamp to switch it)
//   shine  it may also cast real light: only a few may at once, so the scene
//          decides which; the rest just glow
//   poke   bumped each time the reader clicks it, for models that react
//   ceiling  how far above the item the top of the walls is, for hanging ones

export const WOOD = '#6b3a1f'
export const WOOD_DARK = '#3d2213'
export const WOOD_LIGHT = '#c99a66'
export const BRASS = '#b8893d'
export const IRON = '#2b2320'
export const PAPER = '#f3e7cf'
export const LEAF = '#3f6b3a'

// Turn shadows on for every mesh inside, so each model does not have to.
export function Shadowed({ children, receiveOnly = false }) {
  const ref = useRef()
  useLayoutEffect(() => {
    ref.current.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = !receiveOnly
        object.receiveShadow = true
      }
    })
  })
  return <group ref={ref}>{children}</group>
}

// A standard material in one line: colour, roughness, metalness, glow, opacity.
export function Mat({ c = '#ffffff', r = 0.7, m = 0, e, ei = 1, o, map, side }) {
  return (
    <meshStandardMaterial
      color={c}
      roughness={r}
      metalness={m}
      emissive={e ?? '#000000'}
      emissiveIntensity={e ? ei : 0}
      transparent={o !== undefined}
      opacity={o ?? 1}
      map={map ?? null}
      side={side ?? 0}
    />
  )
}

const shape = (Geometry) =>
  function Shape({ s, c, r, m, e, ei, o, map, side, children, ...props }) {
    return (
      <mesh {...props}>
        <Geometry args={s} />
        <Mat c={c} r={r} m={m} e={e} ei={ei} o={o} map={map} side={side} />
        {children}
      </mesh>
    )
  }

const BoxGeo = (props) => <boxGeometry {...props} />
const CylGeo = (props) => <cylinderGeometry {...props} />
const BallGeo = (props) => <sphereGeometry {...props} />
const ConeGeo = (props) => <coneGeometry {...props} />
const TorusGeo = (props) => <torusGeometry {...props} />

// s is the geometry's arguments: [width, height, depth] for a Box,
// [radiusTop, radiusBottom, height, segments] for a Cyl, and so on.
export const Box = shape(BoxGeo)
export const Cyl = shape(CylGeo)
export const Ball = shape(BallGeo)
export const Cone = shape(ConeGeo)
export const Torus = shape(TorusGeo)

// A flat plane lying on the floor, for rugs.
export function FloorPatch({ s, c, y = 0.006, round = false, map }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      {round ? <circleGeometry args={[s, 48]} /> : <planeGeometry args={s} />}
      <Mat c={c} r={1} map={map} />
    </mesh>
  )
}

// The real light a lamp casts, when it may. It stays mounted while switched
// off, at no brightness: adding or removing a light makes three.js rebuild
// every material in the room, which would stutter on each click.
export function Glow({ lit, shine, position, intensity = 1.5, distance = 4, decay = 1.5, color = '#ffb45e' }) {
  if (!shine) return null
  return <pointLight position={position} intensity={lit ? intensity : 0} distance={distance} decay={decay} color={color} />
}

// Something that glows while the light is on, and is dull glass or paper while
// it is off.
export function Lit({ s, geometry: Geometry = BallGeo, lit, c, glow, ei = 1.2, o, ...props }) {
  return (
    <mesh {...props}>
      <Geometry args={s} />
      <meshStandardMaterial
        color={c}
        emissive={glow}
        emissiveIntensity={lit ? ei : 0}
        roughness={0.5}
        transparent={o !== undefined}
        opacity={o ?? 1}
      />
    </mesh>
  )
}
Lit.Box = BoxGeo
Lit.Cyl = CylGeo
Lit.Cone = ConeGeo
Lit.Ball = BallGeo

// A candle flame: a bright drop while lit, a dark wick when not.
export function Flame({ lit, position = [0, 0, 0], size = 0.014, color = '#ffd27a' }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[lit ? size : size * 0.5, 10, 8]} />
      <meshBasicMaterial color={lit ? color : '#2b2320'} />
    </mesh>
  )
}

export function Candle({ position = [0, 0, 0], lit, shine, intensity = 1.2 }) {
  return (
    <group position={position}>
      <Cyl s={[0.025, 0.025, 0.1, 12]} position={[0, 0.05, 0]} c="#f6ecd6" r={0.6} />
      <Flame lit={lit} position={[0, 0.115, 0]} />
      <Glow lit={lit} shine={shine} position={[0, 0.2, 0]} intensity={intensity} distance={3} decay={1.6} />
    </group>
  )
}

// A short animation started by a click: calls play(t) every frame, t running
// from 0 to 1 over `seconds`, then play(1) once more and stops asking for
// frames. The room only draws when something changes, so the animation has to
// keep asking for the next frame itself.
export function usePlay(poke, seconds, play) {
  const started = useRef(null)
  const seen = useRef(poke)
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    if (poke !== seen.current) invalidate()
  }, [poke, invalidate])
  useFrame((state) => {
    const now = state.clock.elapsedTime
    if (poke !== seen.current) {
      seen.current = poke
      started.current = now
    }
    if (started.current === null) return
    const t = Math.min(1, (now - started.current) / seconds)
    play(t)
    if (t >= 1) started.current = null
    state.invalidate()
  })
}

// Something that moves all the time, like the floating books: play(seconds)
// every frame, for as long as it is in the room.
export function useAlways(play, enabled = true) {
  useFrame((state) => {
    if (!enabled) return
    play(state.clock.elapsedTime)
    state.invalidate()
  })
}
