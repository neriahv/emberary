# Security and privacy checklist

Work through this **before your first push**, and again before you submit. It is
short, none of it is exotic, and a grader can check most of it in two minutes.

Your repository is public, in your own account, and permanent. That is the point
of it, and it is also why this file exists.

> First checked on 2026-09-28/29, using the fuller pass in my private workspace
> `SECURITY-CHECKLIST.md`. Checked again on 2026-10-04 against the deployed app
> at https://emberary.onrender.com and the repository's full git history.
> Checked a third time on 2026-10-11 against the code, after reader accounts,
> account settings and friends were added: the app now holds real people's
> emails and passwords, so most of "The application" and "Privacy" changed.
> Everything found that day is fixed, `npm audit` is clean in both packages,
> and all 138 server and 35 client tests pass. What I chose not to fix is
> under "Accepted risks", with the reason.

## Before the first push

- [x] `.gitignore` includes `.env`, and `git check-ignore -v .env` confirms it
      — also `.env.*`, which covered the temporary Neon setup file I used once
      and then deleted
- [x] `git ls-files | grep -iE '\.env$|\.pem$|id_rsa'` prints nothing
- [x] `.env.example` is committed, with **placeholder** values only —
      including empty `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` and
      `GOOGLE_BOOKS_API_KEY`
- [x] No connection string, key or password anywhere in the repository,
      including in a screenshot — `git log -p` searched for
      `password|secret|api[_-]?key|postgres://`, for Google API keys
      (`AIza…`), and separately for Neon host names and the two database role
      names. Only placeholders came back: `devpassword` (the local database),
      `test-only` and `local-test-only` (the test databases on my laptop) and
      the `user:pass@host.neon.tech` example. Nothing was ever committed that
      needed rotating
- [x] No `student.json`, and no name, student number or email of yours or anyone
      else's — three early commits carried my personal Gmail as their author
      email; rewritten with my GitHub no-reply address and force-pushed. Every
      commit now carries only the no-reply address. The seed's readers have no
      email at all

Deleting a file later does **not** remove it from the history. If you commit a
credential, **rotate it first**, at the service, and clean up the history second.
The rotation is the fix; the cleanup is hygiene.

## GitHub Actions

- [x] One workflow, `deploy-pages.yml`. It uses **no secrets**: its only inputs
      are two repository *variables*, and neither is set, so the Pages build is
      the demo-mode client
- [x] Third-party actions pinned to full commit SHAs, not tags
- [x] Nothing printed to the log, and the uploaded artifact is `client/dist`
      only, which contains no `.env` or server configuration
- [x] Secret scanning and push protection turned on for the repository
      (**Settings > Advanced Security**), and push protection for my own
      account, which covers every public repository I push to
- [x] No CI database — the tests run on my laptop against a local PostgreSQL

## Accounts and sign-in

The access gate I started with was one shared password for the whole site. Now
every reader has their own account, so the gate is optional.

- [x] Readers sign up with a name, email and password, and sign in with the
      email and password (`server/app.js`, `server/auth.js`,
      `server/repos/accounts.js`). Every `/api` route after the account routes
      needs a signed-in reader, and takes the reader's id from the session,
      never from the request
- [x] Passwords are hashed and never logged or stored in plain text — with
      **scrypt** from Node's built-in `crypto` (a random 16-byte salt per
      password, a 64-byte key), not bcrypt, so there is no extra dependency.
      Checked with a timing-safe comparison, and malformed stored hashes are
      refused. An unknown email is checked against a decoy hash, so a wrong
      email takes as long as a wrong password
- [x] New passwords must have at least 8 characters with an uppercase and a
      lowercase letter, a number and a symbol, and must not contain the email's
      name or a common password (`PASSWORD_RULES` in `server/catalog.js`),
      checked on the server, not only in the form. The email's domain must
      exist and take mail (`server/emailDomain.js`)
- [x] Sign-in gives the same 401 whether the email or the password was wrong
- [x] Sessions: the cookie holds a random 32-byte token, and the database keeps
      only its SHA-256 hash (`sessions` table), so a copy of the database is no
      use for signing in. The cookie is `HttpOnly`, `SameSite=Lax`, and
      `Secure` in production; it lasts 30 days, and signing out deletes the
      session on the server, not only the cookie
- [x] Changing a password or email needs the current password, and signs out
      every other session of that reader
- [x] Guessing is rate limited — sign-up, sign-in and the password and email
      changes allow 10 failed tries per 15 minutes per address, then answer
      429; successful ones do not count. The live email check and the reader
      search allow 30 a minute. `trust proxy` is set, so behind Render's proxy
      each visitor is counted by their own address
- [x] The old HTTP Basic Authentication gate (`server/basicAuth.js`, before
      every route in `server/web.js`) is still there, with its own rate limit,
      but only switched on if both `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD`
      are set; one without the other stops the server. The live site relies on
      accounts alone. Only `/healthz` (which returns `{"ok":true}` and nothing
      else) answers without signing in, so Render can check the app is up

## The application

- [x] Every SQL query is parameterised. Values go in the array, never into the
      string. This is one line of defence you already know how to do
- [x] Input is validated **on the server**, not only in React. Length limits on
      every text field, positive-integer checks on every numeric id in a URL, and a
      100 kB limit on request bodies
- [x] `cors({ origin: allowedOrigins, credentials: true })` names your origins.
      Not `cors()` with no options, which allows every site on the internet —
      and in production the client and API share one address, so no other
      origin is needed
- [x] `NODE_ENV=production` on the host, and no stack trace in any response body
      — set in Render's dashboard; the error handler always sends a fixed
      message and logs the detail on the server
- [x] `helmet` installed, which is one line for several real protections —
      with a content security policy whose only outside image source is
      `https://books.google.com`, for the covers
- [x] Every route that touches somebody's data has the ownership check **in the
      query** — every query in `server/repos/` filters `WHERE reader_id = $1`,
      with the id from the session, and an item, note, list or snapshot that
      belongs to someone else is a 404. Now that there are real accounts, this
      protects something; the tests check another reader's room items, notes
      and lists can't be touched
- [x] Friends: a reader can see another reader's Library Room and notes only
      after an accepted friendship, checked in the query
      (`friends.areFriends`) before anything is read. Pending requests,
      strangers and visiting yourself get a 404, only the person asked can
      accept, and unfriending removes access at once. A visit shows only the
      placed furniture and the books on the shelves; never the email, Ember
      balance, storage, settings or want-to-read books. Reader search returns
      only id, name and avatar, never the email. `server/test/friends.test.js`
      checks each of these
- [x] The deployed API does not connect as the database owner. It uses
      `emberary_app`, a role with only the permissions the app uses
      (`server/db/roles.sql`): it cannot create, change or drop tables; it can
      add a book found on Google to the catalogue but never change or delete
      one; it can add and update readers but never delete one; and it can only
      add to the Ember ledger, never change or delete it.
      `server/test/roles.test.js` checks each of these
- [x] The Google Books key stays on the server. Discover's searches go
      through the API, which adds the key; a book is saved only after the
      server fetches it from Google itself, and the cover route only fetches
      covers already in the catalogue, from Google's cover host
- [x] The database connection checks the server's certificate
      (`sslmode=verify-full`)
- [x] No debug, seed or reset routes. Seeding, schema changes and
      `login:set` run only from my laptop, with npm scripts. `login:set` takes
      the password from an environment variable, so it never lands in my
      shell history
- [x] `npm audit` run, and every finding fixed — **0 vulnerabilities in
      `server/` and `client/`** on 2026-10-11. `server/`: a critical IP
      spoofing issue in `proxy-addr` (under Express), which mattered because
      `trust proxy` and the rate limits rely on it; `npm audit fix` took it to
      2.0.8. `client/`: `source-map-js` (high) fixed the same way; `tinypool`
      (critical) and `@vitest/mocker` by upgrading vitest 3 to 5; and the two
      `react-router` findings, accepted on 2026-10-04 because the fix was a
      major upgrade, by moving to `react-router-dom` 7.18.4. The app only uses
      `BrowserRouter`, `Routes`, `Link`, `NavLink` and the basic hooks, which
      did not change. All tests and the production build pass on the new
      versions

## Privacy

The half that matters more, because it is about other people.

- [x] **No real classmates' names, numbers, emails or photos**, anywhere. Not in
      seed data, not in screenshots, not in the demo video. Consent for a course
      project does not cover the next ten years of a public repository
- [x] Seed data is invented. Yours will be read — the catalogue is public
      information about real published books; every seed reader, review and
      reading history is made up, and the seed readers have no email or
      password, so they can't be signed in to or found in reader search
- [x] If real people tested your app, even three friends, their data is deleted
      before you submit — anyone can create an account on the live site, so
      the `readers` table on Neon is the place to check. Any account that is
      not mine or the grader's is deleted, with its books, notes and
      friendships, from my laptop as the owner role (the app role cannot
      delete readers)
- [x] If your app collects anything about anyone, the app says what it collects
      — the live app's footer (`client/src/components/Layout.jsx`) says it
      saves your name, email and a hash of your password (never the password
      itself), along with shelves, reading activity, notes, lists, profile,
      settings, room layouts and Ember history. It also says what friends see:
      your Library Room, the books on its shelves with their ratings and
      reviews, and your notes on them, and that nothing else is shared and
      nothing is sold. The demo's notice says its data stays in the visitor's
      own browser
- [x] Collect the minimum — an account is a name, an email and a password
      hash, and the avatar is picked from a fixed gallery, so there are no
      uploaded photos. Nothing else about the reader is asked for
- [x] Any face in a screenshot is stock, generated, or yours — N/A: no faces
      anywhere in the app; avatars are illustrations, and book covers are
      illustrations, not photos of people

If your project handles personal information about real people, you are inside
the Philippine Data Privacy Act. Collect the minimum, say what you collect, and
do not collect anything you cannot justify.

## Accepted risks

Known, weighed, and left as they are on purpose:

- **Sign-up and the email change say "That email already has an account"**, so
  someone could find out whether an address is registered. Sign-in does not
  reveal it, and the rate limit (10 failed tries per 15 minutes) makes trying
  many addresses slow. I kept it because the honest message is what tells a
  real reader to sign in instead of giving up.
- **No password reset by email, and no self-service account deletion.**
  Sending email needs a mail service and its own secrets, which this project
  does not have. For now, a reader who forgets their password or wants their
  account gone asks me, and I do it from my laptop (`npm run login:set`, or a
  delete as the owner role). Both are in "What I would do next" in the README.

## Before each deploy

- [x] `npm test` at the repository root passes: 138 server tests against a real
      PostgreSQL, then 35 client tests
- [x] `npm audit` is clean in `server/` and `client/`
- [x] Render's environment has `NODE_ENV=production`, `DATABASE_URL` for the
      `emberary_app` role (not the owner) with `sslmode=verify-full`, and
      `GOOGLE_BOOKS_API_KEY`. `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` are
      both unset, or both set, never one
- [x] Render installs from the committed lockfiles (`npm ci` in the root
      `build` script), so the fixed versions above are what runs
- [x] After the deploy: `/healthz` answers `{"ok":true}`, signing up and in
      works in a private window, and the session cookie is `Secure` and
      `HttpOnly` in the browser's dev tools

## What to write in your journal

At the first check, the riskiest thing was that the API had no access gate and
would connect as the database superuser the moment it was deployed. Both were
fixed: a Basic Authentication gate with a rate limit on failed logins, and a
role that can only do what the app does. One real flaw turned up during
deployment, not in the tests I started with: the first version of the rate
limit counted every error response, so a logged-in reader could have locked
themselves out; it now counts only failed logins, with a test for it.

Adding accounts changed what the riskiest thing is. The app now keeps real
people's emails and passwords, and lets them see each other's libraries. The
passwords are scrypt-hashed, the session tokens are hashed, every query checks
who owns the row, and a friend's library is only readable after the friendship
is accepted. The ownership check, which I left unchecked last time because
there was only one reader, now protects something real.

The third check found two things, and both are fixed. `npm audit` had a
critical IP spoofing issue in `proxy-addr`, which my rate limits rely on, so I
updated it, and while I was there I cleared every client finding too,
including the `react-router` one I had accepted before. The footer said
"Nothing is shared or sold" after friends could see each other's shelves, and
it didn't mention emails or passwords; it now says what is kept and exactly
what friends see. What I accepted rather than fixed is the email-already-taken
message at sign-up and the lack of password reset and self-service deletion,
for the reasons above.
