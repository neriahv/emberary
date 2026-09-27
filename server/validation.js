// Validation lives on the server because the client can be bypassed. The
// browser form is for a fast, friendly message; this is for correctness.
//
// These are the same rules as validateEntryPatch and friends in
// client/src/api/mockApi.js, so demo mode and the real API fail the same way.
// Each function returns { errors, value }: value holds only the fields that
// were sent and are allowed, already converted to the right type, so nothing
// the client made up ever reaches a query.

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

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('send at least one of status, currentPage, rating, review, shelfPosition')
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

export function validateRoom(body) {
  const errors = []
  const value = {}

  for (const key of ['wallColor', 'floorColor', 'shelfColor']) {
    if (!has(body, key)) continue
    if (typeof body[key] !== 'string' || !HEX_COLOUR.test(body[key])) {
      errors.push(`${key} must be a hex colour`)
    }
    value[key] = body[key]
  }

  if (errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('send at least one of wallColor, floorColor, shelfColor')
  }

  return { errors, value }
}

// ------------------------------------------------------------ room items

export const ROOM_ITEM_KINDS = [
  'rug', 'plant', 'lamp', 'armchair', 'side-table', 'cushion',
  'desk', 'rocking-chair', 'globe', 'dresser', 'lantern',
]

// The floor area an item may stand on, in metres. The same limits as the CHECK
// constraints on room_items in schema.sql.
export const ROOM_BOUNDS = { x: [-2.2, 2.2], z: [-2.2, 2.2] }

export const MAX_ROOM_ITEMS = 30

// A new item (`creating`) needs a kind and may give a placement; an existing
// item can only be moved and turned, never changed into something else.
export function validateRoomItem(body, { creating = false } = {}) {
  const errors = []
  const value = {}

  if (creating) {
    if (!ROOM_ITEM_KINDS.includes(body.kind)) {
      errors.push('kind must be one of ' + ROOM_ITEM_KINDS.join(', '))
    }
    value.kind = body.kind
  }

  for (const axis of ['x', 'z']) {
    if (!has(body, axis)) continue
    const [min, max] = ROOM_BOUNDS[axis]
    const n = Number(body[axis])
    if (body[axis] === null || !Number.isFinite(n) || n < min || n > max) {
      errors.push(`${axis} must be a number from ${min} to ${max}`)
    }
    // Centimetres are plenty, and it keeps 0.30000000000000004 out of the table.
    value[axis] = Math.round(n * 100) / 100
  }

  if (has(body, 'rotation')) {
    const rotation = Number(body.rotation)
    if (body.rotation === null || !Number.isInteger(rotation) || rotation < 0 || rotation > 359) {
      errors.push('rotation must be a whole number of degrees from 0 to 359')
    }
    value.rotation = rotation
  }

  if (!creating && errors.length === 0 && Object.keys(value).length === 0) {
    errors.push('send at least one of x, z, rotation')
  }

  return { errors, value }
}

// The new left-to-right order of the books on one Library Room shelf.
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
