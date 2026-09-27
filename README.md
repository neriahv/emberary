# Emberary

A personal reading space for leisure readers to discover, organize and track
their books, with a 3D Library Room where their collection sits on real shelves.

**Live site:** https://yourusername.github.io/your-repo-name/
**API:** https://your-api.onrender.com/healthz
**Demo video:** (link)

> **This deployment is running in demo mode.** The interface is real; the backend
> is simulated in your browser so the site works without a server. See
> [Demo mode](#demo-mode) below. Delete this quote once your API is live.

![A screenshot of the main screen](docs/assets/screenshot.png)

## What it does

Week 1 built the complete front end, running in demo mode. Week 2 added the
Express API and PostgreSQL database behind it (see [The API](#the-api)). The
live site stays in demo mode until the API is deployed.

- **Home.** A dashboard with your Currently Reading books and their progress,
  library stats, and rows of covers for recently updated books and
  recommendations
- **Discover.** Search the catalogue by title or author, filter by genre, read a
  book's details and add it to your collection with a reading status
- **My Books.** Your collection sorted into Currently Reading, Want to Read, Read
  and Did Not Finish. Change a book's status, update your page, rate it, review
  it, or remove it
- **Library Room.** A full-screen 3D diorama of a reading room: a round window,
  a tall bookcase with one shelf per reading status, and your books on it with
  their titles on the spines. Click a book and it slides off the shelf and opens
  into a two-page spread, the book on the left and your notes on the right; close
  it and it goes back. **Edit room** lets you change the colours and furnish the
  room (desk, rocking chair, globe, dresser, lanterns and more), dragging each
  piece across the floor. Everything you arrange is saved
- **Profile.** Your profile, and insights worked out from your shelves: counts,
  average rating, favourite genres and authors, a ring chart of your yearly goal
  and monthly activity

Every book shows its real cover where one was found (see
[Book covers](#book-covers)), and a drawn cover in its colour otherwise.

## Built with

React 18 and Vite, with React Router for navigation and React Three Fiber
(three.js) for the Library Room. Express 4 and PostgreSQL (through `pg`, with
parameterised queries only) are the back end, tested with Node's built-in test
runner. The client is on GitHub Pages; the API and database hosts are not chosen
yet.

## Demo mode

This repository can run two ways, chosen by one environment variable at **build**
time.

**Demo mode is the default.** Only the exact string `false` turns it off, so a
forgotten or mistyped variable leaves you on the simulated backend with a visible
notice rather than on a silently broken build.

| `VITE_USE_MOCK_API` | What happens |
| --- | --- |
| unset, or `true` | The client answers its own requests from `localStorage`. No server, no database, nothing shared between visitors. This is what the template ships with, so the GitHub Pages link works on day one. |
| `false` | The client calls the Express API at `VITE_API_BASE_URL`, which reads and writes real PostgreSQL. |

**Demo mode is a starting point and a fallback, not a finished project.** Your
finals submission is all three pieces deployed and talking to each other. Demo
mode is there so you can build the interface in week one before the API exists,
and so you have something to show if a free tier is asleep during your demo.

GitHub Pages serves files and cannot run Node, so the API and the database can
never live there. They go somewhere else:

| Piece | Options |
| --- | --- |
| **API** | Render, Railway, Fly.io, Koyeb, a VPS, or [self-hosted behind a tunnel](../content/extending-your-app/11-self-hosting.md) |
| **Database** | Neon, Supabase, Railway, Aiven, or your own PostgreSQL |

`content/extending-your-app/` in your course workspace walks through all of it.
Page 10 is the decision page if you do not know which to pick.

## Running it yourself

**The client only, in demo mode.** No database needed.

    cd client
    npm install
    cp .env.example .env        # VITE_USE_MOCK_API stays true
    npm run dev                 # http://localhost:5173

**The whole stack.** Needs a PostgreSQL, either local or hosted.

    # 1. the database: EITHER with nothing installed
    cd server
    npm install
    npm run db:local            # real PostgreSQL 17 on localhost:5432; leave it running

    #    OR with Docker
    docker run --name my-pg -e POSTGRES_PASSWORD=devpassword \
      -e POSTGRES_DB=emberary -p 5432:5432 -d postgres:17

    # 2. the API
    cd server
    npm install
    cp .env.example .env        # check DATABASE_URL
    npm run db:reset            # creates the tables and adds the demo's books
    npm test                    # optional: resets the database, then tests every endpoint
    npm run dev                 # http://localhost:3000

    # 3. the client, in another terminal
    cd client
    npm install
    cp .env.example .env
    # set VITE_USE_MOCK_API=false
    npm run dev

Check the API on its own before you blame the client:

    curl http://localhost:3000/healthz     # is the process alive
    curl http://localhost:3000/readyz      # is the database reachable
    curl http://localhost:3000/api/books   # the catalogue

`npm run db:local` downloads the official PostgreSQL binaries into
`node_modules` (the `embedded-postgres` package) and keeps its data in
`server/.pgdata`, which is git-ignored. Delete that folder to start from nothing.
It uses the same address and password as `.env.example`, so the default
`DATABASE_URL` works unchanged.

`npm test` refuses to run unless `DATABASE_URL` points at `localhost`, because it
empties the tables before every test.

The demo data lives in `client/src/api/seed.json`. After changing it, run
`npm run db:seed:build` in `server/` to regenerate `db/seed.sql`, so both modes
keep starting from the same books, shelves and room.

## Book covers

Covers come from the Google Books API, looked up **once** by a script rather
than on every page load:

    cd server
    # put your key in .env:  GOOGLE_BOOKS_API_KEY=...
    npm run covers:fetch          # books without a cover yet
    npm run covers:fetch -- --all # look every book up again
    npm run covers:fetch -- --db  # also write them into the database DATABASE_URL names

For each catalogue book it finds the edition whose title and author match, and
saves that cover's public image link to `seed.json` (and so `seed.sql`). It also
works out the cover's main colour, which becomes the book's spine colour in the
Library Room. `--db` updates an existing database in place without touching
anyone's shelves, which is how a hosted database gets covers.

The key is only ever read by this script. The API never calls Google, the key is
never in a `VITE_` variable, and it is never committed. The saved image links load
without a key, so covers work in demo mode on GitHub Pages too. A book with no
cover, or whose image fails to load, gets a drawn cover instead.

Get a key in the Google Cloud console under **APIs & Services > Credentials**,
enable the Books API, and restrict the key to it.

The cover images belong to their publishers and are served by Google Books; the
site credits Google Books in its footer. None of them are stored in this
repository.

## The API

JSON in, JSON out. Errors come back as `{ "error": "..." }` with a 400 (bad
input), 404 (no such book or entry), 409 (already on your shelves) or 500.
`client/src/api/httpApi.js` calls each of these under the same function name as
the mock.

| Method and path | What it does |
| --- | --- |
| `GET /api/books?q=&genre=` | Search the catalogue by title or author, and filter by genre |
| `GET /api/books/:id` | One catalogue book |
| `GET /api/my-books` | Your shelves, newest change first, each entry with its book |
| `GET /api/my-books/:bookId` | One entry on your shelves |
| `POST /api/my-books` | Add `{ bookId, status }`. `status` defaults to `want-to-read` |
| `PATCH /api/my-books/:bookId` | Change any of `status`, `currentPage`, `rating`, `review`, `shelfPosition` |
| `PUT /api/my-books/order` | Save one shelf's left-to-right order: `{ bookIds: [...] }` |
| `DELETE /api/my-books/:bookId` | Take a book off your shelves |
| `GET /api/stats` | Counts by status, average rating, pages read, top genres and authors, books finished per month |
| `GET /api/recommendations?limit=4` | Books you do not own, scored against what you read and rated |
| `GET /api/profile` · `PATCH /api/profile` | `displayName`, `bio`, `yearlyGoal` |
| `GET /api/room` | The Library Room: its colours and every item in it |
| `PATCH /api/room` | Change any of `wallColor`, `floorColor`, `shelfColor` |
| `POST /api/room/items` | Add `{ kind, x?, z?, rotation? }`. Without a placement it appears mid-floor |
| `PATCH /api/room/items/:id` | Move or turn an item: any of `x`, `z`, `rotation` |
| `DELETE /api/room/items/:id` | Take an item out of the room |

The statuses are `currently-reading`, `want-to-read`, `read` and
`did-not-finish`. Marking a book Read moves it to its last page and records when
it was finished, which is what the activity chart counts. A book that changes
status moves to the end of its new shelf.

Room item kinds are `rug`, `plant`, `lamp`, `armchair`, `side-table`,
`cushion`, `desk`, `rocking-chair`, `globe`, `dresser` and `lantern`, at most 30
per room. The floor is 5 by 5 metres centred on 0: `x` runs from -2.2 (the window
wall) to 2.2, and `z` from -2.2 (the bookcase wall) to 2.2; `rotation` is whole
degrees from 0 to 359.

Every book includes `coverUrl`, the link to its real cover, or `null` when none
was found.

## Environment variables

None of these are committed. `.env.example` in each folder lists them with
placeholder values.

| Name | Where | What it is |
| --- | --- | --- |
| `DATABASE_URL` | server | PostgreSQL connection string. Contains a password |
| `CORS_ORIGINS` | server | comma-separated origins allowed to call the API |
| `NODE_ENV` | server | `production` on your host |
| `PORT` | server | **set by the host**, do not set it yourself |
| `GOOGLE_BOOKS_API_KEY` | server `.env`, your laptop only | used only by `npm run covers:fetch`; the API does not need it, so do not set it on the host |
| `VITE_USE_MOCK_API` | client, at build time | only `false` turns demo mode off; unset means on |
| `VITE_API_BASE_URL` | client, at build time | your API's public URL, no trailing slash |

Every `VITE_` value is compiled into the built JavaScript and is **public**.
Never put a key, a password or a connection string in one.

## Deploying

**Client, to GitHub Pages.** Already wired up in
`.github/workflows/deploy-pages.yml`. Two one-time steps:

1. **Settings > Pages > Build and deployment > Source: GitHub Actions.** Without
   this the workflow goes green and publishes nothing.
2. Nothing else, until your API is live. Demo mode is the default, so the first
   deploy works on its own. When the API is up, add `VITE_USE_MOCK_API` = `false`
   and `VITE_API_BASE_URL` under **Settings > Secrets and variables > Actions >
   Variables**, then re-run the workflow.

The repository must be **public** for Pages to serve it on a free account.

**API and database.** Not automated here, because most hosts deploy straight from
your repository with no workflow at all. Point your host at the `server/` folder,
set the environment variables in its dashboard, and run `server/db/schema.sql`
against the hosted database. Run `server/db/seed.sql` once as well, on first
setup only, because the catalogue of books lives there. It starts with
`TRUNCATE`, so running it again wipes every reader's shelves.

## Project structure

    client/          React front end, built by Vite
      src/api/       ONE interface, two implementations, chosen by a variable
        mockApi.js   the demo backend, stored in localStorage
        httpApi.js   the same functions, calling the Express API
        seed.json    demo books, reading history, profile and room
      src/pages/     Home, Discover, Library Room, My Books, Profile
      src/components/  shared pieces: BookCard, BookCover, BookTile, BookEditForm...
        room/        the 3D diorama (LibraryScene), its furniture (models) and
                     canvas-drawn spines and floor (textures), the opening book
                     (BookModal) and the edit panel (RoomCustomizer)
      src/hooks/     useAsync, the loading/error/ready state every screen uses;
                     useRoomSaver, which saves room changes after a pause
    server/          Express API
      app.js         every route, built without listening so tests can run it
      server.js      reads the environment and starts app.js
      validation.js  the same input rules as mockApi.js
      repos/         the SQL, one file per area: books, myBooks, insights,
                     profile, room
      db/            pool, schema.sql, seed.sql and a runner for them;
                     local.js (npm run db:local), build-seed.js and
                     fetch-covers.js (npm run covers:fetch)
      test/          endpoint tests against a real PostgreSQL
    compose.yml      only if you self-host
    docs/            planning documents and weekly reports

## Architecture

Every screen imports its data functions from `src/api/index.js`, which picks
`mockApi.js` or `httpApi.js` at build time from `VITE_USE_MOCK_API`. In demo mode
all data stays in the browser's `localStorage`. With the mock off, the client
calls the Express API, which reads and writes PostgreSQL, and the screens do not
change. The Library Room page loads only when opened, because three.js is most of
the app's size.

In the API, each route validates its input (`validation.js`) and then calls a
repository function in `repos/`, which runs one parameterised query. Stats and
recommendations are computed in SQL rather than in JavaScript.

The database has five tables: `books` (the shared catalogue), `readers`,
`user_books` (one row per reader per book: status, page, rating, review, shelf
position and when it was finished), `room_settings` (the room's colours) and
`room_items` (each piece of furniture, with its position and rotation). There
are no accounts
yet, so the API always acts as reader 1. Every reader-owned row already carries a
`reader_id`, so adding accounts later will not need a migration of every table.

## What I would do next

- Deploy the database and the API, seed the hosted catalogue, then switch off
  demo mode on the live site
- Test the deployed version end to end and fix whatever production changes
- Drag furniture around the room with the mouse, as well as with the sliders
- Add accounts, so each reader's shelves are their own

## Author

Your name, and a link. Course and section.

## AI use

If you used AI while building this, say so here. Honest disclosure is the
standard in this course and increasingly outside it, and reporting heavy use
accurately costs you nothing.

This section is the last 10 points of the finals badge, and it wants three
things:

![Built with AI assistance](https://img.shields.io/badge/built%20with-AI%20assistance-0b5fff)

- the badge above, or one you like better
- a line naming which assistant you used and how much of the work it touched
- a link to [AI-USAGE.md](AI-USAGE.md), where the full account lives

Keep the detail in `AI-USAGE.md` rather than here. This section is the summary a
visitor reads; that file is the record the badge is graded from.

## Licence

MIT, see [LICENSE](LICENSE). Put your own name in it.
