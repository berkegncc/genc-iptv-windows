//! Xtream Codes player_api.php client. One client per playlist (since URL +
//! credentials vary), built from the shared reqwest pool.

use anyhow::{Context, Result};
use reqwest::Client;

use super::dto::*;

/// Thin wrapper around the shared HTTP client + Xtream credentials.
pub struct XtreamClient {
    client: Client,
    server_base: String,
    username: String,
    password: String,
}

impl XtreamClient {
    pub fn new(server_base: String, username: String, password: String) -> Self {
        Self {
            client: super::super::http::shared().clone(),
            server_base,
            username,
            password,
        }
    }

    /// Build the player_api.php URL with auth + action params.
    fn endpoint(&self, action: Option<&str>) -> String {
        let base = super::url::player_api(&self.server_base);
        let mut url = format!(
            "{base}?username={u}&password={p}",
            u = urlencoding::encode(&self.username),
            p = urlencoding::encode(&self.password),
        );
        if let Some(a) = action {
            url.push_str("&action=");
            url.push_str(a);
        }
        url
    }

    /// `get_user_info` — also serves as account validation.
    pub async fn user_info(&self) -> Result<AuthResponse> {
        let url = self.endpoint(None);
        let resp = self.client.get(&url).send().await
            .context("xtream auth request")?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream auth: HTTP {}", resp.status());
        }
        Ok(resp.json::<AuthResponse>().await
            .context("xtream auth json parse")?)
    }

    pub async fn live_categories(&self) -> Result<Vec<CategoryDto>> {
        let url = self.endpoint(Some("get_live_categories"));
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream live_categories: HTTP {}", resp.status());
        }
        // Xtream sometimes returns `[]` when empty; always returns an array.
        Ok(resp.json::<Vec<CategoryDto>>().await
            .unwrap_or_default())
    }

    pub async fn live_streams(&self) -> Result<Vec<LiveStreamDto>> {
        let url = self.endpoint(Some("get_live_streams"));
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream live_streams: HTTP {}", resp.status());
        }
        Ok(resp.json::<Vec<LiveStreamDto>>().await
            .unwrap_or_default())
    }

    pub async fn vod_categories(&self) -> Result<Vec<CategoryDto>> {
        let url = self.endpoint(Some("get_vod_categories"));
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream vod_categories: HTTP {}", resp.status());
        }
        Ok(resp.json::<Vec<CategoryDto>>().await.unwrap_or_default())
    }

    pub async fn vod_streams(&self) -> Result<Vec<VodDto>> {
        let url = self.endpoint(Some("get_vod_streams"));
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream vod_streams: HTTP {}", resp.status());
        }
        Ok(resp.json::<Vec<VodDto>>().await.unwrap_or_default())
    }

    pub async fn series_categories(&self) -> Result<Vec<CategoryDto>> {
        let url = self.endpoint(Some("get_series_categories"));
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream series_categories: HTTP {}", resp.status());
        }
        Ok(resp.json::<Vec<CategoryDto>>().await.unwrap_or_default())
    }

    pub async fn series(&self) -> Result<Vec<SeriesDto>> {
        let url = self.endpoint(Some("get_series"));
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream series: HTTP {}", resp.status());
        }
        Ok(resp.json::<Vec<SeriesDto>>().await.unwrap_or_default())
    }

    /// Detailed info for one VOD — plot, cast, runtime, rating. Used to
    /// enrich poster cards and the film detail screen.
    pub async fn vod_info(&self, vod_id: i64) -> Result<VodInfoResponse> {
        let mut url = self.endpoint(Some("get_vod_info"));
        url.push_str("&vod_id=");
        url.push_str(&vod_id.to_string());
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream vod_info: HTTP {}", resp.status());
        }
        Ok(resp.json::<VodInfoResponse>().await
            .context("xtream vod_info json parse")?)
    }

    /// Series + all episodes. Lazy-loaded when the user opens a series detail
    /// page — fetching for every series at sync time would be 100+ requests
    /// per playlist.
    pub async fn series_info(&self, series_id: i64) -> Result<SeriesInfoResponse> {
        let mut url = self.endpoint(Some("get_series_info"));
        url.push_str("&series_id=");
        url.push_str(&series_id.to_string());
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("xtream series_info: HTTP {}", resp.status());
        }
        Ok(resp.json::<SeriesInfoResponse>().await
            .context("xtream series_info json parse")?)
    }
}
