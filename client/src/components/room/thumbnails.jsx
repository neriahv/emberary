import { useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MODELS } from './models.jsx'
import { finishSwatch } from './textures.js'

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
function Frame({ kind }) {
  const { camera } = useThree()
  const { radius, height } = MODELS[kind]
  useLayoutEffect(() => {
    const extent = Math.max(radius * 2.1, height * 1.3, 0.5)
    camera.position.set(5, 4.3 + height / 2, 5)
    camera.lookAt(0, height * 0.45, 0)
    camera.zoom = SIZE / extent
    camera.updateProjectionMatrix()
  }, [camera, radius, height])
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
