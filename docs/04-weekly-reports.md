# Weekly reports

Five minutes a week. Add a new section at the top; never edit an old one.

The value is entirely in writing them **while it is happening**. What took four
hours and why is invisible a month later, and it is exactly what your journal
needs.

---

## Week 2

**Done.** Works locally against a real PostgreSQL. Not deployed yet, so the live
site is still in demo mode.

- Set up the Express backend and prepared the project to use a real API instead
  of only the Week 1 mock API. The routes are in `server/app.js`, and
  `server/server.js` only starts them.
- Set up PostgreSQL for Emberary and connected the backend to it. The database
  is now called `emberary`, not the starter's `haunted`. `npm run db:local` runs
  a real PostgreSQL 17 from `node_modules`, so development needs neither Docker
  nor an installer.
- Reworked the starter `sightings` table into an Emberary schema: `books`,
  `readers`, `user_books`, `room_settings` and `room_items`, with CHECK
  constraints for statuses, ratings, lengths, colours and room positions.
  `seed.sql` is generated from the demo's `seed.json` (`npm run db:seed:build`),
  so both modes start with the same data.
- Wrote the repository queries in `server/repos/`. Every one is parameterised,
  and search uses `position()` rather than `LIKE`, so `%` and `_` typed into the
  search box are treated as ordinary characters.
- Built the REST endpoints for adding, retrieving, updating and deleting books on
  the reader's shelves, plus searching the catalogue.
- Statuses: Currently Reading, Want to Read, Read and Did Not Finish. Marking a
  book Read moves it to its last page and records `finished_at`.
- Reading progress, ratings (1 to 5, or cleared with null) and reviews (up to
  2000 characters), validated with the same rules as the mock.
- Reading statistics and recommendations for the Home Dashboard and Profile /
  Reading Insights, now computed in SQL.
- Library Room, finished locally:
  - Furniture is now saved items (rug, plant, lamp, armchair, side table,
    cushion) that can be added, moved, turned and removed, replacing the Week 1
    on/off switches. Items can be picked from a list or by clicking them in 3D.
  - Books keep their place along a shelf. Move left and Move right save the
    whole shelf's order in one query (`PUT /api/my-books/order`).
  - The room has skirting boards, a window and a picture.
- Frontend connected to the real API: `mockApi.js` and `httpApi.js` have the same
  new functions, and every screen works with `VITE_USE_MOCK_API=false`.
- Tested it:
  - `npm test` runs 36 endpoint tests against real PostgreSQL.
  - Every read endpoint returns exactly what the mock returns for the same seed
    data.
  - A browser script ran the app against the local API: adding a book, progress,
    rating, review, status, profile, room colours, furniture and shelf order,
    each checked after a page refresh. It also covered the loading,
    slow-server, error, validation and empty states.
- Kept the Week 1 mock working, so the frontend runs with or without the server.
  Demo data moved to a new storage key, so Week 1 visitors start fresh instead
  of loading an old room shape.
- Added a favicon, which removed a 404 logged on every page load.

**Stuck.**

**Hours.**

**Next.** Week 3: deploy the API and database, seed the hosted catalogue, switch
the live site off demo mode, and test everything again in production.

---

## Week of YYYY-MM-DD

**Done.** What actually works now, in the deployed app rather than on your laptop.

**Stuck.** What is not working, and the most specific description you can give.
"CORS" is not specific. "The preflight OPTIONS returns 404 because my router is
mounted above cors" is.

**Hours.** Roughly. You will need this to estimate anything, ever.

**Next.** One or two things, not a wish list.

---

## Week of YYYY-MM-DD

...
