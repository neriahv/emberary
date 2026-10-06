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

-- Where the reader put a book in the Library Room: which bookcase ('main', or
-- the id of a bookcase they bought), which shelf (0 is the top), and how far
-- along it (metres from the shelf's centre). All three, or none: NULL means
-- the room places the book itself, in the next free space.
ALTER TABLE user_books
  ADD COLUMN IF NOT EXISTS shelf_case TEXT     CHECK (shelf_case ~ '^(main|[0-9]{1,9})$'),
  ADD COLUMN IF NOT EXISTS shelf_row  SMALLINT CHECK (shelf_row BETWEEN 0 AND 9),
  ADD COLUMN IF NOT EXISTS shelf_x    REAL     CHECK (shelf_x BETWEEN -1.5::real AND 1.5::real);
DO $$ BEGIN
  ALTER TABLE user_books ADD CONSTRAINT user_books_shelf_spot_whole
    CHECK ((shelf_case IS NULL) = (shelf_row IS NULL) AND (shelf_row IS NULL) = (shelf_x IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- Furniture and decor in the Library Room. The room is a diorama whose back
-- corner is at x = -2.5, z = -2.5: x runs from the window wall towards the
-- open side, z from the bookcase wall towards the viewer. It starts one 5 m
-- floor block square and is built out a block at a time, up to two blocks
-- from the first in any direction. The limits keep items inside the biggest
-- room; the API keeps them on the reader's own floor. rotation is in whole degrees around the vertical axis.
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
-- positions from it are pulled inside the walls first.
ALTER TABLE room_items
  DROP CONSTRAINT IF EXISTS room_items_kind_check,
  DROP CONSTRAINT IF EXISTS room_items_x_check,
  DROP CONSTRAINT IF EXISTS room_items_z_check;

UPDATE room_items SET
  x = LEAST(GREATEST(x, -12.2), 12.2),
  z = LEAST(GREATEST(z, -12.2), 12.2);

-- The kinds are the "item" entries of server/catalog.js.
ALTER TABLE room_items
  ADD CONSTRAINT room_items_kind_check CHECK (kind IN (
    'window-round', 'window-paned', 'window-octagon', 'window-cathedral', 'window-arcade',
    'bookcase-small', 'bookcase-tall', 'bookcase-wall', 'bookcase-crate', 'bookcase-pastel',
    'bookcase-birch', 'bookcase-arched', 'side-table', 'coffee-table', 'desk',
    'dresser', 'reading-table', 'tea-table', 'pastel-desk', 'stump-table',
    'moon-table', 'stool', 'chair', 'cushion', 'armchair',
    'rocking-chair', 'wingback', 'sofa', 'plaid-armchair', 'pink-chair',
    'pouf', 'stump-stool', 'velvet-sofa', 'lantern', 'lamp',
    'candelabra', 'sconce', 'chandelier', 'fireplace', 'pumpkin-lantern',
    'wood-stove', 'fairy-lights', 'paper-lantern', 'mushroom-lamp', 'firefly-jar',
    'orb-lamp', 'crystal-cluster', 'rug', 'round-rug', 'runner-rug',
    'leaf-rug', 'cloud-rug', 'moss-rug', 'moon-rug', 'plant',
    'monstera', 'indoor-tree', 'pebble-planter', 'hanging-plant', 'maple-tree',
    'tulip-vase', 'vase', 'globe', 'clock', 'book-stack',
    'cat-bed', 'library-ladder', 'picture-frames', 'pumpkins', 'apple-crate',
    'wall-shelf', 'birdcage', 'telescope', 'floating-books', 'stairs-straight',
    'stairs-spiral'
  )),
  -- Compared as REAL, like the columns. 2.2 stored as a REAL is 2.2000000477,
  -- which is not BETWEEN -2.2 AND 2.2 in exact numeric terms, so an item
  -- pushed right up to a wall would be refused.
  ADD CONSTRAINT room_items_x_check CHECK (x BETWEEN -12.2::real AND 12.2::real),
  ADD CONSTRAINT room_items_z_check CHECK (z BETWEEN -12.2::real AND 12.2::real);

-- Taking furniture out of the room puts it in storage (placed = false), from
-- where it can be placed again for free.
ALTER TABLE room_items ADD COLUMN IF NOT EXISTS placed BOOLEAN NOT NULL DEFAULT true;

-- level 1 stands on the loft rather than the floor. lit is a light's switch;
-- it means nothing on furniture that gives no light. y and size are a
-- window's height on its wall (its middle, in metres) and its scale. sold is
-- furniture sold back: the row stays, so the app never deletes furniture.
ALTER TABLE room_items
  ADD COLUMN IF NOT EXISTS level SMALLINT NOT NULL DEFAULT 0 CHECK (level IN (0, 1)),
  ADD COLUMN IF NOT EXISTS lit   BOOLEAN  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS y     REAL     NOT NULL DEFAULT 0 CHECK (y BETWEEN 0::real AND 9::real),
  ADD COLUMN IF NOT EXISTS size  REAL     NOT NULL DEFAULT 1 CHECK (size BETWEEN 0.5::real AND 2::real),
  ADD COLUMN IF NOT EXISTS sold  BOOLEAN  NOT NULL DEFAULT false;

-- The finishes on the room: what covers the walls and floor, the shape of the
-- walls' tops, the roof and the loft. The first of each is free; the others
-- have to be bought first (room_unlocks). The ids are the entries of
-- server/catalog.js.
--
-- And where the room's built-in pieces stand, as { main: { x, z, rotation },
-- decor: ... }; a piece not in it stands where it always has (FIXTURES in
-- server/catalog.js).
ALTER TABLE room_settings DROP COLUMN IF EXISTS spare_floor, DROP COLUMN IF EXISTS spare_wall;
ALTER TABLE room_settings
  ADD COLUMN IF NOT EXISTS wallpaper   TEXT     NOT NULL DEFAULT 'wallpaper-plain',
  ADD COLUMN IF NOT EXISTS floor       TEXT     NOT NULL DEFAULT 'floor-planks',
  ADD COLUMN IF NOT EXISTS wall_shape  TEXT     NOT NULL DEFAULT 'shape-straight',
  ADD COLUMN IF NOT EXISTS roof        TEXT     NOT NULL DEFAULT 'roof-open',
  ADD COLUMN IF NOT EXISTS loft        TEXT     NOT NULL DEFAULT 'loft-none',
  ADD COLUMN IF NOT EXISTS fixtures    JSONB    NOT NULL DEFAULT '{}'::jsonb;

-- The room is built of blocks, each put where the reader chose, and moved or
-- taken away as they like. A floor block
-- is the 5 m square (i, j) of a grid around the first one; a wall block is a
-- 3 m high, 5 m long panel on an edge of that grid ("x": the low-z edge of
-- square (i, j), "z": its low-x edge), stacked from level 0 up. A room with
-- no rows here gets the starting three (server/repos/room.js). The rules
-- about where a block may go are in server/catalog.js.
CREATE TABLE IF NOT EXISTS room_blocks (
  id        SERIAL   PRIMARY KEY,
  reader_id INTEGER  NOT NULL REFERENCES readers (id) ON DELETE CASCADE,
  kind      TEXT     NOT NULL CHECK (kind IN ('floor', 'wall')),
  side      TEXT     NOT NULL DEFAULT '' CHECK (side IN ('', 'x', 'z')),
  i         SMALLINT NOT NULL CHECK (i BETWEEN -3 AND 3),
  j         SMALLINT NOT NULL CHECK (j BETWEEN -3 AND 3),
  level     SMALLINT NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 2),
  CHECK ((kind = 'floor') = (side = '')),
  CHECK (kind = 'wall' OR level = 0),
  UNIQUE (reader_id, kind, side, i, j, level)
);

-- Named, so this file can add new finishes to a database that already exists.
ALTER TABLE room_settings
  DROP CONSTRAINT IF EXISTS room_settings_wallpaper_check,
  DROP CONSTRAINT IF EXISTS room_settings_floor_check,
  DROP CONSTRAINT IF EXISTS room_settings_wall_shape_check,
  DROP CONSTRAINT IF EXISTS room_settings_roof_check,
  DROP CONSTRAINT IF EXISTS room_settings_loft_check;

ALTER TABLE room_settings
  ADD CONSTRAINT room_settings_wallpaper_check CHECK (wallpaper IN (
    'wallpaper-plain', 'wallpaper-stripes', 'wallpaper-trellis', 'wallpaper-sprig', 'wallpaper-panels',
    'wallpaper-brick', 'wallpaper-leaves', 'wallpaper-floral', 'wallpaper-stars')),
  ADD CONSTRAINT room_settings_floor_check CHECK (floor IN (
    'floor-planks', 'floor-checker', 'floor-herringbone', 'floor-stone', 'floor-terracotta',
    'floor-moss', 'floor-marble')),
  ADD CONSTRAINT room_settings_wall_shape_check CHECK (wall_shape IN (
    'shape-straight', 'shape-gable', 'shape-arch', 'shape-castle', 'shape-wave')),
  ADD CONSTRAINT room_settings_roof_check CHECK (roof IN (
    'roof-open', 'roof-beams', 'roof-ivy', 'roof-slate', 'roof-glass')),
  ADD CONSTRAINT room_settings_loft_check CHECK (loft IN ('loft-none', 'loft-gallery'));

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
  reason     TEXT        NOT NULL,
  -- What it was for: a book id, a day ("2026-09-30"), the things bought or
  -- the thing sold.
  ref        TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Named, so a new reason can be added to a database that already exists.
-- "sale" is furniture sold back for half its price.
ALTER TABLE ember_ledger DROP CONSTRAINT IF EXISTS ember_ledger_reason_check;
ALTER TABLE ember_ledger ADD CONSTRAINT ember_ledger_reason_check CHECK (reason IN (
  'welcome', 'daily-check-in', 'daily-goal', 'book-finished', 'pages-read', 'purchase', 'sale'
));

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
