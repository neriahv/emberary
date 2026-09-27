import { useCallback, useEffect, useRef, useState } from 'react'
import { updateRoom, updateRoomItem } from '../api'

// Saves Library Room changes after a pause. A colour picker, a slider or a
// dragged chair fires a change on every pixel, and the room should follow each
// one without sending each one to the server.
//
// queue('room', { wallColor }) for colours, queue(itemId, { x, z }) for items.
// Changes to the same key merge, so only the latest position is sent.
export function useRoomSaver(delay = 500) {
  const [state, setState] = useState({ status: 'idle', error: null }) // idle | saving | saved | error
  const pending = useRef(new Map())
  const timer = useRef(null)

  const send = (key, patch) => (key === 'room' ? updateRoom(patch) : updateRoomItem(key, patch))

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const batch = pending.current
    pending.current = new Map()
    if (batch.size === 0) return
    setState({ status: 'saving', error: null })
    try {
      for (const [key, patch] of batch) await send(key, patch)
      setState({ status: 'saved', error: null })
    } catch (error) {
      setState({ status: 'error', error })
    }
  }, [])

  const queue = useCallback(
    (key, patch) => {
      pending.current.set(key, { ...pending.current.get(key), ...patch })
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, delay)
    },
    [flush, delay]
  )

  // An item about to be deleted: a move still waiting would 404.
  const forget = useCallback((key) => pending.current.delete(key), [])

  const report = useCallback((status, error = null) => setState({ status, error }), [])

  // Leaving the page saves anything still waiting rather than dropping it.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      for (const [key, patch] of pending.current) {
        send(key, patch).catch((error) => console.error('Room not saved:', error))
      }
    },
    []
  )

  return { ...state, queue, flush, forget, report }
}
