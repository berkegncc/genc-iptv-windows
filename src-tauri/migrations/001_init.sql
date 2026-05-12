-- Genç IPTV — initial schema. Mirrors Android Room v3 1:1 so existing
-- behaviour patterns (sort orders, dedup keys, FK cascade) carry over.
-- Field naming follows snake_case convention (Rust/SQL).

-- ── Playlists ────────────────────────────────────────────────────────────────
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('M3U','XTREAM')),
    url TEXT NOT NULL,
    username TEXT,
    password TEXT,
    epg_url TEXT,
    user_agent TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    last_synced_at INTEGER NOT NULL DEFAULT 0,
    channel_count INTEGER NOT NULL DEFAULT 0,
    -- Embedded XtreamUserInfo (all nullable)
    xtream_username TEXT,
    xtream_status TEXT,
    xtream_exp_date_millis INTEGER,
    xtream_is_trial INTEGER,
    xtream_max_connections INTEGER
);

-- ── Channels (live TV) ───────────────────────────────────────────────────────
-- ID format:
--   M3U:    "{playlistId}:{idx}-{tvgId or hashCode}"
--   Xtream: "{playlistId}:{streamId}"
CREATE TABLE channels (
    id TEXT PRIMARY KEY,
    playlist_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    stream_url TEXT NOT NULL,
    group_title TEXT,
    epg_channel_id TEXT,
    is_hd INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    -- Provider-defined category order. Lower first; unknown = 2147483647 (Int.MAX_VALUE).
    group_sort_order INTEGER NOT NULL DEFAULT 2147483647,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE INDEX idx_channels_playlist ON channels(playlist_id);
CREATE INDEX idx_channels_epg ON channels(epg_channel_id);
CREATE INDEX idx_channels_group ON channels(group_title);

-- ── Programs (EPG) ───────────────────────────────────────────────────────────
CREATE TABLE programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_epg_id TEXT NOT NULL,
    playlist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_millis INTEGER NOT NULL,
    stop_millis INTEGER NOT NULL,
    category TEXT,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE INDEX idx_programs_playlist ON programs(playlist_id);
CREATE INDEX idx_programs_epg ON programs(channel_epg_id);
CREATE INDEX idx_programs_start ON programs(start_millis);
CREATE INDEX idx_programs_stop ON programs(stop_millis);
CREATE INDEX idx_programs_lookup ON programs(playlist_id, channel_epg_id, start_millis);

-- ── VOD items (movies; series live in `series` table) ────────────────────────
-- ID format: "{playlistId}:movie:{streamId}"
CREATE TABLE vod_items (
    id TEXT PRIMARY KEY,
    playlist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    stream_url TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('MOVIE','SERIES')),
    year INTEGER,
    rating REAL,
    plot TEXT,
    -- JSON arrays via serde (genres, cast)
    genres_json TEXT NOT NULL DEFAULT '[]',
    cast_json TEXT NOT NULL DEFAULT '[]',
    director TEXT,
    duration_secs INTEGER,
    category_id TEXT,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE INDEX idx_vod_playlist ON vod_items(playlist_id);
CREATE INDEX idx_vod_category ON vod_items(category_id);
CREATE INDEX idx_vod_kind ON vod_items(kind);

-- ── Series ───────────────────────────────────────────────────────────────────
-- ID format: "{playlistId}:series:{seriesId}"
CREATE TABLE series (
    id TEXT PRIMARY KEY,
    playlist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    plot TEXT,
    year INTEGER,
    rating REAL,
    genres_json TEXT NOT NULL DEFAULT '[]',
    cast_json TEXT NOT NULL DEFAULT '[]',
    category_id TEXT,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE INDEX idx_series_playlist ON series(playlist_id);
CREATE INDEX idx_series_category ON series(category_id);

-- ── Episodes ─────────────────────────────────────────────────────────────────
CREATE TABLE episodes (
    id TEXT PRIMARY KEY,
    series_id TEXT NOT NULL,
    playlist_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    episode INTEGER NOT NULL,
    title TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    duration_secs INTEGER,
    plot TEXT,
    thumbnail_url TEXT,
    FOREIGN KEY(series_id) REFERENCES series(id) ON DELETE CASCADE
);
CREATE INDEX idx_episodes_series ON episodes(series_id, season, episode);
CREATE INDEX idx_episodes_playlist ON episodes(playlist_id);

-- ── VOD categories ───────────────────────────────────────────────────────────
-- ID format: "{playlistId}:{kind}:{xtreamCategoryId}"
CREATE TABLE vod_categories (
    id TEXT PRIMARY KEY,
    playlist_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('MOVIE','SERIES')),
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE INDEX idx_vod_categories_playlist ON vod_categories(playlist_id);
CREATE INDEX idx_vod_categories_kind ON vod_categories(kind);

-- ── Favorites (composite PK) ─────────────────────────────────────────────────
CREATE TABLE favorites (
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('CHANNEL','MOVIE','SERIES')),
    added_at INTEGER NOT NULL,
    PRIMARY KEY(target_id, target_type)
);

-- ── Continue watching ────────────────────────────────────────────────────────
-- For SERIES rows: target_id = seriesId, resume_episode_id = currentEpisodeId.
-- For MOVIE rows:  target_id = movieId,   resume_episode_id = NULL.
-- Composite PK collapses all episodes of one series into a single row.
CREATE TABLE continue_watching (
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    position_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    thumbnail_url TEXT,
    resume_episode_id TEXT,
    PRIMARY KEY(target_id, target_type)
);
CREATE INDEX idx_cw_recent ON continue_watching(updated_at DESC);
