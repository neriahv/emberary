# Weekly reports

Five minutes a week. Add a new section at the top; never edit an old one.

The value is entirely in writing them **while it is happening**. What took four
hours and why is invisible a month later, and it is exactly what your journal
needs.

---

## Week 1 (Sept 14–23)

**Done.** The complete frontend, in demo mode, with mock data standing in for
a database that didn't exist yet.

- Reworked the starter demo into Emberary: replaced the seed data and
  `mockApi.js`, and rebuilt `App.jsx`'s routing around Home, Discover,
  Library Room, My Books and Profile.
- Built My Books around the four reading statuses (Currently Reading, Want
  to Read, Read, Did Not Finish), with adding, viewing, updating and removing
  books, plus progress, rating and review.
- Built Discover (search, genre filter, recommendations), Home (progress,
  library stats, recent books, recommendations) and Profile (reading
  statistics, favourite genres/authors).
- Started the Library Room: a first, simpler 3D scene with book selection
  and basic room customization.
- Set up shared components and one styling pattern so every screen would
  look like it belonged to the same app.

**Stuck.**

- The starter's own demo structure and terminology had to be pulled out
  first, before Emberary's could go in — more restructuring than writing.
- The Library Room took longer than the flat screens: it's interactive 3D,
  not a form.
- Nothing was checked against a real database yet, so recommendations and
  insights were only as good as the mock data made them look.

**Hours.** Roughly around 5-6 hours of developing and coding.

**Next.** Week 2: the real Express API and PostgreSQL database behind the
same interface, then connect every screen to it and test the whole thing
end to end.

---

## Week 2 (Sept 21–27)

**Done.** The real backend, working locally against a real PostgreSQL; still
not deployed, so the live site stays in demo mode.

- Replaced the starter `sightings` server with an Express API and a
  five-table PostgreSQL schema (`books`, `readers`, `user_books`,
  `room_settings`, `room_items`), with CHECK constraints for statuses,
  ratings, text lengths, colours and room positions, and parameterised
  queries throughout `server/repos/`.
- Built the REST endpoints: catalogue search, adding/updating/removing books
  on a reader's shelves, statuses, progress, ratings, reviews, shelf
  position, statistics, recommendations, and the Library Room's colours and
  furniture.
- Added `npm run db:local` (PostgreSQL 17 via `embedded-postgres`), so the
  project runs with neither Docker nor a separate install.
- Added real book covers from the Google Books API, with each cover's
  dominant colour reused as that book's spine colour.
- Connected the frontend to the real API behind the same interface the mock
  already used: Home's recent/recommended lists became cover rows, Discover
  and My Books show real covers with a drawn fallback, and Profile's yearly
  goal became a donut chart.
- Rebuilt the Library Room as a full-screen isometric room: cut-away walls, a
  round window, categorised bookshelves, warm lighting, books that open with
  a page-turn animation, an edit mode for furniture (add, move, rotate,
  remove, colour), and shelf reordering — all saved.
- Expanded the backend to 37 endpoint tests against real PostgreSQL, plus a
  mock-vs-API comparison confirming matching results, plus a full browser
  pass in Edge (book management, statuses, progress, ratings, reviews,
  profile edits, room customization, shelf order, refresh persistence,
  loading/slow-server/error/validation/empty states, demo mode, CORS).
- Added a favicon (fixed a 404 on every page load), and ran the course's
  security checklist: pinned GitHub Actions to commit SHAs, removed the
  `X-Powered-By` header, added a CORS test, and rewrote three commits that
  carried my personal email.

**Stuck.**

- No PostgreSQL or Docker installed locally — solved with `embedded-postgres`.
- Furniture placed exactly against a wall caused a 500: PostgreSQL's `REAL`
  storage made 2.2 slightly different internally than the value the API had
  just accepted. Fixed by casting the constraint's limits to `REAL` too.
- A CORS error on an allowed port, caused by a leftover `node --watch`
  process from earlier testing restarting the server with default CORS.
  Found by tracing the process on port 3000 back to its parent.
- Four Google Books results were scanned title pages, not covers. Fixed by
  checking each candidate image before accepting it. Also hit a path bug
  (`%20` from the space in my folder name) fixed with `fileURLToPath`.
- Found, but did not yet fix: 3D shelf labels could appear above the edit
  panel, and the opened book had a duplicated title `id`.

**Hours.** Roughly around 4-5 hours of developing and coding.

**Next.** Deploy the Express API and PostgreSQL database, seed the hosted
catalogue, and switch the live frontend off demo mode. Add the access gate
the security checklist flagged as still missing before the API goes public.

---

## Week 3 (Sept 28 – Oct 4)

**Done.** The app is deployed and works end to end at
https://emberary.onrender.com, behind a login.

- **Library Room:**
  - The shelves no longer sort books by status: every started book (reading,
    read, did not finish) stands in one order, like a real bookcase.
  - Furniture is bought from a shop with a cart, in eight categories with
    prices, and each piece is shown as a picture of its real 3D model.
  - Furniture goes into storage instead of being deleted.
- **Ember,** the shop's currency, earned by reading:
  - +3 for the daily check-in, +5 for 20 pages in a day, +1 per 50 pages and
    +15 for finishing a book;
  - kept as a ledger, so no reward can be paid twice.
- **The access gate, written myself:** HTTP Basic Authentication middleware,
  with a timing-safe password comparison, that refuses to start without its
  environment variables.
- **The deployed app, written myself:** one Express app serving helmet
  headers, the gate, the API and the built React client on one address. It
  has a rate limit on failed logins, and `/healthz` is the only route
  outside the gate.
- **The database role, written myself:** `emberary_app` can read and write
  only what the app uses. It cannot change tables, edit the catalogue, or
  rewrite the Ember ledger.
- **Deployed:**
  - the database on Neon (Singapore), with the schema, seed and roles loaded
    from my laptop;
  - the app on Render (Singapore), with every secret in Render's dashboard.

  Checked the live site in a private window: login, adding and finishing a
  book, buying furniture, reloading, and refreshing on a deep link.
- **Locked down:**
  - secret scanning and push protection on;
  - the git history checked for credentials (none);
  - the server's `npm audit` findings fixed by an Express update;
  - the grader's login in my private workspace only.

**Stuck.**

- **My first login to the live site got a 429.** The AI's checks had run from
  my own laptop, so they shared my IP and used up the 10 failed attempts. It
  also showed a real flaw: the limit counted *every* error response, so a
  logged-in reader could lock themselves out with ordinary 404s and 409s.
  Fixed by counting only 401s, with a test that fails without the fix.
- **The first version of my gate changed the function to positional
  arguments.** Every caller passes one options object, so `username` would
  have been the whole object, and my own check would have thrown. Caught in
  review before the tests ran.
- **Search commands that didn't work.** The commands for searching the
  queries were written for Git Bash; my terminal is PowerShell, which has no
  `grep`. I used `Select-String` instead.
- **Neon created the database as PostgreSQL 18, not 17,** which the tests use.
  I kept it: the schema, seed and every check on the live site worked.

**Hours.** Roughly around 6-8 hours of developing and coding.

**Next.** Record the demo video on the deployed site, after warming it up so
the free server is awake.

---

## Week of YYYY-MM-DD

**Done.** What actually works now, in the deployed app rather than on your laptop.

**Stuck.** What is not working, and the most specific description you can give.
"CORS" is not specific. "The preflight OPTIONS returns 404 because my router is
mounted above cors" is.

**Hours.** Roughly. You will need this to estimate anything, ever.

**Next.** One or two things, not a wish list.
