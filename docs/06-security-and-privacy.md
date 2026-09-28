# Security and privacy checklist

Work through this **before your first push**, and again before you submit. It is
short, none of it is exotic, and a grader can check most of it in two minutes.

Your repository is public, in your own account, and permanent. That is the point
of it, and it is also why this file exists.

> Checked against the actual repository and running app on 2026-09-28/29, using
> the fuller pass in my private workspace `SECURITY-CHECKLIST.md` as the source.
> Every unchecked box below is a real gap, not an unfinished form.

## Before the first push

- [x] `.gitignore` includes `.env`, and `git check-ignore -v .env` confirms it
- [x] `git ls-files | grep -iE '\.env$|\.pem$|id_rsa'` prints nothing
- [x] `.env.example` is committed, with **placeholder** values only
- [x] No connection string, key or password anywhere in the repository,
      including in a screenshot
- [x] No `student.json`, and no name, student number or email of yours or anyone
      else's — three early commits carried my personal Gmail as their author
      email; rewritten with my GitHub no-reply address and force-pushed

Deleting a file later does **not** remove it from the history. If you commit a
credential, **rotate it first**, at the service, and clean up the history second.
The rotation is the fix; the cleanup is hygiene.

## The application

- [x] Every SQL query is parameterised. Values go in the array, never into the
      string. This is one line of defence you already know how to do
- [x] Input is validated **on the server**, not only in React. Length limits on
      every text field
- [x] `cors({ origin: allowedOrigins })` names your origins. Not `cors()` with no
      options, which allows every site on the internet
- [ ] `NODE_ENV=production` on the host, and no stack trace in any response body
      — the stack-trace part is done (the error handler always sends a fixed
      message); `NODE_ENV=production` itself is only set once there's a host to
      set it on, in Week 3
- [ ] `helmet` installed, which is one line for several real protections — not
      done yet, still on `server/package.json`'s missing-dependencies list
- [ ] Anything that costs money or accepts a password is rate limited — nothing
      costs money; nothing accepts a password yet either, because there's no
      access gate yet (Week 3)
- [ ] Passwords, if you have accounts, are hashed with bcrypt and never logged
      — N/A for now: no accounts, no passwords
- [ ] Every route that touches somebody's data has the ownership check **in the
      query**, as `AND user_id = $2`, not as an `if` above it — every query in
      `server/repos/` does filter `WHERE reader_id = $1`, the right shape for
      when this matters, but there's only one reader (`READER_ID = 1` in
      `server/app.js`) until real accounts exist, so the check has nothing to
      protect against yet and doesn't count as done
- [x] `npm audit` run once, and the easy fixes taken — `client/`: 2 moderate
      (react-router, fix is a breaking major-version bump, deferred);
      `server/`: 3 moderate (`qs`, via `body-parser`/`express`, no fix released
      yet for the Express 4 line). Neither is a fix I can take today without
      breaking something else, so both are a known, accepted gap, not an
      unnoticed one.

```bash
npm install helmet
```

```js
import helmet from 'helmet'
app.use(helmet())
```

## Privacy

The half that matters more, because it is about other people.

- [x] **No real classmates' names, numbers, emails or photos**, anywhere. Not in
      seed data, not in screenshots, not in the demo video. Consent for a course
      project does not cover the next ten years of a public repository
- [x] Seed data is invented. Yours will be read — the catalogue is public
      information about real published books; every reader, review and reading
      history is made up
- [x] If real people tested your app, even three friends, their data is deleted
      before you submit — N/A: no one else's data went in; only my own testing
- [ ] If your app collects anything about anyone, the app says what it collects
      — the demo-mode banner says data stays in the visitor's own browser, but
      there's no equivalent statement for what the real API will store once
      it's deployed and demo mode is off
- [x] Any face in a screenshot is stock, generated, or yours — N/A: no faces
      anywhere in the app; book covers are illustrations, not photos of people

If your project handles personal information about real people, you are inside
the Philippine Data Privacy Act. Collect the minimum, say what you collect, and
do not collect anything you cannot justify.

## What to write in your journal

The riskiest thing on this list is that the API will have no access gate and
will connect to the database as its superuser the moment it's deployed —
neither is done, both are planned for Week 3, and until then the honest state
is "not yet safe to put a real URL on." I accepted two smaller things instead
of fixing them immediately: `helmet` is still missing, and the moderate
`npm audit` findings in both `client/` and `server/` have no available fix that
doesn't force a breaking dependency upgrade this week. Those two are logged,
not hidden, and are worth another look once the bigger gate/permissions work is
done.
