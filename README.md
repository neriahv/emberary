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

Version 1 (Week 1) is the complete front end, running in demo mode.

- **Home.** A dashboard with your Currently Reading books and their progress,
  library stats, recently updated books and recommendations
- **Discover.** Search the catalogue by title or author, filter by genre, read a
  book's details and add it to your collection with a reading status
- **My Books.** Your collection sorted into Currently Reading, Want to Read, Read
  and Did Not Finish. Change a book's status, update your page, rate it, review
  it, or remove it
- **Library Room.** A 3D room with one bookcase shelf per reading status. Click a
  book to pull it out and edit it. Change the wall, floor and bookcase colours and
  turn the rug, plant and lamp on or off
- **Profile.** Your profile, and insights worked out from your shelves: counts,
  average rating, favourite genres and authors, a yearly goal and monthly activity

## Built with

React 18 and Vite, with React Router for navigation and React Three Fiber
(three.js) for the Library Room. Express and PostgreSQL are the back end, which
arrives in Week 2. The client is on GitHub Pages; the API and database hosts are
not chosen yet.

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

**The whole stack.** Needs a PostgreSQL, either local or hosted. In version 1
`server/` is still the starter API and does not serve Emberary's endpoints yet,
so the client only works in demo mode. The steps below apply from Week 2.

    # 1. the database
    docker run --name my-pg -e POSTGRES_PASSWORD=devpassword \
      -e POSTGRES_DB=haunted -p 5432:5432 -d postgres:17

    # 2. the API
    cd server
    npm install
    cp .env.example .env        # check DATABASE_URL
    npm run db:reset            # creates the tables and adds sample rows
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
    curl http://localhost:3000/api/books   # from Week 2

## Environment variables

None of these are committed. `.env.example` in each folder lists them with
placeholder values.

| Name | Where | What it is |
| --- | --- | --- |
| `DATABASE_URL` | server | PostgreSQL connection string. Contains a password |
| `CORS_ORIGINS` | server | comma-separated origins allowed to call the API |
| `NODE_ENV` | server | `production` on your host |
| `PORT` | server | **set by the host**, do not set it yourself |
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
once against the hosted database.

## Project structure

    client/          React front end, built by Vite
      src/api/       ONE interface, two implementations, chosen by a variable
        mockApi.js   the demo backend, stored in localStorage
        httpApi.js   the same functions, calling the Express API
        seed.json    demo books, reading history, profile and room
      src/pages/     Home, Discover, Library Room, My Books, Profile
      src/components/  shared pieces: BookCard, BookCover, BookDetailPanel...
        room/        the 3D scene and the room customizer
      src/hooks/     useAsync, the loading/error/ready state every screen uses
    server/          Express API (starter code until Week 2)
      db/            pool, schema.sql, seed.sql, and a runner for them
    compose.yml      only if you self-host
    docs/            planning documents and weekly reports

## Architecture

The React client is the only piece running in version 1. Every screen imports
its data functions from `src/api/index.js`, which picks `mockApi.js` or
`httpApi.js` at build time from `VITE_USE_MOCK_API`. In demo mode all data stays
in the browser's `localStorage`. From Week 2 the client calls the Express API,
which reads and writes PostgreSQL, and the screens do not change. The Library
Room page loads only when opened, because three.js is most of the app's size.

## What I would do next

- Build the Express API and PostgreSQL schema for books, user books, reviews,
  stats, recommendations and room settings, then switch off demo mode
- Save each book's position in the Library Room and finish the customization
  interface
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
