# Genç IPTV — Windows · İlerleme & Kararlar

Son güncelleme: 2026-05-09

> Bu doküman geliştirme ilerlemesini, alınan teknik kararları ve nedenlerini kayıt
> altında tutar. Her major faz sonunda güncellenir. Yeni session başlangıcında
> referans olarak okunmalı.

---

## 0 · Felsefe (önemli — kafadan çıkarmaya gerek yok)

**Windows-first, en iyi tool kullanılır.** Bu bir Windows masaüstü uygulamasıdır;
mobil iptv kod tabanı (sibling repo, yerel referans)
sadece **davranış kalıpları** için referans alınır:
- Auto-sync gate (6 saat threshold)
- Series ContinueWatching dedup (composite key)
- HLS fallback ladder (3 stage)
- PosterEnricher (Semaphore + dedup set)
- Channel logo URL normalisation
- M3U/XMLTV/Xtream parser semantikleri

**Tech stack ise mobile'dan KOPYALANMAZ — Windows'ta o işin en iyisi seçilir:**

| Katman | Mobil (Android) | Windows (bu proje) | Neden |
|---|---|---|---|
| Player | Media3 ExoPlayer | **mpv** | ExoPlayer Android-only; mpv Windows native, geniş format |
| DB | Room | **SQLite + sqlx** | Aynı SQLite engine; Rust idiomatic erişim |
| HTTP | OkHttp + Retrofit | **reqwest** | Async, rustls, modern |
| UI | Jetpack Compose | **React + tokens.css** | Tasarım brief'i React-based; Compose Desktop ekosistemi yetersiz |
| State | Hilt + Flow | **Zustand + TanStack Query** | React idiomatic, hafif |
| App shell | Native Activity | **Tauri 2** | Native window + WebView2, küçük binary |

**Kalite hedefi:** Piyasada Windows için kaliteli IPTV player eksik. "Çalışır" değil
"premium" hedefliyoruz — UX, tipografi, performans, format desteği hepsi önemli.

---

## 1 · Tamamlanan Fazlar

### Faz 0 — Skeleton ✅

**Tarih:** 2026-05-09  
**Süre:** ~1 gün

- Tauri 2.11 + React 18.3 + TypeScript 5.6 + Vite 5.4 proje skeleton
- `src/` (frontend) + `src-tauri/` (backend) klasör hiyerarşisi
- `tokens.css` transferi: light/dark + 8 accent + 5 typography variant (data-attr ile)
- Custom title bar (decorations:false, drag region, custom min/max/close)
- Sidebar (full + mini, otomatik 1280px responsive breakpoint)
- React Router routes: Home, Channels, Films, Series, Guide, Favorites, Settings, Onboarding, Search, Player
- Settings/Theme — canlı switcher (theme · accent · typography · homeStyle 4 grup)
- Tauri ikonları üretildi (gümüş G + bakır eğri + teal play, App Icon.html'den)
- Zustand stores: themeStore + uiStore (persist localStorage)
- TS build: 0 hata, ~115 modül

**Build sonuçları:** TS build 847ms, Cargo check 1m30s, ilk dev launch ~3-5 dk.

### Faz 1 — Core MVP (Data + Sync + UI) ✅

**Tarih:** 2026-05-09  
**Süre:** ~1 gün

**Backend (Rust):**
- SQLite şema (`migrations/001_init.sql`) — 9 tablo, Android Room v3 ile birebir
- sqlx pool (WAL + foreign_keys ON, max 10 conn)
- M3U parser + `#EXTVLCOPT` UA/Referer override + 4 unit test
- Xtream API client (10 endpoint) + DTOs (`JsonElement` polymorphic category_id)
- Xtream mapper + image URL normaliser (relative → absolute) + 4 unit test
- Sync service (`service/sync_service.rs`):
  - M3U: group order tracking (LinkedHashMap pattern), FNV-1a hash for stable channel IDs
  - Xtream: live_categories (id→name + id→order maps) → live_streams → bulk insert
  - 500'lük chunked bulk insert (SQLite param limit safety)
  - Diagnostic logging: kaç kanalda epgChannelId var, sample
- Tauri commands (10):
  - `get_playlists`, `get_active_playlist`
  - `add_m3u_playlist`, `add_xtream_playlist` (Xtream'de auth doğrulama)
  - `sync_playlist`, `set_active_playlist`, `delete_playlist`
  - `get_channels` (filter: query + category), `get_channel`, `get_categories`

**Frontend (React + TS):**
- Tauri invoke wrapper (`lib/tauri.ts`) — typed playlistApi + channelApi
- TanStack Query hooks: `usePlaylists`, `useActivePlaylist`, `useChannels`,
  `useChannel`, `useCategories` + 5 mutation hook
- Onboarding wizard (3 step) — Hoş geldin · Playlist (M3U/Xtream tabs) · Profil
  (accent + tema seçimi). react-hook-form. Backend validation ile.
- Channels page — kategori picker (glyph row, 3-harfli mono abbreviation) +
  channel list (logo + ad + group + Canlı/HD pill) + 250ms debounced search
- Settings/Playlists — list, sync, delete, set active, error toasts
- App.tsx — aktif playlist yoksa otomatik /onboarding redirect
- Sidebar mini mode (1280px breakpoint)

**Davranış kalıpları (Android'den port):**
- Auto-sync gate hazır (UI tarafında değil ama backend'de last_synced_at takibi var)
- Series dedup hazırlığı (continue_watching tablosunda resume_episode_id)
- HLS fallback ladder ilk versiyon (sonraki bölümde değişti)
- Channel logo normalise (XtreamMapper'da)

### Faz 1.5 — Stream Proxy (kısmi, mpv'ye geçiliyor) ⚠️

**Tarih:** 2026-05-09

Yapıldı:
- axum + tokio HTTP proxy (127.0.0.1, dynamic port at startup)
- Endpoint: `GET /stream?url=<encoded>&ua=<encoded>&trust=1`
- VLC-mimicking User-Agent default
- Range header forward (VOD seek için)
- CORS `*` + hop-by-hop header strip
- HLS manifest detection (Content-Type + path `.m3u8`)
- **Manifest rewriter** — segment satırları + `URI="..."` attribute'larını
  (EXT-X-KEY, EXT-X-MEDIA, EXT-X-MAP) absolute proxy URL'e dönüştür
- Frontend HLS.js loader override — her fetch proxy üzerinden
- 3-stage fallback ladder (HLS → progressive_same → progressive_ts → exhausted)
- Detaylı debug logging (her iki tarafta)

**Sorun:** Chromium WebView2'de HLS.js çoğu IPTV stream'i oynatamıyor:
- Codec sınırı (HEVC, AC3, DTS yok)
- Bazı manifest formatları (low-latency, custom tags) parse hatası
- `canPlayType("application/vnd.apple.mpegurl")` "maybe" yalan döndürüyor (düzeltildi)

**Karar:** HLS.js + browser-side oynatma yetersiz. mpv'ye geçiyoruz.

---

## 2 · Devam Eden — Faz 1.6 · mpv Player Engine 🚧

**Karar gerekçesi:** IPTV provider'larının çoğu HEVC/AC3/MPEG-TS kullanır.
Chromium codec listesi sınırlı. Browser-based oynatma "premium IPTV player"
kalitesini sağlayamaz.

**mpv neden seçildi:**
- Windows native, geniş format desteği (VLC seviyesi)
- Hardware-accelerated decoding (DXVA2/D3D11)
- IPTV-friendly CLI flag'leri (UA, Referer, SSL trust)
- ~50 MB binary (VLC ~150 MB)
- Battle-tested, açık kaynak, aktif maintain
- ExoPlayer'ın Windows'taki en yakın muadili

**İmplementasyon planı:**
1. mpv binary kurulumu (winget veya bundled sidecar)
2. Tauri command: `play_stream(url, ua, trust)` → `tokio::process::Command` ile mpv başlat
3. `MpvHandle` global state (Mutex<Option<Child>>) — kanal değişiminde önceki process kill
4. Tauri command: `stop_stream` — process terminate + wait
5. Player.tsx — HLS.js çıkar, mpv invoke; mpv kendi pencerede başlangıçta (v1)
6. (Sonra) mpv'yi Tauri pencerene `--wid=<HWND>` ile embed
7. (Sonra) IPC: `--input-ipc-server` ile pause/seek/volume kontrolü

**Stream proxy ne olacak?** Kalıyor. mpv'nin kendi UA/SSL flag'leri var ama proxy
loglama + hatalı upstream debug için faydalı. Faz 1.6'da mpv'yi direkt URL ile
çağıracağız (proxy bypass), Faz 4 polish'inde proxy'yi opsiyonel ara katman
yapabiliriz.

---

## 3 · Yapılan Önemli Kararlar

| # | Karar | Tarih | Neden |
|---|---|---|---|
| 1 | Stack: Tauri 2 + React + TS + Vite | 2026-05-09 | Bundle size (~10 MB vs Electron 120 MB), Rust güvenliği, native API kolaylığı |
| 2 | Tipografi default: `archive` (Spectral · Schibsted Grotesk) | 2026-05-09 | Kullanıcı tercihi, Settings'te 5 varyant seçilebilir |
| 3 | Anasayfa default: `classic-billboard` | 2026-05-09 | Kullanıcı tercihi, Settings'te 5 varyant seçilebilir |
| 4 | TMDB API key: kullanıcıda, sonradan eklenecek | 2026-05-09 | Geliştirme şimdilik key'siz |
| 5 | Code signing + MSI installer: v1'den çıkarıldı | 2026-05-09 | Hedef GitHub release; signing ~$300/yıl gerek değil |
| 6 | Player engine: HLS.js → mpv | 2026-05-09 | Chromium codec sınırı; IPTV gerçek format desteği gerek |
| 7 | useHttpsScheme: false (Tauri pencere) | 2026-05-09 | Mixed content (HTTP IPTV stream'leri) için. mpv'ye geçişle gerek kalmayabilir |

---

## 4 · Sıradaki Adımlar

**Yakın (Faz 1.6 tamamlanması):**
- mpv sidecar entegrasyon
- Tauri pencerene mpv embed (HWND parent)
- mpv IPC (stop/seek/volume)
- Player.tsx UI: minimal Tauri overlay + mpv altında

**Faz 2 — VOD:**
- Xtream VOD streams + categories sync (Rust)
- TMDB poster enricher (Rust, Semaphore(6) + dedup set, Android'den port)
- Movies grid + film detay sayfası
- Series grid + dizi detay (sezon + bölüm)
- Continue Watching (series dedup logic)

**Faz 3 — EPG + Polish:**
- XMLTV parser + gzip handling (Rust)
- Program Rehberi grid UI (sticky channel column, time ruler)
- Search palette (Ctrl+F command palette)
- Favoriler 3 sekme
- Subtitle settings (13 kontrol — mpv'nin OSD üzerinden)

**Faz 4 — Premium:**
- Tray icon + menu
- Mini player widget (always-on-top)
- Tüm klavye kısayolları
- Drag-drop M3U file
- File association (.m3u → bizim app)
- Auto-update (GitHub release based)
- Code splitting + bundle optimization
- mpv binary embed/sidecar (manuel install yerine)

---

## 5 · Bilinen Sorunlar / Teknik Borçlar

- **52 cargo warning** — Faz 2/3'te kullanılacak struct/fn'lar `#[allow(dead_code)]` ile sustur
- **HLS.js bundle 300+ kB** — mpv geçişiyle bağımlılık tamamen kaldırılacak
- **localStorage'da theme persist** — Faz 4'te Tauri Store'a geç (cross-session reliability)
- **Custom title bar drag** — bazı bölgelerde drag çalışmıyor olabilir, test gerek
- **proxy.rs içinde unused functions** (xmltv, vod_stream, series_stream) — Faz 2/3'te kullanılacak
