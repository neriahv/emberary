// Validation lives on the server because the client can be bypassed. The
// browser form is for a fast, friendly message; this is for correctness.
//
// These are the same rules as validateEntryPatch and friends in
// client/src/api/mockApi.js, so demo mode and the real API fail the same way.
// Each function returns { errors, value }: value holds only the fields that
// were sent and are allowed, already converted to the right type, so nothing
// the client made up ever reaches a query.

import {
  BLOCKS,
  BLOCK_KINDS,
  FINISH_TYPES,
  SIZE_LIMITS,
  WINDOW_LIMITS,
  catalogEntry,
  clearanceOf,
  forSale,
  hasUpstairs,
  isSmall,
  itemFits,
  nearestSpot,
  resizable,
  EMAIL_PATTERN,
  passwordProblems,
} from './catalog.js'

export const STATUSES = ['currently-reading', 'want-to-read', 'read', 'did-not-finish']

const HEX_COLOUR = /^#[0-9a-f]{6}$/i

const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

export function validateStatus(status) {
  return STATUSES.includes(status) ? [] : ['status must be one of ' + STATUSES.join(', ')]
}

// A change to a book on the reader's shelves. `pages` is the book's length,
// which is the upper limit for currentPage.
export function validateEntryPatch(body, pages) {
  const errors = []
  const value = {}

  if (has(body, 'status')) {
    errors.push(...validateStatus(body.status))
    value.status = body.status
  }

  if (has(body, 'currentPage')) {
    const page = Number(body.currentPage)
    if (!Number.isInteger(page) || page < 0 || page > pages) {
      errors.push(`currentPage must be a whole number from 0 to ${pages}`)
    }
    value.currentPage = page
  }

  if (has(body, 'rating')) {
    if (body.rating === null) {
      value.rating = null
    } else {
      const rating = Number(body.rating)
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors.push('rating must be a whole number from 1 to 5')
      }
      value.rating = rating
    }
  }

  if (has(body, 'review')) {
    if (typeof body.review !== 'string') errors.push('review must be text')
    else if (body.review.length > 2000) errors.push('review must be 2000 characters or fewer')
    value.review = String(body.review ?? '')
  }

  if (has(body, 'shelfPosition')) {
    if (body.shelfPosition === null) {
      value.shelfPosition = null
    } else {
      const position = Number(body.shelfPosition)
      if (!Number.isInteger(position) || position < 0 || position > 999) {
        errors.push('shelfPosition must be a whole number from 0 to 999, or null')
      }
      value.shelfPosition = position
    }
  }

  // Where the book stands in the Library Room, or null to let the room place it.
  if (has(body, 'shelfSpot')) {
    const spot = body.shelfSpot
    if (spot === null) {
      value.shelfSpot = null
    } else if (
      typeof spot !== 'object' ||
      typeof spot.bookcase !== 'string' ||
      !/^(main|[0-9]{1,9})$/.test(spot.bookcase) ||
      !Number.isInteger(spot.row) || spot.row < 0 || spot.row > 9 ||
      typeof spot.x !== 'number' || !Number.isFinite(spot.x) || spot.x < -2.5 || spot.x > 2.5
    ) {
      errors.push('shelfSpot must be { bookcase: "main" or the id of a bookcase or table, row: 0 to 9, x: -2.5 to 2.5 }, or null')
    } else {
      value.shelfSpot = { bookcase: spot.bookcase, row: spot.row, x: spot.x }
    }
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('send at least one of status, currentPage, rating, review, shelfPosition, shelfSpot')
  }

  return { errors, value }
}

// The whole profile after the patch is applied, so a patch cannot leave it
// invalid by omission.
export function validateProfile(current, body) {
  const merged = { ...current }
  for (const key of ['displayName', 'bio', 'yearlyGoal']) {
    if (has(body, key)) merged[key] = body[key]
  }

  const errors = []
  const displayName = String(merged.displayName ?? '').trim()
  const bio = String(merged.bio ?? '')
  const yearlyGoal = Number(merged.yearlyGoal)

  if (!displayName || displayName.length > 60) errors.push('display name must be 1 to 60 characters')
  if (bio.length > 280) errors.push('bio must be 280 characters or fewer')
  if (!Number.isInteger(yearlyGoal) || yearlyGoal < 1 || yearlyGoal > 365) {
    errors.push('yearly goal must be a whole number from 1 to 365')
  }

  return { errors, value: { displayName, bio, yearlyGoal } }
}



// Validates the reader's settings after merging any changes.
export function validateSettings(current, body) {
  const merged = { ...current }

  for (const key of ['timezone', 'dailyPageGoal', 'theme']) {
    if (has(body, key)) merged[key] = body[key]
  }

  const errors = []
  const { timezone, theme } = merged
  const dailyPageGoal = Number(merged.dailyPageGoal)

  const timezones = Intl.supportedValuesOf('timeZone')

  if (
    typeof timezone !== 'string' ||
    (timezone !== 'UTC' && !timezones.includes(timezone))
  ) {
    errors.push('timezone must be a valid time zone')
  }

  if (
    !Number.isInteger(dailyPageGoal) ||
    dailyPageGoal < 5 ||
    dailyPageGoal > 500
  ) {
    errors.push('daily page goal must be a whole number from 5 to 500')
  }

  if (!['light', 'dark', 'system'].includes(theme)) {
    errors.push('theme must be light, dark, or system')
  }

  return {
    errors,
    value: { timezone, dailyPageGoal, theme }
  }
}

export function validateRoom(body) {
  const errors = []
  const value = {}

  for (const key of ['wallColor', 'floorColor', 'shelfColor', 'upperFloorColor']) {
    if (!has(body, key)) continue
    if (typeof body[key] !== 'string' || !HEX_COLOUR.test(body[key])) {
      errors.push(`${key} must be a hex colour`)
    }
    value[key] = body[key]
  }

  // Whether the reader owns the finish is checked by the route, which can ask
  // the database; this only checks that it is a finish of the right kind.
  for (const key of FINISH_TYPES) {
    if (!has(body, key)) continue
    if (catalogEntry(body[key])?.type !== key) {
      errors.push(`${key} must be one of the shop's ${key} finishes`)
    }
    value[key] = body[key]
  }
  // The upstairs floor takes any floor finish.
  if (has(body, 'upperFloor')) {
    if (catalogEntry(body.upperFloor)?.type !== 'floor') errors.push("upperFloor must be one of the shop's floor finishes")
    value.upperFloor = body.upperFloor
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push(`send at least one of wallColor, floorColor, shelfColor, upperFloorColor, ${FINISH_TYPES.join(', ')}, upperFloor`)
  }

  return { errors, value }
}

// ------------------------------------------------------------ room items

// An item can be moved, turned, carried up to the loft, switched on or off,
// put in storage or placed again, never changed into something else. New
// items only arrive through the shop.
//
// Where it may stand depends on the room (its floor blocks, and whether it
// has a loft) and on the level the item ends up on, so both are passed in:
// `room` is the room with its blocks and `current` the item as it is now.
export function validateRoomItem(body, room, current) {
  const errors = []
  const value = {}

  if (has(body, 'level')) {
    if (body.level !== 0 && body.level !== 1) errors.push('level must be 0 (the floor) or 1 (upstairs)')
    else if (body.level === 1 && !hasUpstairs(room)) errors.push('level 1 is upstairs: build an upstairs floor first')
    value.level = body.level
  }

  for (const axis of ['x', 'z']) {
    if (!has(body, axis)) continue
    const n = Number(body[axis])
    if (body[axis] === null || !Number.isFinite(n)) errors.push(`${axis} must be a number`)
    // Centimetres are plenty, and it keeps 0.30000000000000004 out of the table.
    else value[axis] = Math.round(n * 100) / 100
  }

  // What it stands on, when it is a small thing on a table, a shelf or a
  // seat: another of the reader's items (the route checks which), or null.
  if (has(body, 'on')) {
    if (body.on !== null && (!Number.isInteger(body.on) || body.on < 1 || body.on === current.id)) {
      errors.push('on must be the id of another item in the room, or null')
    } else if (body.on !== null && !isSmall(current.kind)) {
      errors.push('only small things stand on other furniture')
    }
    value.on = body.on
  }

  // Wherever it ends up must be floor (or loft), unless it stands on
  // something. Moved to the other level without a new position, it goes as
  // near to where it was as that level allows.
  const standsOn = has(value, 'on') ? value.on : current.on
  if (errors.length === 0 && !standsOn && (has(body, 'x') || has(body, 'z') || has(value, 'level') || has(value, 'on'))) {
    const level = has(value, 'level') ? value.level : current.level
    const x = value.x ?? current.x
    const z = value.z ?? current.z
    const clearance = clearanceOf(current.kind)
    if (!itemFits(room, level, x, z, clearance)) {
      const moved = has(value, 'level') && !has(body, 'x') && !has(body, 'z') && nearestSpot(room, level, x, z, clearance)
      if (moved) Object.assign(value, moved)
      else errors.push(level === 1 ? 'x and z must be a spot upstairs' : "x and z must be a spot on the room's floor")
    }
  }

  if (has(body, 'rotation')) {
    const rotation = Number(body.rotation)
    if (body.rotation === null || !Number.isInteger(rotation) || rotation < 0 || rotation > 359) {
      errors.push('rotation must be a whole number of degrees from 0 to 359')
    }
    value.rotation = rotation
  }

  for (const key of ['placed', 'lit']) {
    if (!has(body, key)) continue
    if (typeof body[key] !== 'boolean') errors.push(`${key} must be true or false`)
    value[key] = body[key]
  }

  // How high it is (a window on its wall, or something standing on
  // something), its size, and how much wider and taller it is made.
  // Furniture on the floor stands at height 0; only a window keeps clear of
  // the floor, which the room sees to when it hangs one.
  const limits = { ...WINDOW_LIMITS, y: [0, WINDOW_LIMITS.y[1]], ...SIZE_LIMITS }
  for (const key of ['y', 'size', 'sx', 'sy']) {
    if (!has(body, key)) continue
    if ((key === 'sx' || key === 'sy') && !resizable(current.kind)) {
      errors.push(`only bookcases and windows can be made wider or taller`)
      continue
    }
    const [min, max] = limits[key]
    const n = Number(body[key])
    if (body[key] === null || !Number.isFinite(n) || n < min || n > max) {
      errors.push(`${key} must be a number from ${min} to ${max}`)
    }
    value[key] = Math.round(n * 100) / 100
  }

  // A colour of the reader's choosing, or null for its own.
  if (has(body, 'color')) {
    if (body.color !== null && (typeof body.color !== 'string' || !HEX_COLOUR.test(body.color))) {
      errors.push('color must be a hex colour, or null')
    }
    value.color = body.color
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('send at least one of x, z, rotation, level, placed, lit, y, size, sx, sy, color, on')
  }

  return { errors, value }
}

// A spot for a block: { i, j }, and for a wall the edge's side, "x" or "z".
function blockSpot(spot, kind, name, errors) {
  const bad = (message) => errors.push(`${name} ${message}`)
  if (spot === null || typeof spot !== 'object') return bad('must be { i, j } (and side, for a wall)')
  for (const key of ['i', 'j']) {
    if (!Number.isInteger(spot[key]) || Math.abs(spot[key]) > BLOCKS.reach + 1) {
      bad(`.${key} must be a whole number from ${-BLOCKS.reach - 1} to ${BLOCKS.reach + 1}`)
    }
  }
  if (kind === 'wall' && spot.side !== 'x' && spot.side !== 'z') bad('.side must be "x" or "z" for a wall')
  return { side: kind === 'wall' ? spot.side : '', i: spot.i, j: spot.j }
}

// A change to the room's blocks:
//   { type: "add", kind, at }    { type: "remove", kind, at }
//   { type: "move", kind, from, to }
// with kind "floor", "wall" or "upper" (a square of upstairs floor). Whether
// the room allows it is the room's to say.
export function validateBlockChange(body) {
  const errors = []
  const { type, kind } = body
  if (!['add', 'move', 'remove'].includes(type)) errors.push('type must be one of add, move, remove')
  if (!BLOCK_KINDS.includes(kind)) errors.push(`kind must be one of ${BLOCK_KINDS.join(', ')}`)
  if (errors.length > 0) return { errors, value: null }
  const value = { type, kind }
  if (type === 'move') {
    value.from = blockSpot(body.from, kind, 'from', errors)
    value.to = blockSpot(body.to, kind, 'to', errors)
  } else {
    value.at = blockSpot(body.at, kind, 'at', errors)
  }
  return errors.length > 0 ? { errors, value: null } : { errors, value }
}

// A shop cart: { items: [catalogue id, ...] }. The same piece of furniture may
// be bought several times over; a wallpaper or floor only once.
export function validateCheckout(body) {
  const items = body.items
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 20 ||
    !items.every((id) => typeof id === 'string' && forSale(catalogEntry(id)))
  ) {
    return { errors: ['items must be a list of 1 to 20 things from the shop'], value: null }
  }
  const finishes = items.filter((id) => catalogEntry(id).type !== 'item')
  if (new Set(finishes).size !== finishes.length) {
    return { errors: ['a wallpaper or floor can only be bought once'], value: null }
  }
  return { errors: [], value: items }
}

// The new order of the books on the Library Room shelves, first to last.
export function validateShelfOrder(body) {
  const bookIds = body.bookIds
  if (
    !Array.isArray(bookIds) ||
    bookIds.length === 0 ||
    bookIds.length > 500 ||
    !bookIds.every((id) => typeof id === 'string' && id.length > 0)
  ) {
    return { errors: ['bookIds must be a list of 1 to 500 book ids'], value: null }
  }
  if (new Set(bookIds).size !== bookIds.length) {
    return { errors: ['bookIds must not repeat a book'], value: null }
  }
  return { errors: [], value: bookIds }
}

// ------------------------------------------------------------ accounts

// { email, password, displayName } to make an account. The email is kept in
// lower case, so it matches however it is typed later. The password must meet
// every one of PASSWORD_RULES (catalog.js), the same ones the form shows.
export function validateSignup(body) {
  const errors = []
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.push('email must be an email address')
  const problems = passwordProblems(password, email)
  if (problems.length > 0) errors.push(`password needs: ${problems.map((p) => p.toLowerCase()).join('; ')}`)
  if (!displayName || displayName.length > 60) errors.push('display name must be 1 to 60 characters')
  return { errors, value: { email, password, displayName } }
}

// { email, password } to sign in.
export function validateLogin(body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const errors = email && password && email.length <= 254 && password.length <= 200 ? [] : ['send an email and a password']
  return { errors, value: { email, password } }
}
