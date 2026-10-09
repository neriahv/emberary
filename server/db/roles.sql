REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO emberary_app;

-- Books found on Google join the catalogue when a reader adds one, so the app
-- may add books, but never change or delete them.
GRANT SELECT, INSERT ON books TO emberary_app;

-- Signing up adds a reader; nobody is ever deleted.
GRANT SELECT, INSERT, UPDATE ON readers TO emberary_app;

-- Signing in starts a session and signing out ends it.
GRANT SELECT, INSERT, DELETE ON sessions TO emberary_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON user_books TO emberary_app;

GRANT SELECT, INSERT, UPDATE
ON room_settings, room_items, reading_days TO emberary_app;
-- A reader moves and takes away room blocks, so the app may delete them.
GRANT SELECT, INSERT, UPDATE, DELETE
ON room_blocks TO emberary_app;

GRANT SELECT, INSERT
ON room_unlocks, ember_ledger TO emberary_app;

GRANT USAGE
ON SEQUENCE readers_id_seq, room_items_id_seq, room_blocks_id_seq, ember_ledger_id_seq
TO emberary_app;