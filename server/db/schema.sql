-- The complete shape of Emberary's database. Safe to run against an empty
-- database, and safe to run twice.
--
-- This file is committed on purpose. The schema is a fact about the
-- application, not a runtime concern: it should be readable by opening a file
-- rather than by connecting to a server. It is also what lets you move to a
-- hosted database in one command.
--
-- Rules the client also checks (statuses, rating range, colour format) are
-- repeated here as CHECK constraints. The API validates first so it can send a
-- friendly message; these are the backstop if anything ever skips the API.

-- The Week 1 starter table. Emberary does not use it.
DROP TABLE IF EXISTS sightings;

-- A person with shelves. There is only one until accounts arrive, but every
-- reader-owned row already carries reader_id, so adding accounts later is a
-- login screen rather than a migration of every table.
CREATE TABLE IF NOT EXISTS readers (
  id           SERIAL      PRIMARY KEY,
  display_name TEXT        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  bio          TEXT        NOT NULL DEFAULT '' CHECK (char_length(bio) <= 280),
  yearly_goal  INTEGER     NOT NULL DEFAULT 12 CHECK (yearly_goal BETWEEN 1 AND 365),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The shared catalogue, the same for every reader. The ids are short text
-- ("b01") so they match the demo data and stay readable in URLs.
CREATE TABLE IF NOT EXISTS books (
  id          TEXT    PRIMARY KEY,
  title       TEXT    NOT NULL,
  author      TEXT    NOT NULL,
  genre       TEXT    NOT NULL,
  pages       INTEGER NOT NULL CHECK (pages > 0),
  year        INTEGER,
  color       TEXT    NOT NULL DEFAULT '#5a3a22' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  description TEXT    NOT NULL DEFAULT '',
  -- The real cover, found once by "npm run covers:fetch". NULL means the client
  -- draws a cover from the colour instead.
  cover_url   TEXT    CHECK (cover_url ~ '^https://')
);

-- Databases created before covers existed get the column too.
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT CHECK (cover_url ~ '^https://');

-- A book on one reader's shelves: where they are with it and what they thought.
-- One row per reader per book, which is what the primary key enforces.
CREATE TABLE IF NOT EXISTS user_books (
  reader_id      INTEGER     NOT NULL REFERENCES readers (id) ON DELETE CASCADE,
  book_id        TEXT        NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  status         TEXT        NOT NULL DEFAULT 'want-to-read'
                   CHECK (status IN ('currently-reading', 'want-to-read', 'read', 'did-not-finish')),
  current_page   INTEGER     NOT NULL DEFAULT 0 CHECK (current_page >= 0),
  rating         INTEGER     CHECK (rating BETWEEN 1 AND 5),
  review         TEXT        NOT NULL DEFAULT '' CHECK (char_length(review) <= 2000),
  -- Order along the book's shelf in the Library Room. NULL means "wherever the
  -- room puts it", which is every book until the room saves positions.
  shelf_position INTEGER     CHECK (shelf_position >= 0),
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- When the book was last marked Read. Kept separately from updated_at so
  -- editing a review later does not move the book to a different month in the
  -- reading activity chart.
  finished_at    TIMESTAMPTZ,
  PRIMARY KEY (reader_id, book_id)
);

-- My Books and the Home dashboard list a reader's books newest first.
CREATE INDEX IF NOT EXISTS user_books_reader_updated_idx
  ON user_books (reader_id, updated_at DESC);

-- Each reader's Library Room colours. One row per reader.
CREATE TABLE IF NOT EXISTS room_settings (
  reader_id   INTEGER PRIMARY KEY REFERENCES readers (id) ON DELETE CASCADE,
  wall_color  TEXT    NOT NULL DEFAULT '#6b3f2a' CHECK (wall_color ~ '^#[0-9a-fA-F]{6}$'),
  floor_color TEXT    NOT NULL DEFAULT '#3a2a1e' CHECK (floor_color ~ '^#[0-9a-fA-F]{6}$'),
  shelf_color TEXT    NOT NULL DEFAULT '#5a3a22' CHECK (shelf_color ~ '^#[0-9a-fA-F]{6}$')
);

-- The rug, plant and lamp used to be on/off switches here. They are rows in
-- room_items now, so a reader can have two plants, or move the lamp.
ALTER TABLE room_settings
  DROP COLUMN IF EXISTS rug,
  DROP COLUMN IF EXISTS plant,
  DROP COLUMN IF EXISTS lamp;

-- Furniture and decor standing on the Library Room floor. The room is a
-- 5 x 5 metre diorama centred on 0: x runs from the window wall (negative) to
-- the open side, z from the bookcase wall (negative) towards the viewer. The
-- limits keep items on the floor and inside the walls. rotation is in whole
-- degrees around the vertical axis.
CREATE TABLE IF NOT EXISTS room_items (
  id         SERIAL      PRIMARY KEY,
  reader_id  INTEGER     NOT NULL REFERENCES readers (id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL,
  x          REAL        NOT NULL DEFAULT 0,
  z          REAL        NOT NULL DEFAULT 0.5,
  rotation   INTEGER     NOT NULL DEFAULT 0 CHECK (rotation BETWEEN 0 AND 359),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_items_reader_idx ON room_items (reader_id, id);

-- The kinds and floor limits, as named constraints so this file can change
-- them on a database that already exists. Week 2's first room was smaller, so
-- positions from it are pulled inside the new walls first.
ALTER TABLE room_items
  DROP CONSTRAINT IF EXISTS room_items_kind_check,
  DROP CONSTRAINT IF EXISTS room_items_x_check,
  DROP CONSTRAINT IF EXISTS room_items_z_check;

UPDATE room_items SET
  x = LEAST(GREATEST(x, -2.2), 2.2),
  z = LEAST(GREATEST(z, -2.2), 2.2);

-- The kinds are the "item" entries of server/catalog.js.
ALTER TABLE room_items
  ADD CONSTRAINT room_items_kind_check CHECK (kind IN (
    'bookcase-small', 'bookcase-tall',
    'side-table', 'coffee-table', 'desk', 'dresser',
    'stool', 'chair', 'cushion', 'armchair', 'rocking-chair',
    'lantern', 'lamp', 'candelabra',
    'rug', 'round-rug', 'runner-rug',
    'vase', 'plant', 'globe', 'clock'
  )),
  -- Compared as REAL, like the columns. 2.2 stored as a REAL is 2.2000000477,
  -- which is not BETWEEN -2.2 AND 2.2 in exact numeric terms, so an item
  -- pushed right up to a wall would be refused.
  ADD CONSTRAINT room_items_x_check CHECK (x BETWEEN -2.2::real AND 2.2::real),
  ADD CONSTRAINT room_items_z_check CHECK (z BETWEEN -2.2::real AND 2.2::real);

-- Bought furniture is never destroyed: taking it out of the room puts it in
-- storage (placed = false), from where it can be placed again for free.
ALTER TABLE room_items ADD COLUMN IF NOT EXISTS placed BOOLEAN NOT NULL DEFAULT true;

-- The wallpaper and floor finishes on the room. Plain paint and oak planks are
-- free; the others have to be bought first (room_unlocks).
ALTER TABLE room_settings
  ADD COLUMN IF NOT EXISTS wallpaper TEXT NOT NULL DEFAULT 'wallpaper-plain'
    CHECK (wallpaper IN ('wallpaper-plain', 'wallpaper-stripes', 'wallpaper-trellis',
                         'wallpaper-sprig', 'wallpaper-panels')),
  ADD COLUMN IF NOT EXISTS floor TEXT NOT NULL DEFAULT 'floor-planks'
    CHECK (floor IN ('floor-planks', 'floor-checker', 'floor-herringbone', 'floor-stone'));

-- The finishes a reader has bought.
CREATE TABLE IF NOT EXISTS room_unlocks (
  reader_id INTEGER NOT NULL REFERENCES readers (id) ON DELETE CASCADE,
  item      TEXT    NOT NULL,
  PRIMARY KEY (reader_id, item)
);

-- Ember, the Library Room's currency. Every Ember earned or spent is a row, and
-- a reader's balance is the sum of their rows, so the balance can always be
-- explained and never drifts from its history.
CREATE TABLE IF NOT EXISTS ember_ledger (
  id         SERIAL      PRIMARY KEY,
  reader_id  INTEGER     NOT NULL REFERENCES readers (id) ON DELETE CASCADE,
  amount     INTEGER     NOT NULL CHECK (amount <> 0),
  reason     TEXT        NOT NULL CHECK (reason IN (
               'welcome', 'daily-check-in', 'daily-goal', 'book-finished', 'pages-read', 'purchase'
             )),
  -- What it was for: a book id, a day ("2026-09-30") or the things bought.
  ref        TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ember_ledger_reader_idx ON ember_ledger (reader_id, id DESC);

-- One-off rewards can only be recorded once: one welcome, one check-in and one
-- daily goal per day, one "finished" per book. The database refuses a second,
-- so two quick clicks cannot earn twice.
CREATE UNIQUE INDEX IF NOT EXISTS ember_ledger_once_idx ON ember_ledger (reader_id, reason, ref)
  WHERE reason IN ('welcome', 'daily-check-in', 'daily-goal', 'book-finished');

-- Pages read per reader per day, for the daily reading goal.
CREATE TABLE IF NOT EXISTS reading_days (
  reader_id INTEGER NOT NULL REFERENCES readers (id) ON DELETE CASCADE,
  day       DATE    NOT NULL,
  pages     INTEGER NOT NULL DEFAULT 0 CHECK (pages >= 0),
  PRIMARY KEY (reader_id, day)
);

-- The API serves reader 1 until accounts exist, so make sure reader 1 exists
-- even on a database that only ever had this file run against it.
INSERT INTO readers (id, display_name) VALUES (1, 'Reader')
  ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('readers', 'id'), (SELECT max(id) FROM readers));

INSERT INTO room_settings (reader_id) VALUES (1)
  ON CONFLICT (reader_id) DO NOTHING;
