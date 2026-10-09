
 // Filters books by reading status, search text, genre, and rating.
export function filterBooks(
  entries,
  { tab, search = '', genre = 'all', rating = 'any' }
) {
  const needle = search.trim().toLowerCase()

  return entries.filter((entry) => {
    const matchesTab = tab === 'all' || entry.status === tab

    const matchesSearch =
      !needle ||
      entry.book.title.toLowerCase().includes(needle) ||
      entry.book.author.toLowerCase().includes(needle)

    const matchesGenre = genre === 'all' || entry.book.genre === genre

    let matchesRating

    if (rating === 'any') {
      matchesRating = true
    } else if (rating === 'unrated') {
      matchesRating = entry.rating === null
    } else {
      matchesRating = entry.rating !== null && entry.rating >= Number(rating)
    }

    return matchesTab && matchesSearch && matchesGenre && matchesRating
  })
}
