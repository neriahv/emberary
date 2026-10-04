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
| `--muted` on `--surface-warm` (tinted panels) | 5.62:1 | pass |
| `--accent-fg` on `--accent-glow` (lightest edge of a button) | 4.83:1 | pass |
| dark `--muted` on dark `--surface-warm` | 6.45:1 | pass |

**Tints, not new colours.** The cozy autumn look (Week 3) added no new hues.
Every glow, gradient and shadow is mixed from the palette above with
`color-mix()`:

| Token | Mixed from | Role |
| --- | --- | --- |
| `--honey` | `--star` | The second warm colour in gradients and glows |
| `--accent-glow` / `--accent-deep` | `--accent` with white / black | The top and edge of every ember button and active tab |
| `--surface` | `--card`, 82% opaque | The frosted header and cover tiles |
| `--surface-warm` | `--accent-soft` and `--card` | Tinted panels: reading items, Quick Access tiles, stats, ranked lists |
| `--line-soft` | `--line`, 70% opaque | Card borders |

The page background is `--bg` with soft radial pools of `--honey` and
`--accent` in the corners, and a few blurred "embers" behind everything.

## Type

| Style | Size | Weight | Font | Used for |
| --- | --- | --- | --- | --- |
| `--text-xl` | 2.1rem (33.6px) | 650 | `--font-display` | Page titles (`h1`); the Home welcome scales up to 2.8rem |
| `--text-lg` | 1.3rem (20.8px) | 650 | `--font-display` | Section titles (`h2`) |
| `--text-md` | 1rem (16px) | 400 | `--font-body` | Body text, form fields |
| `--text-sm` | 0.875rem (14px) | 400–800 | `--font-body` | Captions, labels, buttons, metadata |

`--font-display` is **Fraunces**, a soft serif with its "soft" and "wonky"
axes turned on for rounded, bookish headings. `--font-body` is **Nunito**, a
rounded sans. Both are variable fonts under the SIL Open Font License,
installed from npm (`@fontsource-variable/*`) and bundled with the app, so
no request goes to Google Fonts and the deployed security policy needed no
change. Georgia and the system sans remain as fallbacks.

## Shape and depth

| Token | Value | Used for |
| --- | --- | --- |
| `--radius-sm` | 0.7rem | Inputs, small tiles, ranked rows |
| `--radius` | 1.1rem | Cards and panels |
| `--radius-lg` | 1.75rem | Banners, the room's edit drawer, the phone tab bar |
| `--pill` | 999px | Buttons, chips, tabs, the header, search fields |
| `--shadow-sm` / `--shadow` / `--shadow-lg` | warm brown, layered | Resting cards / hovered cards and banners / popovers and the tab bar |

Buttons are pills of ember (a gradient from `--accent-glow` to `--accent`)
with a faint top highlight and a warm drop shadow, lifting 1px on hover.
Section titles carry the brand's diamond as a small ribbon mark.

## Spacing

One scale, six steps, all off a 4px base: `--space-1` through `--space-6` are
4px, 8px, 12px, 16px, 24px and 32px. Screen edge padding is handled by the
page container's own max-width and padding rather than a separate desktop/
mobile constant.

## Components

Added with the cozy autumn redesign: `Icon` (`name`, `label`), a small set of
line icons drawn on a 24px grid in the current text colour, used in the
navigation, Quick Access and search fields; and `Illustrations.jsx`
(`HeroArt`, `RoomArt`, `BooksArt`, each taking `className`), flat
decorative pictures in the palette for the Home welcome, the Library Room
card and the My Books banner.

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
- **The type scale changed.** 28px/16px/14px became a four-step rem scale,
  and headings picked up a serif display font the plan didn't specify. In
  Week 3 that became Fraunces and Nunito, with the scale nudged up
  (33.6/20.8/16/14px).
- **The look changed in Week 3, the palette did not.** The interface was
  restyled as a cozy autumn reading nook (rounded cards, pill buttons, warm
  glows, illustrations), using reference designs for shape and layout only.
  Every colour still comes from the palette above.
- **The spacing base changed.** The plan's 8px base with named 8/32px
  spacings and 24px/16px edge padding became a six-step 4px-based scale used
  the same way everywhere, without a separate edge-padding constant.
- **`Header`, `Footer`, `IconButton` and `NavLink` were never built as their
  own components.** Their jobs are done directly inside `Layout.jsx` and
  ordinary `<button>`/`<a>` elements, because the app never grew enough
  distinct nav or icon-button variants to justify pulling them out on their
  own. The icons themselves did become one component, `Icon`, in Week 3.
- **`SearchBar` and `SectionHeader` were never built as their own components
  either** — every page that needs a search input or a section heading
  writes its own, since the markup around each one differs enough (Discover's
  has a Search button and genre chips; My Books' sits beside "Add Book"; each
  section's heading differs in whether it has a "See all" link) that a
  shared wrapper would have taken more props than markup. They share one
  `.search-field` style instead.
