//! Local HTTP proxy for IPTV streams. Solves three problems at once:
//!  1. **CORS** — providers don't send Access-Control-Allow-Origin, so
//!     HLS.js's fetch fails from inside WebView2. We add `*` ourselves.
//!  2. **User-Agent** — many providers reject browser UAs. We forward a
//!     VLC-mimicking UA via reqwest.
//!  3. **Mixed content / SSL** — Tauri runs on http(s)://tauri.localhost;
//!     letting Rust make the upstream call sidesteps the WebView's
//!     stricter network policies and lets us optionally trust invalid
//!     certs per playlist.
//!
//! The trick: when the response is an HLS manifest (.m3u8), we rewrite
//! every URL inside it (segment lines AND `URI="..."` attributes on
//! EXT-X-KEY / EXT-X-MEDIA / EXT-X-MAP / etc.) so HLS.js sees absolute
//! proxied URLs — never tries to resolve a relative segment against our
//! own host. Otherwise (segment bodies, key bytes) we passthrough-stream.
//!
//! Architecture: a single axum server bound to 127.0.0.1 on a random port
//! at app startup. Frontend HLS.js installs a loader override that wraps
//! the initial manifest URL into `/stream?url=<encoded>`; from there our
//! manifest rewriter ensures every subsequent fetch already targets us.

use anyhow::Result;
use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use tokio::net::TcpListener;
use url::Url;

#[derive(Clone)]
pub struct ProxyHandle {
    pub port: u16,
}

impl ProxyHandle {
    /// Base URL the frontend uses to wrap upstream stream URLs:
    ///   `http://127.0.0.1:<port>`
    pub fn base(&self) -> String {
        format!("http://127.0.0.1:{}", self.port)
    }
}

#[derive(Clone)]
struct ProxyState {
    proxy_base: String,
}

#[derive(Deserialize)]
struct StreamQuery {
    url: String,
    ua: Option<String>,
    trust: Option<String>,
}

/// Start the proxy on a random localhost port. Returns immediately; the
/// server runs in a background tokio task for the life of the app.
pub async fn start_proxy() -> Result<ProxyHandle> {
    let listener = TcpListener::bind("127.0.0.1:0").await?;
    let port = listener.local_addr()?.port();
    let proxy_base = format!("http://127.0.0.1:{}", port);

    let state = ProxyState { proxy_base };
    let app = Router::new()
        .route("/stream", get(handle_stream))
        .with_state(state);

    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            tracing::error!("stream proxy crashed: {e}");
        }
    });

    tracing::info!(port, "stream proxy listening on 127.0.0.1");
    Ok(ProxyHandle { port })
}

/// `GET /stream?url=<encoded>&ua=<encoded>&trust=1`
async fn handle_stream(
    State(state): State<ProxyState>,
    Query(q): Query<StreamQuery>,
    headers: HeaderMap,
) -> Response {
    let trust_all = q.trust.as_deref() == Some("1");

    tracing::info!(url = %q.url, ua = ?q.ua, trust = trust_all, "proxy fetch");

    let client = match super::http::build_client(q.ua.as_deref(), trust_all) {
        Ok(c) => c,
        Err(e) => {
            tracing::error!(error = %e, "proxy: build_client failed");
            return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
        }
    };

    let mut req = client.get(&q.url);
    if let Some(range) = headers.get(header::RANGE) {
        if let Ok(s) = range.to_str() {
            req = req.header(header::RANGE, s);
        }
    }

    let upstream = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(url = %q.url, error = %e, "proxy upstream fetch failed");
            return (StatusCode::BAD_GATEWAY, format!("upstream: {e}")).into_response();
        }
    };

    let status = upstream.status();
    let upstream_headers = upstream.headers().clone();

    // Detect HLS manifest by content-type or path extension. We need to
    // rewrite it so HLS.js doesn't try to resolve relative URLs against
    // our own host (where they'd 404).
    let content_type = upstream_headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();
    let path_only = q.url.split('?').next().unwrap_or(&q.url);
    let is_manifest = path_only.to_ascii_lowercase().ends_with(".m3u8")
        || content_type.contains("mpegurl")
        || content_type.contains("vnd.apple.mpegurl");

    let mut builder = Response::builder().status(status);
    for (k, v) in upstream_headers.iter() {
        // Strip hop-by-hop / connection-management headers; also drop
        // content-length when we're rewriting, since the new body has
        // a different size.
        match k.as_str() {
            "connection"
            | "transfer-encoding"
            | "keep-alive"
            | "proxy-authenticate"
            | "proxy-authorization"
            | "te"
            | "trailers"
            | "upgrade" => continue,
            "content-length" if is_manifest => continue,
            _ => {}
        }
        builder = builder.header(k, v);
    }

    builder = builder.header("Access-Control-Allow-Origin", "*");
    builder = builder.header("Access-Control-Allow-Headers", "*");
    builder = builder.header("Access-Control-Allow-Methods", "GET, OPTIONS");

    if is_manifest {
        let bytes = match upstream.bytes().await {
            Ok(b) => b,
            Err(e) => {
                return (StatusCode::BAD_GATEWAY, format!("manifest read: {e}")).into_response()
            }
        };
        let text = String::from_utf8_lossy(&bytes);
        let rewritten = rewrite_manifest(
            &text,
            &q.url,
            &state.proxy_base,
            q.ua.as_deref(),
            trust_all,
        );
        builder
            .header(header::CONTENT_TYPE, "application/vnd.apple.mpegurl")
            .body(Body::from(rewritten))
            .unwrap()
    } else {
        builder
            .body(Body::from_stream(upstream.bytes_stream()))
            .unwrap()
    }
}

// ── Manifest rewriting ──────────────────────────────────────────────────────

/// Matches `URI="..."` attributes on lines like `#EXT-X-KEY` /
/// `#EXT-X-MEDIA` / `#EXT-X-MAP`. The regex stays simple — HLS attribute
/// lists never escape `"` inside quoted values.
static URI_ATTR_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"URI="([^"]*)""#).unwrap());

/// Rewrite an HLS manifest so every URL inside it is an absolute proxy
/// URL. HLS.js then never sees a relative path, so it never tries to
/// resolve one against our own host (which would 404).
fn rewrite_manifest(
    content: &str,
    upstream_url: &str,
    proxy_base: &str,
    user_agent: Option<&str>,
    trust_all: bool,
) -> String {
    let base = match Url::parse(upstream_url) {
        Ok(u) => u,
        Err(_) => return content.to_string(),
    };

    let mut out = String::with_capacity(content.len() * 3);
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            out.push_str(line);
        } else if trimmed.starts_with('#') {
            // Directive line. Some carry `URI="..."` attributes (KEY,
            // MEDIA, MAP, I-FRAME-STREAM-INF, ...). Rewrite each.
            if line.contains("URI=\"") {
                let rewritten = URI_ATTR_RE.replace_all(line, |caps: &regex::Captures| {
                    let original = &caps[1];
                    match base.join(original) {
                        Ok(absolute) => {
                            let wrapped =
                                wrap_proxy(absolute.as_str(), proxy_base, user_agent, trust_all);
                            format!("URI=\"{}\"", wrapped)
                        }
                        Err(_) => caps[0].to_string(),
                    }
                });
                out.push_str(&rewritten);
            } else {
                out.push_str(line);
            }
        } else {
            // Plain URL line (segment, sub-playlist, ...).
            match base.join(trimmed) {
                Ok(absolute) => {
                    out.push_str(&wrap_proxy(
                        absolute.as_str(),
                        proxy_base,
                        user_agent,
                        trust_all,
                    ));
                }
                Err(_) => out.push_str(line),
            }
        }
        out.push('\n');
    }
    out
}

fn wrap_proxy(
    upstream: &str,
    proxy_base: &str,
    user_agent: Option<&str>,
    trust_all: bool,
) -> String {
    let mut params = format!("url={}", urlencoding::encode(upstream));
    if let Some(ua) = user_agent {
        params.push_str(&format!("&ua={}", urlencoding::encode(ua)));
    }
    if trust_all {
        params.push_str("&trust=1");
    }
    format!("{}/stream?{}", proxy_base, params)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rewrites_relative_segment_url() {
        let m = "#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:6.0,\nseg1.ts\n#EXTINF:6.0,\nseg2.ts\n";
        let upstream = "https://srv.com/live/123/playlist.m3u8";
        let proxy = "http://127.0.0.1:55555";
        let out = rewrite_manifest(m, upstream, proxy, None, false);
        assert!(out.contains("http://127.0.0.1:55555/stream?url=https%3A%2F%2Fsrv.com%2Flive%2F123%2Fseg1.ts"));
        assert!(out.contains("http://127.0.0.1:55555/stream?url=https%3A%2F%2Fsrv.com%2Flive%2F123%2Fseg2.ts"));
    }

    #[test]
    fn rewrites_uri_attribute_on_ext_x_key() {
        let m = "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key/abc\",IV=0x0\n#EXTINF:6.0,\nseg1.ts\n";
        let upstream = "https://srv.com/live/123/playlist.m3u8";
        let proxy = "http://127.0.0.1:55555";
        let out = rewrite_manifest(m, upstream, proxy, None, false);
        assert!(out.contains("URI=\"http://127.0.0.1:55555/stream?url=https%3A%2F%2Fsrv.com%2Flive%2F123%2Fkey%2Fabc\""));
    }

    #[test]
    fn preserves_absolute_segment_url() {
        let m = "#EXTM3U\n#EXTINF:6.0,\nhttps://cdn.com/seg1.ts\n";
        let upstream = "https://srv.com/live/123/playlist.m3u8";
        let proxy = "http://127.0.0.1:55555";
        let out = rewrite_manifest(m, upstream, proxy, None, false);
        assert!(out.contains("http://127.0.0.1:55555/stream?url=https%3A%2F%2Fcdn.com%2Fseg1.ts"));
    }

    #[test]
    fn forwards_user_agent() {
        let m = "#EXTM3U\n#EXTINF:6.0,\nseg1.ts\n";
        let upstream = "https://srv.com/p.m3u8";
        let proxy = "http://127.0.0.1:55555";
        let out = rewrite_manifest(m, upstream, proxy, Some("MyAgent/1.0"), false);
        assert!(out.contains("&ua=MyAgent%2F1.0"));
    }
}
