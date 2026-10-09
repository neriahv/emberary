
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

// Calculates reading progress as a fraction, avoiding division by zero.
function progressOf(entry) {
  return entry.book.pages > 0
    ? entry.currentPage / entry.book.pages
    : 0
}

// Sorts books by title, author surname, rating, progress, or page count.
export function sortBooks(entries, sort = 'updated') {
  const sorted = [...entries]

  switch (sort) {
    case 'title':
      return sorted.sort((a, b) =>
        a.book.title.localeCompare(b.book.title)
      )

    case 'author':
      return sorted.sort((a, b) => {
        const surnameA = a.book.author.trim().split(' ').at(-1)
        const surnameB = b.book.author.trim().split(' ').at(-1)

        return (
          surnameA.localeCompare(surnameB) ||
          a.book.author.localeCompare(b.book.author)
        )
      })

    case 'rating':
      return sorted.sort((a, b) => {
        if (a.rating === null && b.rating === null) return 0
        if (a.rating === null) return 1
        if (b.rating === null) return -1

        return b.rating - a.rating
      })

    case 'progress':
      return sorted.sort((a, b) => progressOf(b) - progressOf(a))

    case 'pages':
      return sorted.sort((a, b) => b.book.pages - a.book.pages)

    case 'updated':
    default:
      return sorted
  }
}
