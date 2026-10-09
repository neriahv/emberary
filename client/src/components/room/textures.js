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

// ------------------------------------------------------------ spines

// A spine is 96 x 640 pixels, drawn top to bottom. Every book gets one of five
// designs, chosen from its id so it always looks the same, in its own cover
// colour, so two books are told apart on the shelf by more than their titles.
const SPINE_W = 96
const SPINE_H = 640
const SERIF = 'Fraunces Variable, Georgia, "Times New Roman", serif'
const GILT = '#d9b56a'

function hashOf(text) {
  let hash = 0
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash
}

// The colour lighter (amount > 0) or darker (amount < 0).
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c) => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount))
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix)
  return `rgb(${r}, ${g}, ${b})`
}

// The rounded look of a real spine: darker at both edges.
function roundSpine(ctx) {
  const round = ctx.createLinearGradient(0, 0, SPINE_W, 0)
  round.addColorStop(0, 'rgba(0,0,0,0.38)')
  round.addColorStop(0.22, 'rgba(255,255,255,0.10)')
  round.addColorStop(0.5, 'rgba(255,255,255,0.04)')
  round.addColorStop(0.82, 'rgba(0,0,0,0.10)')
  round.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = round
  ctx.fillRect(0, 0, SPINE_W, SPINE_H)
}

// Text running top to bottom, as on an English-language spine.
function spineText(ctx, text, { y, length, align = 'left', start, min, color, alpha = 1 }) {
  ctx.save()
  ctx.translate(SPINE_W / 2, y)
  ctx.rotate(Math.PI / 2)
  ctx.textBaseline = 'middle'
  ctx.textAlign = align
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  fitFont(ctx, text, length, start, min, SERIF)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function diamond(ctx, x, y, size, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.lineTo(x + size * 0.7, y)
  ctx.lineTo(x, y + size)
  ctx.lineTo(x - size * 0.7, y)
  ctx.closePath()
  ctx.fill()
}

const surnameOf = (book) => book.author.split(',')[0].trim().split(' ').at(-1)

// Five designs. Each fills the canvas and returns where the title may go.
const DESIGNS = [
  // classic: two pairs of gilt bands at the head and foot
  (ctx, book, ink) => {
    ctx.fillStyle = book.color
    ctx.fillRect(0, 0, SPINE_W, SPINE_H)
    ctx.fillStyle = ink
    ctx.globalAlpha = 0.75
    for (const y of [34, 44, SPINE_H - 44, SPINE_H - 34]) ctx.fillRect(10, y, SPINE_W - 20, 3)
    ctx.globalAlpha = 1
    return { y: 70, length: SPINE_H - 220, color: ink }
  },
  // label: a paper label with the title, between dark bands
  (ctx, book) => {
    ctx.fillStyle = book.color
    ctx.fillRect(0, 0, SPINE_W, SPINE_H)
    ctx.fillStyle = shade(book.color, -0.35)
    ctx.fillRect(0, 0, SPINE_W, 36)
    ctx.fillRect(0, SPINE_H - 36, SPINE_W, 36)
    ctx.fillStyle = '#f3e6cc'
    ctx.fillRect(14, 70, SPINE_W - 28, SPINE_H - 230)
    ctx.strokeStyle = shade(book.color, -0.2)
    ctx.lineWidth = 3
    ctx.strokeRect(19, 75, SPINE_W - 38, SPINE_H - 240)
    return { y: 92, length: SPINE_H - 274, color: shade(book.color, -0.45) }
  },
  // two-tone: a pale band across the foot, like a paperback's jacket
  (ctx, book, ink) => {
    ctx.fillStyle = book.color
    ctx.fillRect(0, 0, SPINE_W, SPINE_H)
    ctx.fillStyle = shade(book.color, 0.55)
    ctx.fillRect(0, SPINE_H * 0.7, SPINE_W, SPINE_H * 0.3)
    ctx.fillStyle = GILT
    ctx.fillRect(0, SPINE_H * 0.7 - 5, SPINE_W, 5)
    diamond(ctx, SPINE_W / 2, 30, 12, GILT)
    return { y: 58, length: SPINE_H * 0.7 - 80, color: ink }
  },
  // leather: raised ribs with gilt diamonds between them
  (ctx, book, ink) => {
    ctx.fillStyle = shade(book.color, -0.15)
    ctx.fillRect(0, 0, SPINE_W, SPINE_H)
    for (const y of [24, 120, SPINE_H - 120, SPINE_H - 24]) {
      ctx.fillStyle = shade(book.color, -0.45)
      ctx.fillRect(0, y - 7, SPINE_W, 14)
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(0, y - 7, SPINE_W, 3)
    }
    diamond(ctx, SPINE_W / 2, 72, 14, GILT)
    diamond(ctx, SPINE_W / 2, SPINE_H - 72, 14, GILT)
    return { y: 150, length: SPINE_H - 330, color: GILT }
  },
  // stripes: a band of thin stripes near the head, the publisher's mark below
  (ctx, book, ink) => {
    ctx.fillStyle = book.color
    ctx.fillRect(0, 0, SPINE_W, SPINE_H)
    ctx.fillStyle = shade(book.color, 0.35)
    for (let i = 0; i < 5; i += 1) ctx.fillRect(0, 22 + i * 11, SPINE_W, 5)
    ctx.beginPath()
    ctx.arc(SPINE_W / 2, SPINE_H - 40, 16, 0, Math.PI * 2)
    ctx.fillStyle = shade(book.color, 0.5)
    ctx.fill()
    return { y: 96, length: SPINE_H - 260, color: ink }
  },
]

// A book's drawn spine. Used everywhere in demo mode, and in the live app until
// (or unless) the real cover arrives.
export function spineTexture(book) {
  return cached(`spine|${book.id}|${book.color}|${book.title}`, () => {
    const [el, ctx] = canvas(SPINE_W, SPINE_H)
    const ink = inkFor(book.color)
    const design = DESIGNS[hashOf(book.id) % DESIGNS.length]
    const title = design(ctx, book, ink)
    roundSpine(ctx)
    spineText(ctx, book.title, { y: title.y, length: title.length, start: 40, min: 16, color: title.color })
    spineText(ctx, surnameOf(book), {
      y: SPINE_H - 60,
      length: 110,
      align: 'right',
      start: 26,
      min: 14,
      color: title.color === GILT ? GILT : ink,
      alpha: 0.85,
    })
    return makeTexture(el)
  })
}

// A spine cut from the book's real cover: a strip from the left of the front,
// where a cover's art usually wraps round onto the spine, with the title on a
// dark band so it stays readable over any picture.
export function coverSpineTexture(book, image) {
  return cached(`cover-spine|${book.id}`, () => {
    const [el, ctx] = canvas(SPINE_W, SPINE_H)
    // Scale the cover to the spine's height, then take a strip near its left.
    const scale = SPINE_H / image.naturalHeight
    const stripFrom = Math.min(image.naturalWidth * 0.18, image.naturalWidth - SPINE_W / scale)
    ctx.drawImage(image, Math.max(0, stripFrom), 0, SPINE_W / scale, image.naturalHeight, 0, 0, SPINE_W, SPINE_H)

    const band = ctx.createLinearGradient(0, 0, SPINE_W, 0)
    band.addColorStop(0, 'rgba(20,12,8,0)')
    band.addColorStop(0.2, 'rgba(20,12,8,0.55)')
    band.addColorStop(0.8, 'rgba(20,12,8,0.55)')
    band.addColorStop(1, 'rgba(20,12,8,0)')
    ctx.fillStyle = band
    ctx.fillRect(0, 56, SPINE_W, SPINE_H - 200)
    ctx.fillStyle = GILT
    ctx.globalAlpha = 0.85
    ctx.fillRect(12, 50, SPINE_W - 24, 3)
    ctx.fillRect(12, SPINE_H - 147, SPINE_W - 24, 3)
    ctx.globalAlpha = 1

    roundSpine(ctx)
    spineText(ctx, book.title, { y: 70, length: SPINE_H - 228, start: 38, min: 16, color: '#fff6e6' })
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 6
    spineText(ctx, surnameOf(book), { y: SPINE_H - 40, length: 90, align: 'right', start: 24, min: 13, color: '#fff6e6' })
    ctx.restore()
    return makeTexture(el)
  })
}

// Load a cover from the app's own address, once per book. Resolves with the
// image, or null if there is none or it fails: the drawn spine stays.
const images = new Map()
export function loadCover(url) {
  if (!url) return Promise.resolve(null)
  if (!images.has(url)) {
    images.set(
      url,
      new Promise((resolve) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image.naturalWidth > 0 ? image : null)
        image.onerror = () => resolve(null)
        image.src = url
      })
    )
  }
  return images.get(url)
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

// Big dressed stones of uneven sizes, as on a castle wall: rows of blocks of
// different widths, some cut in two, each a slightly different grey with a
// few darker weathering marks. Every block crossing the right edge is drawn
// again on the left, so the canvas tiles without a seam.
function stoneBlocks(ctx, size, rowHeights, seed) {
  ctx.fillStyle = '#8c8c8c'
  ctx.fillRect(0, 0, size, size)
  let n = seed
  let y = 0
  for (const rowHeight of rowHeights) {
    let x = Math.round(jitter(++n) * size * 0.3)
    const start = x
    while (x < start + size) {
      const width = Math.round(size * (0.18 + jitter(++n) * 0.22))
      const split = jitter(++n) > 0.72
      const shade = 196 + Math.round(jitter(++n) * 44)
      for (const shift of [-size, 0]) {
        const pieces = split ? [[y, rowHeight / 2], [y + rowHeight / 2, rowHeight / 2]] : [[y, rowHeight]]
        for (const [py, ph] of pieces) {
          ctx.fillStyle = `rgb(${shade},${shade},${shade - 4})`
          ctx.fillRect(x + shift + 3, py + 3, width - 6, ph - 6)
          ctx.fillStyle = 'rgba(255,255,255,0.22)'
          ctx.fillRect(x + shift + 3, py + 3, width - 6, 3)
          ctx.fillStyle = 'rgba(0,0,0,0.12)'
          for (let k = 0; k < 3; k++) {
            ctx.beginPath()
            ctx.ellipse(x + shift + 8 + jitter(n + k * 7) * (width - 16), py + 8 + jitter(n + k * 11) * (ph - 16), 3 + jitter(n + k) * 7, 2 + jitter(n + k * 3) * 4, jitter(n + k * 5) * 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      x += width
    }
    y += rowHeight
  }
}

// Square glazed tiles with pale grout and a shine across each.
function glazedTiles(ctx, size, count, grout = 4) {
  ctx.fillStyle = '#bdbdbd'
  ctx.fillRect(0, 0, size, size)
  const tile = size / count
  let n = 0
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      const shade = 226 + Math.round(jitter(++n) * 20)
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`
      ctx.fillRect(col * tile + grout / 2, row * tile + grout / 2, tile - grout, tile - grout)
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillRect(col * tile + grout, row * tile + grout, (tile - grout) * 0.45, 3)
    }
  }
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
  // Painted brick, as on the reference's green cottage wall: staggered
  // courses with pale mortar between.
  'wallpaper-brick': () => {
    const [el, ctx] = canvas(256, 128)
    ctx.fillStyle = '#d6d6d6'
    ctx.fillRect(0, 0, 256, 128)
    let n = 0
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 ? 32 : 0
      for (let x = -64 + offset; x < 256; x += 64) {
        const shade = 200 + Math.round(jitter(++n) * 40)
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        ctx.fillRect(x + 2, row * 32 + 2, 60, 28)
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillRect(x + 2, row * 32 + 2, 60, 4)
      }
    }
    return repeating(el, 10, 10)
  },
  // Maple leaves drifting down, each turned its own way.
  'wallpaper-leaves': () => {
    const [el, ctx] = canvas(160, 160)
    ctx.fillStyle = '#f1f1f1'
    ctx.fillRect(0, 0, 160, 160)
    const leaf = (x, y, size, turn, shade) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(turn)
      ctx.fillStyle = shade
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + ((i - 2) * Math.PI) / 3.2
        const tip = i === 2 ? size : size * 0.78
        ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip)
        ctx.lineTo(Math.cos(a + 0.33) * size * 0.35, Math.sin(a + 0.33) * size * 0.35)
      }
      ctx.lineTo(0, size * 0.25)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = shade
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, size * 0.2)
      ctx.lineTo(0, size * 0.55)
      ctx.stroke()
      ctx.restore()
    }
    for (let i = 0; i < 7; i++) {
      const shade = 150 + Math.round(jitter(i + 40) * 60)
      leaf(jitter(i + 1) * 160, jitter(i + 9) * 160, 13 + jitter(i + 5) * 6, jitter(i + 3) * 6, `rgb(${shade},${shade},${shade})`)
    }
    return repeating(el, 10, 6)
  },
  // Small five-petalled flowers and dots, like a nursery print.
  'wallpaper-floral': () => {
    const [el, ctx] = canvas(128, 128)
    ctx.fillStyle = '#f6f6f6'
    ctx.fillRect(0, 0, 128, 128)
    const flower = (x, y, r) => {
      ctx.fillStyle = '#c9c9c9'
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5
        ctx.beginPath()
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#a8a8a8'
      ctx.beginPath()
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    flower(32, 32, 7)
    flower(96, 96, 7)
    ctx.fillStyle = '#d8d8d8'
    for (const [x, y] of [[96, 30], [30, 96], [64, 64], [10, 64], [64, 10]]) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    return repeating(el, 14, 8)
  },
  // Stars joined into constellations. The ground is mid-grey so the stars
  // stay brighter than the wall colour, even a dark one.
  'wallpaper-stars': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#8a8a8a'
    ctx.fillRect(0, 0, 256, 256)
    const star = (x, y, r) => {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4
        const d = i % 2 ? r * 0.35 : r
        ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
      }
      ctx.closePath()
      ctx.fill()
    }
    const groups = [
      [[30, 40], [62, 30], [90, 52], [118, 44]],
      [[160, 150], [190, 130], [215, 160], [195, 195]],
      [[50, 180], [80, 210], [40, 230]],
    ]
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.5
    for (const points of groups) {
      ctx.beginPath()
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.stroke()
      for (const [x, y] of points) star(x, y, 6)
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.4 + jitter(i + 70) * 0.5})`
      ctx.beginPath()
      ctx.arc(jitter(i + 11) * 256, jitter(i + 31) * 256, 0.8 + jitter(i) * 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
    return repeating(el, 5, 3)
  },
}

const FLOORS = {
  // The same castle stone underfoot, in bigger flags.
  'floor-castle': () => {
    const [el, ctx] = canvas(256, 256)
    stoneBlocks(ctx, 256, [72, 56, 72, 56], 40)
    return repeating(el, 3, 3)
  },
  // Rounded cobbles packed in pale mortar, each with a little shine.
  'floor-cobble': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#a8a8a8'
    ctx.fillRect(0, 0, 256, 256)
    let n = 0
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cx = col * 32 + 16 + (row % 2 ? 16 : 0) + (jitter(++n) - 0.5) * 6
        const cy = row * 32 + 16 + (jitter(++n) - 0.5) * 6
        const rx = 12 + jitter(++n) * 3
        const ry = 10 + jitter(++n) * 4
        const turn = jitter(++n) * Math.PI
        const shade = 150 + Math.round(jitter(++n) * 70)
        for (const [dx, dy] of [[0, 0], [-256, 0], [256, 0], [0, -256], [0, 256]]) {
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`
          ctx.beginPath()
          ctx.ellipse(cx + dx, cy + dy, rx, ry, turn, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.25)'
          ctx.beginPath()
          ctx.ellipse(cx + dx - 3, cy + dy - 3, rx * 0.45, ry * 0.35, turn, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    return repeating(el, 4, 4)
  },
  // Polished granite: fine speckles of every grey, in big square slabs.
  'floor-granite': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#d2d2d2'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 2600; i++) {
      const shade = Math.round(jitter(i + 3) * 200)
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.35 + jitter(i + 9) * 0.5})`
      ctx.fillRect(jitter(i + 1) * 256, jitter(i + 2) * 256, 1 + jitter(i + 4) * 3, 1 + jitter(i + 5) * 3)
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(0, 0, 256, 2)
    ctx.fillRect(0, 0, 2, 256)
    return repeating(el, 3, 3)
  },
  'floor-ceramic': () => {
    const [el, ctx] = canvas(128, 128)
    glazedTiles(ctx, 128, 2, 5)
    return repeating(el, 8, 8)
  },
  // Wide boards of soft pine, their ends staggered, with long grain.
  'floor-wideplanks': () => {
    const [el, ctx] = canvas(256, 256)
    let n = 0
    for (let k = 0; k < 4; k++) {
      const joint = Math.round(jitter(k + 31) * 256)
      for (const [from, to] of [[joint - 256, joint], [joint, joint + 256]]) {
        const shade = 200 + Math.round(jitter(++n) * 35)
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        ctx.fillRect(k * 64, from, 64, to - from)
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(k * 64, to - 1, 64, 2)
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      for (let g = 0; g < 6; g++) {
        const gx = k * 64 + 6 + g * 10
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.bezierCurveTo(gx + 4, 80, gx - 4, 170, gx, 256)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(k * 64, 0, 2, 256)
    }
    return repeating(el, 4, 2)
  },
  // Dark marble with pale veins, in big slabs.
  'floor-blackmarble': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 10; i++) {
      ctx.lineWidth = 0.6 + jitter(i + 70) * 1.6
      ctx.beginPath()
      let x = jitter(i + 11) * 256
      let y = 0
      ctx.moveTo(x, y)
      while (y < 256) {
        x += (jitter(i * 17 + y) - 0.5) * 46
        y += 20
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, 256, 2)
    ctx.fillRect(0, 0, 2, 256)
    return repeating(el, 3, 3)
  },
  // Woven sisal: little squares of strands, turned one way then the other.
  'floor-sisal': () => {
    const [el, ctx] = canvas(64, 64)
    ctx.fillStyle = '#c8c8c8'
    ctx.fillRect(0, 0, 64, 64)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const across = (row + col) % 2 === 0
        for (let k = 0; k < 4; k++) {
          const shade = 180 + Math.round(jitter(row * 16 + col * 4 + k) * 40)
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`
          if (across) ctx.fillRect(col * 16, row * 16 + k * 4, 16, 3)
          else ctx.fillRect(col * 16 + k * 4, row * 16, 3, 16)
        }
      }
    }
    return repeating(el, 16, 16)
  },
  // Tatami mats, twice as long as wide, laid the traditional way round, with
  // a dark binding along each long side.
  'floor-tatami': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#7a7a7a'
    ctx.fillRect(0, 0, 256, 256)
    const mat = (x, y, w, h) => {
      const along = w > h
      ctx.fillStyle = '#d8d8d8'
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2)
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      for (let k = 3; k < (along ? h : w) - 3; k += 3) {
        ctx.beginPath()
        if (along) {
          ctx.moveTo(x + 2, y + k)
          ctx.lineTo(x + w - 2, y + k)
        } else {
          ctx.moveTo(x + k, y + 2)
          ctx.lineTo(x + k, y + h - 2)
        }
        ctx.stroke()
      }
      ctx.fillStyle = '#5a5a5a'
      if (along) {
        ctx.fillRect(x + 1, y + 1, w - 2, 6)
        ctx.fillRect(x + 1, y + h - 7, w - 2, 6)
      } else {
        ctx.fillRect(x + 1, y + 1, 6, h - 2)
        ctx.fillRect(x + w - 7, y + 1, 6, h - 2)
      }
    }
    mat(0, 0, 128, 64)
    mat(128, 0, 128, 64)
    for (const x of [0, 64, 128, 192]) mat(x, 64, 64, 128)
    for (const x of [-64, 64, 192]) mat(x, 192, 128, 64)
    return repeating(el, 4, 4)
  },
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
  // Hexagonal tiles with pale grout.
  'floor-terracotta': () => {
    const r = 22
    const w = Math.sqrt(3) * r
    const [el, ctx] = canvas(Math.round(w * 4), r * 6)
    ctx.fillStyle = '#e8e8e8'
    ctx.fillRect(0, 0, el.width, el.height)
    let n = 0
    for (let row = -1; row < 5; row++) {
      for (let col = -1; col < 6; col++) {
        const cx = col * w + (row % 2 ? w / 2 : 0)
        const cy = row * r * 1.5
        const shade = 175 + Math.round(jitter(++n) * 45)
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3
          ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2))
        }
        ctx.closePath()
        ctx.fill()
      }
    }
    return repeating(el, 9, 8)
  },
  // Flagstones with tufts of moss in the joints.
  'floor-moss': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#7d7d7d'
    ctx.fillRect(0, 0, 256, 256)
    let n = 0
    for (const [x, y, w, h] of [
      [0, 0, 120, 100], [120, 0, 136, 70], [120, 70, 136, 90], [0, 100, 80, 156],
      [80, 100, 40, 60], [80, 160, 176, 96],
    ]) {
      const shade = 190 + Math.round(jitter(++n) * 50)
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`
      ctx.beginPath()
      ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 14)
      ctx.fill()
    }
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(90,90,90,${0.35 + jitter(i + 3) * 0.4})`
      ctx.beginPath()
      ctx.arc(jitter(i + 7) * 256, jitter(i + 17) * 256, 2 + jitter(i + 27) * 5, 0, Math.PI * 2)
      ctx.fill()
    }
    return repeating(el, 3, 3)
  },
  // Large polished squares with soft veins.
  'floor-marble': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#f2f2f2'
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 1 + jitter(i + 50) * 2
      ctx.beginPath()
      let x = jitter(i + 1) * 256
      let y = 0
      ctx.moveTo(x, y)
      while (y < 256) {
        x += (jitter(i * 13 + y) - 0.5) * 40
        y += 24
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, 256, 2)
    ctx.fillRect(0, 0, 2, 256)
    ctx.fillRect(0, 127, 256, 2)
    ctx.fillRect(127, 0, 2, 256)
    return repeating(el, 3, 3)
  },
}

Object.assign(WALLPAPERS, {
  // Castle stone, as in the reader's grey stone reference.
  'wallpaper-stone': () => {
    const [el, ctx] = canvas(256, 256)
    stoneBlocks(ctx, 256, [56, 48, 64, 40, 48], 7)
    return repeating(el, 5, 3)
  },
  // Long glossy tiles laid like bricks.
  'wallpaper-subway': () => {
    const [el, ctx] = canvas(128, 64)
    ctx.fillStyle = '#b8b8b8'
    ctx.fillRect(0, 0, 128, 64)
    let n = 0
    for (let row = 0; row < 2; row++) {
      for (let x = row ? -32 : 0; x < 128; x += 64) {
        const shade = 228 + Math.round(jitter(++n) * 18)
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`
        ctx.fillRect(x + 2, row * 32 + 2, 60, 28)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillRect(x + 6, row * 32 + 5, 30, 3)
      }
    }
    return repeating(el, 16, 18)
  },
  'wallpaper-ceramic': () => {
    const [el, ctx] = canvas(128, 128)
    glazedTiles(ctx, 128, 2, 4)
    return repeating(el, 12, 7)
  },
  // Seigaiha: overlapping fans of rings, like waves.
  'wallpaper-waves': () => {
    const [el, ctx] = canvas(128, 64)
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, 128, 64)
    const fan = (cx, cy) => {
      for (let r = 32, k = 0; r > 2; r -= 5.5, k++) {
        ctx.fillStyle = k % 2 ? '#f0f0f0' : '#bcbcbc'
        ctx.beginPath()
        ctx.arc(cx, cy, r, Math.PI, 0)
        ctx.fill()
      }
    }
    for (const cx of [-32, 32, 96, 160]) fan(cx, 32)
    for (const cx of [0, 64, 128]) fan(cx, 64)
    return repeating(el, 12, 14)
  },
  // Paper screens in a wooden lattice.
  'wallpaper-shoji': () => {
    const [el, ctx] = canvas(128, 192)
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, 128, 192)
    ctx.fillStyle = '#8a8a8a'
    for (const x of [0, 42, 85]) ctx.fillRect(x, 0, 4, 192)
    for (const y of [0, 48, 96, 144]) ctx.fillRect(0, y, 128, 4)
    ctx.fillRect(0, 0, 8, 192)
    ctx.fillStyle = 'rgba(0,0,0,0.04)'
    for (let y = 6; y < 192; y += 6) ctx.fillRect(0, y, 128, 1)
    return repeating(el, 8, 3)
  },
  // Coarse woven burlap.
  'wallpaper-burlap': () => {
    const [el, ctx] = canvas(64, 64)
    ctx.fillStyle = '#d4d4d4'
    ctx.fillRect(0, 0, 64, 64)
    for (let k = 0; k < 16; k++) {
      const shade = 170 + Math.round(jitter(k + 5) * 50)
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.8)`
      ctx.fillRect(0, k * 4, 64, 2)
      const shade2 = 175 + Math.round(jitter(k + 25) * 45)
      ctx.fillStyle = `rgba(${shade2},${shade2},${shade2},0.7)`
      ctx.fillRect(k * 4, 0, 2, 64)
    }
    return repeating(el, 24, 14)
  },
  // Smooth cement, mottled, with the marks of the boards it was cast in.
  'wallpaper-cement': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#d0d0d0'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 160; i++) {
      const shade = 170 + Math.round(jitter(i + 2) * 70)
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.18)`
      ctx.beginPath()
      ctx.ellipse(jitter(i + 7) * 256, jitter(i + 13) * 256, 6 + jitter(i + 19) * 26, 4 + jitter(i + 23) * 16, jitter(i) * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(0, 0, 256, 2)
    ctx.fillRect(0, 0, 2, 256)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    for (const [x, y] of [[32, 32], [224, 32], [32, 224], [224, 224]]) {
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    return repeating(el, 4, 2)
  },
  // Damask: a curling flower-and-leaf motif, mirrored, on a plain ground.
  'wallpaper-damask': () => {
    const [el, ctx] = canvas(128, 160)
    ctx.fillStyle = '#ececec'
    ctx.fillRect(0, 0, 128, 160)
    const motif = (cx, cy, scale) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(scale, scale)
      ctx.fillStyle = '#c4c4c4'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(0, -40)
        ctx.bezierCurveTo(side * 30, -30, side * 34, 0, side * 8, 10)
        ctx.bezierCurveTo(side * 30, 16, side * 26, 38, 0, 40)
        ctx.bezierCurveTo(side * 10, 24, side * 6, 0, 0, -40)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(side * 22, -6, 6, 12, side * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#ececec'
      ctx.beginPath()
      ctx.ellipse(0, 4, 5, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    motif(64, 40, 0.8)
    for (const x of [0, 128]) motif(x, 120, 0.8)
    return repeating(el, 10, 5)
  },
})

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

// The sky seen through the windows, at the time of day the reader chose: an
// afternoon with clouds, a pink dusk, or a night of stars with a moon.
const SKIES = {
  day: { stops: ['#6f9ccc', '#b9d3ea', '#f4dcc0'], cloud: 'rgba(255,255,255,0.75)' },
  dusk: { stops: ['#4b3a78', '#d9708a', '#ffc58a'], cloud: 'rgba(255,214,190,0.55)' },
  night: { stops: ['#0d1030', '#1d2457', '#33366e'], cloud: null },
}

export function skyTexture(time = 'day') {
  return cached(`sky|${time}`, () => {
    const { stops, cloud } = SKIES[time] ?? SKIES.day
    const [el, ctx] = canvas(256, 256)
    const sky = ctx.createLinearGradient(0, 0, 0, 256)
    stops.forEach((colour, i) => sky.addColorStop(i / (stops.length - 1), colour))
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 256, 256)
    if (cloud) {
      ctx.fillStyle = cloud
      for (const [x, y, r] of [
        [60, 150, 28], [92, 140, 36], [128, 152, 26], [180, 90, 22], [205, 84, 30], [232, 94, 20],
      ]) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(255,255,240,${0.4 + jitter(i + 5) * 0.6})`
        ctx.beginPath()
        ctx.arc(jitter(i + 1) * 256, jitter(i + 99) * 256, 0.6 + jitter(i + 3) * 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      // A crescent: a pale disc with the sky's colour bitten out of it.
      ctx.fillStyle = '#fff4d0'
      ctx.beginPath()
      ctx.arc(176, 72, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = stops[0]
      ctx.beginPath()
      ctx.arc(188, 64, 24, 0, Math.PI * 2)
      ctx.fill()
    }
    return makeTexture(el)
  })
}

// Overlapping rows of rounded slates, for the eaves.
export function slateTexture() {
  return cached('slate', () => {
    const [el, ctx] = canvas(128, 128)
    ctx.fillStyle = '#4b5560'
    ctx.fillRect(0, 0, 128, 128)
    let n = 0
    for (let row = 0; row < 5; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * 32 + (row % 2 ? 16 : 0)
        const y = row * 26
        const shade = 95 + Math.round(jitter(++n) * 40)
        ctx.fillStyle = `rgb(${shade - 8},${shade},${shade + 12})`
        ctx.beginPath()
        ctx.roundRect(x + 1, y, 30, 30, [0, 0, 10, 10])
        ctx.fill()
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.fillRect(x + 1, y + 27, 30, 3)
      }
    }
    return repeating(el, 4, 1)
  })
}

// A woven check, for the plaid armchair and the tea table's cloth.
export function checkTexture(base, stripe, repeat = 3) {
  return cached(`check|${base}|${stripe}|${repeat}`, () => {
    const [el, ctx] = canvas(64, 64)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 64, 64)
    ctx.globalAlpha = 0.55
    ctx.fillStyle = stripe
    ctx.fillRect(0, 20, 64, 16)
    ctx.fillRect(20, 0, 16, 64)
    ctx.globalAlpha = 0.35
    ctx.fillRect(0, 50, 64, 4)
    ctx.fillRect(50, 0, 4, 64)
    ctx.globalAlpha = 1
    return repeating(el, repeat, repeat)
  })
}

// The front of a book lying on a table: its colour, a frame of rules, and its
// title and author. In the live app the real cover replaces it.
export function coverTexture(book) {
  return cached(`cover|${book.id}|${book.color}|${book.title}`, () => {
    const [el, ctx] = canvas(256, 384)
    const ink = inkFor(book.color)
    ctx.fillStyle = book.color
    ctx.fillRect(0, 0, 256, 384)
    ctx.strokeStyle = ink
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 3
    ctx.strokeRect(16, 16, 224, 352)
    ctx.lineWidth = 1.5
    ctx.strokeRect(24, 24, 208, 336)
    ctx.globalAlpha = 1
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // The title, wrapped onto as many as three lines.
    ctx.font = `700 30px ${SERIF}`
    const lines = []
    for (const word of book.title.split(' ')) {
      const last = lines.at(-1)
      if (last && ctx.measureText(`${last} ${word}`).width < 190) lines[lines.length - 1] = `${last} ${word}`
      else lines.push(word)
    }
    lines.slice(0, 3).forEach((line, i) => {
      fitFont(ctx, line, 200, 30, 14, SERIF)
      ctx.fillText(line, 128, 120 + i * 38)
    })
    diamond(ctx, 128, 250, 10, ink)
    fitFont(ctx, book.author, 190, 20, 11, SERIF)
    ctx.fillText(book.author, 128, 310)
    return makeTexture(el)
  })
}

// A real cover photo, for a book lying face up.
export function coverImageTexture(book, image) {
  return cached(`cover-image|${book.id}`, () => {
    const [el, ctx] = canvas(256, 384)
    ctx.drawImage(image, 0, 0, 256, 384)
    return makeTexture(el)
  })
}

// ------------------------------------------------------------ pictures
//
// Flat pictures for the wizard's things: the patterned rugs and the
// chalkboard's drawings. Drawn once each, in full colour.

// A star of `points` points, as a path.
function starPath(ctx, x, y, outer, inner, points, turn = -Math.PI / 2) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = turn + (i * Math.PI) / points
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.closePath()
}

const PICTURES = {
  // A square arcane rug: plum ground, gold border, a ring of rune marks and
  // an eight-pointed compass star in the middle.
  'arcane-rug': () => {
    const [el, ctx] = canvas(512, 512)
    ctx.fillStyle = '#6a3a5c'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = '#d9b56a'
    ctx.lineWidth = 8
    ctx.strokeRect(22, 22, 468, 468)
    ctx.lineWidth = 3
    ctx.strokeRect(40, 40, 432, 432)
    for (const [x, y] of [[40, 40], [472, 40], [40, 472], [472, 472]]) {
      ctx.fillStyle = '#d9b56a'
      starPath(ctx, x, y, 18, 7, 4)
      ctx.fill()
    }
    ctx.lineWidth = 5
    for (const r of [190, 150]) {
      ctx.beginPath()
      ctx.arc(256, 256, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    // rune marks between the rings
    ctx.lineWidth = 3
    for (let k = 0; k < 24; k++) {
      const a = (k * Math.PI * 2) / 24
      ctx.save()
      ctx.translate(256 + Math.cos(a) * 170, 256 + Math.sin(a) * 170)
      ctx.rotate(a + Math.PI / 2)
      ctx.beginPath()
      const kind = k % 4
      if (kind === 0) { ctx.moveTo(-6, -8); ctx.lineTo(6, 8); ctx.moveTo(6, -8); ctx.lineTo(-6, 8) }
      if (kind === 1) { ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.moveTo(0, -2); ctx.lineTo(7, -8) }
      if (kind === 2) { ctx.arc(0, 0, 6, 0, Math.PI * 2) }
      if (kind === 3) { ctx.moveTo(-7, 8); ctx.lineTo(0, -8); ctx.lineTo(7, 8) }
      ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = '#d9b56a'
    starPath(ctx, 256, 256, 130, 34, 8)
    ctx.fill()
    ctx.fillStyle = '#6a3a5c'
    starPath(ctx, 256, 256, 104, 30, 8)
    ctx.fill()
    ctx.fillStyle = '#d9b56a'
    ctx.beginPath()
    ctx.arc(256, 256, 22, 0, Math.PI * 2)
    ctx.fill()
    return makeTexture(el)
  },
  // Pink and butter-yellow checks inside a pale blue border.
  'checker-rug': () => {
    const [el, ctx] = canvas(512, 384)
    ctx.fillStyle = '#a9d6dc'
    ctx.fillRect(0, 0, 512, 384)
    ctx.fillStyle = '#fbf3e4'
    ctx.fillRect(52, 52, 408, 280)
    const size = 34
    for (let y = 58; y < 326; y += size) {
      for (let x = 58; x < 454; x += size) {
        const k = Math.round((x - 58) / size) + Math.round((y - 58) / size)
        ctx.fillStyle = k % 2 ? '#f4b6c6' : '#f6eba3'
        ctx.fillRect(x, y, Math.min(size, 454 - x), Math.min(size, 326 - y))
      }
    }
    return makeTexture(el)
  },
  // A navy rug scattered with white stars, in a zigzag border.
  'star-rug': () => {
    const [el, ctx] = canvas(384, 512)
    ctx.fillStyle = '#1f2a4f'
    ctx.fillRect(0, 0, 384, 512)
    ctx.fillStyle = '#e9e4d6'
    for (let k = 0; k < 16; k++) {
      for (const [y, flip] of [[18, 1], [494, -1]]) {
        ctx.beginPath()
        ctx.moveTo(k * 24, y - 10 * flip)
        ctx.lineTo(k * 24 + 12, y + 10 * flip)
        ctx.lineTo(k * 24 + 24, y - 10 * flip)
        ctx.fill()
      }
    }
    for (let k = 0; k < 21; k++) {
      for (const [x, flip] of [[18, 1], [366, -1]]) {
        ctx.beginPath()
        ctx.moveTo(x - 10 * flip, k * 24)
        ctx.lineTo(x + 10 * flip, k * 24 + 12)
        ctx.lineTo(x - 10 * flip, k * 24 + 24)
        ctx.fill()
      }
    }
    ctx.strokeStyle = '#8a6a3a'
    ctx.lineWidth = 6
    ctx.strokeRect(40, 40, 304, 432)
    for (let k = 0; k < 26; k++) {
      const x = 60 + jitter(k + 3) * 264
      const y = 60 + jitter(k + 9) * 392
      const big = jitter(k + 17) > 0.7
      ctx.fillStyle = '#f2efe6'
      starPath(ctx, x, y, big ? 22 : 10, big ? 3 : 2.5, big ? 8 : 4, jitter(k) * 0.4)
      ctx.fill()
    }
    return makeTexture(el)
  },
  // Chalk on a green board: crescent moons, a star, a ring of the moon's
  // phases, a potion and a feather, and lines of notes.
  'moon-chalkboard': () => {
    const [el, ctx] = canvas(512, 288)
    ctx.fillStyle = '#2f5a48'
    ctx.fillRect(0, 0, 512, 288)
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.02 + jitter(i) * 0.04})`
      ctx.fillRect(jitter(i + 2) * 512, jitter(i + 5) * 288, 30 + jitter(i + 7) * 60, 6 + jitter(i + 9) * 20)
    }
    ctx.strokeStyle = 'rgba(235,240,225,0.85)'
    ctx.fillStyle = 'rgba(235,240,225,0.85)'
    ctx.lineWidth = 3
    const moon = (x, y, r, turn) => {
      ctx.beginPath()
      ctx.arc(x, y, r, turn, turn + Math.PI)
      ctx.quadraticCurveTo(x + Math.cos(turn + Math.PI / 2) * r * 0.2, y + Math.sin(turn + Math.PI / 2) * r * 0.2, x + Math.cos(turn) * r, y + Math.sin(turn) * r)
      ctx.stroke()
    }
    moon(150, 50, 18, -Math.PI / 2)
    moon(205, 50, 18, Math.PI / 2)
    starPath(ctx, 300, 48, 26, 10, 5)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(250, 170, 62, 0, Math.PI * 2)
    ctx.stroke()
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      ctx.beginPath()
      ctx.arc(250 + Math.cos(a) * 44, 170 + Math.sin(a) * 44, 9, 0, Math.PI * 2)
      if (k % 2) ctx.fill()
      else ctx.stroke()
    }
    // notes
    ctx.lineWidth = 2
    for (const [x, y, w] of [[40, 110, 110], [40, 140, 90], [40, 170, 120], [40, 200, 80], [360, 110, 100], [360, 230, 110], [60, 250, 120]]) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      for (let u = 0; u < w; u += 10) ctx.lineTo(x + u, y + Math.sin(u * 0.6) * 3)
      ctx.stroke()
    }
    // a flask
    ctx.beginPath()
    ctx.arc(420, 175, 24, 0, Math.PI * 2)
    ctx.moveTo(412, 152)
    ctx.lineTo(412, 135)
    ctx.lineTo(428, 135)
    ctx.lineTo(428, 152)
    ctx.stroke()
    // a feather
    ctx.beginPath()
    ctx.moveTo(470, 60)
    ctx.quadraticCurveTo(500, 90, 455, 130)
    ctx.quadraticCurveTo(450, 90, 470, 60)
    ctx.moveTo(470, 60)
    ctx.lineTo(450, 140)
    ctx.stroke()
    return makeTexture(el)
  },
  // A framed chart: a window, a sun, crystals and a little cauldron, in gold
  // and lilac on deep purple.
  'spell-chart': () => {
    const [el, ctx] = canvas(256, 256)
    ctx.fillStyle = '#3a2350'
    ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = '#9a6ad0'
    ctx.beginPath()
    ctx.moveTo(40, 170)
    ctx.lineTo(40, 80)
    ctx.arc(70, 80, 30, Math.PI, 0)
    ctx.lineTo(100, 170)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#d9b56a'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(70, 50)
    ctx.lineTo(70, 170)
    ctx.moveTo(40, 110)
    ctx.lineTo(100, 110)
    ctx.stroke()
    ctx.fillStyle = '#e6c46a'
    starPath(ctx, 185, 60, 22, 12, 10)
    ctx.fill()
    for (const [x, y, s, c] of [[140, 110, 12, '#c9a4f0'], [175, 120, 16, '#9a6ad0'], [210, 105, 10, '#e6c46a'], [150, 160, 10, '#9a6ad0'], [200, 165, 14, '#c9a4f0']]) {
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.moveTo(x, y - s)
      ctx.lineTo(x + s * 0.6, y)
      ctx.lineTo(x, y + s)
      ctx.lineTo(x - s * 0.6, y)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = '#d9b56a'
    ctx.beginPath()
    ctx.arc(128, 210, 22, 0, Math.PI)
    ctx.fill()
    ctx.fillRect(100, 204, 56, 6)
    return makeTexture(el)
  },
}

Object.assign(PICTURES, {
  // Leaded glass for a cottage window: pale green panes in a diamond lattice,
  // a few of them blue, and a yellow tulip at the top. See-through.
  'leaded-glass': () => {
    const [el, ctx] = canvas(256, 384)
    ctx.fillStyle = 'rgba(170,225,190,0.32)'
    ctx.fillRect(0, 0, 256, 384)
    const size = 48
    for (let row = -1; row < 10; row++) {
      for (let col = -1; col < 7; col++) {
        const cx = col * size + (row % 2 ? size / 2 : 0)
        const cy = row * (size / 2) * 1.5
        if ((row * 3 + col * 5) % 7 === 0) {
          ctx.fillStyle = 'rgba(70,110,220,0.6)'
          ctx.beginPath()
          ctx.moveTo(cx, cy - size * 0.75)
          ctx.lineTo(cx + size / 2, cy)
          ctx.lineTo(cx, cy + size * 0.75)
          ctx.lineTo(cx - size / 2, cy)
          ctx.closePath()
          ctx.fill()
        }
      }
    }
    ctx.strokeStyle = '#2b2320'
    ctx.lineWidth = 4
    for (let k = -8; k < 14; k++) {
      ctx.beginPath()
      ctx.moveTo(k * size, 0)
      ctx.lineTo(k * size + 256, 384)
      ctx.moveTo(k * size + 256, 0)
      ctx.lineTo(k * size, 384)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(230,200,70,0.85)'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(128 + side * 16, 70, 14, 34, side * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(140,200,120,0.85)'
    ctx.beginPath()
    ctx.ellipse(128, 64, 10, 40, 0, 0, Math.PI * 2)
    ctx.fill()
    return makeTexture(el)
  },
  // Stained glass for a lancet window: blue panes in lead, with green and
  // gold tracery leaves in the point. See-through.
  'stained-lancet': () => {
    const [el, ctx] = canvas(256, 448)
    ctx.fillStyle = 'rgba(80,120,225,0.55)'
    ctx.fillRect(0, 0, 256, 448)
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillStyle = `rgba(${90 + ((row + col) % 3) * 15},${130 + ((row * col) % 2) * 20},235,0.25)`
        ctx.fillRect(col * 64 + 4, 130 + row * 36 + 4, 56, 28)
      }
    }
    ctx.strokeStyle = '#2b2a3a'
    ctx.lineWidth = 5
    for (const x of [64, 128, 192]) {
      ctx.beginPath()
      ctx.moveTo(x, 130)
      ctx.lineTo(x, 448)
      ctx.stroke()
    }
    for (let y = 130; y < 448; y += 36) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(256, y)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(160,220,170,0.9)'
    ctx.beginPath()
    ctx.ellipse(128, 70, 30, 60, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(225,200,80,0.9)'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(128 + side * 44, 88, 22, 44, side * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(128 + side * 20, 50, 12, 30, side * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = '#2b2a3a'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(0, 128)
    ctx.lineTo(256, 128)
    ctx.stroke()
    return makeTexture(el)
  },
})

Object.assign(PICTURES, {
  // A cork notice board with pinned notes, a reading list and a poster.
  'notice-board': () => {
    const [el, ctx] = canvas(384, 256)
    ctx.fillStyle = '#c99a62'
    ctx.fillRect(0, 0, 384, 256)
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(90,55,25,${0.1 + jitter(i) * 0.2})`
      ctx.fillRect(jitter(i + 1) * 384, jitter(i + 2) * 256, 2, 2)
    }
    const note = (x, y, w, h, color, turn, lines) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(turn)
      ctx.fillStyle = color
      ctx.fillRect(-w / 2, -h / 2, w, h)
      ctx.fillStyle = 'rgba(60,40,30,0.55)'
      for (let k = 0; k < lines; k++) ctx.fillRect(-w / 2 + 8, -h / 2 + 14 + k * 10, w - 16 - (k % 2) * 14, 3)
      ctx.fillStyle = '#d23c3c'
      ctx.beginPath()
      ctx.arc(0, -h / 2 + 6, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    note(70, 70, 90, 80, '#fff4a8', -0.08, 5)
    note(190, 90, 100, 120, '#f6f1e6', 0.04, 9)
    note(310, 70, 90, 80, '#bfe3f0', 0.1, 5)
    note(90, 190, 110, 70, '#f7c6d6', 0.06, 4)
    note(300, 190, 100, 80, '#c9e8b8', -0.06, 5)
    ctx.fillStyle = '#2f5d6b'
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('READ!', 168, 64)
    return makeTexture(el)
  },
  // The hanging sign's board: a name in gold on deep green.
  'library-sign': () => {
    const [el, ctx] = canvas(320, 192)
    ctx.fillStyle = '#2f4a3a'
    ctx.fillRect(0, 0, 320, 192)
    ctx.strokeStyle = '#d9b56a'
    ctx.lineWidth = 6
    ctx.strokeRect(10, 10, 300, 172)
    ctx.fillStyle = '#e8cf8a'
    ctx.textAlign = 'center'
    ctx.font = 'bold 44px Georgia, serif'
    ctx.fillText('LIBRARY', 160, 88)
    ctx.font = 'italic 24px Georgia, serif'
    ctx.fillText('books & tea', 160, 132)
    ctx.fillStyle = '#d9b56a'
    starPath(ctx, 60, 140, 10, 4, 5)
    ctx.fill()
    starPath(ctx, 260, 140, 10, 4, 5)
    ctx.fill()
    return makeTexture(el)
  },
  // A world map for a young explorer: soft continents on a blue sea, with a
  // compass rose.
  'world-map': () => {
    const [el, ctx] = canvas(384, 256)
    ctx.fillStyle = '#9cc8e0'
    ctx.fillRect(0, 0, 384, 256)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    for (let x = 0; x < 384; x += 32) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 256)
      ctx.stroke()
    }
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(384, y)
      ctx.stroke()
    }
    const land = (points, color) => {
      ctx.fillStyle = color
      ctx.beginPath()
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.closePath()
      ctx.fill()
    }
    land([[40, 50], [110, 40], [130, 80], [100, 110], [80, 120], [60, 100], [45, 80]], '#a8d58a')
    land([[95, 130], [125, 135], [120, 190], [105, 220], [92, 180]], '#c9d98a')
    land([[175, 50], [215, 45], [225, 70], [195, 85], [178, 75]], '#e8c98a')
    land([[180, 95], [225, 95], [235, 140], [210, 190], [190, 160], [178, 120]], '#e8b07a')
    land([[230, 45], [330, 40], [345, 80], [300, 110], [255, 100], [235, 75]], '#b8d88a')
    land([[300, 160], [345, 155], [350, 190], [310, 195]], '#e8c98a')
    ctx.fillStyle = '#ffffff'
    starPath(ctx, 350, 225, 18, 4, 4)
    ctx.fill()
    ctx.fillStyle = '#d23c3c'
    ctx.beginPath()
    ctx.arc(205, 62, 5, 0, Math.PI * 2)
    ctx.fill()
    return makeTexture(el)
  },
})

// One of the pictures above, drawn the first time it is needed.
export function pictureTexture(id) {
  return cached(`picture|${id}`, PICTURES[id])
}
