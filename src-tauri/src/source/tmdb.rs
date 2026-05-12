//! TMDB (The Movie Database) v3 client. Used to backfill missing posters /
//! cast / plot for VOD items the Xtream provider didn't enrich.
//!
//! API key resolution: read from `TMDB_API_KEY` (the conventional name —
//! tries this first), falling back to `GENC_TMDB_API_KEY` for the
//! namespaced variant. When neither is set the client is a no-op — every
//! lookup returns `Ok(None)` so callers (the PosterEnricher service)
//! silently skip enrichment instead of erroring out. The user can drop
//! their own key in `.env` next to the project root and dotenvy picks it
//! up at startup.
//!
//! Concurrency: TMDB free tier rate-limits ~50 req/sec; we cap at 6 in
//! flight via `tokio::sync::Semaphore` (matches Android brief 11.4).

use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;

use crate::data::models::CastMember;
use crate::source::fanart_tv::FanartClient;

const API_BASE: &str = "https://api.themoviedb.org/3";
const IMAGE_BASE: &str = "https://image.tmdb.org/t/p";

#[derive(Clone)]
pub struct TmdbClient {
    client: Client,
    api_key: Option<String>,
}

impl TmdbClient {
    pub fn from_env() -> Self {
        // Try the conventional name first, fall back to the namespaced one
        // so existing setups keep working.
        let api_key = std::env::var("TMDB_API_KEY")
            .ok()
            .or_else(|| std::env::var("GENC_TMDB_API_KEY").ok())
            .filter(|s| !s.is_empty());
        Self {
            client: super::http::shared().clone(),
            api_key,
        }
    }

    pub fn enabled(&self) -> bool {
        self.api_key.is_some()
    }

    /// Search for a movie by title (+ optional year). Returns the first hit's
    /// poster + backdrop + cast, or `None` if no match exists or no API key
    /// is configured.
    ///
    /// The provider often ships titles like
    /// `"Kız - The Girl in the Spider's Web (2018)"` — Turkish localized
    /// name, then a dash, then the original English title, then `(year)`.
    /// We try a sequence of normalised queries: each candidate is sent
    /// to TMDB until one returns a hit. That dramatically improves the
    /// match rate on Turkish IPTV libraries.
    pub async fn lookup_movie(
        &self,
        title: &str,
        year: Option<i32>,
    ) -> Result<Option<TmdbHit>> {
        if self.api_key.is_none() {
            return Ok(None);
        }
        for candidate in title_candidates(title) {
            if let Some(hit) = self.search_movie_once(&candidate, year).await? {
                return Ok(Some(hit));
            }
        }
        Ok(None)
    }

    async fn search_movie_once(
        &self,
        query: &str,
        year: Option<i32>,
    ) -> Result<Option<TmdbHit>> {
        let key = self.api_key.as_deref().expect("api_key checked by caller");
        let mut url = format!(
            "{API_BASE}/search/movie?api_key={key}&query={q}&language=tr-TR",
            q = urlencoding::encode(query.trim()),
        );
        if let Some(y) = year {
            url.push_str(&format!("&year={y}"));
        }
        let resp = self.client.get(&url).send().await
            .context("tmdb search/movie")?;
        if !resp.status().is_success() {
            anyhow::bail!("tmdb search/movie HTTP {}", resp.status());
        }
        let body: SearchResponse = resp.json().await.context("tmdb json")?;
        let Some(first) = body.results.into_iter().next() else {
            return Ok(None);
        };

        let mut cast: Vec<CastMember> = Vec::new();
        if let Some(id) = first.id {
            cast = self.fetch_movie_credits(id).await.unwrap_or_default();
        }

        // Backdrop cascade (per the design doc — Phase 2):
        //   1. TMDB /images, filtered to textless + 16:9 + top-voted.
        //      This is the cleanest hero art when available.
        //   2. Fanart.tv `moviebackground` — IPTV/Kodi community
        //      artwork, often better than TMDB for non-Hollywood
        //      content. Keyed by TMDB id directly.
        //   3. TMDB search's default `backdrop_path` — last resort
        //      before we fall through to the poster-blur on the frontend.
        let mut backdrop_url: Option<String> = None;
        if let Some(id) = first.id {
            backdrop_url = self.best_backdrop(&format!("/movie/{id}/images")).await;
            if backdrop_url.is_none() {
                let fanart = FanartClient::from_env();
                if fanart.enabled() {
                    backdrop_url = fanart.movie_background(id).await;
                }
            }
        }
        if backdrop_url.is_none() {
            backdrop_url = first.backdrop_path.as_deref().map(image_url_w1280);
        }

        Ok(Some(TmdbHit {
            poster_url: first.poster_path.as_deref().map(image_url_w342),
            backdrop_url,
            plot: first.overview.filter(|s| !s.is_empty()),
            rating: first.vote_average,
            cast,
        }))
    }

    pub async fn lookup_series(
        &self,
        title: &str,
        first_air_year: Option<i32>,
    ) -> Result<Option<TmdbHit>> {
        if self.api_key.is_none() {
            return Ok(None);
        }
        for candidate in title_candidates(title) {
            if let Some(hit) = self.search_series_once(&candidate, first_air_year).await? {
                return Ok(Some(hit));
            }
        }
        Ok(None)
    }

    async fn search_series_once(
        &self,
        query: &str,
        first_air_year: Option<i32>,
    ) -> Result<Option<TmdbHit>> {
        let key = self.api_key.as_deref().expect("api_key checked by caller");
        let mut url = format!(
            "{API_BASE}/search/tv?api_key={key}&query={q}&language=tr-TR",
            q = urlencoding::encode(query.trim()),
        );
        if let Some(y) = first_air_year {
            url.push_str(&format!("&first_air_date_year={y}"));
        }
        let resp = self.client.get(&url).send().await
            .context("tmdb search/tv")?;
        if !resp.status().is_success() {
            anyhow::bail!("tmdb search/tv HTTP {}", resp.status());
        }
        let body: SearchResponse = resp.json().await.context("tmdb json")?;
        let Some(first) = body.results.into_iter().next() else {
            return Ok(None);
        };

        let mut cast: Vec<CastMember> = Vec::new();
        if let Some(id) = first.id {
            cast = self.fetch_tv_credits(id).await.unwrap_or_default();
        }

        // Same 3-stage backdrop cascade as the movie path. For Fanart
        // we need a TVDB id rather than TMDB, so an `external_ids`
        // call is interleaved. That extra hop only happens when both
        // TMDB endpoints have nothing — popular shows short-circuit
        // out at step 1.
        let mut backdrop_url: Option<String> = None;
        if let Some(id) = first.id {
            backdrop_url = self.best_backdrop(&format!("/tv/{id}/images")).await;
            if backdrop_url.is_none() {
                let fanart = FanartClient::from_env();
                if fanart.enabled() {
                    if let Some(tvdb_id) = self.tvdb_id_for_series(id).await {
                        backdrop_url = fanart.show_background(tvdb_id).await;
                    }
                }
            }
        }
        if backdrop_url.is_none() {
            backdrop_url = first.backdrop_path.as_deref().map(image_url_w1280);
        }

        Ok(Some(TmdbHit {
            poster_url: first.poster_path.as_deref().map(image_url_w342),
            backdrop_url,
            plot: first.overview.filter(|s| !s.is_empty()),
            rating: first.vote_average,
            cast,
        }))
    }

    /// Resolve a TMDB series id to a TVDB id via `/tv/{id}/external_ids`.
    /// Needed because Fanart.tv's TV catalogue is keyed by TVDB id
    /// rather than TMDB. Returns `None` on any error / missing mapping.
    async fn tvdb_id_for_series(&self, tmdb_id: i64) -> Option<i64> {
        let key = self.api_key.as_deref()?;
        let url = format!("{API_BASE}/tv/{tmdb_id}/external_ids?api_key={key}");
        let resp = self.client.get(&url).send().await.ok()?;
        if !resp.status().is_success() {
            return None;
        }
        let body: ExternalIdsResponse = resp.json().await.ok()?;
        body.tvdb_id
    }

    /// Hit `/movie/{id}/images` (or `/tv/{id}/images`) and return the
    /// URL of the best backdrop for a hero. Quiet on failure — returns
    /// None so the caller can keep going with whatever it had.
    ///
    /// Selection rules (in priority order):
    ///   1. **Aspect ratio ≥ 1.5** — reject square / portrait crops
    ///      that TMDB sometimes tags as "backdrops". We want 16:9-ish.
    ///   2. **Textless first** (`iso_639_1 == null`) — the clean
    ///      no-text variant is the Netflix / Disney+ look. Localised
    ///      backdrops with text on top compete with our hero title.
    ///   3. **Highest `vote_average`** — community-curated quality.
    ///   4. **Highest `vote_count`** — tie-breaker so a 9.0★/1-vote
    ///      doesn't beat an 8.4★/30-votes.
    ///
    /// The endpoint is queried with `include_image_language=null,en,tr`
    /// so we get textless + English + Turkish backdrops in one call;
    /// the sort above decides which wins.
    async fn best_backdrop(&self, path: &str) -> Option<String> {
        let key = self.api_key.as_deref()?;
        let url = format!(
            "{API_BASE}{path}?api_key={key}&include_image_language=null,en,tr"
        );
        let resp = self.client.get(&url).send().await.ok()?;
        if !resp.status().is_success() {
            return None;
        }
        let body: ImagesResponse = resp.json().await.ok()?;
        let mut backdrops: Vec<BackdropEntry> = body
            .backdrops
            .into_iter()
            // Step 1: drop anything that isn't a wide landscape image.
            // Default 1.0 for missing aspect_ratio rejects them too —
            // TMDB always sets this for real backdrops.
            .filter(|b| b.aspect_ratio.unwrap_or(1.0) >= 1.5)
            .collect();
        if backdrops.is_empty() {
            return None;
        }
        backdrops.sort_by(|a, b| {
            // Steps 2-4 chained: textless first, then quality.
            let a_textless = a.iso_639_1.is_none();
            let b_textless = b.iso_639_1.is_none();
            b_textless
                .cmp(&a_textless)
                .then(
                    b.vote_average
                        .partial_cmp(&a.vote_average)
                        .unwrap_or(std::cmp::Ordering::Equal),
                )
                .then(b.vote_count.cmp(&a.vote_count))
        });
        backdrops
            .into_iter()
            .next()
            .map(|b| image_url_w1280(&b.file_path))
    }

    async fn fetch_movie_credits(&self, id: i64) -> Result<Vec<CastMember>> {
        self.fetch_credits(&format!("/movie/{id}/credits")).await
    }

    async fn fetch_tv_credits(&self, id: i64) -> Result<Vec<CastMember>> {
        self.fetch_credits(&format!("/tv/{id}/credits")).await
    }

    async fn fetch_credits(&self, path: &str) -> Result<Vec<CastMember>> {
        let key = self
            .api_key
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("no api key"))?;
        let url = format!("{API_BASE}{path}?api_key={key}&language=tr-TR");
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("tmdb credits HTTP {}", resp.status());
        }
        let body: CreditsResponse = resp.json().await?;
        Ok(body
            .cast
            .into_iter()
            .take(12)
            .map(|c| CastMember {
                name: c.name,
                photo_url: c.profile_path.as_deref().map(image_url_w185),
            })
            .collect())
    }
}

#[derive(Debug, Clone)]
pub struct TmdbHit {
    pub poster_url: Option<String>,
    pub backdrop_url: Option<String>,
    pub plot: Option<String>,
    pub rating: Option<f64>,
    pub cast: Vec<CastMember>,
}

/// Generate a sequence of title candidates to try against TMDB.
///
/// Turkish IPTV providers love compound titles like
/// `"Türkçe Adı - English Original (2019)"`. TMDB's search is fuzzy but
/// breaks on the trailing `(year)` and on the Turkish-only half. We
/// normalise:
///   1. The full title minus a trailing `(YYYY)` suffix
///   2. The English half after ` - ` (often the canonical TMDB title)
///   3. The Turkish half before ` - ` (last resort, rarely matches but
///      occasionally is the ONLY name TMDB knows for local content)
///
/// Duplicates and empty strings are filtered. Order matters — the first
/// candidate that returns a hit wins, so we go from most-specific to
/// least.
fn title_candidates(raw: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let stripped = strip_trailing_year(raw.trim()).trim().to_string();
    if !stripped.is_empty() {
        out.push(stripped.clone());
    }
    if let Some((tr_part, en_part)) = stripped.split_once(" - ") {
        let en = en_part.trim();
        if !en.is_empty() {
            out.push(en.to_string());
        }
        let tr = tr_part.trim();
        if !tr.is_empty() {
            out.push(tr.to_string());
        }
    }
    // Dedup while preserving order.
    let mut seen = std::collections::HashSet::new();
    out.retain(|s| seen.insert(s.clone()));
    out
}

/// Strip a trailing ` (YYYY)` if present. `"Inception (2010)"` →
/// `"Inception"`. Leaves anything else alone.
fn strip_trailing_year(s: &str) -> &str {
    let bytes = s.as_bytes();
    if bytes.len() < 7 {
        return s;
    }
    if bytes[bytes.len() - 1] != b')' {
        return s;
    }
    // Walk back: ')' '0'..'9' '0'..'9' '0'..'9' '0'..'9' '(' ' '
    let n = bytes.len();
    if n >= 7
        && bytes[n - 7] == b' '
        && bytes[n - 6] == b'('
        && bytes[n - 5..n - 1].iter().all(|c| c.is_ascii_digit())
    {
        return &s[..n - 7];
    }
    s
}

fn image_url_w342(path: &str) -> String {
    format!("{IMAGE_BASE}/w342{path}")
}
/// Backdrop / hero image. We picked `w1280` (Netflix-quality) over `w780`
/// after the home hero + detail backdrop started looking soft when
/// stretched across desktop displays. The bandwidth bump is real but
/// these are large surfaces — quality matters here.
fn image_url_w1280(path: &str) -> String {
    format!("{IMAGE_BASE}/w1280{path}")
}
/// Person headshot — TMDB's `w185` is the smallest dignified portrait
/// size; we render cast chips ~100px wide so this is roughly 2x.
fn image_url_w185(path: &str) -> String {
    format!("{IMAGE_BASE}/w185{path}")
}

#[derive(Deserialize)]
struct SearchResponse {
    results: Vec<SearchHit>,
}

#[derive(Deserialize)]
struct SearchHit {
    id: Option<i64>,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    overview: Option<String>,
    vote_average: Option<f64>,
}

#[derive(Deserialize)]
struct CreditsResponse {
    cast: Vec<CreditEntry>,
}

#[derive(Deserialize)]
struct CreditEntry {
    name: String,
    /// TMDB headshot path, e.g. `/abc123.jpg`. Combined with the `w185`
    /// CDN prefix to form a usable URL.
    profile_path: Option<String>,
}

/// Response shape of `/tv/{id}/external_ids`. We only care about
/// the TVDB id (for Fanart.tv lookups); other ids (imdb, freebase,
/// instagram, etc.) are ignored.
#[derive(Deserialize)]
struct ExternalIdsResponse {
    #[serde(default)]
    tvdb_id: Option<i64>,
}

/// Response shape of `/movie/{id}/images` and `/tv/{id}/images`. We only
/// look at backdrops; posters / logos are ignored here.
#[derive(Deserialize)]
struct ImagesResponse {
    backdrops: Vec<BackdropEntry>,
}

#[derive(Deserialize)]
struct BackdropEntry {
    file_path: String,
    #[serde(default)]
    vote_average: f64,
    #[serde(default)]
    vote_count: i64,
    /// Width / height. Used to reject square or portrait crops that
    /// TMDB occasionally tags as "backdrops". A clean 16:9 backdrop
    /// is ~1.78; we keep anything ≥ 1.5 so the rare 3:2 still passes.
    #[serde(default)]
    aspect_ratio: Option<f64>,
    /// ISO 639-1 language code of the embedded text, or `None` for a
    /// fully textless image. We prefer textless for hero usage so the
    /// rendered title doesn't fight with localised title art baked
    /// into the picture.
    #[serde(default)]
    iso_639_1: Option<String>,
}
