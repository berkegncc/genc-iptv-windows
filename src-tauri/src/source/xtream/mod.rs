pub mod api;
pub mod dto;
pub mod mapper;

/// Build absolute URLs for Xtream Codes endpoints.
pub mod url {
    /// Player API base: `{server}/player_api.php`
    pub fn player_api(server_base: &str) -> String {
        format!("{}/player_api.php", server_base.trim_end_matches('/'))
    }

    /// Live stream URL. Uses the raw MPEG-TS endpoint (`.ts`) rather than
    /// the HLS playlist (`.m3u8`) because many XUI-One based IPTV panels
    /// (very common in TR/EU IPTV resellers) ship with HLS_DISABLED on
    /// extra/premium tiers — only the direct TS stream works there. mpv
    /// (libavformat) handles raw TS over HTTP transparently.
    pub fn live_stream(server_base: &str, username: &str, password: &str, stream_id: i64) -> String {
        format!(
            "{}/live/{}/{}/{}.ts",
            server_base.trim_end_matches('/'),
            username,
            password,
            stream_id
        )
    }

    /// VOD movie URL with container extension (default mp4).
    pub fn vod_stream(
        server_base: &str,
        username: &str,
        password: &str,
        stream_id: i64,
        ext: &str,
    ) -> String {
        format!(
            "{}/movie/{}/{}/{}.{}",
            server_base.trim_end_matches('/'),
            username,
            password,
            stream_id,
            if ext.is_empty() { "mp4" } else { ext }
        )
    }

    /// Series episode URL with container extension.
    pub fn series_stream(
        server_base: &str,
        username: &str,
        password: &str,
        episode_id: &str,
        ext: &str,
    ) -> String {
        format!(
            "{}/series/{}/{}/{}.{}",
            server_base.trim_end_matches('/'),
            username,
            password,
            episode_id,
            if ext.is_empty() { "mp4" } else { ext }
        )
    }

    /// Full XMLTV EPG endpoint: `{server}/xmltv.php?username=&password=`
    pub fn xmltv(server_base: &str, username: &str, password: &str) -> String {
        format!(
            "{}/xmltv.php?username={}&password={}",
            server_base.trim_end_matches('/'),
            urlencoding::encode(username),
            urlencoding::encode(password)
        )
    }
}
