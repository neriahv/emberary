# Emberary

<p align="center"><img src="docs/assets/logo.jpg" alt="Emberary: a smiling little flame rising out of an open book" width="420"></p>

## My project repository

Public repository: https://github.com/neriahv/emberary

Live app: https://emberary.onrender.com (create an account on the sign-in page)

Public demo: https://neriahv.github.io/emberary/ (runs in your browser; any
email and a password of 8 or more characters opens it)

The free server sleeps after 15 minutes idle, so the first visit can take
about 30 seconds.

## What it is

Emberary is a cozy reading tracker for leisure readers: discover books on
Google Books, sort them into Currently Reading, Want to Read, Read and Did Not
Finish, and track your progress. Reading earns Ember, which you spend building
a 3D Library Room where your books stand on real shelves and friends can visit.

![The Library Room](docs/assets/mockup-library-room-desktop.png)

Built with React, Vite and React Three Fiber on the front end, and Express and
PostgreSQL on the back end. It is deployed on Render, with the database on
Neon.

## How to run it

You need Node.js 20 or newer.

**Just the interface (demo mode, no database):**

    cd client
    npm install
    cp .env.example .env
    npm run dev                 # open http://localhost:5173

**The whole app:**

1. Start a database. Either run one with nothing installed:

       cd server
       npm install
       npm run db:local         # PostgreSQL on localhost:5432; leave it running

   or use Docker:

       docker run --name emberary-pg -e POSTGRES_PASSWORD=devpassword \
         -e POSTGRES_DB=emberary -p 5432:5432 -d postgres:17

2. Start the API, in a new terminal:

       cd server
       npm install
       cp .env.example .env     # the example DATABASE_URL works with step 1
       npm run db:reset         # creates the tables and adds the sample books
       npm run dev              # http://localhost:3000

   The example `.env` uses
   `postgresql://postgres:devpassword@localhost:5432/emberary`. Add a Google
   Books API key as `GOOGLE_BOOKS_API_KEY` for full search; without one,
   search still works on a smaller shared quota.

3. Start the client, in another terminal:

       cd client
       npm install
       cp .env.example .env     # then set VITE_USE_MOCK_API=false
       npm run dev              # open http://localhost:5173

4. Create an account on the sign-in page.

To run the tests: `npm test` in the repository root (server tests against the
local database, then client tests).

## Presentation

- Video (public Google Drive link): https://drive.google.com/file/d/1kFh8jdx-jXeZMjJeIo3ZlO9wNSx1oDi1/view?usp=sharing
- Slides (link or PDF): https://drive.google.com/file/d/1slljRjRGCwkMo_1RvgfqL6cak8iEqkxb/view?usp=sharing
- Square image: https://drive.google.com/file/d/1eOAzf33XFweX9aKP-q1M8ad-I2qrE0HZ/view?usp=sharing

## AI usage

[AI-USAGE.md](AI-USAGE.md):
https://github.com/neriahv/emberary/blob/main/AI-USAGE.md

---

By Neriah Faith L. Villapaña ([@neriahv](https://github.com/neriahv)), CS 401.
Security and privacy notes are in
[docs/06-security-and-privacy.md](docs/06-security-and-privacy.md). MIT
licence, see [LICENSE](LICENSE).
