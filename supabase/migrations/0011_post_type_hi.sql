-- 0011: a fourth community room, "Say Hi", for introductions.
-- Adding an enum value cannot be undone, and the new value cannot be used in
-- the same transaction that adds it, so this file is a single statement.
alter type public.post_type_t add value if not exists 'hi' before 'question';
