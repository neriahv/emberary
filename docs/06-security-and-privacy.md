# Security and privacy checklist

Work through this **before your first push**, and again before you submit. It is
short, none of it is exotic, and a grader can check most of it in two minutes.

Your repository is public, in your own account, and permanent. That is the point
of it, and it is also why this file exists.

> First checked on 2026-09-28/29, using the fuller pass in my private workspace
> `SECURITY-CHECKLIST.md`. Checked again on 2026-10-04 against the deployed app
> at https://emberary.onrender.com and the repository's full git history.
> Every unchecked box below is a real gap, not an unfinished form.

## Before the first push

- [x] `.gitignore` includes `.env`, and `git check-ignore -v .env` confirms it
      — also `.env.*`, which covered the temporary Neon setup file I used once
      and then deleted
- [x] `git ls-files | grep -iE '\.env$|\.pem$|id_rsa'` prints nothing
- [x] `.env.example` is committed, with **placeholder** values only —
      including empty `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD`
- [x] No connection string, key or password anywhere in the repository,
      including in a screenshot — `git log -p` searched for
      `password|secret|api[_-]?key|postgres://`, and separately for Neon host
      names and the two database role names. Only placeholders came back:
      `devpassword` (the local database), `local-test-only` (a role the role
      test creates on my laptop) and the `user:pass@host.neon.tech` example.
      Nothing was ever committed that needed rotating
- [x] No `student.json`, and no name, student number or email of yours or anyone
      else's — three early commits carried my personal Gmail as their author
      email; rewritten with my GitHub no-reply address and force-pushed

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

## The access gate

- [x] **Option B: a password on the app itself.** HTTP Basic Authentication,
      written as Express middleware in `server/basicAuth.js`, registered before
      every route in `server/web.js`. The website and the API are on one
      address behind it; only `/healthz` (which returns `{"ok":true}` and
      nothing else) answers without a login, so Render can check the app is up
- [x] The username and password are environment variables set in Render's
      dashboard, not in the source. The server refuses to start in production
      if either is missing
- [x] The credentials are in my private workspace `project/README.md` for the
      grader, never in this repository
- [x] Checked in a private window on the live site: the login box appears, a
      wrong password is refused, the right one opens the app

## The application

- [x] Every SQL query is parameterised. Values go in the array, never into the
      string. This is one line of defence you already know how to do
- [x] Input is validated **on the server**, not only in React. Length limits on
      every text field
- [x] `cors({ origin: allowedOrigins })` names your origins. Not `cors()` with no
      options, which allows every site on the internet — and in production the
      client and API share one address, so no other origin is needed
- [x] `NODE_ENV=production` on the host, and no stack trace in any response body
      — set in Render's dashboard; the error handler always sends a fixed
      message and logs the detail on the server
- [x] `helmet` installed, which is one line for several real protections —
      with a content security policy whose only outside image source is
      `https://books.google.com`, for the covers
- [x] Anything that costs money or accepts a password is rate limited — the
      gate allows 10 failed logins per 15 minutes per visitor, then answers
      429. Only failed logins (401) count, so a logged-in reader is never
      locked out. `trust proxy` is set, so behind Render's proxy each visitor
      is counted by their own address
- [ ] Passwords, if you have accounts, are hashed with bcrypt and never logged
      — N/A: there are no user accounts. The one gate password lives only in
      an environment variable and is compared with a timing-safe comparison
- [ ] Every route that touches somebody's data has the ownership check **in the
      query**, as `AND user_id = $2`, not as an `if` above it — every query in
      `server/repos/` does filter `WHERE reader_id = $1`, the right shape for
      when this matters, but there's only one reader (`READER_ID = 1` in
      `server/app.js`) until real accounts exist, so the check has nothing to
      protect against yet and doesn't count as done
- [x] The deployed API does not connect as the database owner. It uses
      `emberary_app`, a role with only the permissions the app uses
      (`server/db/roles.sql`): it cannot create, change or drop tables, cannot
      edit the book catalogue, and can only add to the Ember ledger, never
      change or delete it. `server/test/roles.test.js` checks each of these
- [x] The database connection checks the server's certificate
      (`sslmode=verify-full`)
- [x] No debug, seed or reset routes. Seeding and schema changes run only from
      my laptop, with npm scripts
- [x] `npm audit` run once, and the easy fixes taken — `server/`: the three
      moderate `qs` findings now have a fix in Express 4.22.3, taken on
      2026-10-04 (0 left, all 75 tests pass). `client/`: 2 moderate in
      `react-router`, whose only fix is a breaking major-version upgrade, so
      it is still a known, accepted gap

## Privacy

The half that matters more, because it is about other people.

- [x] **No real classmates' names, numbers, emails or photos**, anywhere. Not in
      seed data, not in screenshots, not in the demo video. Consent for a course
      project does not cover the next ten years of a public repository
- [x] Seed data is invented. Yours will be read — the catalogue is public
      information about real published books; every reader, review and reading
      history is made up, and the live database started from the same seed
- [x] If real people tested your app, even three friends, their data is deleted
      before you submit — N/A: no one else's data went in; only my own testing
- [x] If your app collects anything about anyone, the app says what it collects
      — the live app's footer lists what it saves (shelves, reading progress,
      ratings, reviews, profile, room and Ember history) and says nothing is
      shared or sold; the demo's notice says its data stays in the visitor's
      own browser
- [x] Any face in a screenshot is stock, generated, or yours — N/A: no faces
      anywhere in the app; book covers are illustrations, not photos of people

If your project handles personal information about real people, you are inside
the Philippine Data Privacy Act. Collect the minimum, say what you collect, and
do not collect anything you cannot justify.

## What to write in your journal

At the first check, the riskiest thing was that the API had no access gate and
would connect as the database superuser the moment it was deployed. Both are
fixed: the live app is behind a Basic Authentication gate with a rate limit on
failed logins, and it connects as a role that can only do what the app does.
One real flaw turned up during deployment, not in the tests I started with: the
first version of the rate limit counted every error response, so a logged-in
reader could have locked themselves out; it now counts only failed logins, with
a test for it. What I accepted rather than fixed: the two moderate
`react-router` findings, because the fix is a breaking upgrade, and the
ownership check, which only becomes meaningful once there are accounts.
