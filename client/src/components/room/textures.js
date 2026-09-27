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
