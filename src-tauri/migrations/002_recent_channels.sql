-- Recently-played channels feed the Home page's "Son izlenen kanallar" rail.
-- Single row per channel id with the most recent play time; we trim to N
-- entries on every insert (see `add_recent_channel` command).
CREATE TABLE recent_channels (
    channel_id TEXT NOT NULL PRIMARY KEY,
    played_at INTEGER NOT NULL
);
CREATE INDEX idx_recent_channels_played_at ON recent_channels(played_at DESC);
