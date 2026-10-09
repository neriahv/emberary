# Emberary

<p align="center"><img src="docs/assets/logo.jpg" alt="Emberary: a smiling little flame rising out of an open book" width="420"></p>

A personal reading space for leisure readers to discover, organize and track
their books, with a 3D Library Room where their collection sits on real shelves.

**Live app:** https://emberary.onrender.com (sign in, or create an account)
**Public demo:** https://neriahv.github.io/emberary/ (runs in your browser; any email opens it)
**Health check:** https://emberary.onrender.com/healthz
**Demo video:** https://drive.google.com/drive/folders/1mt27P3wbFPt6sftJIJmXrUEw5F9ChAdP?usp=sharing

The live app is the real thing: React, the Express API and a PostgreSQL
database, all deployed. Every reader has their own account: create one on the
sign-in page and you start with an empty shelf, a fresh Library Room and some
Ember to build with. The grader's login to my own library is in my private
course workspace, never in this repository. The first visit after 15 minutes
idle takes about 30 seconds while the free server wakes up.

The public demo is the same interface in [demo mode](#demo-mode): anyone can
try it, and everything stays in their own browser.

![The Library Room](docs/assets/mockup-library-room-desktop.png)

## What it does

Week 1 built the complete front end, running in demo mode. Week 2 added the
Express API and PostgreSQL database behind it (see [The API](#the-api)). Week 3
added the Library Room shop and Ember, then deployed the whole app. Week 4 made
the Library Room a game, "Build your dream library", and gave every reader
their own account.

- **Accounts.** Sign up with your name, email and a password, and sign in on
  any device. Your books, room and Ember are yours alone
- **Home.** A dashboard with your Currently Reading books and their progress,
  library stats, and rows of covers for recently updated books and
  recommendations
- **Discover.** Search every book on Google Books by title or author, or browse
  by genre, read a book's details, and add it to My Books as Currently Reading,
  Want to Read, Read or Did Not Finish
- **My Books.** Your collection sorted into Currently Reading, Want to Read, Read
  and Did Not Finish. Change a book's status, update your page, rate it, review
  it, or remove it
- **Library Room.** Build your dream library: a 3D diorama of a reading room,
  filling the window below the navigation bar, with every book you have started
  (reading, read, or set aside) standing on its shelves. Each spine is cut from
  the book's real cover (or, in demo mode, drawn in its colours) with its title,
  so you can find it at a glance. Click a book and it slides off the shelf and
  opens into a two-page spread, the book on the left and your notes on the
  right. Three modes, down the right-hand side:
  - **Shop.** Browse by picture categories along the top, with prices on the
    left. Pick something and it appears in the room, see-through, where you
    drag it (or click where it goes); buy it right there, or into storage. Walls,
    floors and wall tops are tried on the room before you buy them. About 175
    things in all: bookcases in many themes, tables, seats, lights, rugs,
    plants, windows, seven staircases, and pieces for modern, minimalist, cute,
    cosy and wizard libraries
  - **Build.** Bring things out of storage, move, turn and size them, set small
    things on tables, seats and shelves, and choose the walls' patterns, colours
    and tops and the floors. Grow the room itself a block at a time: floor and
    wall blocks, and, with a staircase and a tall enough wall, an upstairs floor
    of its own design. Point at a wall or floor to move it or sell it back.
    Ctrl+Z undoes
  - **Storage.** What is not in the room, and the books waiting for a shelf.
    Anything sells back for half its price

  Lamps switch on and off, the globe spins and the cat wakes when clicked, and
  the sky turns from day to dusk to night. Look around freely: scroll to zoom
  towards the pointer, right-drag (or two fingers) to move the view, and
  **Centre** to come back. Everything is saved
- **Ember.** Emberary's currency, earned by reading: a daily check-in, reading
  20 pages in a day, every 50 pages of a book, and finishing a book. The wallet
  in the navigation bar shows the balance and how to earn more
- **Profile.** Your profile, and insights worked out from your shelves: counts,
  average rating, favourite genres and authors, a ring chart of your yearly goal
  and monthly activity

Every book shows its real cover where one was found (see
[Book covers](#book-covers)), and a drawn cover in its colour otherwise.

## Built with

React 18 and Vite, with React Router for navigation and React Three Fiber
(three.js) for the Library Room. Express 4 and PostgreSQL (through `pg`, with
parameterised queries only) are the back end, tested with Node's built-in test
runner. The deployed app is one Express service on Render, serving the API and
the client from one address, with readers' own accounts (scrypt-hashed
passwords and session cookies), `helmet` security headers and a rate limit on
failed sign-ins; the database is on Neon. GitHub Pages keeps a public demo-mode
preview.

## Demo mode

This repository can run two ways, chosen by one environment variable at **build**
time.

**Demo mode is the default.** Only the exact string `false` turns it off, so a
forgotten or mistyped variable leaves you on the simulated backend with a visible
notice rather than on a silently broken build.

| `VITE_USE_MOCK_API` | What happens |
| --- | --- |
| unset, or `true` | The client answers its own requests from `localStorage`. No server, no database, nothing shared between visitors. Any email with a password of 8 or more characters signs in to the one demo library. This is the public demo on GitHub Pages. |
| `false` | The client calls the Express API at `VITE_API_BASE_URL` (or its own address when that is empty, as on Render), which reads and writes real PostgreSQL. This is the live app. |

Demo mode let me build the whole interface in Week 1 before the API existed.
It now stays as a public preview, and as a fallback if the free server is
asleep during a demo. GitHub Pages serves files and cannot run Node, so the
real app runs on Render instead (see [Deploying](#deploying)).

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

    #    the demo's reader has the books but no login yet: give it one, or
    #    just create a new account on the sign-in page
    LOGIN_PASSWORD='choose one' npm run login:set -- 1 you@example.com

    # 3. the client, in another terminal
    cd client
    npm install
    cp .env.example .env
    # set VITE_USE_MOCK_API=false
    npm run dev

Check the API on its own before you blame the client:

    curl http://localhost:3000/healthz     # is the process alive
    curl http://localhost:3000/readyz      # is the database reachable
    curl http://localhost:3000/api/books   # 401: everything else needs you signed in

`npm run db:local` downloads the official PostgreSQL binaries into
`node_modules` (the `embedded-postgres` package) and keeps its data in
`server/.pgdata`, which is git-ignored. Delete that folder to start from nothing.
It uses the same address and password as `.env.example`, so the default
`DATABASE_URL` works unchanged.

`npm test` refuses to run unless `DATABASE_URL` points at `localhost`, because it
empties the tables before every test. It runs every file in `server/test/`, one
at a time, since two of them reset the same database.

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

**Searching Google Books.** Discover searches every book on Google through the
API (`GET /api/books/search`), which adds the key on the server. A book found
there joins the catalogue when a reader first adds it: the server fetches it from
Google itself, by id, rather than trusting a title or cover sent by the browser.
The demo has no server and no key, so it asks Google directly; when Google's
small keyless quota is used up, it searches its own shelf instead and says so.

**Spines.** The Library Room paints a strip of each book's real cover onto its
spine. 3D graphics may only read images from the page's own address, so the API
passes covers through (`GET /api/covers/:id`), only for covers already in the
catalogue and only from Google's cover host. In demo mode, spines are drawn.

The key is never in a `VITE_` variable, and it is never committed. The saved
image links load without a key, so covers work in demo mode on GitHub Pages too. A book with no
cover, or whose image fails to load, gets a drawn cover instead.

Get a key in the Google Cloud console under **APIs & Services > Credentials**,
enable the Books API, and restrict the key to it.

The cover images belong to their publishers and are served by Google Books; the
site credits Google Books in its footer. None of them are stored in this
repository.

## The API

JSON in, JSON out. Errors come back as `{ "error": "..." }` with a 400 (bad
input), 401 (not signed in), 404 (no such book or entry), 409 (already on your
shelves) or 500. `client/src/api/httpApi.js` calls each of these under the
same function name as the mock.

Every reader has their own account. Signing in sets an `emberary_session`
cookie (HttpOnly, SameSite=Lax, HTTPS-only in production) that lasts 30 days;
every route below the account ones needs it, and acts only on the signed-in
reader's own books, room and Ember. Passwords are kept as scrypt hashes and
sessions as hashes of their token. Failed sign-ins and sign-ups are limited to
10 per address every 15 minutes. To give an existing reader (such as the seeded
one, with its books and room) a login:
`LOGIN_PASSWORD='...' npm run login:set -- 1 you@example.com` in `server/`.

| Method and path | What it does |
| --- | --- |
| `POST /api/auth/signup` | Make an account: `{ email, password, displayName }` (password 8 to 200 characters). Signs in, and starts the welcome Ember. 409 if the email has an account |
| `POST /api/auth/login` | `{ email, password }`. 401, the same either way, if they do not match |
| `POST /api/auth/logout` | End this session |
| `GET /api/auth/me` | Who is signed in: `{ id, displayName, email }`, or 401 |
| `GET /api/books?q=&genre=` | Search the catalogue by title or author, and filter by genre |
| `GET /api/books/search?q=&genre=` | Search every book on Google Books. Results already in the catalogue come back as the catalogue's book. 502 if Google does not answer |
| `GET /api/books/:id` | One catalogue book |
| `GET /api/covers/:id` | A catalogue book's cover image, passed through from Google, for the Library Room's spines |
| `GET /api/my-books` | Your shelves, newest change first, each entry with its book |
| `GET /api/my-books/:bookId` | One entry on your shelves |
| `POST /api/my-books` | Add `{ bookId, status }`. `status` defaults to `want-to-read`. The reply includes `rewards` |
| `PATCH /api/my-books/:bookId` | Change any of `status`, `currentPage`, `rating`, `review`, `shelfPosition`, `shelfSpot` (`{ bookcase, row, x }` or `null`: where the book stands in the Library Room). The reply includes `rewards`: the Ember this save earned |
| `PUT /api/my-books/order` | Save the order of the books on the shelves: `{ bookIds: [...] }` |
| `DELETE /api/my-books/:bookId` | Take a book off your shelves |
| `GET /api/stats` | Counts by status, average rating, pages read, top genres and authors, books finished per month |
| `GET /api/recommendations?limit=4` | Books you do not own, scored against what you read and rated |
| `GET /api/profile` · `PATCH /api/profile` | `displayName`, `bio`, `yearlyGoal` |
| `GET /api/room` | The Library Room: its `blocks`, colours and finishes, the finishes you own (`unlocks`) and every item, placed or stored |
| `PATCH /api/room` | Change any of `wallColor`, `floorColor`, `shelfColor`, `upperFloorColor`, and a `wallpaper`, `floor`, `wallShape` or `upperFloor` you own |
| `POST /api/room/blocks` | Build: `{ type: "add" \| "move" \| "remove", kind: "floor" \| "wall" \| "upper", at }` (or `from` and `to` to move). A block is paid for when it is put down and gives half back when taken away; 409 says why one cannot go somewhere |
| `PATCH /api/room/items/:id` | Move, turn, size, switch, store or place an item: any of `x`, `z`, `y`, `rotation`, `level` (1 is upstairs), `placed`, `lit`, `size`, `sx`, `sy`, `on` (what a small thing stands on) |
| `POST /api/room/items/:id/sell` | Sell an item back for half its price, rounded down |
| `POST /api/shop/checkout` | Buy `{ items: [catalogue id, ...] }`, all or nothing: furniture goes into storage, finishes are unlocked. 409 if you cannot afford it |
| `GET /api/ember` | Your balance, today's check-in and pages, the earning rules, and recent history |
| `POST /api/ember/check-in` | The daily check-in. 409 if already claimed today |

The statuses are `currently-reading`, `want-to-read`, `read` and
`did-not-finish`. Marking a book Read moves it to its last page and records when
it was finished, which is what the activity chart counts. Every started book is
on the Library Room shelves; one that joins them from Want to Read goes to the
end, and moving between the other statuses keeps its place.

What the shop sells, and its prices, are in `server/catalog.js` (kept identical
to `client/src/api/catalog.js`, and a test checks they match), and so are the
building rules, so the shop, the server and demo mode always agree. A reader
owns at most 200 things and can put as many of them in the room as they like;
the rest wait in storage, and nothing sold is ever deleted, only marked sold.
The room starts as one 5 by 5 metre floor block centred on 0 with a wall along
its two back edges, and grows a block at a time, up to 12 floor blocks; walls
go only on the back edges, so the room is never closed off from view. `x` and
`z` are metres from the first block's middle; `rotation` is whole degrees from
0 to 359.

**Ember.** Every Ember earned or spent is a row in `ember_ledger`, and the balance
is their sum. One-off rewards (the welcome gift, a daily check-in, a daily goal,
a finished book) have a unique index, so they cannot be paid twice, even by
removing a book and adding it again. Page rewards are counted against what that
book has already earned, so paging back and forth earns nothing. Rewards and
purchases happen inside a transaction with the rows they depend on locked.
"Today" is in `APP_TIMEZONE` (Asia/Manila by default).

Every book includes `coverUrl`, the link to its real cover, or `null` when none
was found.

## Environment variables

None of these are committed. `.env.example` in each folder lists them with
placeholder values.

| Name | Where | What it is |
| --- | --- | --- |
| `DATABASE_URL` | server | PostgreSQL connection string. Contains a password |
| `CORS_ORIGINS` | server | comma-separated origins allowed to call the API |
| `NODE_ENV` | server | `production` on your host; serves the built client and sends the session cookie over HTTPS only |
| `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` | server, host dashboard only | optional: a shared password in front of the whole site, on top of each reader's own sign-in. Set both or neither |
| `PORT` | server | **set by the host**, do not set it yourself |
| `APP_TIMEZONE` | server, optional | when "today" starts for the daily check-in and reading goal; `Asia/Manila` if unset |
| `GOOGLE_BOOKS_API_KEY` | server: host dashboard and `.env` | searching Google Books from Discover, and `npm run covers:fetch`. Restrict it to the Books API |
| `VITE_USE_MOCK_API` | client, at build time | only `false` turns demo mode off; unset means on |
| `VITE_API_BASE_URL` | client, at build time | your API's public URL, no trailing slash |

Every `VITE_` value is compiled into the built JavaScript and is **public**.
Never put a key, a password or a connection string in one.

## Deploying

**Client, to GitHub Pages.** Already wired up in
`.github/workflows/deploy-pages.yml`. Two one-time steps:

1. **Settings > Pages > Build and deployment > Source: GitHub Actions.** Without
   this the workflow goes green and publishes nothing.
2. Nothing else. No Actions variables are set, so the Pages build stays in demo
   mode.

The repository must be **public** for Pages to serve it on a free account.

The Pages site stays in demo mode on purpose: it is the public preview, and it
never touches the database. The real app is not on Pages, because the session
cookie works most simply when the website and the API share one address.

**The real app: Render and Neon.** One Render web service runs Express, which
serves both the API and the built React client from the same address
(`server/web.js`). Same address means no CORS, and the session cookie goes with
every request. Readers sign in with their own accounts; the earlier HTTP Basic
Authentication gate (`server/basicAuth.js`) is still there, but only switched
on if both of its variables are set. The database is on Neon
(PostgreSQL 18; the tests run locally on 17), in Singapore like the server.

| Render setting | Value |
| --- | --- |
| Root directory | *(empty: the repository root)* |
| Build command | `npm run build` (root `package.json`: builds the client, installs the server) |
| Start command | `npm start` |
| Health check path | `/healthz`, which answers without signing in |
| Environment | `NODE_ENV=production`, `DATABASE_URL` (the app role), `GOOGLE_BOOKS_API_KEY`, optionally `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD`, `VITE_USE_MOCK_API=false` |

The database is set up from a laptop, connected as Neon's **owner** role:
`schema.sql`, then `seed.sql` (first setup only: it starts with `TRUNCATE`), then
`roles.sql`. To update a database that is already live, run `schema.sql` and
`roles.sql` again (both are safe to repeat), never `seed.sql`. A reader made by
the seed signs in once given a login with `npm run login:set` (see
[Running it yourself](#running-it-yourself)). The deployed API connects as `emberary_app`, a role that can read
and write the app's rows but cannot change tables, rewrite the catalogue, or
edit Ember history (`server/test/roles.test.js` checks each of these).

## Project structure

    client/          React front end, built by Vite
      src/api/       ONE interface, two implementations, chosen by a variable
        mockApi.js   the demo backend, stored in localStorage
        httpApi.js   the same functions, calling the Express API
        seed.json    demo books, reading history, profile and room
      src/pages/     Home, Discover, Library Room, My Books, Profile, and the
                     sign-in page
      src/components/  shared pieces: BookCard, BookCover, BookTile, BookEditForm...
        AuthGate     shows the sign-in page until a reader is signed in
        room/        the 3D diorama (LibraryScene) and the room's walls, floors
                     and upstairs (structure); the furniture registry (models)
                     and the pieces themselves (furniture, lights, collection,
                     wizardry, themes, windows); canvas-drawn spines, patterns
                     and pictures (textures); the shop's pictures (thumbnails),
                     its category tabs (catalogs), the shelves of the shop,
                     builder and storage (RoomCustomizer) and the opening book
                     (BookModal)
        EmberBadge   the wallet in the navigation bar
      src/api/catalog.js  what the shop sells and what Ember is earned for
      src/hooks/     useAsync, the loading/error/ready state every screen uses;
                     useRoomSaver, which saves room changes after a pause;
                     useEmber, the wallet kept up to date
    package.json     build and start commands for the host
    server/          Express API
      app.js         every route, built without listening so tests can run it
      web.js         the deployed app: security headers, the optional gate,
                     the API and the built client on one address
      auth.js        password hashing and the session cookie
      basicAuth.js   the optional shared-password gate
      server.js      reads the environment and starts app.js (or web.js in
                     production)
      validation.js  the same input rules as mockApi.js
      catalog.js     the shop and the Ember rules (identical to the client's)
      repos/         the SQL, one file per area: accounts (and sessions),
                     books, myBooks, insights, profile, room (and the shop's
                     checkout), ember
      db/            pool, schema.sql, seed.sql, roles.sql (the deployed
                     API's permissions) and a runner for them; local.js
                     (npm run db:local), build-seed.js, fetch-covers.js
                     (npm run covers:fetch) and set-login.js (npm run
                     login:set)
      test/          endpoint tests against a real PostgreSQL, accounts
                     included, plus the gate, the deployed app and the
                     database role
    compose.yml      only if you self-host
    docs/            planning documents and weekly reports

## Architecture

Every screen imports its data functions from `src/api/index.js`, which picks
`mockApi.js` or `httpApi.js` at build time from `VITE_USE_MOCK_API`. In demo mode
all data stays in the browser's `localStorage`. With the mock off, the client
calls the Express API, which reads and writes PostgreSQL, and the screens do not
change. The Library Room page loads only when opened, because three.js is most of
the app's size.

In the API, the account routes come first; every other `/api` route then
needs a valid session, which tells it who the reader is. The reader's id comes
only from the session, never from the request, so nobody can reach another
reader's rows. Each route validates its input (`validation.js`) and then calls a
repository function in `repos/`, which runs one parameterised query. Stats and
recommendations are computed in SQL rather than in JavaScript.

The database has ten tables: `books` (the shared catalogue), `readers` (with
each one's email and password hash), `sessions` (a hash of each signed-in
browser's token), `user_books` (one row per reader per book: status, page,
rating, review, shelf spot and when it was finished), `room_settings` (the
room's colours and finishes), `room_blocks` (the floor, wall and upstairs
blocks it is built of), `room_items` (each piece of furniture, with its
position, size, level and whether it is placed, stored or sold),
`room_unlocks` (the finishes bought), `ember_ledger` (every Ember earned or
spent) and `reading_days` (pages read per day, for the daily goal).

## What I would do next

- Let a reader reset a forgotten password by email
- Visit other readers' Library Rooms

## Author

Neriah Faith L. Villapaña ([@neriahv](https://github.com/neriahv)).
CS - 401 - Computer Science.

## AI use

![Built with AI assistance](https://img.shields.io/badge/built%20with-AI%20assistance-0b5fff)

Built with Claude Code (Opus 5.5) as the main assistant. AI wrote most of the interface, the 3D Library Room, the API's
query layer and the accounts. I wrote the routing, the server entry point, the access gate, the
deployed app's middleware and the database role, and I did the deployment
myself. The full account, entry by entry with commit links, is in
[AI-USAGE.md](AI-USAGE.md).

## Licence

MIT, see [LICENSE](LICENSE).
