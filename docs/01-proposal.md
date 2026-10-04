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
- **Library Room** — a 3D room where the reader's books stand on real
  shelves. *Done, and grew past what was planned:* it is an isometric
  diorama built from a reference photo, with a round window, cut-away walls
  and warm lighting. The shelves hold every book the reader has started
  (reading, read or set aside), in their own order rather than sorted by
  status, the way a real bookcase is; the first plan of one shelf per
  status was dropped for that reason. Books slide off the shelf and open
  into a two-page spread with a page-turn animation. The room is furnished
  from a shop: the reader builds a cart of bookshelves, wallpaper, floors,
  tables, chairs, lamps, rugs and decorations, each shown as a picture of
  the real model, and pays in Ember; then drags, turns or stores each piece.
- **Ember** — the room's currency, earned by reading: a daily check-in (+3),
  20 pages in a day (+5), every 50 pages of a book (+1) and finishing a book
  (+15). Kept as a ledger in the database so it cannot be earned twice or
  spent below zero. *Done, added in Week 3.*
- **Profile** — the reader's profile, and insights worked out from their
  shelves: counts, average rating, favourite genres and authors, monthly
  reading activity, and the yearly goal as a donut chart. *Done.*
- **Backend** — an Express API and an eight-table PostgreSQL database behind
  all of the above, with parameterised queries, server-side validation, and
  75 tests (the endpoints, the access gate, the deployed app and the database
  role). *Done, and deployed (see Hosting below).*
- **Demo mode** — the whole app runs against a mock API stored in the
  browser, with the same function names as the real one, so it works with no
  server at all. *Done; kept as the public preview on GitHub Pages, while the
  real app is deployed behind a login — see Demo mode below.*

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
  became required rather than a stretch, and shipped in Week 3: HTTP Basic
  Authentication in front of the whole app, with a rate limit on failed
  logins. See Risks.

## Tech stack

React 18 and Vite, with React Router for navigation and React Three Fiber
(three.js) for the Library Room, code-split so it only loads on that one page.
Express 4 and PostgreSQL (through `pg`, parameterised queries only) for the
API, tested with Node's built-in test runner. The deployed app is one Express
service on Render, serving the API and the built client behind a password,
with `helmet` security headers; the database is on Neon. The demo-mode client
stays on GitHub Pages.

## Data model

Eight tables. `books` is the shared catalogue (with each book's real cover
link, added Week 2). `readers` is one row per reader, ready for accounts
later. `user_books` is one row per reader per book: status, page, rating,
review, and its position along its shelf. `room_settings` holds the room's
colours, wallpaper and floor, and `room_items` holds every piece of furniture,
with its kind, position, rotation, and whether it is placed or in storage.
Week 3 added `room_unlocks` (the wallpapers and floors bought),
`ember_ledger` (every Ember earned or spent; the balance is their sum) and
`reading_days` (pages read per day, for the daily goal).

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

**Week 3 (Sept 28 – Oct 4).** The Library Room shop and Ember, then
deployment. The shelves stopped sorting books by status, the room gained a
furniture shop paid for in Ember, and Ember is earned by reading. Then the app
went live: an access gate, security headers and a rate limit, a database role
with only the permissions the app uses, the database on Neon and the app on
Render, checked end to end in a browser against the deployed version.

## Hosting

| Piece | Host | Status |
| --- | --- | --- |
| App (client and API together) | Render, free web service, Singapore | **Live** at https://emberary.onrender.com, behind a login; redeploys on every push to `main` |
| Database | Neon, free plan, PostgreSQL 18, Singapore | **Live**; the API connects as a limited role, not the owner |
| Public demo | GitHub Pages | **Live** at https://neriahv.github.io/emberary/, demo mode, via `.github/workflows/deploy-pages.yml` |

## Demo mode

**Off on the live app, on for the public demo, on purpose.** The Render build
sets `VITE_USE_MOCK_API=false`, so the live app reads and writes the Neon
database. GitHub Pages keeps the demo-mode build: it never touches the
database, so it can stay public with no login, and it is the fallback if the
free server is asleep during a demo.

## Risks

- **No access gate on the API, once it is deployed.** *Resolved.* The whole
  app (website and API on one address) is behind HTTP Basic Authentication,
  with the login set in Render's environment and the server refusing to start
  without it. Failed logins are rate limited.
- **The database connects as its superuser.** *Resolved* for the deployed
  app: it connects as `emberary_app`, which can only read and write the rows
  the app uses. It cannot change tables, edit the catalogue, or rewrite Ember
  history, and a test checks each of these.
- **`helmet` is not installed.** *Resolved:* installed, with a content
  security policy that allows only Google Books as an outside image source.
- **Choosing free-tier hosts for the API and database.** *Resolved:* Render
  and Neon, both free. What remains is the free tier's behaviour: the app
  sleeps after 15 minutes idle and takes about 30 seconds to wake, which is
  why the demo video should be recorded on a warmed-up site.
- **A rate limit that locked out the wrong people.** *New this week, fixed.*
  The first version counted every error response, not just failed logins,
  so a logged-in reader could have locked themselves out. It now counts only
  401s, with a test.
- **No PostgreSQL or Docker on the development laptop.** *Turned out to be
  nothing:* solved in Week 2 with `embedded-postgres`
  (`npm run db:local`), so local development no longer depends on either.
- **The Library Room's complexity.** *Shrank a lot:* flagged as a risk in
  Week 1 ("more complex than the traditional screens"), but by the end of
  Week 2 it is the most finished part of the app — furniture, animation and
  all — because it kept getting worked on rather than left half-done.
