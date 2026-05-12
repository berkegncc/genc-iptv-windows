//! M3U / M3U8 playlist parser. Direct port of Android `M3uParser.kt` —
//! tolerant of mixed quoting, supports `#EXTVLCOPT` per-entry overrides
//! (User-Agent, Referer), and yields entries lazily via an iterator so we
//! don't hold a 10k-channel playlist in memory.

use anyhow::{Context, Result};

/// `tvg_name`, `duration`, `user_agent`, `referer` are extracted from M3U
/// but not yet consumed by the sync layer (the per-channel UA / Referer
/// override would feed into a future per-channel HTTP override path).
/// Allow dead_code so the shape stays self-documenting.
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct M3uEntry {
    pub display_name: String,
    pub url: String,
    pub tvg_id: Option<String>,
    pub tvg_name: Option<String>,
    pub tvg_logo: Option<String>,
    pub group_title: Option<String>,
    pub duration: i32,
    /// Per-entry override from `#EXTVLCOPT:http-user-agent=...`
    pub user_agent: Option<String>,
    /// Per-entry override from `#EXTVLCOPT:http-referrer=...` (or `referer`)
    pub referer: Option<String>,
}

/// Parse M3U text into a Vec of entries. Header (`#EXTM3U`), comments and
/// blank lines are skipped. `#EXTVLCOPT` lines apply to the NEXT entry only.
pub fn parse(text: &str) -> Vec<M3uEntry> {
    let mut entries = Vec::new();
    let mut pending_extinf: Option<ExtInfLine> = None;
    let mut pending_user_agent: Option<String> = None;
    let mut pending_referer: Option<String> = None;

    for raw in text.lines() {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }

        let lower = line.to_ascii_lowercase();
        if lower.starts_with("#extm3u") {
            // header — ignore
        } else if lower.starts_with("#extinf:") {
            pending_extinf = parse_extinf(line);
        } else if lower.starts_with("#extvlcopt:") {
            let body = line.splitn(2, ':').nth(1).unwrap_or("").trim();
            let body_lower = body.to_ascii_lowercase();
            if body_lower.starts_with("http-user-agent=") {
                pending_user_agent =
                    Some(body.splitn(2, '=').nth(1).unwrap_or("").trim().to_string());
            } else if body_lower.starts_with("http-referrer=")
                || body_lower.starts_with("http-referer=")
            {
                pending_referer = Some(body.splitn(2, '=').nth(1).unwrap_or("").trim().to_string());
            }
        } else if line.starts_with('#') {
            // unknown directive — ignore
        } else {
            // URL line — finalise the pending entry
            if let Some(ext) = pending_extinf.take() {
                let attrs = ext.attrs;
                entries.push(M3uEntry {
                    display_name: ext.display_name,
                    url: line.to_string(),
                    tvg_id: attrs.get("tvg-id").cloned().filter(|s| !s.is_empty()),
                    tvg_name: attrs.get("tvg-name").cloned().filter(|s| !s.is_empty()),
                    tvg_logo: attrs.get("tvg-logo").cloned().filter(|s| !s.is_empty()),
                    group_title: attrs.get("group-title").cloned().filter(|s| !s.is_empty()),
                    duration: ext.duration,
                    user_agent: pending_user_agent.take(),
                    referer: pending_referer.take(),
                });
            }
            pending_user_agent = None;
            pending_referer = None;
        }
    }

    entries
}

#[derive(Debug)]
struct ExtInfLine {
    duration: i32,
    attrs: std::collections::HashMap<String, String>,
    display_name: String,
}

/// Parse one `#EXTINF:...` line.
///
/// Format: `#EXTINF:<duration>[ key="value"]*,<display name>`
///
/// Display name is everything after the LAST top-level comma (one not inside
/// quotes). Attributes are key=value pairs with optionally-quoted values.
fn parse_extinf(line: &str) -> Option<ExtInfLine> {
    let body = line.splitn(2, ':').nth(1)?;

    let header_end = find_top_level_comma(body);
    let (header, display_name) = match header_end {
        Some(i) => (&body[..i], body[i + 1..].trim().to_string()),
        None => (body, String::new()),
    };

    // First token is duration ("-1" or seconds).
    let duration_token: String = header
        .chars()
        .take_while(|c| !c.is_whitespace())
        .collect();
    let duration = duration_token.parse::<i32>().unwrap_or(-1);

    // Remainder is the attribute region.
    let attr_region = header
        .find(|c: char| c.is_whitespace())
        .map(|i| &header[i + 1..])
        .unwrap_or("");
    let attrs = parse_attributes(attr_region);

    Some(ExtInfLine {
        duration,
        attrs,
        display_name,
    })
}

/// Index of the first comma that's not inside double quotes.
fn find_top_level_comma(s: &str) -> Option<usize> {
    let mut in_quotes = false;
    for (i, c) in s.char_indices() {
        if c == '"' {
            in_quotes = !in_quotes;
        } else if c == ',' && !in_quotes {
            return Some(i);
        }
    }
    None
}

/// Parse space-separated `key="value"` or `key=value` pairs.
fn parse_attributes(region: &str) -> std::collections::HashMap<String, String> {
    let mut result = std::collections::HashMap::new();
    if region.trim().is_empty() {
        return result;
    }

    let bytes = region.as_bytes();
    let n = bytes.len();
    let mut i = 0;

    while i < n {
        // Skip whitespace
        while i < n && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= n {
            break;
        }

        // Read key until '=' or whitespace
        let key_start = i;
        while i < n && bytes[i] != b'=' && !bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= n || bytes[i] != b'=' {
            break;
        }
        let key = String::from_utf8_lossy(&bytes[key_start..i])
            .to_ascii_lowercase();
        i += 1; // skip '='

        // Read value: quoted or bare
        let value = if i < n && bytes[i] == b'"' {
            i += 1; // skip opening "
            let v_start = i;
            while i < n && bytes[i] != b'"' {
                i += 1;
            }
            let v = String::from_utf8_lossy(&bytes[v_start..i]).to_string();
            if i < n {
                i += 1; // skip closing "
            }
            v
        } else {
            let v_start = i;
            while i < n && !bytes[i].is_ascii_whitespace() {
                i += 1;
            }
            String::from_utf8_lossy(&bytes[v_start..i]).to_string()
        };
        result.insert(key, value);
    }

    result
}

// ─── Remote loader ───────────────────────────────────────────────────────────

/// Download an M3U from `url` (with optional User-Agent override) and parse it.
///
/// Special-cases `file://` URLs so drag-drop / file association can hand a
/// local path to the same `add_m3u_playlist` command without needing a
/// separate code path. Both Windows-style (`file:///C:/path/file.m3u`) and
/// raw absolute paths are accepted.
pub async fn fetch_and_parse(url: &str, user_agent: Option<&str>) -> Result<Vec<M3uEntry>> {
    if let Some(text) = try_load_local(url)? {
        return Ok(parse(&text));
    }

    let client = if let Some(ua) = user_agent {
        super::http::build_client(Some(ua), false)?
    } else {
        super::http::shared().clone()
    };

    let response = client
        .get(url)
        .send()
        .await
        .with_context(|| format!("fetch m3u: {url}"))?;

    if !response.status().is_success() {
        anyhow::bail!("M3U HTTP {}", response.status());
    }
    let body = response.text().await.context("read m3u body")?;
    Ok(parse(&body))
}

/// If `url` looks like a local path (either `file://` URI or a Windows /
/// POSIX absolute path), read it from disk and return the contents. Falls
/// through (returns `Ok(None)`) when the URL is something the HTTP loader
/// should handle.
fn try_load_local(url: &str) -> Result<Option<String>> {
    let path: Option<std::path::PathBuf> = if let Some(rest) = url.strip_prefix("file://") {
        // file:///C:/foo  →  C:/foo  (Windows)
        // file:///home/x  →  /home/x (POSIX)
        let cleaned = rest.trim_start_matches('/');
        // On POSIX we want the leading slash back; rebuild from the original
        // so we don't accidentally drop the root.
        let p = if cfg!(windows) {
            std::path::PathBuf::from(
                urlencoding::decode(cleaned).map(|s| s.into_owned()).unwrap_or_else(|_| cleaned.to_string()),
            )
        } else {
            let with_slash = format!("/{}", cleaned);
            std::path::PathBuf::from(
                urlencoding::decode(&with_slash).map(|s| s.into_owned()).unwrap_or(with_slash),
            )
        };
        Some(p)
    } else if is_local_path(url) {
        Some(std::path::PathBuf::from(url))
    } else {
        None
    };

    let Some(path) = path else { return Ok(None); };
    let body = std::fs::read_to_string(&path)
        .with_context(|| format!("read m3u file: {}", path.display()))?;
    Ok(Some(body))
}

fn is_local_path(s: &str) -> bool {
    if s.starts_with("http://") || s.starts_with("https://") {
        return false;
    }
    // Windows drive letter (C:\, C:/), or POSIX absolute (/foo)
    let bytes = s.as_bytes();
    if bytes.len() >= 3 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':'
        && (bytes[2] == b'\\' || bytes[2] == b'/')
    {
        return true;
    }
    if s.starts_with('/') {
        return true;
    }
    false
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_basic_entry() {
        let m3u = r#"#EXTM3U
#EXTINF:-1 tvg-id="trt1.tr" tvg-name="TRT 1" tvg-logo="https://logos/trt1.png" group-title="Ulusal",TRT 1 HD
http://stream.url/trt1
"#;
        let entries = parse(m3u);
        assert_eq!(entries.len(), 1);
        let e = &entries[0];
        assert_eq!(e.display_name, "TRT 1 HD");
        assert_eq!(e.url, "http://stream.url/trt1");
        assert_eq!(e.tvg_id.as_deref(), Some("trt1.tr"));
        assert_eq!(e.tvg_logo.as_deref(), Some("https://logos/trt1.png"));
        assert_eq!(e.group_title.as_deref(), Some("Ulusal"));
    }

    #[test]
    fn handles_extvlcopt_overrides() {
        let m3u = r#"#EXTM3U
#EXTINF:-1,Custom UA Channel
#EXTVLCOPT:http-user-agent=MyAgent/1.0
#EXTVLCOPT:http-referrer=https://referer.example
http://stream.url/ch
"#;
        let entries = parse(m3u);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].user_agent.as_deref(), Some("MyAgent/1.0"));
        assert_eq!(entries[0].referer.as_deref(), Some("https://referer.example"));
    }

    #[test]
    fn handles_quoted_comma_in_attrs() {
        // tvg-name with a comma inside quotes shouldn't split the displayName off early
        let m3u = "#EXTM3U\n#EXTINF:-1 tvg-name=\"Sports, Live\",Channel\nhttp://x\n";
        let entries = parse(m3u);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].display_name, "Channel");
        assert_eq!(entries[0].tvg_name.as_deref(), Some("Sports, Live"));
    }

    #[test]
    fn skips_blank_and_unknown_directives() {
        let m3u = "#EXTM3U\n\n#FOO\n#EXTINF:-1,A\nhttp://a\n\n#EXTINF:-1,B\nhttp://b\n";
        let entries = parse(m3u);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].display_name, "A");
        assert_eq!(entries[1].display_name, "B");
    }
}
