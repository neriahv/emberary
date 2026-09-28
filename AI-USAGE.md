# AI usage

This project was built with AI assistance. This file is the record of it. It is
graded as the finals badge, and it is worth 100 points.

Start it in week 1 and keep it up as you go. The commit history of this file is
part of the evidence: a file written all at once the night before the deadline
looks exactly like what it is.

## 1. How I used AI

At least six entries. One per real use. Every entry needs a commit link.

### 2026-09-23 - Frontend design (Week 1)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** The whole Week 1 frontend — Home, Discover, My Books,
  Profile and a first version of the Library Room — plus a mock API so the
  app worked with no backend yet.
- **What it gave back:** The five pages, shared components (`BookCard`,
  `BookCover`, `BookDetailPanel`, `ProgressBar`, `StarRating`, `StatCard`,
  `StatusBadge`), `mockApi.js` simulating the backend in `localStorage`, and
  `seed.json` with invented demo data.
- **What I kept, what I changed, and why:** Kept the generated pages and
  components as the starting point, then wired the routing myself once the
  pieces existed (see section 3).
- **Commit:** https://github.com/neriahv/emberary/commit/bcb1ea090502f249e23dc7d89fe51136070bb0f3

### 2026-09-27 - Library Room rebuilt as a 3D diorama (Week 2)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** I gave a reference photo of an isometric reading-room
  diorama and asked for the Library Room to be rebuilt full-screen to match
  it, with a game-style Edit button, draggable furniture, and books that open
  into a page-turn pop-up instead of a side panel.
- **What it gave back:** `LibraryScene.jsx` (the diorama, camera, lighting),
  `models.jsx` (desk, rocking chair, globe, dresser, lantern and the earlier
  furniture), `textures.js` (canvas-drawn book spines and floor planks),
  `BookModal.jsx` (the opening-book animation) and `RoomCustomizer.jsx` /
  `useRoomSaver.js` (the edit panel and its save-after-pause logic).
- **What I kept, what I changed, and why:** Kept the room layout and models. I
  had it rework the round window and shelf-label positions after screenshots
  showed the window drawn as a hole rather than a filled pane, and labels
  overlapping the edit panel.
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d

### 2026-09-27 - Backend beyond basic Express and the database (Week 2)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** I can write a basic Express server and a database
  myself (see section 3), but not the rest: the PostgreSQL schema's
  constraints, the parameterised query layer, input validation, and the SQL
  behind statistics and recommendations.
- **What it gave back:** The five-table schema (`books`, `readers`,
  `user_books`, `room_settings`, `room_items`) with CHECK constraints,
  `server/repos/` (one query file per area), `server/validation.js`, and
  endpoint tests run against a real local PostgreSQL.
- **What I kept, what I changed, and why:** Kept the schema and query design.
  Asked for `npm run db:local` after finding I had neither Docker nor
  PostgreSQL installed, so the project runs from `node_modules` alone.
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d

### 2026-09-27 - Real book covers from Google Books (Week 2)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** A script to fetch each catalogue book's real cover
  using my own Google Books API key.
- **What it gave back:** `server/db/fetch-covers.js`, a one-time script that
  looks each book up, saves the cover's public image link into `seed.json`,
  and works out the cover's dominant colour for the book's spine.
- **What I kept, what I changed, and why:** Kept the script; I created the key
  and ran it myself (see section 3). It found that four "covers" were actually
  scanned black-and-white title pages and added a check to reject those and
  try the next edition instead (see Case 2 below).
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d

### 2026-09-27 - Profile reading goal as a ring chart (Week 2)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** Replace the yearly reading-goal progress bar on the
  Profile page with a pie/donut chart.
- **What it gave back:** A plain-SVG donut (`GoalRing` in `ProfilePage.jsx`),
  styled with the site's existing light/dark colour tokens rather than
  hardcoded colours.
- **What I kept, what I changed, and why:** Kept it as given; it matched the
  site's look without extra rework.
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d

### 2026-09-27 - Security checklist pass (Week 2)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** To go through the course's security checklist against
  the actual code and git history and fix what it found.
- **What it gave back:** GitHub Actions pinned to commit SHAs instead of
  movable tags, the `X-Powered-By` header disabled, a Google Books credit in
  the footer, and two new tests (no framework header, CORS refuses unknown
  origins).
- **What I kept, what I changed, and why:** Kept all of it. It also found my
  personal Gmail in three commit authors, and walked me through the
  `git filter-branch` command to fix it, which I ran and force-pushed myself
  (see section 3).
- **Commit:** https://github.com/neriahv/emberary/commit/d3b75f1068b3a94373bff8b2b6d2b63818c382b6

## 2. Where the AI got it wrong

Three cases. Be specific. If you write that the AI was never wrong, this section
scores zero.

### Case 1 - covers that were scanned title pages, not covers (Week 2)

- **What it gave me:** A first working version of `fetch-covers.js` that
  accepted whatever image Google Books returned for the best title/author
  match.
- **What was wrong with it:** For four books (Dune, Little Women, The
  Adventures of Sherlock Holmes, The Lion, the Witch and the Wardrobe), the
  best-matching edition on Google Books was an old public-domain scan whose
  "cover" was actually a black-and-white line-art title page, not a real
  cover. It looked fine in the terminal log ("cover found") but was wrong on
  screen.
- **What I did instead:** Had it add a check on each candidate image before
  accepting it — real cover art comes back as a JPEG of some size; a scanned
  title page came back as a small PNG — and try the next edition if a
  candidate fails that check. Confirmed by downloading and looking at the
  fixed covers afterward.
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d

### Case 2 - a database constraint that rejected its own boundary (Week 2)

- **What it gave me:** A CHECK constraint on room item positions,
  `x BETWEEN -2.2 AND 2.2`, meant to match the validation already run in the
  API.
- **What was wrong with it:** Dragging a piece of furniture right up against a
  wall in the browser produced a 500 error instead of saving. PostgreSQL
  stores the column as `REAL`, and 2.2 stored as a `REAL` is actually
  2.2000000477, so the exact value 2.2 the API had already accepted failed the
  database's own boundary check.
- **What I did instead:** Had it cast the constraint's limits to `::real`
  explicitly, and add a test that places an item on every wall at the exact
  limit. Ran the full test suite afterward to confirm.
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d

### Case 3 - a leftover server that made CORS look broken (Week 2)

- **What it gave me:** A background API server started for testing, meant to
  be stopped when done.
- **What was wrong with it:** Later browser tests reported CORS errors on a
  port that should have been allowed. Stopping the server process had not
  stopped its `node --watch` child process, which restarted on its own with
  the default CORS settings and kept holding the port. It took tracing the
  process on port 3000 back through its parent to find.
- **What I did instead:** Had it identify and stop every leftover process by
  checking each one's command line and start time first, and switch to
  running the server without `--watch` for one-off test sessions so there is
  no hidden child process left behind.
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d

## 3. Who wrote what

At least a fifth of this project is code you wrote yourself. Name it, and explain
it in your own words.

> Group projects: give each member their own heading below, and use your GitHub
> handle as the heading. You are graded on your own section.

### Written by me
**Linkage of pages and components**

- **File:** `client/src/App.jsx`
- **Commit:** https://github.com/neriahv/emberary/commit/bcb1ea090502f249e23dc7d89fe51136070bb0f3
- **What it does and why it is built this way:** Wires every page component
  into a route (`/`, `/discover`, `/library-room`, `/my-books`, `/profile`)
  under one shared `Layout`, with a catch-all 404 route. The Library Room is
  loaded with `lazy()` and wrapped in `Suspense`, because three.js is several
  times the size of the rest of the app and no other page needs it, so it
  should not be in everyone's initial download. `basename` comes from
  `import.meta.env.BASE_URL` so the same routes work both at `localhost:5173/`
  in development and at `username.github.io/emberary/` once deployed, without
  hardcoding the repository name anywhere.

**The basic Express server**

- **File:** `server/server.js`
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d
- **What it does and why it is built this way:** Reads `CORS_ORIGINS` and
  `PORT` from the environment, builds the app with `createApp(pool, {
  corsOrigins })`, and starts listening. `PORT` falls back to 3000 only for
  local runs — it is read from the environment rather than hardcoded because a
  host assigns its own port, and an app that ignores that gets marked
  unhealthy. This file only starts the server; the routes themselves
  (`server/app.js`) and the query logic (`server/repos/`) are the part I asked
  the AI for, described above.

**Getting real covers into the app**

- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d
- **What it does and why it is built this way:** This one isn't source code I
  wrote, so it belongs here as a note rather than a code claim: I created the
  Google Cloud project and Books API key myself (enabled the Books API,
  restricted the key to it), put the key in my own `server/.env`, and ran
  `npm run covers:fetch` myself. I then checked the results — that's how the
  four scanned-title-page covers in Case 2 above got caught — before deciding
  the covers were good enough to keep and to run `npm run db:reset` to load
  them.

**The security checklist pass**

- **Commit:** https://github.com/neriahv/emberary/commit/d3b75f1068b3a94373bff8b2b6d2b63818c382b6
- **What it does and why it is built this way:** I ran the checklist's items
  myself where they needed my own GitHub account: turning on "Keep my email
  addresses private" and "Block command line pushes that expose my email" in
  GitHub settings, running `git config user.email` to switch this repository
  to my no-reply address, and then running the `git filter-branch` rewrite and
  `git push --force-with-lease` myself to fix the three older commits that
  still carried my personal Gmail. The checklist itself, and the code changes
  it led to (pinned Actions, the disabled `X-Powered-By` header, the two new
  tests), are the AI-usage entry above; running the account-level fixes and
  the history rewrite against my own real GitHub account is not something the
  AI could do for me.

### The AI-written part I understand best

**The frontend's mock/real API switch**

- **File:** `client/src/api/index.js`, `client/src/api/mockApi.js`,
  `client/src/api/httpApi.js`
- **Commit:** https://github.com/neriahv/emberary/commit/bcb1ea090502f249e23dc7d89fe51136070bb0f3
- **What it does and why we kept it:** I used AI to write this faster, but I
  understand exactly how it works: `mockApi.js` and `httpApi.js` both export
  the same set of function names (`listMyBooks`, `updateMyBook`, `getRoom`,
  and so on) — one storing everything in `localStorage`, the other calling the
  real Express API with `fetch`. `index.js` picks one implementation based on
  the `VITE_USE_MOCK_API` build-time variable and re-exports it under those
  same names. Every page imports from `index.js` and never knows which
  implementation it's actually talking to, which is why the whole frontend
  could be built and tested in Week 1 with no backend at all, and then run
  against the real PostgreSQL backend in Week 2 by changing one environment
  variable, not by rewriting any screen.

**The backend's repos/validation split**

- **File:** `server/app.js`, `server/validation.js`, `server/repos/myBooks.js`
- **Commit:** https://github.com/neriahv/emberary/commit/e1588a4d53e342a4e206dd1a0036f0a85e313c9d
- **What it does and why we kept it:** `app.js` only does three things per
  route: read the request, call one function, send the response. All the
  "is this input actually valid" logic lives in `validation.js` and runs
  before any database call, returning every problem with the input at once
  instead of stopping at the first one. All the SQL lives in `server/repos/`,
  one file per area, and every value that comes from the request goes in as a
  `$1`/`$2` parameter rather than being pasted into the query text, which is
  what stops a search box or a review field from being able to run its own
  SQL. Splitting it this way is why I could ask for the schema and the query
  layer separately from the basic Express server I wrote myself — they don't
  depend on each other's implementation, only on the same function names.
