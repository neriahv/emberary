import { useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MODELS } from './models.jsx'
import { finishSwatch } from './textures.js'
import { wallProfile } from './structure.jsx'

// Pictures of the furniture for the shop and the edit panel.
//
// A picture is a photo of the real 3D model, so it always matches what lands
// in the room. They are taken once, by one small off-screen canvas that shows
// each model in turn and saves what it drew, then unmounts. One canvas for all
// of them matters: a browser only allows a handful of WebGL canvases at once.

const SIZE = 160 // pixels, square
const photos = new Map() // kind -> data URL
const listeners = new Set()

function useVersion() {
  const [, bump] = useReducer((n) => n + 1, 0)
  useEffect(() => {
    listeners.add(bump)
    return () => listeners.delete(bump)
  }, [])
}

// Point the camera at the model the way the room's camera looks at the room,
// from above one corner, and zoom until the whole thing fits.
// Something hanging from above is framed on what hangs, not on its long chain;
// a window is seen nearly face on, around its middle.
function Frame({ kind }) {
  const { camera } = useThree()
  const { radius, height, hang, window } = MODELS[kind]
  useLayoutEffect(() => {
    if (window) {
      camera.position.set(1.6, 1.2, 6)
      camera.lookAt(0, 0, -0.3)
      camera.zoom = SIZE / (Math.max(...window.half) * 2.5)
    } else {
      const extent = hang ? Math.max(radius * 2.6, 1.1) : Math.max(radius * 2.1, height * 1.3, 0.5)
      const middle = hang ? 2.15 : height * 0.45
      camera.position.set(5, 4.3 + middle, 5)
      camera.lookAt(0, middle, 0)
      camera.zoom = SIZE / extent
    }
    camera.updateProjectionMatrix()
  }, [camera, radius, height, hang, window])
  return null
}

// Photographs `kind`. Saving the photo takes it off the parent's list of
// pending kinds, which re-renders this with the next one.
function Studio({ kind }) {
  const { gl } = useThree()
  const frames = useRef(0)
  const { Model } = MODELS[kind]

  useEffect(() => {
    frames.current = 0
  }, [kind])

  // Wait a couple of frames so the model and its lighting are drawn, then save.
  useFrame(() => {
    frames.current += 1
    if (frames.current !== 3) return
    photos.set(kind, gl.domElement.toDataURL('image/png'))
    listeners.forEach((listener) => listener())
  })

  return (
    <>
      <Frame kind={kind} />
      <ambientLight intensity={1.1} color="#fff0de" />
      <directionalLight position={[3, 6, 4]} intensity={1.6} color="#ffe6c4" />
      <directionalLight position={[-4, 2, -2]} intensity={0.4} color="#c9d8ff" />
      <group key={kind}>
        <Model lit sample />
      </group>
    </>
  )
}

// Mount once, somewhere on the page that shows pictures. Renders nothing
// visible, and nothing at all once every picture is taken.
export function ThumbnailStudio({ kinds }) {
  useVersion()
  const pending = kinds.filter((kind) => !photos.has(kind))
  if (pending.length === 0) return null
  return (
    <div className="thumbnail-studio" aria-hidden="true">
      <Canvas
        orthographic
        dpr={1}
        frameloop="always"
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        style={{ width: SIZE, height: SIZE }}
      >
        <Studio kind={pending[0]} />
      </Canvas>
    </div>
  )
}

// The picture of one piece of furniture, or a soft placeholder until it is ready.
export function ItemThumb({ kind, label }) {
  useVersion()
  const src = photos.get(kind)
  return (
    <span className="item-thumb" aria-hidden={label ? undefined : 'true'}>
      {src ? <img src={src} alt={label ?? ''} /> : <span className="item-thumb-wait" />}
    </span>
  )
}

// A wallpaper or floor, shown in the colour the reader has chosen for it.
export function FinishSwatch({ id, color }) {
  const src = finishSwatch(id)
  return (
    <span
      className="finish-swatch"
      aria-hidden="true"
      style={{
        backgroundColor: color,
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundBlendMode: 'multiply',
      }}
    />
  )
}

// ------------------------------------------------------------ build options

// Little drawings of the room's build options for the Build tab: the shape of
// the walls' top, a roof, the loft.
const INK = '#6b3a1f'
const FILL = '#f3e2c8'

function WallShapeDrawing({ id }) {
  const profile = wallProfile(id, 5.18, 3)
  const sx = 48 / 5.18
  const sy = 7
  const top = profile.map(([u, h]) => `L${8 + u * sx} ${44 - h * sy}`).join(' ')
  return <path d={`M8 44 ${top} L56 44 Z`} fill={FILL} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
}

const ROOF_DRAWINGS = {
  'roof-open': null,
  'roof-beams': <path d="M10 14 H54 M10 22 H54 M14 12 L10 18" stroke="#3d2213" strokeWidth="3" />,
  'roof-slate': <path d="M6 18 L32 6 L58 18 L54 20 L32 10 L10 20 Z" fill="#5a6470" stroke="#3a4048" strokeWidth="1" />,
  'roof-glass': (
    <path d="M10 12 L54 12 L54 26 L10 26 Z M21 12 V26 M32 12 V26 M43 12 V26" fill="#cfe8ff" fillOpacity="0.7" stroke="#f2efe6" strokeWidth="1.5" />
  ),
  'roof-ivy': (
    <>
      {[12, 18, 24, 30, 36, 42, 48, 54].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="12" r="3" fill="#4f8a45" />
          <line x1={x} y1="12" x2={x} y2={16 + (i % 3) * 7} stroke="#3f6b3a" strokeWidth="2" />
          <circle cx={x} cy={16 + (i % 3) * 7} r="2" fill="#3f6b3a" />
        </g>
      ))}
    </>
  ),
}

function Roof({ id }) {
  return (
    <>
      <path d="M10 44 V12 M10 44 H54" stroke={INK} strokeWidth="3" fill="none" />
      <rect x="10" y="12" width="44" height="32" fill={FILL} fillOpacity="0.5" />
      {ROOF_DRAWINGS[id]}
    </>
  )
}

// A tall wall seen side on, with the gallery and its railing when there is one.
function LoftDrawing({ id }) {
  return (
    <>
      <line x1="6" y1="44" x2="58" y2="44" stroke={INK} strokeWidth="1.5" />
      <rect x="10" y="6" width="44" height="38" fill={FILL} stroke={INK} strokeWidth="1.5" />
      {id === 'loft-gallery' && (
        <>
          <line x1="10" y1="25" x2="36" y2="25" stroke={INK} strokeWidth="3" />
          <line x1="35" y1="25" x2="35" y2="44" stroke={INK} strokeWidth="2" />
          {[14, 19, 24, 29, 34].map((x) => (
            <line key={x} x1={x} y1="25" x2={x} y2="18" stroke={INK} />
          ))}
          <line x1="12" y1="18" x2="35" y2="18" stroke={INK} />
        </>
      )}
    </>
  )
}

// The picture for one build option, by catalogue entry.
export function StructureSwatch({ entry }) {
  let drawing = null
  if (entry.type === 'wallShape') drawing = <WallShapeDrawing id={entry.id} />
  else if (entry.type === 'roof') drawing = <Roof id={entry.id} />
  else if (entry.type === 'loft') drawing = <LoftDrawing id={entry.id} />
  return (
    <span className="finish-swatch structure-swatch" aria-hidden="true">
      <svg viewBox="0 0 64 48">{drawing}</svg>
    </span>
  )
}
