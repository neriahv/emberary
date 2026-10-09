
export function filterBooks(entries, { tab, search = '' }) {
  // Filters books by reading status and searches titles or authors, ignoring case and extra spaces.
  const needle = search.trim().toLowerCase()

  return entries.filter((entry) => {
    const matchesTab = tab === 'all' || entry.status === tab

    const matchesSearch =
      !needle ||
      entry.book.title.toLowerCase().includes(needle) ||
      entry.book.author.toLowerCase().includes(needle)

    return matchesTab && matchesSearch
  })
}
