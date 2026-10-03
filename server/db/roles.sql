REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO emberary_app;

GRANT SELECT ON books TO emberary_app;

GRANT SELECT, UPDATE ON readers TO emberary_app;

GRANT SELECT, INSERT, UPDATE, DELETE
ON user_books TO emberary_app;

GRANT SELECT, INSERT, UPDATE
ON room_settings, room_items, reading_days TO emberary_app;

GRANT SELECT, INSERT
ON room_unlocks, ember_ledger TO emberary_app;

GRANT USAGE
ON SEQUENCE room_items_id_seq, ember_ledger_id_seq
TO emberary_app;