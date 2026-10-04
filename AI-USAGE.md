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

### 2026-09-30 - Library Room shelves and furniture shop (Week 3)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** Three changes to the Library Room. Remove the shelf
  labels ("Currently Reading", "Want to Read", …), because the room is meant to
  display the books I have read or started, not sort them. Show a picture of
  each piece of furniture instead of only its name. Replace "add furniture"
  with a shop and a cart, with the categories I listed (bookshelves,
  wallpaper, floor tiles, tables, chairs, lamps, rugs, decorations) and prices
  based on my examples (chair 1 Ember, table 2, wallpaper 3, large bookshelf
  10).
- **What it gave back:**
  - The shelves now hold only Currently Reading, Read and Did Not Finish books,
    in one order with no labels. They fill the main bookcase, then any
    bookcases I buy.
  - `catalog.js`, the price list with 33 items in 8 categories, kept as
    identical copies in `server/` and `client/src/api/`.
  - Nine new 3D models in `models.jsx`, and new wallpaper and floor patterns
    in `textures.js`.
  - `thumbnails.jsx`, which takes a picture of each real 3D model for the shop
    cards.
  - `RoomCustomizer.jsx` rebuilt with Shop and Arrange tabs, a cart, and a
    **Put in storage** option instead of delete.
  - A `POST /api/shop/checkout` route that checks prices and the balance on
    the server.
- **What I kept, what I changed, and why:**
  - Kept all of it, including the prices it filled in for the items my
    examples didn't cover. For example, a small bookcase costs 6 and a
    grandfather clock 5.
  - Storage instead of delete was its suggestion. I kept it because otherwise
    removing something I had paid for would throw the Ember away.
  - Two bugs came up while testing, described in Cases 4 and 5 below.
- **Commit:** https://github.com/neriahv/emberary/commit/2e85bd28d1335bb9f78f72b0d2ccd00e093ee43e

### 2026-09-30 - Ember: earning the shop's currency by reading (Week 3)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** A way to earn Ember for the shop by reading, using the
  rewards I described: a free 3 Ember for checking in each day, 15 for
  finishing a book, and rewards for a daily goal and for pages read.
- **What it gave back:**
  - An `ember_ledger` table where every reward and purchase is one row, and the
    balance is their sum.
  - `server/repos/ember.js`, which pays +3 for the daily check-in, +5 for
    reading 20 pages in a day, +1 per 50 pages of a book and +15 for finishing
    a book.
  - A unique index so each reward can only be paid once.
  - An Ember wallet in the navigation bar (`EmberBadge.jsx`) with a **Daily +3**
    button and the reader's recent history.
  - A message after saving a book that says what was earned.
  - Tests, including tests for ways to cheat.
- **What I kept, what I changed, and why:** Kept it. I asked for the rewards
  and their amounts; the rules that stop cheating came from the AI. Finishing
  a book only pays once, even if the book is removed and added again. Paging
  backwards and forwards does not earn page rewards twice. I kept those rules
  because without them the shop would be free. The 53 server tests, which
  include these cases, all pass.
- **Commit:** https://github.com/neriahv/emberary/commit/2e85bd28d1335bb9f78f72b0d2ccd00e093ee43e

### 2026-10-03 - Tests and setup for going live (Week 3)

- **Tool:** Claude Code (Opus 5.5)
- **What I asked for:** Help getting the app ready to deploy safely. Before
  making the API public it needed an access gate, security headers, and a
  database login with limited permissions. I chose to write those parts myself
  (see section 3), so I asked the AI to set up everything around them.
- **What it gave back:**
  - The course's secret scan over my git history. It found no real secret,
    only the placeholder local password `devpassword`.
  - Three test files that describe what my code had to do, before I wrote it:
    `basicAuth.test.js` (8 tests), `web.test.js` (8) and `roles.test.js` (5).
  - Empty starting files for me to fill in: `basicAuth.js`, `web.js` and
    `roles.sql`.
  - A root `package.json` with Render's build and start commands.
  - A privacy line in the footer of the live app, saying what it stores.
  - The `BASIC_AUTH_*` placeholders in `.env.example`.
  - The README's deploy section.
  - A local step-by-step guide for my tasks, which is not committed.
- **What I kept, what I changed, and why:**
  - Kept all of it.
  - I chose the options myself:
    - the gate: Basic Auth (Option B), because I have no domain;
    - hosting: Render for the API and Neon for the database;
    - GitHub Pages stays a public demo that never touches the database.
  - Writing the tests first meant I could tell when my own code was right
    without asking the AI to check it each time.
- **Commit:** https://github.com/neriahv/emberary/commit/d59a306889bfde1f723afbdda7dd1e23c40b6a7b

## 2. Where the AI got it wrong

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

### Case 3 - the shop's pictures blanked the whole page (Week 3)

- **What it gave me:** `thumbnails.jsx`, which photographs each furniture
  model one at a time on a hidden 3D canvas to make the shop's pictures.
- **What was wrong with it:** Opening **Edit room** turned the whole Library
  Room page blank. The code removed each finished model from its list of
  models to photograph, but also kept moving an index forward through that
  list. As the list got shorter, the index ran past its end and the code tried
  to draw a model that did not exist, which crashed the page.
- **What I did instead:** Had it drop the index and always photograph the
  first model still left in the list. Then I reopened the shop in the browser
  to check that every card had a picture and the console showed no errors.
- **Commit:** https://github.com/neriahv/emberary/commit/2e85bd28d1335bb9f78f72b0d2ccd00e093ee43e

### Case 4 - a rate limit that could lock out the right people (Week 3)

- **What it gave me:** Guidance for the rate limit in front of my access gate:
  `skipSuccessfulRequests: true`, so that only failures count toward the
  limit of 10 per 15 minutes. Its tests passed.
- **What was wrong with it:** My first login to the live site got
  "Could not load this: 429".
  - **The immediate cause.** The AI had checked the live site with requests
    run from my own laptop, so they shared my IP and used up the failed
    attempts.
  - **The real flaw underneath.** express-rate-limit treats *every* 4xx
    response as a failure, not just a wrong password. A logged-in reader who
    got ten ordinary answers like "404" or "409 You already checked in today"
    would have been locked out of the app.
  - **Why the tests missed it.** They only tested wrong passwords, and correct
    passwords that always succeeded.
- **What I did instead:**
  - Had it add a test where a logged-in reader gets 15 404s in a row and must
    never see a 429. It failed on request 11, which confirmed the flaw.
  - Fixed it myself by telling the limiter what counts as success:
    `requestWasSuccessful: (request, response) => response.statusCode !== 401`.
    Only failed logins count now.
  - 9 of 9 tests pass, and I pushed it, so Render redeployed it.
  - To get back in straight away, I restarted the Render service, which
    clears the limiter's in-memory counter, instead of waiting out the
    15 minutes.
- **Commit:** https://github.com/neriahv/emberary/commit/ea7f756d34aa9b4733da3009ff6bea1afd3f8e54

## 3. Who wrote what

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

**The access gate**

- **File:** `server/basicAuth.js`
- **Commit:** https://github.com/neriahv/emberary/commit/c88cb8e6733777d14f32ece107cf876cd4d143a0
- **What it does and why it is built this way:** HTTP Basic Authentication in
  front of the whole deployed app. The browser sends
  `Authorization: Basic <base64 of username:password>`.
  - **No password means no start.** If the username or password is missing or
    empty, the function throws an error naming `BASIC_AUTH_USER` and
    `BASIC_AUTH_PASSWORD` before the server starts. A missing environment
    variable on Render then crashes the boot instead of leaving the app open.
    One `if (!username || !password)` covers both cases, because an empty
    string is falsy.
  - **Reading the header.** The middleware reads the header with a `?? ''`
    fallback, splits off the scheme, and checks for `basic` in any case. The
    `&& encoded` check is there because `''.split(' ')` and `'Basic'.split(' ')`
    both leave the encoded part `undefined`.
  - **Decoding.** It decodes with `Buffer.from(encoded, 'base64')` and splits
    on the first colon only, using `indexOf` and `slice`. A password may
    contain a colon; a username cannot.
  - **Comparing.** `same()` hashes both sides with SHA-256, so
    `timingSafeEqual` always gets buffers of the same length (it throws when
    they differ). We compute userOk and passOk separately because `&&`
    short-circuits: if the username comparison returns false, it skips the
    password comparison. Running both comparisons every time reduces timing
    differences that could reveal whether the username matched.
  - **Refusing.** Anything that fails falls through to a 401 with
    `WWW-Authenticate: Basic realm="Emberary"`, which is what makes the browser
    show its login box.
  - **My mistake along the way.** My first full version changed the parameters
    to `basicAuth(username, password)`. The callers pass one options object,
    so `username` would have been the whole object, and my own check would
    have thrown. I put the `{ username, password, realm }` destructuring back.
    8 of 8 tests pass.

**The deployed app**

- **Files:** `server/web.js`, `server/server.js`
- **Commit:** https://github.com/neriahv/emberary/commit/09ed7d0ab2d633f5ee2587b35ff86d55a4dcbfa5
- **What it does and why it is built this way:** One Express app serves the
  security headers, the gate, the API and the built React client from one
  address, so there is no CORS and one login covers everything. I worked out
  the middleware order before writing any code:
  1. **helmet:** adds security headers to every response, including
     `/healthz` and login refusals. Its image policy allows `data:` and
     `blob:` for the shop's pictures, and `https://books.google.com` for the
     covers.
  2. **`GET /healthz`:** answers health checks without requiring a password
     or using the rate limit, so Render can tell the app is alive.
  3. **Rate limit:** runs before the gate so failed login attempts count:
     10 per 15 minutes. `requestWasSuccessful` says that only a 401 is a
     failure, and `skipSuccessfulRequests` then leaves everything else
     uncounted, so a logged-in reader is never limited (see Case 4).
  4. **The gate (`basicAuth`):** protects the client files and the API.
  5. **Static files:** serve the built React files before the SPA fallback.
  6. **SPA fallback:** sends `index.html` for client routes such as
     `/my-books`, so refreshing a page works. It must skip API paths so they
     reach `api`: I skip `/api`, `/api/...` and `/readyz`.
  7. **`api`:** comes last, because its catch-all 404 answers any request
     that reaches it.
  - **`trust proxy`.** I set `trust proxy` to 1 because on Render every
    request arrives through Render's proxy. Without it, every visitor would
    share one IP address, and ten wrong passwords from anyone would lock out
    everyone.
  - **`server.js`.** It builds the API, and only in production wraps it in
    `createWebApp`, with the client folder found relative to the file
    (`fileURLToPath(new URL('../client/dist', import.meta.url))`), because
    Render starts the app from a different folder. If BASIC_AUTH_PASSWORD is
    missing or empty in production, createWebApp calls basicAuth, which
    throws the error naming the required environment variables. Execution
    stops before app.listen, so the server refuses to start.
  - **Results.** 8 of 8 tests pass. In a local run in production mode,
    `/healthz` answered without a login, `/` and `/api/books` refused without
    one, and with it the site, a `/my-books` deep link and the database all
    worked.

**The database role**

- **File:** `server/db/roles.sql`
- **Commit:** https://github.com/neriahv/emberary/commit/2f712bf97775ceeda71201a861760e9f98e11323
- **What it does and why it is built this way:** The deployed API logs in as
  `emberary_app`, not as the database owner. Then a bug or someone getting past
  the gate cannot drop tables or rewrite data the app never changes. I searched
  every query in `server/repos/` for inserts, updates, deletes and locks, and
  worked out what each table actually needs:

  | Table | Granted | Why |
  | --- | --- | --- |
  | `books` | SELECT | the catalogue is loaded from my laptop, never written by the app |
  | `readers` | SELECT, UPDATE | profile edits, and the `FOR UPDATE` lock during checkout |
  | `user_books` | SELECT, INSERT, UPDATE, DELETE | the only table the app deletes from |
  | `room_settings`, `room_items`, `reading_days` | SELECT, INSERT, UPDATE | furniture is stored, never deleted; the daily pages use `ON CONFLICT DO UPDATE` |
  | `room_unlocks`, `ember_ledger` | SELECT, INSERT | the ledger is append-only: once Ember is recorded, the app cannot change or delete it |

  - **Creating things.** `REVOKE CREATE ON SCHEMA public FROM PUBLIC` stops
    any role from creating tables. `USAGE` on the schema lets the app role see
    the tables at all.
  - **Sequences.** The two `SERIAL` id sequences the app inserts into need
    their own `USAGE` grant.
  - **The one thing I verified before writing it.** I checked that the
    ledger's `ON CONFLICT` clause is `DO NOTHING`, not `DO UPDATE`, which is
    what lets `ember_ledger` stay append-only.
  - **Results.** 5 of 5 tests pass: the whole app works as this role, and it
    is refused when it tries to change tables, edit the catalogue, rewrite
    Ember history, or delete readers or furniture. With these, the whole
    server suite passes, 74 of 74.

**Deploying it and locking it down**

- **Live app:** https://emberary.onrender.com (behind the gate)
- **Commit:** https://github.com/neriahv/emberary/commit/ea7f756d34aa9b4733da3009ff6bea1afd3f8e54
- **What it does and why it is built this way:** This is not source code, so
  it is a note rather than a code claim. All of it happened in my own
  accounts.
  - **Neon.** I created the `emberary` project in AWS Singapore, the region
    closest to Manila. Neon made it PostgreSQL 18, not the 17 my tests use; I
    kept it, because the schema, seed and every check worked. I created the
    `emberary_app` role in the console, which generated its password, so no
    database password was ever typed into a file in the repository.
  - **Loading the database.** From my laptop I ran `schema.sql`, `seed.sql`
    and `roles.sql` as the owner, through a temporary `.env.neon-owner` file.
    I confirmed `.gitignore` covers it before using it, and deleted it
    afterwards, so the owner login no longer exists on my machine.
  - **The app's connection string.** It uses `emberary_app` and
    `sslmode=verify-full`, which checks the database server's certificate
    instead of only encrypting the connection.
  - **Render.** I created the web service in Singapore, next to the database,
    so queries don't cross an ocean. The build is `npm run build` and the
    start is `npm start`. The health check path is `/healthz`, the only route
    outside the gate. Six environment variables are set in the dashboard,
    including the gate's login, which I generated with Node's `crypto`.
  - **Checking it like a grader.** In a private window: the login box, a
    wrong password refused, no demo banner, `/readyz` showing the database
    up, adding and finishing a book, buying furniture, reloading, and
    refreshing on `/my-books`.
  - **Locking down the repository.** I put the grader's login in my private
    workspace README only. I turned on secret scanning and push protection
    for the repository, and push protection for my own account, which covers
    every public repository I push to. I confirmed no Actions variables
    are set, so GitHub Pages stays the public demo, and ran the secret search
    over the whole git history. Only placeholders came back.

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