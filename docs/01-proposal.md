# Proposal

The submitted version is your Canvas answer for m8a1. This copy lives in the
repository so the plan and the code sit next to each other, and it is kept
updated as the project moves — see the status lines inside each section below.

## Emberary

A personal reading space for leisure readers: discover books, track your
reading, and see your collection sitting on real shelves in a 3D Library Room,
instead of a spreadsheet of titles.

## The problem

Most reading trackers are a table with a status column. That is enough to
remember what you have read, but it does nothing to make a personal library
feel like a place. Emberary's pitch is that the Library Room — a room you can
walk into, arrange, and pull a book off the shelf of — is what makes a
collection feel like *yours*, in a way a list view cannot.

## Who it's for

A leisure reader who already has a rough shelf of books in their head (want to
read this, in the middle of that, loved this one, gave up on that one) and
wants a personal space to keep it in — not a social network, not a library
catalogue, and not a productivity tool with streaks and badges.

## Core features

Grouped by screen, each marked with where it actually stands.

- **Home** — Currently Reading with progress bars, library-wide stats, and
  rows of book covers for recently updated and recommended books. *Done.*
- **Discover** — search the catalogue by title or author, filter by genre, read
  a book's details, add it to a shelf with a status. Every result shows its
  real cover. *Done.*
- **My Books** — the collection sorted into the four reading statuses; change
  status, page, rating, review, or remove a book. *Done.*
- **Library Room** — a 3D room with one bookcase shelf per reading status.
  *Done, and grew past what was planned:* it is now a full-screen isometric
  diorama built from a reference photo, with a round window, cut-away walls
  and warm lighting; books slide off the shelf and open into a two-page
  spread with a page-turn animation instead of a side panel; and the room can
  be furnished — rugs, a desk, a rocking chair, a globe, lanterns and more —
  added, dragged, turned and removed in an edit mode, with everything saved.
- **Profile** — the reader's profile, and insights worked out from their
  shelves: counts, average rating, favourite genres and authors, monthly
  reading activity, and the yearly goal as a donut chart. *Done.*
- **Backend** — an Express API and a five-table PostgreSQL database
  (`books`, `readers`, `user_books`, `room_settings`, `room_items`) behind all
  of the above, with parameterised queries, server-side validation, and 37
  endpoint tests. *Done, running locally against a real PostgreSQL; not
  deployed yet (see Hosting below).*
- **Demo mode** — the whole app runs against a mock API stored in the
  browser, with the same function names as the real one, so it works with no
  server at all. *Done, and still the live site's default — see Demo mode
  below.*

## Stretch goals

Cut from "must have" to "if there's time," or added once the core was solid:

- ~~Basic drawn book covers~~ — replaced outright: every book now has a real
  cover fetched once from the Google Books API, with the drawn colour cover
  kept only as a fallback for a missing or failed image.
- User accounts and login — not attempted. Every reader-owned table already
  carries a `reader_id`, on purpose, so this can be added later without a
  schema rewrite, but it was never in scope for this project's three weeks.
- Dragging furniture with the mouse in 3D — this **was** a stretch goal in
  Week 2's planning and shipped: furniture can be picked up and slid across
  the floor in edit mode, not only moved with sliders.
- An access gate on the deployed API (password or Cloudflare Zero Trust) —
  planned for Week 3, not yet built. See Risks.

## Tech stack

React 18 and Vite, with React Router for navigation and React Three Fiber
(three.js) for the Library Room, code-split so it only loads on that one page.
Express 4 and PostgreSQL (through `pg`, parameterised queries only) for the
API, tested with Node's built-in test runner. The client deploys to GitHub
Pages; the API and database host is chosen in Week 3.

## Data model

Five tables. `books` is the shared catalogue (with each book's real cover
link, added Week 2). `readers` is one row per reader, ready for accounts
later. `user_books` is one row per reader per book: status, page, rating,
review, and its position along its shelf. `room_settings` holds the room's
three colours, and `room_items` holds every piece of furniture in it, with its
kind, position and rotation.

## Timeline

**Week 1 (Sept 14–23).** The complete frontend, in demo mode. All five
screens built against a mock API stored in the browser, so every workflow —
adding a book, changing its status, updating progress, rating and reviewing
it, browsing recommendations, viewing insights, a first version of the 3D
room — was visible and clickable before any backend existed.

**Week 2 (Sept 21–27).** The real backend, and the Library Room finished. The
Express API and PostgreSQL database replaced the mock for every screen behind
one unchanged interface. Real book covers were added from the Google Books
API. The Library Room was rebuilt into the full-screen diorama described
above. 37 endpoint tests were added, and the whole app was tested in a real
browser against the local database, including the loading, error, validation
and empty states. A security checklist pass followed: GitHub Actions pinned
to commit SHAs, the `X-Powered-By` header removed, CORS behaviour tested, and
a personal email scrubbed from the commit history.

**Week 3 (final week).** Deployment. Choose hosts for the API and database,
seed the hosted catalogue, switch the live site off demo mode, add the access
gate that is still missing (see Risks), and repeat the frontend-to-backend
testing against the deployed version instead of a laptop.

## Hosting

| Piece | Host | Status |
| --- | --- | --- |
| Client | GitHub Pages | **Live**, via `.github/workflows/deploy-pages.yml` on every push to `main` |
| API | not chosen yet | Planned for Week 3 |
| Database | not chosen yet | Planned for Week 3 |

## Demo mode

**Still on.** The live site runs entirely against the mock API in the
browser; nothing typed into it reaches a server. It comes off once the API
and database are deployed and `VITE_USE_MOCK_API=false` is set on the client
build — a Week 3 task that has not started. If this line still says "still
on" after Week 3's deadline has passed, that is the one thing in this file
that matters most.

## Risks

- **No access gate on the API, once it is deployed.** *Grew* into the risk
  that matters most right now: the backend has no login, password, or
  Zero Trust check yet, so it must not be deployed reachable from the
  internet without one. Decided, not yet built — Week 3.
- **The database connects as its superuser locally.** *New this week,* found
  while working through the security checklist. Before deployment this needs
  a role with only the permissions the app actually uses (select/insert/
  update/delete on Emberary's own tables), not full admin rights.
- **`helmet` is not installed.** *Known, not yet done* — one line
  (`app.use(helmet())`) for several response-header protections the API
  currently lacks. Small, but worth doing before the API is public.
- **Choosing free-tier hosts for the API and database.** *Unchanged since
  Week 1's planning:* still open, and still the main scheduling risk for
  Week 3, since a free database can sleep or reset in ways a local one does
  not.
- **No PostgreSQL or Docker on the development laptop.** *Turned out to be
  nothing:* solved in Week 2 with `embedded-postgres`
  (`npm run db:local`), so local development no longer depends on either.
- **The Library Room's complexity.** *Shrank a lot:* flagged as a risk in
  Week 1 ("more complex than the traditional screens"), but by the end of
  Week 2 it is the most finished part of the app — furniture, animation and
  all — because it kept getting worked on rather than left half-done.
