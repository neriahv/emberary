# Design system

The rules Emberary's interface follows, written down, so that screen four
looks like screen one.

**The visual document** — swatches, type samples and component states — was
submitted separately as `emberary_03_design_system.pdf`. That PDF is the
planning-stage palette, decided before the app was built. This file is the
record of what actually shipped in the code, which drifted from that plan in
some real ways — see the honest note at the bottom.

## Colour

Every colour is a custom property on `:root` in `client/src/styles.css`, with
a second set of values for dark mode under `@media (prefers-color-scheme:
dark)`, so a reader's OS setting decides which one they see.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bg` | `#faf6f0` | `#17120f` | Page background |
| `--fg` | `#2a1f1a` | `#f1e8df` | Body text and headings |
| `--muted` | `#6b5c52` | `#b3a497` | Secondary text, captions, labels |
| `--line` | `#e4d8cc` | `#3a2e27` | Borders and dividers |
| `--card` | `#fffdf9` | `#211a16` | Cards and panels |
| `--accent` | `#a4431f` | `#f08a5d` | Primary buttons, active nav, links |
| `--accent-fg` | `#ffffff` | `#1a0f0a` | Text on top of `--accent` |
| `--accent-soft` | `#f6e2d6` | `#3d2519` | Selected/hovered background |
| `--star` | `#c7771c` | `#f2b156` | Ratings |
| `--danger` | `#a3261b` | `#f08a80` | Destructive actions |
| `--warn-bg` / `--warn-line` | `#fff4d6` / `#e0bf6a` | `#3a3120` / `#7d6a30` | The demo-mode notice |
| `--error-bg` / `--error-line` | `#fbe7e4` / `#d98a80` | `#3a2320` / `#7d4038` | Error messages |

Four more, used only by `StatusBadge`, one per reading status:
`--status-reading`, `--status-want`, `--status-read`, `--status-dnf`.

**Contrast**, checked against the running app rather than the plan (WCAG AA
needs 4.5:1 for normal text):

| Pair | Ratio | |
| --- | --- | --- |
| `--fg` on `--bg` | 14.90:1 | pass |
| `--fg` on `--card` | 15.79:1 | pass |
| `--muted` on `--bg` | 5.95:1 | pass |
| `--accent` on `--bg` (links) | 5.73:1 | pass |
| `--accent-fg` on `--accent` (buttons) | 6.17:1 | pass |
| dark `--fg` on dark `--bg` | 15.35:1 | pass |
| dark `--accent-fg` on dark `--accent` | 7.61:1 | pass |

## Type

| Style | Size | Weight | Font | Used for |
| --- | --- | --- | --- | --- |
| `--text-xl` | 2rem (32px) | 700 | `--font-display` | Page titles (`h1`) |
| `--text-lg` | 1.2rem (19.2px) | 700 | `--font-display` | Section titles (`h2`, `h3`) |
| `--text-md` | 1rem (16px) | 400 | `--font-body` | Body text, form fields |
| `--text-sm` | 0.85rem (13.6px) | 400 | `--font-body` | Captions, labels, metadata |

`--font-display` is Georgia (serif) and `--font-body` is the system UI font
stack — every heading is serif, everything else is the system sans, which is
the one type decision the plan didn't originally make.

## Spacing

One scale, six steps, all off a 4px base: `--space-1` through `--space-6` are
4px, 8px, 12px, 16px, 24px and 32px. Screen edge padding is handled by the
page container's own max-width and padding rather than a separate desktop/
mobile constant.

## Components

The shared pieces, and the real props each one takes:

| Component | Appears on | Props |
| --- | --- | --- |
| `BookCover` | Everywhere a book appears | `book`, `size` (`sm`/`md`/`lg`/`fill`) |
| `BookCard` | Discover, My Books | `book`, `entry`, `onSelect`, `selected`, `children` |
| `BookTile` | Home | `book`, `to`, `children` |
| `BookEditForm` | My Books panel, the opened book | `entry`, `onSaved`, `onRemoved`, `heading` |
| `BookDetailPanel` | My Books | `entry`, `onSaved`, `onRemoved`, `onClose` |
| `ProgressBar` | Home, My Books, the opened book | `value`, `max`, `label`, `unit` |
| `StarRating` | My Books, the opened book | `value`, `onChange`, `name`, `disabled` |
| `StatusBadge` | Home, Discover, My Books | `status` |
| `StatCard` | Home, Profile | `label`, `value`, `hint` |
| `AsyncState` | Every page | the `useAsync` result: `status`, `error`, `label` |
| `DemoNotice` | Every page, only in demo mode | none |

`Layout` (the header, nav and skip link) and the Library Room's own pieces
(`LibraryScene`, `RoomCustomizer`, `BookModal`, `models`, `textures`) are
built for Emberary specifically rather than as generic reusable atoms, which
is the plan's `Header` / `Footer` / `IconButton` / `NavLink` collapsed into
fewer, more specific pieces — see the honest note.

## States

Every screen goes through the same four states, from one hook
(`useAsync`) and one component (`AsyncState`):

- **Loading** — a plain `"<label>..."` message (e.g. "Loading your books"),
  and after 3 seconds an added note that the server may be waking up.
- **Error** — a card: `"Could not load this: <message>"` and a **Try again**
  button that re-runs the same request.
- **Empty** — each page writes its own `.empty` message once data has
  loaded but there's nothing in it (e.g. "Your collection is empty. Find a
  book on Discover to start.").
- **Data** — the page itself.

Every interactive control is a real `<button>`, `<select>`, `<input>` or
`<a>`, never a `<div>` with a click handler; every label uses `htmlFor` +
`id`; and `:focus-visible { outline: 2px solid var(--accent); }` is set once,
globally, rather than removed and never replaced.

## In code

Plain CSS, one file (`client/src/styles.css`), custom properties on `:root`.
No CSS Modules and no Tailwind — the plan named CSS Modules as an option, but
the simpler single-file approach won once the component count stayed small
enough for one file to stay readable. Dark mode is the same token names,
redefined once under `@media (prefers-color-scheme: dark)`, so no component
ever branches on light/dark itself.

## Honest note

The submitted PDF was the plan **before** the palette and component list were
finalised during the build, and several things changed:

- **Every colour's hex value changed.** The PDF's `--color-primary` /
  `--color-accent` / `--color-bg` / `--color-surface` / `--color-text` became
  `--accent` / `--bg` / `--card` / `--fg` under different names and different
  values, and grew a full dark-mode set the plan didn't include.
- **The type scale changed.** 28px/16px/14px became a four-step rem scale
  (32/19.2/16/13.6px), and headings picked up a serif display font the plan
  didn't specify.
- **The spacing base changed.** The plan's 8px base with named 8/32px
  spacings and 24px/16px edge padding became a six-step 4px-based scale used
  the same way everywhere, without a separate edge-padding constant.
- **`Header`, `Footer`, `IconButton` and `NavLink` were never built as their
  own components.** Their jobs are done directly inside `Layout.jsx` and
  ordinary `<button>`/`<a>` elements, because the app never grew enough
  distinct nav or icon-button variants to justify pulling them out on their
  own.
- **`SearchBar` and `SectionHeader` were never built as their own components
  either** — every page that needs a search input or a section heading
  writes its own, since the markup around each one differs enough
  (Discover's search bar also has a genre `<select>`; each section's heading
  differs in whether it has a "See all" link) that a shared wrapper would
  have taken more props than markup.
