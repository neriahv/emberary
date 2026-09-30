-- Sample data for development: the same books, shelves, profile and room as
-- demo mode. GENERATED from client/src/api/seed.json by db/build-seed.js, so
-- change that file and run "npm run db:seed:build" rather than editing this.
--
-- This starts with TRUNCATE. That is correct on your laptop and catastrophic
-- against the database your live demo depends on. Check which DATABASE_URL is
-- loaded before you run it.

TRUNCATE TABLE ember_ledger, reading_days, room_unlocks, room_items, user_books, room_settings,
  books, readers RESTART IDENTITY CASCADE;

INSERT INTO readers (id, display_name, bio, yearly_goal, joined_at) VALUES
  (1, 'Ember Reader',
   'Reads classics in the evening and sci-fi on the weekend. Always one book behind on the reading goal.',
   24, '2026-06-01T00:00:00.000Z');

INSERT INTO books (id, title, author, genre, pages, year, color, description, cover_url) VALUES
  ('b01', 'Pride and Prejudice', 'Jane Austen', 'Romance', 432, 1813, '#5b7070',
   'Elizabeth Bennet spars with the proud Mr. Darcy while her family''s future hangs on who marries whom. Sharp, funny, and still the template for a slow-burn love story.',
   'https://books.google.com/books/content?id=wE5lsa-8nogC&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b02', 'Dracula', 'Bram Stoker', 'Horror', 418, 1897, '#8c6738',
   'A solicitor''s trip to Transylvania unleashes an ancient count on London. Told entirely through letters, diaries and clippings, which is what makes it so unsettling.',
   'https://books.google.com/books/content?id=3pwaBQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b03', 'The Hobbit', 'J.R.R. Tolkien', 'Fantasy', 310, 1937, '#88673f',
   'Bilbo Baggins would rather stay home, but a wizard and thirteen dwarves have other plans. A quest, a dragon, and one very good riddle contest.',
   'https://books.google.com/books/content?id=OlCHcjX0RT4C&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b04', 'Frankenstein', 'Mary Shelley', 'Horror', 280, 1818, '#674f44',
   'A young scientist builds a living creature and then refuses to take responsibility for it. A book about ambition, loneliness and what we owe the things we make.',
   'https://books.google.com/books/content?id=YRq8DwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b05', '1984', 'George Orwell', 'Science Fiction', 328, 1949, '#cf4e3b',
   'Winston Smith works at rewriting history for a government that watches everything. A bleak, precise warning about surveillance and the control of language.',
   'https://books.google.com/books/content?id=Dgv0DwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b06', 'Jane Eyre', 'Charlotte Brontë', 'Romance', 500, 1847, '#5b6b7b',
   'An orphan becomes a governess at Thornfield Hall and finds a secret in the attic. Gothic atmosphere, a stubborn heroine, and a very unusual proposal.',
   'https://books.google.com/books/content?id=K9HOEAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b07', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Classic', 180, 1925, '#633c2e',
   'Nick Carraway watches his mysterious neighbour throw lavish parties in the hope of winning back one woman. A short, glittering book about wanting the past back.',
   'https://books.google.com/books/content?id=CBlMMQAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b08', 'Dune', 'Frank Herbert', 'Science Fiction', 612, 1965, '#996241',
   'Paul Atreides inherits a desert planet that is the only source of the most valuable substance in the universe. Politics, ecology and prophecy on a huge scale.',
   'https://books.google.com/books/content?id=deRpPwAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b09', 'Little Women', 'Louisa May Alcott', 'Classic', 449, 1868, '#7b685b',
   'Four sisters grow up in New England during the Civil War. Jo March wants to be a writer, and the book knows exactly how much that costs her.',
   'https://books.google.com/books/content?id=v0iuYlsc8EIC&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b10', 'The Picture of Dorian Gray', 'Oscar Wilde', 'Horror', 254, 1890, '#6b4043',
   'A beautiful young man stays unchanged while his portrait absorbs every consequence of his choices. Witty on the surface, genuinely dark underneath.',
   'https://books.google.com/books/content?id=zNz6AgAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b11', 'The Time Machine', 'H.G. Wells', 'Science Fiction', 118, 1895, '#357794',
   'An inventor travels to the year 802,701 and finds humanity split into two very different species. A quick read with a long shadow.',
   'https://books.google.com/books/content?id=51aMCgAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b12', 'Emma', 'Jane Austen', 'Romance', 474, 1815, '#796957',
   'Emma Woodhouse is sure she is an excellent matchmaker, and is wrong about almost everyone, including herself. Austen''s most playful heroine.',
   'https://books.google.com/books/content?id=nf_AEQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b13', 'A Study in Scarlet', 'Arthur Conan Doyle', 'Mystery', 160, 1887, '#eb1c25',
   'The first meeting of Sherlock Holmes and Dr. Watson, and the first case they solve together. A body, a single word written in blood, and a long flashback.',
   'https://books.google.com/books/content?id=qeKLCwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b14', 'The Hound of the Baskervilles', 'Arthur Conan Doyle', 'Mystery', 256, 1902, '#9c4558',
   'A family curse, a phantom dog on the moor, and Holmes working out which of those is real. The best atmosphere of any Holmes story.',
   'https://books.google.com/books/content?id=ghTlEAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b15', 'Alice''s Adventures in Wonderland', 'Lewis Carroll', 'Fantasy', 200, 1865, '#9e650c',
   'Alice follows a white rabbit down a hole into a world where the rules of logic have been quietly removed. Funnier and stranger than its reputation.',
   'https://books.google.com/books/content?id=btIQAAAAYAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b16', 'Wuthering Heights', 'Emily Brontë', 'Classic', 416, 1847, '#ab522a',
   'Heathcliff and Catherine''s doomed attachment on the Yorkshire moors, told by two unreliable narrators. Nobody in it is likeable, which is the point.',
   'https://books.google.com/books/content?id=e0p_EAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b17', 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', 'Mystery', 307, 1892, '#8b635d',
   'Twelve short cases, including "A Scandal in Bohemia" and "The Speckled Band". The easiest way into the detective genre, and still one of the best.',
   'https://books.google.com/books/content?id=w7gOrgEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600'),
  ('b18', 'The Lion, the Witch and the Wardrobe', 'C.S. Lewis', 'Fantasy', 208, 1950, '#6f6b5d',
   'Four siblings step through a wardrobe into a land stuck in endless winter. A children''s book that adults keep returning to.',
   'https://books.google.com/books/content?id=L25-QAAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api&fife=w400-h600');

INSERT INTO user_books
  (reader_id, book_id, status, current_page, rating, review,
   shelf_position, added_at, updated_at, finished_at)
VALUES
  (1, 'b08', 'currently-reading', 240, NULL, '',
   NULL, '2026-08-30T09:00:00.000Z', '2026-09-20T21:10:00.000Z', NULL),
  (1, 'b12', 'currently-reading', 95, NULL, '',
   NULL, '2026-09-10T12:00:00.000Z', '2026-09-18T19:30:00.000Z', NULL),
  (1, 'b01', 'read', 432, 5, 'Every re-read finds a new joke. The first proposal scene is perfect.',
   NULL, '2026-06-02T10:00:00.000Z', '2026-06-24T20:00:00.000Z', '2026-06-24T20:00:00.000Z'),
  (1, 'b03', 'read', 310, 4, 'Cosy and adventurous in equal measure. The riddle chapter is the best part.',
   NULL, '2026-07-01T10:00:00.000Z', '2026-07-12T18:00:00.000Z', '2026-07-12T18:00:00.000Z'),
  (1, 'b02', 'read', 418, 4, 'The epistolary format makes the dread build slowly. Renfield steals every scene.',
   NULL, '2026-07-14T10:00:00.000Z', '2026-08-04T22:00:00.000Z', '2026-08-04T22:00:00.000Z'),
  (1, 'b07', 'read', 180, 3, 'Beautifully written, but I never warmed to anyone in it.',
   NULL, '2026-08-05T10:00:00.000Z', '2026-08-09T17:00:00.000Z', '2026-08-09T17:00:00.000Z'),
  (1, 'b05', 'read', 328, 5, '',
   NULL, '2026-08-10T10:00:00.000Z', '2026-08-27T23:00:00.000Z', '2026-08-27T23:00:00.000Z'),
  (1, 'b16', 'did-not-finish', 120, 2, 'Could not get past the second narrator. Might try again in winter.',
   NULL, '2026-07-20T10:00:00.000Z', '2026-07-28T16:00:00.000Z', NULL),
  (1, 'b06', 'want-to-read', 0, NULL, '',
   NULL, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z', NULL),
  (1, 'b13', 'want-to-read', 0, NULL, '',
   NULL, '2026-09-05T10:00:00.000Z', '2026-09-05T10:00:00.000Z', NULL),
  (1, 'b04', 'want-to-read', 0, NULL, '',
   NULL, '2026-09-12T10:00:00.000Z', '2026-09-12T10:00:00.000Z', NULL);

INSERT INTO room_settings (reader_id, wall_color, floor_color, shelf_color, wallpaper, floor) VALUES
  (1, '#e3a86b', '#9a5530', '#5e3219', 'wallpaper-plain', 'floor-planks');

INSERT INTO room_items (id, reader_id, kind, x, z, rotation, placed) VALUES
  (1, 1, 'rug', 0.3, 0.2, 0, true),
  (2, 1, 'desk', -0.9, -0.7, 0, true),
  (3, 1, 'rocking-chair', 1.1, 0.1, 250, true),
  (4, 1, 'side-table', 0.7, 1.5, 0, true),
  (5, 1, 'lantern', -0.4, 1.5, 0, true),
  (6, 1, 'dresser', -2.05, 0.9, 90, true),
  (7, 1, 'globe', -1.75, 1.95, 0, true),
  (8, 1, 'plant', 1.95, 1.9, 0, true);

INSERT INTO ember_ledger (reader_id, amount, reason, ref, created_at) VALUES
  (1, 10, 'welcome', '', '2026-06-01T00:00:00.000Z'),
  (1, 8, 'pages-read', 'b01', '2026-06-24T20:00:00.000Z'),
  (1, 15, 'book-finished', 'b01', '2026-06-24T20:00:00.000Z'),
  (1, 6, 'pages-read', 'b03', '2026-07-12T18:00:00.000Z'),
  (1, 15, 'book-finished', 'b03', '2026-07-12T18:00:00.000Z'),
  (1, 2, 'pages-read', 'b16', '2026-07-28T16:00:00.000Z'),
  (1, 8, 'pages-read', 'b02', '2026-08-04T22:00:00.000Z'),
  (1, 15, 'book-finished', 'b02', '2026-08-04T22:00:00.000Z'),
  (1, 3, 'pages-read', 'b07', '2026-08-09T17:00:00.000Z'),
  (1, 15, 'book-finished', 'b07', '2026-08-09T17:00:00.000Z'),
  (1, 6, 'pages-read', 'b05', '2026-08-27T23:00:00.000Z'),
  (1, 15, 'book-finished', 'b05', '2026-08-27T23:00:00.000Z'),
  (1, 1, 'pages-read', 'b12', '2026-09-18T19:30:00.000Z'),
  (1, 4, 'pages-read', 'b08', '2026-09-20T21:10:00.000Z'),
  (1, -21, 'purchase', 'rug, desk, rocking-chair, side-table, lantern, dresser, globe, plant', '2026-09-20T21:10:00.000Z');

-- The rows above chose their own ids, so move each sequence past them.
SELECT setval(pg_get_serial_sequence('readers', 'id'), (SELECT max(id) FROM readers));
SELECT setval(pg_get_serial_sequence('room_items', 'id'), (SELECT max(id) FROM room_items));
