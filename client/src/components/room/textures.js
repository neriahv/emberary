import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

// Textures for the Library Room, drawn on a canvas at run time so nothing has
// to be downloaded, and so every spine can carry its own book's title.
//
// Each is made once and cached: a room re-renders often, and a new texture
// each time would leak GPU memory.

const cache = new Map()

function cached(key, draw) {
  if (!cache.has(key)) cache.set(key, draw())
  return cache.get(key)
}

function makeTexture(canvas) {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function canvas(width, height) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return [element, element.getContext('2d')]
}

// Light text on a dark spine, dark text on a light one.
function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.55 ? '#2a1d15' : '#f7ecd9'
}

// Shrink the font until the text fits the space, down to a floor.
function fitFont(ctx, text, maxWidth, start, min, family) {
  let size = start
  do {
    ctx.font = `700 ${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) return size
    size -= 1
  } while (size > min)
  return size
}

// A book's spine: its cover colour, two gilt bands, the title running top to
// bottom as on an English-language spine, and the author's surname at the foot.
export function spineTexture(book) {
  return cached(`spine|${book.id}|${book.color}|${book.title}`, () => {
    const [el, ctx] = canvas(96, 640)
    const { width: w, height: h } = el
    const ink = inkFor(book.color)

    ctx.fillStyle = book.color
    ctx.fillRect(0, 0, w, h)
    // Rounded spine: darker at both edges.
    const round = ctx.createLinearGradient(0, 0, w, 0)
    round.addColorStop(0, 'rgba(0,0,0,0.38)')
    round.addColorStop(0.22, 'rgba(255,255,255,0.10)')
    round.addColorStop(0.5, 'rgba(255,255,255,0.04)')
    round.addColorStop(0.82, 'rgba(0,0,0,0.10)')
    round.addColorStop(1, 'rgba(0,0,0,0.42)')
    ctx.fillStyle = round
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = ink
    ctx.globalAlpha = 0.75
    for (const y of [34, 44, h - 44, h - 34]) ctx.fillRect(10, y, w - 20, 3)
    ctx.globalAlpha = 1

    const family = 'Georgia, "Times New Roman", serif'
    ctx.save()
    ctx.translate(w / 2, 64)
    ctx.rotate(Math.PI / 2)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    fitFont(ctx, book.title, h - 64 - 150, 40, 18, family)
    ctx.fillText(book.title, 0, 0)
    ctx.restore()

    const surname = book.author.split(' ').at(-1)
    ctx.save()
    ctx.translate(w / 2, h - 60)
    ctx.rotate(Math.PI / 2)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    ctx.globalAlpha = 0.85
    fitFont(ctx, surname, 110, 26, 14, family)
    ctx.fillText(surname, 0, 0)
    ctx.restore()

    return makeTexture(el)
  })
}

// Grey wood planks. The floor material's colour tints them, so the reader's
// floor colour still applies.
export function plankTexture() {
  return cached('planks', () => {
    const [el, ctx] = canvas(512, 512)
    const rows = 8
    const rowHeight = el.height / rows
    for (let row = 0; row < rows; row++) {
      // Stagger the joints so the floor does not look like a grid.
      const offset = (row * 173) % 512
      for (let x = -offset; x < el.width; x += 256) {
        const shade = 200 + ((row * 37 + x) % 40)
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        ctx.fillRect(x, row * rowHeight, 256, rowHeight)
        // Grain.
        ctx.strokeStyle = 'rgba(0,0,0,0.06)'
        for (let g = 0; g < 5; g++) {
          const gy = row * rowHeight + 6 + g * (rowHeight / 5)
          ctx.beginPath()
          ctx.moveTo(x, gy)
          ctx.bezierCurveTo(x + 80, gy + 3, x + 170, gy - 3, x + 256, gy + 1)
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.fillRect(x, row * rowHeight, 2, rowHeight)
      }
      ctx.fillStyle = 'rgba(0,0,0,0.32)'
      ctx.fillRect(0, row * rowHeight, el.width, 2)
    }
    const texture = makeTexture(el)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(2, 2)
    return texture
  })
}

// ------------------------------------------------------------ finishes
//
// The shop's wallpapers and floors. Each is drawn in pale greys, and the
// material's colour tints it, so the reader's wall and floor colours still
// apply on top of the pattern they bought.

function repeating(el, x, y) {
  const texture = makeTexture(el)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(x, y)
  return texture
}

// A repeatable pseudo-random number, so a pattern looks the same every time.
const jitter = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const WALLPAPERS = {
  'wallpaper-stripes': () => {
    const [el, ctx] = canvas(256, 64)
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#d9d9d9' : '#f4f4f4'
      ctx.fillRect(i * 64, 0, 64, 64)
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(i * 64, 0, 2, 64)
    }
    return repeating(el, 8, 1)
  },
  'wallpaper-trellis': () => {
    const [el, ctx] = canvas(128, 128)
    ctx.fillStyle = '#f2f2f2'
    ctx.fillRect(0, 0, 128, 128)
    ctx.strokeStyle = '#c4c4c4'
    ctx.lineWidth = 5
    for (const k of [-1, 0, 1]) {
      ctx.beginPath()
      ctx.moveTo(k * 128, 0)
      ctx.lineTo(k * 128 + 128, 128)
      ctx.moveTo(k * 128 + 128, 0)
      ctx.lineTo(k * 128, 128)
      ctx.stroke()
    }
    ctx.fillStyle = '#b0b0b0'
    for (const [x, y] of [[64, 64], [0, 0], [128, 0], [0, 128], [128, 128]]) {
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    return repeating(el, 12, 7)
  },
  'wallpaper-sprig': () => {
    const [el, ctx] = canvas(128, 128)
    ctx.fillStyle = '#f3f3f3'
    ctx.fillRect(0, 0, 128, 128)
    const sprig = (x, y, turn) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(turn)
      ctx.strokeStyle = '#a9a9a9'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, 12)
      ctx.lineTo(0, -12)
      ctx.stroke()
      ctx.fillStyle = '#b8b8b8'
      for (const [lx, ly, a] of [[-5, -4, -0.6], [5, 2, 0.6], [-5, 8, -0.6], [0, -14, 0]]) {
        ctx.beginPath()
        ctx.ellipse(lx, ly, 3, 6, a, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    sprig(32, 32, 0.3)
    sprig(96, 96, -0.4)
    sprig(96, 32, 2.6)
    sprig(32, 96, -2.8)
    return repeating(el, 14, 8)
  },
  'wallpaper-panels': () => {
    const [el, ctx] = canvas(256, 256)
    for (let i = 0; i < 4; i++) {
      const shade = 205 + Math.round(jitter(i + 1) * 25)
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`
      ctx.fillRect(i * 64, 0, 64, 256)
      ctx.strokeStyle = 'rgba(0,0,0,0.05)'
      for (let g = 0; g < 4; g++) {
        const gx = i * 64 + 10 + g * 13
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.bezierCurveTo(gx + 3, 90, gx - 3, 170, gx + 1, 256)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(i * 64, 0, 3, 256)
    }
    return repeating(el, 7, 1)
  },
}

const FLOORS = {
  'floor-checker': () => {
    const [el, ctx] = canvas(128, 128)
    for (const [x, y, light] of [[0, 0, 1], [64, 0, 0], [0, 64, 0], [64, 64, 1]]) {
      ctx.fillStyle = light ? '#f0f0f0' : '#6e6e6e'
      ctx.fillRect(x, y, 64, 64)
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, 128, 128)
    ctx.beginPath()
    ctx.moveTo(64, 0)
    ctx.lineTo(64, 128)
    ctx.moveTo(0, 64)
    ctx.lineTo(128, 64)
    ctx.stroke()
    return repeating(el, 5, 5)
  },
  // Planks twice as long as they are wide, laid in the stepped zigzag of a
  // herringbone. The pattern repeats every four plank widths in both
  // directions, so the canvas tiles without a seam.
  'floor-herringbone': () => {
    const w = 32
    const size = 4 * w
    const [el, ctx] = canvas(size, size)
    let n = 0
    const plank = (x, y, width, height) => {
      const shade = 190 + Math.round(jitter(++n) * 45)
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`
      ctx.fillRect(x, y, width, height)
      ctx.strokeStyle = 'rgba(0,0,0,0.32)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)
    }
    for (let j = -4; j <= 4; j++) {
      for (let k = -8; k <= 8; k++) {
        const x = k * w + j * 2 * w
        const y = k * w - j * 2 * w
        plank(x, y, 2 * w, w)
        plank(x, y + w, w, 2 * w)
      }
    }
    return repeating(el, 5, 5)
  },
  'floor-stone': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#9a9a9a'
    ctx.fillRect(0, 0, 256, 256)
    const rows = [96, 64, 96]
    let y = 0
    let n = 0
    for (const height of rows) {
      const widths = height === 64 ? [96, 64, 96] : [128, 128]
      let x = Math.round(jitter(y + 3) * 60)
      for (let i = 0; i < widths.length * 2; i++) {
        const width = widths[i % widths.length]
        const shade = 195 + Math.round(jitter(++n) * 45)
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        // Drawn twice, one canvas-width apart, so a flag crossing the right
        // edge reappears on the left and the tile has no seam.
        for (const shift of [-256, 0]) ctx.fillRect(x + shift + 3, y + 3, width - 6, height - 6)
        x += width
        if (x >= 256 + 128) break
      }
      y += height
    }
    return repeating(el, 3, 3)
  },
}

// The wallpaper for the walls, or null for plain paint.
export function wallpaperTexture(id) {
  return WALLPAPERS[id] ? cached(id, WALLPAPERS[id]) : null
}

export function floorTexture(id) {
  return FLOORS[id] ? cached(id, FLOORS[id]) : plankTexture()
}

// A picture of a finish for the shop, tinted in CSS by the room's colour.
// null for plain paint, which is just the colour.
export function finishSwatch(id) {
  const texture = id.startsWith('wallpaper') ? wallpaperTexture(id) : floorTexture(id)
  if (!texture) return null
  return cached(`swatch|${id}`, () => texture.image.toDataURL())
}

// Afternoon sky for the round window.
export function skyTexture() {
  return cached('sky', () => {
    const [el, ctx] = canvas(256, 256)
    const sky = ctx.createLinearGradient(0, 0, 0, 256)
    sky.addColorStop(0, '#6f9ccc')
    sky.addColorStop(0.6, '#b9d3ea')
    sky.addColorStop(1, '#f4dcc0')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    for (const [x, y, r] of [
      [60, 150, 28], [92, 140, 36], [128, 152, 26], [180, 90, 22], [205, 84, 30], [232, 94, 20],
    ]) {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    return makeTexture(el)
  })
}
