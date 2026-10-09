import { it, expect, vi, afterEach } from 'vitest'
import * as demo from '../api/mockApi.js'
afterEach(() => vi.useRealTimers())
async function done(promise) {
  await vi.runAllTimersAsync()
  return promise
}
it('demo settings change the daily target; rating and check-in quests pay once', async () => {
  vi.useFakeTimers()
  await demo.updateSettings({
    dailyPageGoal: 5,
    timezone: 'UTC',
    theme: 'dark',
  })
  const books = await done(demo.listMyBooks()),
    book = books.find((e) => e.status === 'currently-reading')
  const updated = await done(
    demo.updateMyBook(book.bookId, {
      currentPage: book.currentPage + 5,
      rating: 4,
    })
  )
  expect(updated.rewards.some((r) => r.reason === 'daily-goal')).toBe(true)
  expect((await done(demo.getEmber())).dailyPageGoal).toBe(5)
  await done(demo.checkIn())
  const quests = await demo.getQuests()
  expect(quests.items.find((q) => q.id === 'rating').progress).toBe(1)
  expect((await demo.claimQuest('check-in')).reward.amount).toBe(2)
  await expect(demo.claimQuest('check-in')).rejects.toThrow(/already claimed/)
})
it('demo quotes and lists are persistent and cascade with the book', async () => {
  vi.useFakeTimers()
  const [book] = await done(demo.listMyBooks())
  await demo.addNote(book.bookId, {
    text: 'A line to keep',
    page: 1,
    kind: 'quote',
  })
  const list = await demo.createList('Summer reads')
  await demo.setListBook(list.id, book.bookId, true)
  expect((await demo.getNotes(book.bookId))[0].text).toBe('A line to keep')
  expect((await demo.getLists())[0].bookIds).toContain(book.bookId)
  await done(demo.removeFromCollection(book.bookId))
  expect((await demo.getLists())[0].bookIds).toEqual([])
})
it('demo snapshots cannot turn replacement purchases into sold furniture or restore blocks', async () => {
  vi.useFakeTimers()
  const purchase = await done(demo.checkout(['ember-star-table']))
  const id = purchase.items[0].id
  const snapshot = await demo.saveSnapshot('Autumn room')
  const blocks = (await done(demo.getRoom())).blocks
  await done(demo.sellRoomItem(id))
  const replacement = await done(demo.checkout(['ember-fox-cushion']))
  expect(replacement.items[0].id).not.toBe(id)
  const restored = await demo.restoreSnapshot(snapshot.id)
  expect(restored.skipped).toContain(id)
  expect(restored.room.items.find((i) => i.id === replacement.items[0].id).kind).toBe('ember-fox-cushion')
  expect(restored.room.blocks).toEqual(blocks)
})
it('demo timer survives reload and adds elapsed minutes to the reading summary', async () => {
  vi.useFakeTimers()
  const active = await demo.startTimer()
  expect(await demo.getTimer()).toEqual(active)
  vi.advanceTimersByTime(120000)
  await demo.stopTimer()
  expect((await demo.getReading()).minutes).toBe(2)
  expect(await demo.getTimer()).toBeNull()
})
