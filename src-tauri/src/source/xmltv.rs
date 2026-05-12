//! XMLTV parser. Direct port of Android `XmlTvParser.kt` — tolerant of the
//! many flavours providers actually serve (mixed encoding, mismatched tags,
//! gzip on `.xmltv` URLs, etc.).
//!
//! Format reference (`{tv}` is the root element; we ignore it and stream
//! programme children one at a time):
//!
//! ```xml
//! <tv>
//!   <channel id="trt1.tr">
//!     <display-name>TRT 1</display-name>
//!     <icon src="https://..." />
//!   </channel>
//!   <programme start="20260507210000 +0300" stop="20260507220000 +0300" channel="trt1.tr">
//!     <title>Ana Haber</title>
//!     <desc>...</desc>
//!     <category>News</category>
//!   </programme>
//!   ...
//! </tv>
//! ```
//!
//! Implementation notes:
//!  - Streams via `quick_xml::Reader` so a 200 MB country-pack EPG doesn't
//!    blow the heap.
//!  - Time format `YYYYMMDDHHMMSS ±HHMM` → UTC epoch ms via chrono.
//!  - Gzip auto-decode if the response is gzipped — detected by URL suffix,
//!    `Content-Encoding: gzip`, or the gzip magic bytes 0x1F 0x8B at the
//!    start of the stream (some providers serve gzip without setting either
//!    flag correctly).
//!  - Programmes whose `start` we can't parse are skipped with a `warn`
//!    rather than aborting the whole sync.

use anyhow::{Context, Result};
use chrono::{DateTime, FixedOffset, NaiveDateTime, TimeZone, Utc};
use flate2::read::GzDecoder;
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::io::{Cursor, Read};

use crate::data::models::NewProgram;

/// One channel block from the XMLTV header. Currently unused for the Guide
/// query (we join on `channels.epg_channel_id`) but kept so a future PR can
/// surface upstream channel icons + display names without a re-fetch.
#[derive(Debug, Clone, Default)]
pub struct EpgChannel {
    pub id: String,
    pub display_name: Option<String>,
    pub icon_url: Option<String>,
}

#[derive(Debug, Default)]
pub struct ParsedXmltv {
    pub channels: Vec<EpgChannel>,
    pub programmes: Vec<NewProgram>,
}

/// Fetch an XMLTV file (handling gzip + custom UA), parse it, and return
/// the result. `playlist_id` becomes the FK on every programme row.
pub async fn fetch_and_parse(
    url: &str,
    user_agent: Option<&str>,
    playlist_id: i64,
) -> Result<ParsedXmltv> {
    tracing::info!(target: "genc_iptv::epg", %url, "fetching XMLTV");
    let client = super::http::build_client(user_agent, false)
        .context("build epg http client")?;
    let resp = client
        .get(url)
        .send()
        .await
        .with_context(|| format!("fetch xmltv: {url}"))?;
    if !resp.status().is_success() {
        anyhow::bail!("XMLTV: HTTP {} ({url})", resp.status());
    }
    let content_encoding_gzip = resp
        .headers()
        .get(reqwest::header::CONTENT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.eq_ignore_ascii_case("gzip"))
        .unwrap_or(false);

    let raw = resp.bytes().await.context("read xmltv body")?;
    let url_suggests_gzip = url.to_ascii_lowercase().ends_with(".gz");
    let magic_suggests_gzip = raw.len() >= 2 && raw[0] == 0x1F && raw[1] == 0x8B;
    let is_gzip = content_encoding_gzip || url_suggests_gzip || magic_suggests_gzip;

    let xml: Vec<u8> = if is_gzip {
        let mut decoder = GzDecoder::new(Cursor::new(&raw[..]));
        let mut out = Vec::with_capacity(raw.len() * 4);
        decoder
            .read_to_end(&mut out)
            .context("gunzip xmltv body")?;
        tracing::info!(target: "genc_iptv::epg", gzipped = true, raw_bytes = raw.len(), inflated_bytes = out.len(), "XMLTV decoded");
        out
    } else {
        raw.to_vec()
    };

    parse(&xml, playlist_id)
}

/// Parse an XMLTV byte stream into channels + programmes. Pure function —
/// callers handle the network I/O. Useful for tests that feed in a static
/// fixture.
pub fn parse(xml: &[u8], playlist_id: i64) -> Result<ParsedXmltv> {
    let mut reader = Reader::from_reader(xml);
    let cfg = reader.config_mut();
    cfg.trim_text(true);
    cfg.expand_empty_elements = false;

    let mut buf = Vec::with_capacity(1024);
    let mut text_buf = String::new();
    let mut out = ParsedXmltv::default();

    let mut current_channel: Option<EpgChannel> = None;
    let mut current_programme: Option<ProgrammeBuilder> = None;
    let mut text_target = TextTarget::None;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                match e.name().as_ref() {
                    b"channel" => {
                        let mut ch = EpgChannel::default();
                        for attr in e.attributes().flatten() {
                            if attr.key.as_ref() == b"id" {
                                if let Ok(v) = attr.unescape_value() {
                                    ch.id = v.into_owned();
                                }
                            }
                        }
                        current_channel = Some(ch);
                        text_target = TextTarget::None;
                    }
                    b"display-name" => text_target = TextTarget::DisplayName,
                    b"programme" => {
                        let mut start_raw: Option<String> = None;
                        let mut stop_raw: Option<String> = None;
                        let mut channel: Option<String> = None;
                        for attr in e.attributes().flatten() {
                            match attr.key.as_ref() {
                                b"start" => {
                                    start_raw = attr.unescape_value().ok().map(|c| c.into_owned());
                                }
                                b"stop" => {
                                    stop_raw = attr.unescape_value().ok().map(|c| c.into_owned());
                                }
                                b"channel" => {
                                    channel = attr.unescape_value().ok().map(|c| c.into_owned());
                                }
                                _ => {}
                            }
                        }
                        current_programme = Some(ProgrammeBuilder {
                            channel_epg_id: channel.unwrap_or_default(),
                            start_raw,
                            stop_raw,
                            title: String::new(),
                            description: None,
                            category: None,
                        });
                        text_target = TextTarget::None;
                    }
                    b"title" => {
                        if current_programme.is_some() {
                            text_target = TextTarget::Title;
                        }
                    }
                    b"desc" => {
                        if current_programme.is_some() {
                            text_target = TextTarget::Desc;
                        }
                    }
                    b"category" => {
                        if current_programme.is_some() {
                            text_target = TextTarget::Category;
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Empty(e)) => {
                // Self-closing — only `<icon src="..."/>` matters here.
                if e.name().as_ref() == b"icon" {
                    if let Some(ch) = current_channel.as_mut() {
                        for attr in e.attributes().flatten() {
                            if attr.key.as_ref() == b"src" {
                                if let Ok(v) = attr.unescape_value() {
                                    ch.icon_url = Some(v.into_owned());
                                }
                            }
                        }
                    }
                }
            }
            Ok(Event::Text(t)) => {
                let s = match t.unescape() {
                    Ok(s) => s.into_owned(),
                    Err(_) => continue,
                };
                if s.is_empty() {
                    continue;
                }
                match text_target {
                    TextTarget::DisplayName => {
                        if let Some(ch) = current_channel.as_mut() {
                            if ch.display_name.is_none() {
                                ch.display_name = Some(s);
                            }
                        }
                    }
                    TextTarget::Title => {
                        if let Some(p) = current_programme.as_mut() {
                            if p.title.is_empty() {
                                p.title = s;
                            } else {
                                // Some providers split title across multiple
                                // text events when entities are involved.
                                p.title.push_str(&s);
                            }
                        }
                    }
                    TextTarget::Desc => {
                        text_buf.push_str(&s);
                    }
                    TextTarget::Category => {
                        if let Some(p) = current_programme.as_mut() {
                            if p.category.is_none() {
                                p.category = Some(s);
                            }
                        }
                    }
                    TextTarget::None => {}
                }
            }
            Ok(Event::End(e)) => {
                match e.name().as_ref() {
                    b"channel" => {
                        if let Some(ch) = current_channel.take() {
                            if !ch.id.is_empty() {
                                out.channels.push(ch);
                            }
                        }
                        text_target = TextTarget::None;
                    }
                    b"programme" => {
                        if let Some(builder) = current_programme.take() {
                            if let Some(p) = builder.build(playlist_id) {
                                out.programmes.push(p);
                            }
                        }
                        text_target = TextTarget::None;
                        text_buf.clear();
                    }
                    b"desc" => {
                        if let Some(p) = current_programme.as_mut() {
                            if !text_buf.is_empty() {
                                p.description = Some(text_buf.clone());
                            }
                        }
                        text_buf.clear();
                        text_target = TextTarget::None;
                    }
                    b"title" | b"display-name" | b"category" => {
                        text_target = TextTarget::None;
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(e) => {
                // Don't abort on malformed XML — log + bail at the failed
                // position; we may have already collected a useful prefix.
                tracing::warn!(target: "genc_iptv::epg", error = %e, position = reader.buffer_position(), "XMLTV parse error");
                break;
            }
        }
        buf.clear();
    }

    tracing::info!(
        target: "genc_iptv::epg",
        channels = out.channels.len(),
        programmes = out.programmes.len(),
        "XMLTV parsed"
    );
    Ok(out)
}

#[derive(Debug)]
struct ProgrammeBuilder {
    channel_epg_id: String,
    start_raw: Option<String>,
    stop_raw: Option<String>,
    title: String,
    description: Option<String>,
    category: Option<String>,
}

impl ProgrammeBuilder {
    fn build(self, playlist_id: i64) -> Option<NewProgram> {
        let start_millis = self
            .start_raw
            .as_deref()
            .and_then(parse_xmltv_time)?;
        // Some providers omit <stop>. Default to start + 30 min so the
        // programme still shows up on the grid.
        let stop_millis = self
            .stop_raw
            .as_deref()
            .and_then(parse_xmltv_time)
            .unwrap_or(start_millis + 30 * 60 * 1000);

        if self.channel_epg_id.is_empty() || self.title.is_empty() {
            return None;
        }
        Some(NewProgram {
            channel_epg_id: self.channel_epg_id,
            playlist_id,
            title: self.title,
            description: self.description,
            start_millis,
            stop_millis,
            category: self.category,
        })
    }
}

#[derive(Debug, Clone, Copy)]
enum TextTarget {
    None,
    DisplayName,
    Title,
    Desc,
    Category,
}

/// Parse an XMLTV timestamp like `20260507210000 +0300` (or `20260507210000`,
/// or `20260507210000+0300`, or with a `Z` suffix) into UTC epoch ms.
pub fn parse_xmltv_time(raw: &str) -> Option<i64> {
    let s = raw.trim();
    if s.len() < 14 {
        return None;
    }
    let date_part = &s[..14];
    let dt = NaiveDateTime::parse_from_str(date_part, "%Y%m%d%H%M%S").ok()?;
    let rest = s[14..].trim();
    let offset_secs = if rest.is_empty() || rest == "Z" || rest == "z" {
        0
    } else {
        // Accept "+HHMM", "-HHMM", "+HH:MM"
        let sign = match rest.chars().next()? {
            '+' => 1,
            '-' => -1,
            _ => return None,
        };
        let digits: String = rest.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.len() < 4 {
            return None;
        }
        let hh: i32 = digits[0..2].parse().ok()?;
        let mm: i32 = digits[2..4].parse().ok()?;
        sign * (hh * 3600 + mm * 60)
    };
    let offset = FixedOffset::east_opt(offset_secs)?;
    let local = offset.from_local_datetime(&dt).earliest()?;
    let utc: DateTime<Utc> = local.with_timezone(&Utc);
    Some(utc.timestamp_millis())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_simple_xmltv() {
        // Raw byte strings only accept ASCII, so non-ASCII test data goes
        // through `.as_bytes()` on a regular string literal.
        let xml = "<?xml version=\"1.0\"?>
<tv>
  <channel id=\"trt1.tr\">
    <display-name>TRT 1</display-name>
    <icon src=\"https://example.com/trt1.png\" />
  </channel>
  <programme start=\"20260507210000 +0300\" stop=\"20260507220000 +0300\" channel=\"trt1.tr\">
    <title>Ana Haber</title>
    <desc>Akşam haberleri.</desc>
    <category>Haber</category>
  </programme>
</tv>";
        let out = parse(xml.as_bytes(), 7).unwrap();
        assert_eq!(out.channels.len(), 1);
        assert_eq!(out.channels[0].id, "trt1.tr");
        assert_eq!(out.channels[0].display_name.as_deref(), Some("TRT 1"));
        assert_eq!(
            out.channels[0].icon_url.as_deref(),
            Some("https://example.com/trt1.png")
        );

        assert_eq!(out.programmes.len(), 1);
        let p = &out.programmes[0];
        assert_eq!(p.channel_epg_id, "trt1.tr");
        assert_eq!(p.title, "Ana Haber");
        assert_eq!(p.description.as_deref(), Some("Akşam haberleri."));
        assert_eq!(p.category.as_deref(), Some("Haber"));
        assert_eq!(p.playlist_id, 7);
        assert!(p.stop_millis > p.start_millis);
    }

    #[test]
    fn parses_xmltv_time_with_offset() {
        // 21:00 +03:00 == 18:00 UTC
        let ms = parse_xmltv_time("20260507210000 +0300").unwrap();
        let dt = chrono::DateTime::from_timestamp_millis(ms).unwrap();
        assert_eq!(dt.format("%Y-%m-%dT%H:%M:%SZ").to_string(), "2026-05-07T18:00:00Z");
    }

    #[test]
    fn parses_xmltv_time_utc_default() {
        let ms = parse_xmltv_time("20260507210000").unwrap();
        let dt = chrono::DateTime::from_timestamp_millis(ms).unwrap();
        assert_eq!(dt.format("%Y-%m-%dT%H:%M:%SZ").to_string(), "2026-05-07T21:00:00Z");
    }

    #[test]
    fn parses_xmltv_time_zulu() {
        let ms = parse_xmltv_time("20260507210000 Z").unwrap();
        let dt = chrono::DateTime::from_timestamp_millis(ms).unwrap();
        assert_eq!(dt.format("%Y-%m-%dT%H:%M:%SZ").to_string(), "2026-05-07T21:00:00Z");
    }

    #[test]
    fn missing_stop_defaults_to_start_plus_30min() {
        let xml = br#"<tv>
          <programme start="20260507210000 +0000" channel="ch1">
            <title>X</title>
          </programme>
        </tv>"#;
        let out = parse(xml, 1).unwrap();
        assert_eq!(out.programmes.len(), 1);
        let p = &out.programmes[0];
        assert_eq!(p.stop_millis - p.start_millis, 30 * 60 * 1000);
    }

    #[test]
    fn skips_programme_without_title() {
        let xml = br#"<tv>
          <programme start="20260507210000 +0000" stop="20260507220000 +0000" channel="ch1">
          </programme>
          <programme start="20260507220000 +0000" stop="20260507230000 +0000" channel="ch1">
            <title>OK</title>
          </programme>
        </tv>"#;
        let out = parse(xml, 1).unwrap();
        assert_eq!(out.programmes.len(), 1);
        assert_eq!(out.programmes[0].title, "OK");
    }
}
