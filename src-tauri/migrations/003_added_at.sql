-- "Son Eklenen Filmler/Diziler" rails on Home page need an upstream
-- timestamp to sort by. Xtream surfaces it as `added` (VOD streams) and
-- `last_modified` (series); we mirror both into a single `added_at`
-- (epoch ms) column on each table.
--
-- NULL means "we don't know when it was added" — usually a non-Xtream
-- (M3U) playlist or an older provider that omits the field. The Home
-- query falls back to id-based ordering for those.
ALTER TABLE vod_items ADD COLUMN added_at INTEGER;
ALTER TABLE series    ADD COLUMN added_at INTEGER;

CREATE INDEX idx_vod_added_at    ON vod_items(playlist_id, kind, added_at DESC);
CREATE INDEX idx_series_added_at ON series(playlist_id, added_at DESC);
