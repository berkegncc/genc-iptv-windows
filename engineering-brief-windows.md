# Genç IPTV — Windows Masaüstü Mühendislik Brief'i

> Bu doküman, mevcut Android uygulamasının özelliklerine birebir karşılık gelen
> bir Windows masaüstü versiyonunun **uygulanması** için teknik brief'tir.
> Tasarım ayrı dokümanda (`design-brief-windows.md`); burada **stack, mimari,
> veri modeli, entegrasyonlar, davranış kalıpları, build/dağıtım** ele alınır.

---

## 1 · Amaç & kapsam

**Amaç:** Mevcut Android uygulamasındaki tüm özellikleri Windows'ta birebir
sunan bir masaüstü oynatıcı. Aynı playlist tipleri, aynı oynatma deneyimi,
aynı veri modeli — farklı yalnızca platform ve UI.

**Kapsam içinde:**
- M3U & Xtream Codes playlist desteği
- Canlı kanallar (kategori → liste → player)
- VOD: filmler + diziler (sezon/bölüm), TMDB fallback
- EPG (program rehberi)
- Favoriler, Devam Et (series dedup'lu), Arama, Ayarlar (altyazı styling dahil)
- Animasyonlu splash, tema/accent sistemi, otomatik sync
- Picture-in-Picture (Windows: always-on-top mini player)

**Kapsam dışı (v1):**
- Bulut senkronizasyon, paylaşım, sosyal özellikler
- Çoklu dil (yalnız Türkçe)
- macOS / Linux (potansiyel v2)
- Reklam, mağaza, abonelik
- Tarayıcı/mobile içerik döküntüsü

---

## 2 · Tech stack — öneri ve alternatifler

### Önerilen: **Tauri 2 + React + TypeScript + Vite**

Neden:
- **Bundle**: ~6-12 MB final installer (Electron'un ~120 MB'a karşı)
- **Performans**: Rust backend → XMLTV parsing, HTTP, SQLite; cold start <1 sn
- **Native entegrasyon**: tray icon, MSI installer, file association, auto-update,
  multi-monitor — hepsi Tauri API'leriyle out-of-box
- **UI esnekliği**: React + Tailwind / Radix UI / shadcn-ui — tasarım brief'indeki
  hairline divider, glyph chip, marquee scroll vb. kalıplar kolay implement
- **Güvenlik**: web-isolated frontend + Rust kapısı; SSL trust override gibi
  hassas işlemler Rust tarafına izole edilir

### Alternatif A: **Electron + React + TypeScript**

Tauri yerine. Bundle daha büyük, kurulum daha kolay (Node.js zaten yaygın).
Yapı aynı mimariyle çalışır, sadece backend Node olur. Eğer ekipte Rust
deneyimi yoksa değerlendirilebilir.

### Alternatif B: **Compose Multiplatform Desktop (Kotlin)**

Mevcut Android koduyla **maksimum yeniden kullanım**. Composables, ViewModels,
data modelleri, repository sınıfları büyük ölçüde paylaşılabilir. Ancak:
- ExoPlayer yok → VLCJ veya LibVLC binding gerekir (player kabuk yazımı zor)
- Hilt yerine Koin
- Some Compose UI libraries Android-only
- Compose Desktop ekosistemi (Tauri/Electron'a göre) küçük

Eğer mevcut Kotlin kodunu attığımızı düşünmüyorsak ve bir kişi bakacaksa
yine de değer var. Yine de v1 hedefi pragmatik bir Windows app'e ulaşmaksa
**Tauri** önerimdir.

### Frontend dependencies (Tauri + React önerilirse)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.27.0",
    "@tauri-apps/api": "^2.0.0",
    "zustand": "^5.0.0",                  // hafif state mgmt (Redux yerine)
    "@tanstack/react-query": "^5.59.0",   // server state, cache, sync
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",  // component variant API (shadcn pattern)
    "framer-motion": "^11.11.0",          // animasyonlar (splash sekansı)
    "lucide-react": "^0.453.0",           // sidebar ikonları
    "hls.js": "^1.5.0",                    // HLS playback (Phase 1)
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0"                       // form/JSON validation
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "vite": "^5.4.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0"
  }
}
```

### Rust dependencies (Tauri backend)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "window-decorations"] }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-http = "2"
tauri-plugin-store = "2"
tauri-plugin-updater = "2"
tauri-plugin-os = "2"
tauri-plugin-single-instance = "2"
tauri-plugin-window-state = "2"
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "macros", "migrate"] }
reqwest = { version = "0.12", features = ["json", "gzip", "rustls-tls", "stream"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
quick-xml = { version = "0.36", features = ["serialize"] }
flate2 = "1"        # xmltv.gz decode
chrono = "0.4"
tokio = { version = "1", features = ["full"] }
tracing = "0.1"     # logging
anyhow = "1"
thiserror = "1"
once_cell = "1"
async-trait = "0.1"
```

---

## 3 · Proje yapısı

```
genc_iptv_windows/
├── src/                        # React frontend
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── providers.tsx       # Query client, theme, Tauri context
│   ├── pages/                  # Top-level pages (1 = 1 sidebar item)
│   │   ├── Home.tsx
│   │   ├── Channels.tsx
│   │   ├── Movies.tsx
│   │   ├── Series.tsx
│   │   ├── Guide.tsx
│   │   ├── Favorites.tsx
│   │   ├── Settings/
│   │   │   ├── Playlists.tsx
│   │   │   ├── Player.tsx
│   │   │   ├── Subtitles.tsx
│   │   │   └── Theme.tsx
│   │   ├── Onboarding.tsx
│   │   └── Search.tsx
│   ├── features/               # Feature-scoped logic (hooks, types)
│   │   ├── playlist/
│   │   │   ├── usePlaylists.ts
│   │   │   ├── useSync.ts
│   │   │   ├── types.ts
│   │   │   └── api.ts          # invoke('get_playlists') wrappers
│   │   ├── channels/
│   │   ├── vod/
│   │   ├── epg/
│   │   ├── favorites/
│   │   ├── continue-watching/
│   │   ├── search/
│   │   └── player/
│   ├── components/             # Shared UI primitives
│   │   ├── ui/                 # Button, Card, Input, Tabs, ... (shadcn-style)
│   │   ├── BrandLogo.tsx       # SVG G mark
│   │   ├── AnimatedSplash.tsx  # Splash.html port (framer-motion)
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── ChannelLogo.tsx     # Channel logo with fallback initials
│   │   └── ... (PosterCard, GlyphChip, EmptyState, etc.)
│   ├── stores/                 # Zustand stores
│   │   ├── playerStore.ts      # Active player state, mini-player visibility
│   │   ├── themeStore.ts       # Theme + accent palette
│   │   └── uiStore.ts          # Sidebar collapsed, search open, etc.
│   ├── styles/
│   │   ├── globals.css
│   │   ├── tokens.css          # Color, typography, spacing tokens (CSS vars)
│   │   └── themes/
│   │       ├── dark.css
│   │       └── light.css
│   └── lib/
│       ├── tauri.ts            # invoke wrapper with typed commands
│       └── format.ts           # formatMs, formatDate, etc.
│
├── src-tauri/                  # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── src/
│       ├── main.rs
│       ├── commands/           # #[tauri::command] handlers
│       │   ├── playlist.rs     # add_playlist, sync_playlist, set_active
│       │   ├── channel.rs      # observe_channels, search_channels
│       │   ├── vod.rs
│       │   ├── epg.rs
│       │   ├── favorite.rs
│       │   ├── continue_watching.rs
│       │   └── tmdb.rs
│       ├── data/
│       │   ├── db.rs           # SQLite pool + migrations
│       │   ├── models.rs       # Playlist, Channel, Program, VodItem ...
│       │   ├── playlist_repo.rs
│       │   ├── channel_repo.rs
│       │   └── ...
│       ├── source/
│       │   ├── m3u.rs          # M3U parser
│       │   ├── xmltv.rs        # XMLTV parser (with gzip)
│       │   ├── xtream/
│       │   │   ├── api.rs      # player_api.php endpoint client
│       │   │   ├── dto.rs      # DTOs from JSON
│       │   │   └── mapper.rs   # DTO → domain model
│       │   ├── tmdb.rs
│       │   └── http.rs         # Custom UA, SSL bypass support
│       ├── service/
│       │   ├── sync_service.rs # Orchestrates playlist sync
│       │   ├── poster_enricher.rs
│       │   └── pref_service.rs
│       └── migrations/
│           ├── 001_init.sql
│           ├── 002_continue_watching_v2.sql
│           └── ...
│
├── public/
│   └── icons/
│       ├── icon.ico            # Windows app icon (multi-resolution)
│       ├── icon.png
│       └── tray.png
└── package.json
```

---

## 4 · Mimari katmanlar

### Frontend (React)

- **Pages**: 1 page = 1 sidebar item. Her page hooks ve componentlerden besleniyor.
- **Features**: Domain-spesifik hook + tip + API wrapper. Page'ler feature
  hook'larını import eder, doğrudan Tauri invoke yapmaz.
- **Components/ui**: shadcn-style primitive'ler (Button, Card, Tabs, Sheet,
  Toast). Tasarım brief'indeki kalıpları izler (hairline divider, glyph chip,
  marquee scroll, gradient ring).
- **Stores (Zustand)**: ephemeral UI state — aktif sidebar, search açık mı,
  player oynuyor mu. Persistence YOK (DB ve settings Rust tarafında).
- **TanStack Query**: server state caching. Channels, EPG, VOD listeleri
  Rust'tan invoke ile gelir; query key'leri ile cache'lenir, invalidation
  sync ile yapılır.

### Backend (Rust / Tauri)

- **Commands**: `#[tauri::command]` ile Frontend'in `invoke()` ile çağırdığı
  endpoint'ler. Fonksiyonlar: `get_playlists`, `add_xtream_playlist`,
  `sync_playlist`, `observe_channels`, `search_channels`, `get_epg_grid` ...
- **Data layer**: SQLite (sqlx) + migrations. Repo trait/struct'ları her
  entity için ayrı.
- **Source layer**: harici sistemlerle konuşan modüller — M3U, XMLTV, Xtream
  API, TMDB. Hepsi async fonksiyonlar.
- **Service layer**: orchestration — sync_service playlist ekleme/güncelleme
  akışını yönetir, poster_enricher VOD listesi geldikçe TMDB'den boş poster'ları
  doldurur.

### State akış kuralları

- **DB → Frontend**: Frontend, DB'den okumak için `invoke('get_x')` çağırır,
  TanStack Query cache'ler.
- **Frontend → DB**: yazma işlemleri (favori toggle, position save) yine
  invoke ile gider.
- **Background sync**: Periyodik (24sa) sync için Tauri'nin background
  task'ı kullanılır (tokio::spawn + interval).
- **Reactive update**: DB değiştiğinde frontend güncellensin diye **event
  emit** kullan (`window.emit('playlist-synced', payload)`). Frontend
  `listen('playlist-synced')` ile cache'i invalidate eder.

---

## 5 · Veri modeli (SQLite şeması)

Android'deki Room şemasıyla birebir paralel. Tüm tablolarda `id` veya bileşik
PK; `lastSyncedAt` benzeri timestamp'ler `INTEGER` (epoch ms).

```sql
-- Playlists
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
    user_info_json TEXT       -- Xtream user info as JSON
);

-- Channels (live TV)
CREATE TABLE channels (
    id TEXT PRIMARY KEY,                  -- "{playlistId}:{streamId}"
    playlist_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    stream_url TEXT NOT NULL,
    group_title TEXT,
    epg_channel_id TEXT,
    is_hd INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL,
    group_sort_order INTEGER NOT NULL,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE INDEX idx_channels_playlist ON channels(playlist_id);
CREATE INDEX idx_channels_group ON channels(playlist_id, group_title);

-- EPG programs
CREATE TABLE programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    channel_epg_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    start_millis INTEGER NOT NULL,
    stop_millis INTEGER NOT NULL,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);
CREATE INDEX idx_programs_lookup ON programs(playlist_id, channel_epg_id, start_millis);

-- VOD items (movies + series share table via 'kind')
CREATE TABLE vod_items (
    id TEXT PRIMARY KEY,
    playlist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    stream_url TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('MOVIE','SERIES')),
    rating REAL,
    plot TEXT,
    year INTEGER,
    duration_secs INTEGER,
    genres_json TEXT,
    cast_json TEXT,
    director TEXT,
    category_id TEXT,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Series (separate metadata; episodes link here)
CREATE TABLE series (
    id TEXT PRIMARY KEY,
    playlist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_url TEXT,
    backdrop_url TEXT,
    plot TEXT,
    year INTEGER,
    rating REAL,
    genres_json TEXT,
    cast_json TEXT,
    category_id TEXT,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

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

-- VOD categories
CREATE TABLE vod_categories (
    id TEXT PRIMARY KEY,         -- "{playlistId}:{kind}:{xtreamCatId}"
    playlist_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('MOVIE','SERIES')),
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
);

-- Favorites
CREATE TABLE favorites (
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('CHANNEL','MOVIE','SERIES')),
    added_at INTEGER NOT NULL,
    PRIMARY KEY(target_id, target_type)
);

-- Continue watching (series collapse: target_id = seriesId, resume_episode_id = current)
CREATE TABLE continue_watching (
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    position_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    thumbnail_url TEXT,
    resume_episode_id TEXT,      -- series: current episode; movies: NULL
    PRIMARY KEY(target_id, target_type)
);
CREATE INDEX idx_cw_recent ON continue_watching(updated_at DESC);
```

### User preferences (JSON dosya, SQLite değil)

`%APPDATA%\Genc IPTV\settings.json`:

```json
{
  "displayName": "Berke",
  "onboardingCompleted": true,
  "activePlaylistId": 1,
  "themeMode": "DARK",
  "accentKey": "PURPLE",
  "autoUpdateEnabled": true,
  "player": {
    "defaultQuality": "AUTO",
    "decoderPref": "AUTO",
    "preferredAudioLang": "tr",
    "loudnessNormalization": false,
    "pipEnabled": true,
    "userAgentOverride": null,
    "trustAllCerts": false
  },
  "subtitles": {
    "fontFamily": "SANS",
    "fontStyle": "REGULAR",
    "textSizePercent": 100,
    "textColor": "#FFFFFF",
    "textOpacityPercent": 100,
    "backgroundColor": "#000000",
    "backgroundOpacityPercent": 75,
    "windowColor": "#000000",
    "windowOpacityPercent": 0,
    "edgeType": "NONE",
    "edgeColor": "#000000",
    "verticalPosition": "BOTTOM"
  },
  "recentChannels": ["ch1","ch2",...],   // last-N watched channel IDs (FIFO, max 15)
  "lastSyncTimestamp": 1730000000000
}
```

---

## 6 · Harici entegrasyonlar

### 6.1 Xtream Codes API

Endpoint base: `{playlist.url}/player_api.php?username={u}&password={p}&action={a}`

| Action | Kullanım |
|---|---|
| `get_user_info` | Hesap bilgisi (status, exp_date, max_connections) — eklerken doğrulama |
| `get_live_categories` | Canlı kanal kategorileri |
| `get_live_streams` | Tüm canlı kanallar (id, name, stream_icon, category_id, epg_channel_id) |
| `get_vod_categories` | Film kategorileri |
| `get_vod_streams` | Tüm filmler |
| `get_vod_info&vod_id={id}` | Tek film detayı (plot, cast, runtime, rating) |
| `get_series_categories` | Dizi kategorileri |
| `get_series` | Tüm diziler |
| `get_series_info&series_id={id}` | Dizi + bölüm listesi |
| `get_short_epg&stream_id={id}&limit=...` | Kanalın bugünkü EPG'si |

XMLTV (full EPG) endpoint: `{playlist.url}/xmltv.php?username={u}&password={p}`
→ XML, gzip serve edebilir.

Stream URL'leri:
- Canlı: `{playlist.url}/{username}/{password}/{streamId}` (genelde HLS)
- VOD: `{playlist.url}/movie/{username}/{password}/{streamId}.{ext}`
- Dizi bölümü: `{playlist.url}/series/{username}/{password}/{episodeId}.{ext}`

### 6.2 M3U parser

Standart `#EXTM3U` formatı. Her entry:

```
#EXTINF:-1 tvg-id="trt1.tr" tvg-name="TRT 1" tvg-logo="https://..." group-title="Ulusal",TRT 1
http://stream.url/...
```

Çıkar:
- `tvgId` (epg_channel_id)
- `displayName` (TRT 1)
- `tvgLogo` (logo URL)
- `groupTitle` (kategori)
- URL (sonraki satır)

Boş `tvg-logo` ve `tvg-id` null olarak handle edilmeli.

### 6.3 XMLTV parser

```xml
<tv>
  <channel id="trt1.tr">
    <display-name>TRT 1</display-name>
    <icon src="https://..." />
  </channel>
  <programme start="20260507210000 +0300" stop="20260507220000 +0300" channel="trt1.tr">
    <title>Ana Haber</title>
    <desc>...</desc>
    <category>News</category>
  </programme>
  ...
</tv>
```

Davranış:
- Gzip detection: `Content-Encoding: gzip` HEADER veya URL `.gz` ile bitiyorsa
  flate2/gzdecode ile çöz.
- `<programme>` → DB programs tablosuna yazılır.
- `<channel>` blokları (içindeki `<icon>` ve `<display-name>`) **EPG fallback**
  için ayrı tabloya alınabilir (Android'de henüz yok ama Windows'ta düşünülebilir).
- Zaman parsing: `YYYYMMDDHHMMSS ±HHMM` → UTC epoch ms.

### 6.4 TMDB

`https://api.themoviedb.org/3` base, API key BuildConfig'den (env veya
`tauri.conf.json` env').

| Endpoint | Kullanım |
|---|---|
| `/search/movie?query=&year=` | Film poster + cast lookup için ID bul |
| `/search/tv?query=&first_air_date_year=` | Dizi |
| `/movie/{id}/credits` | Cast listesi |
| `/tv/{id}/credits` | Cast listesi |
| Image base: `https://image.tmdb.org/t/p/{size}{path}` | Poster URL'i (size: w185, w342) |

**PosterEnricher logic** (Android'de var, port et):
- VOD list emit edildikçe boş poster'ları topla
- In-memory dedup set (aynı oturumda aynı ID iki kez sorulmaz)
- Concurrency throttle: max 6 paralel istek (TMDB free tier 50/sec)
- Bulunan URL'i SQLite'a yaz → frontend cache invalidate olur → otomatik yeniler

### 6.5 HTTP istemcisi

Tek shared `reqwest::Client` instance (lazy_static / OnceCell):
- Custom User-Agent (`UserPreferencesService.player.userAgentOverride` varsa)
- Trust-all-certs flag → `danger_accept_invalid_certs(true)` (ayar aktifse)
- Connection pool, timeout 15sn

---

## 7 · Video oynatıcı

### Phase 1 — HLS.js + `<video>` (MVP)

```tsx
// src/components/Player/Player.tsx
import Hls from 'hls.js';
import { useEffect, useRef } from 'react';

export function Player({ src, onReady }: { src: string; onReady?: (v: HTMLVideoElement) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;

    if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(v);
      return () => hls.destroy();
    }
    onReady?.(v);
  }, [src]);

  return <video ref={videoRef} controls={false} className="w-full h-full bg-black" />;
}
```

**Limitasyonlar (MVP'de kabul edilebilir):**
- MPEG-TS (UDP) yok → Xtream HLS endpoint'lerini kullan
- DASH için ayrı: `dash.js`
- SSL bypass için Rust proxy gerekecek (aşağı bakın)
- Custom User-Agent için yine Rust proxy

### Phase 1.5 — Rust HTTP proxy (SSL bypass + UA)

`HLS.js` browser fetch API kullanır → User-Agent ve SSL trust browser'ın
kontrolünde. Bunu aşmak için:

```rust
// Yerel HTTP server (loopback'te) açıp Rust reqwest ile proxy yapacağız
#[tauri::command]
async fn start_stream_proxy(stream_url: String, user_agent: Option<String>, trust_all: bool) -> String {
    // 127.0.0.1:0 üzerinde dinle, gelen isteği reqwest ile original URL'e ilet
    // Frontend'e local proxy URL'i döndür
    ...
}
```

Frontend `<video src="http://127.0.0.1:42312/proxy/abc">` ile oynar; Rust
arka planda gerçek stream'i çeker.

### Phase 2 — MPV entegrasyonu (öneri, isteğe bağlı)

İleri seviye codec, MPEG-TS, RTMP desteği için **libmpv** binding:
- Crate: `libmpv-sys` veya `libmpv-rs`
- Tauri'de native mpv window aç → frontend embed eder
- Çok daha karmaşık ama çok daha güçlü

V1'de gerek yok; Phase 1 yetiyorsa ileri ertele.

### Player UI elementleri (her iki yaklaşımda da)

Tasarım brief'inde detaylı; kısaca:
- Top bar: ← Geri / Logo + isim / ★ favori / ⚙
- Center: ⏪ -10s / ⏯ play-pause / ⏩ +10s / ⏭ skip-next (dizi)
- Bottom: scrub bar + time codes (mono) / aspect ratio / PiP / fullscreen
- Auto-hide 2sn aktivite yoksa
- Klavye: Space / ←→↑↓ / F / M / Esc

---

## 8 · Persistence

### SQLite (sqlx)

```rust
// src-tauri/src/data/db.rs
use sqlx::sqlite::SqlitePool;

pub static DB_POOL: OnceCell<SqlitePool> = OnceCell::new();

pub async fn init(app_data_dir: &Path) -> Result<()> {
    let db_path = app_data_dir.join("genciptv.db");
    let url = format!("sqlite://{}?mode=rwc", db_path.display());
    let pool = SqlitePool::connect(&url).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    DB_POOL.set(pool).ok();
    Ok(())
}
```

Migrations folder structure: `001_init.sql`, `002_add_resume_episode_id.sql`,
... — her yeni schema değişikliği yeni dosya. Sqlx migrate macro'su sürüm
takibini otomatik yapar.

### Settings (JSON)

`tauri-plugin-store` ile basit key-value:

```rust
let store = app.store("settings.json")?;
store.set("theme.mode", json!("DARK"));
store.save()?;
```

Frontend'de:
```ts
import { Store } from '@tauri-apps/plugin-store';
const store = await Store.load('settings.json');
await store.set('theme.mode', 'DARK');
```

### File locations

- DB: `%APPDATA%\Genc IPTV\genciptv.db`
- Settings: `%APPDATA%\Genc IPTV\settings.json`
- Logs: `%APPDATA%\Genc IPTV\logs\app-{date}.log`
- Cache (image): `%LOCALAPPDATA%\Genc IPTV\cache\images\`

---

## 9 · Windows-spesifik entegrasyonlar

### 9.1 Pencere yönetimi (Tauri)

`src-tauri/tauri.conf.json`:
```json
{
  "app": {
    "windows": [
      {
        "title": "Genç IPTV",
        "width": 1440,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 640,
        "decorations": false,            // custom title bar
        "fullscreen": false,
        "resizable": true,
        "center": true,
        "url": "index.html"
      }
    ]
  }
}
```

`tauri-plugin-window-state` ile son açılış pozisyonunu hatırla.

### 9.2 Custom title bar

Frontend'de top-bar üst kısmına `data-tauri-drag-region` koy:
```tsx
<div data-tauri-drag-region className="h-8 bg-bg flex items-center px-3">
  <BrandLogo size={20} />
  <div className="flex-1" />
  <WindowControls />  {/* min/max/close butonları */}
</div>
```

### 9.3 Tray icon

```rust
use tauri::tray::TrayIconBuilder;
use tauri::menu::{MenuBuilder, MenuItemBuilder};

let menu = MenuBuilder::new(app)
    .item(&MenuItemBuilder::new("Aç").id("open").build(app)?)
    .item(&MenuItemBuilder::new("Devam Et").id("resume").build(app)?)
    .separator()
    .item(&MenuItemBuilder::new("Mini Player").id("mini").build(app)?)
    .item(&MenuItemBuilder::new("Ayarlar").id("settings").build(app)?)
    .separator()
    .item(&MenuItemBuilder::new("Çıkış").id("quit").build(app)?)
    .build()?;

TrayIconBuilder::new()
    .icon(app.default_window_icon().unwrap().clone())
    .menu(&menu)
    .on_menu_event(|app, event| match event.id().as_ref() {
        "open" => app.get_webview_window("main").unwrap().show().unwrap(),
        "quit" => app.exit(0),
        _ => {}
    })
    .build(app)?;
```

### 9.4 Single-instance lock

`tauri-plugin-single-instance` — uygulamayı ikinci kez açtığında mevcut
pencereyi öne getir.

### 9.5 File association (`.m3u`)

`tauri.conf.json` → `bundle.windows.fileAssociations`:
```json
{
  "fileAssociations": [
    {
      "ext": ["m3u", "m3u8"],
      "name": "M3U Playlist",
      "description": "Genç IPTV Playlist",
      "role": "Editor"
    }
  ]
}
```

`main.rs`'te startup args'tan dosya yolunu oku, "Yeni Playlist" sheet'ini
ön-doldurulu aç.

### 9.6 Auto-update

`tauri-plugin-updater` + Github Releases (veya kendi sunucu). Updates
endpoint'i imzalı manifest döner; uygulama her açılışta kontrol eder.

### 9.7 Multi-monitor & fullscreen player

Player için ayrı pencere açma seçeneği (kullanıcı sağ tık → "Yeni pencerede
oynat"). Tauri'de yeni pencere oluşturmak basit.

---

## 10 · Özellik implementasyon listesi (öncelikli)

### Phase 1 — Core (MVP)
- [ ] Onboarding (M3U + Xtream form)
- [ ] DB init + migrations
- [ ] Playlist sync (M3U + Xtream live channels)
- [ ] Sidebar + Channels page
- [ ] Channel kategori picker (glyph row)
- [ ] Channel listesi
- [ ] Live player (HLS.js)
- [ ] Custom title bar + window controls
- [ ] Settings: Playlist Yönetimi (add/remove/sync)

### Phase 2 — VOD
- [ ] Movies grid + detail page
- [ ] Series grid + detail page (sezon/bölüm)
- [ ] VOD player (seek, ±10s, fullscreen)
- [ ] Skip-next butonu (dizi)
- [ ] Continue watching ekranı + kart
- [ ] Series dedup logic (resumeEpisodeId)

### Phase 3 — Polish
- [ ] EPG sync + Program Rehberi grid
- [ ] Search modal (Ctrl+F)
- [ ] Favoriler (3 sekme + swipe)
- [ ] TMDB cast + poster fallback
- [ ] Settings: Player + Subtitle + Theme/Accent
- [ ] Auto-sync gate (>6sa eskiyse)
- [ ] Recent channels + Home dashboard

### Phase 4 — Premium
- [ ] Animated splash sekansı (Splash.html port)
- [ ] System tray icon + menü
- [ ] Mini player widget (PiP)
- [ ] Klavye kısayolları (tüm liste)
- [ ] Drag-drop M3U dosyası
- [ ] File association + multi-instance lock
- [ ] Auto-update channel
- [ ] Multi-monitor fullscreen

### Phase 5 — Hardening
- [ ] Logging (tracing → file rotate)
- [ ] Error boundaries (React) + crash reporting (Sentry opsiyonel)
- [ ] HLS fallback ladder (HLS → progressive same URL → progressive .ts variant)
- [ ] HTTP proxy for SSL bypass + custom UA
- [ ] Localization scaffold (Türkçe sabitler izole)
- [ ] Code signing + MSI installer

---

## 11 · Android'den taşıması kritik davranış kalıpları

Bunlar Android tarafında battle-tested; Windows port'unda **birebir aynı
davranışı** verecek şekilde implement et:

### 11.1 Auto-sync gate (`StartDestinationViewModel.kt`)
- Cold start'ta aktif playlist'in `lastSyncedAt` 6 saatten eskiyse → Syncing
  ekranına yönlendir, sync biter bitmez Home'a geç.
- 6 saatten taze ise direkt Home — kullanıcıyı bekletme.
- runningReduce ile latch: sync sonrası `lastSyncedAt` yenilense bile
  startRoute "syncing" → "home" flip etmez, splash'tan navigate edilen
  Home değişmez.

### 11.2 Series ContinueWatching dedup (`VodPlayerViewModel.savePosition`)
- Movies: `targetId = movieId, resumeEpisodeId = null`
- Series: `targetId = seriesId, resumeEpisodeId = currentEpisodeId`
- PK `(targetId, targetType)` → upsert series row → bir dizi için yalnızca
  bir entry, en son izlenen bölüme resume.
- Series.id null ise (henüz yüklenmemiş) save'i ATLA — yarış koşulundan
  bozuk row oluşmasın.

### 11.3 HLS fallback ladder (`PlayerScreen.kt`)
Player hata verdiğinde 3 aşamalı geri çekilme:
1. **HLS** (initial)
2. **HLS hata** → aynı URL **progressive** (mp4 / ts) olarak dene
3. **Yine hata** → URL'in `.m3u8`'ini `.ts`'ye değiştir, progressive olarak dene
4. **Tüm aşamalar tükendi** → "Yayın açılamıyor" hata overlay'i

Her stream URL için tried-stage tracking (lokal state).

### 11.4 PosterEnricher (`PosterEnricher.kt`)
- VOD listesi her emit edildiğinde, posterUrl boş olanları topla.
- Per-session in-memory `attempted` set (Concurrent set).
- Semaphore ile max 6 paralel TMDB isteği.
- Long-lived scope (session-bound) — ViewModel cancel olsa da mevcut lookup
  bitsin.
- Bulunan URL'i DAO update → Flow re-emit → UI otomatik refresh.

### 11.5 Sync error swallowing (`PlaylistRepository.syncXtream`)
- VOD ve Series sync ayrı `runCatching` içinde — bir tanesi hata verse de
  live channels yine güncellenir.
- EPG sync de ayrı runCatching — sağlayıcı `xmltv.php` serve etmiyorsa
  uygulama yine açılır, sadece EPG yok.
- Log seviyeleri: live = error (kritik), VOD/Series/EPG = warn (informational).

### 11.6 EPG diagnostic logging (`GuideViewModel`, `EpgRepository`)
- XMLTV indirilirken: URL + program count + distinct channel-id sample log.
- Live sync sırasında: kaç kanal `epgChannelId` ile geldi, sample log.
- Guide query sırasında: kaç ID ile sorgu, kaç sonuç, mismatch varsa açık görünür.
  Bu loglar EPG bozuksa hangi katmanda kırıldığını anlamak için zorunlu.

### 11.7 Channel logo URL normalisation (`XtreamMapper.toChannel`)
Bazı sağlayıcılar relative URL döner (`images/logo.png`). Absolute hale çevir:
```rust
fn normalise_image_url(raw: Option<&str>, server_base: &str) -> Option<String> {
    let trimmed = raw?.trim();
    if trimmed.is_empty() { return None; }
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return Some(trimmed.to_string());
    }
    let base = server_base.trim_end_matches('/');
    let path = if trimmed.starts_with('/') { trimmed.to_string() } else { format!("/{}", trimmed) };
    Some(format!("{}{}", base, path))
}
```
Hem live channel logosu hem VOD/Series posteri için uygula.

### 11.8 Search local TextField state (`SearchScreen.kt`)
- Search input'unu local state'te tut (`useState`), VM'e debounced push et.
- VM'den geri besleme yapma → cursor jumping bug'ı yok.
- Debounce 250ms, MIN_QUERY_LENGTH = 2.

### 11.9 Marquee scroll (`DevamEtCard`)
- 5sn duraklama her iterasyon arası
- Title + subtitle TEK marquee Column'a sarılı (drift önler)
- 1.5sn initial delay (image decode + layout settle)

### 11.10 Keep-screen-on (player)
- Window'a "prevent display sleep" flag eklenmeli (Windows: `SetThreadExecutionState`
  with `ES_DISPLAY_REQUIRED | ES_CONTINUOUS`)
- Player ekranı açıkken aktif, dispose'da temizle
- Tauri için Rust crate: `winapi::um::winbase::SetThreadExecutionState`

### 11.11 Bottom-nav style tab switching (Android'in bottomNav popUpTo pattern'i)
- Sidebar tab'ları arasında geçişte: kanal listesinde scroll vb. state'i koru
  → React Router yerine custom navigator (Zustand store) ile saved state
  pattern'i. Ya da `react-router`'ın `<Outlet>` + `key` trick'leri.

### 11.12 Bağımsız nav: drill-in vs tab
- Profil → Favoriler/Guide gibi drill-in geçişler **plain push** (geri tuşu
  Profil'e döner)
- Sidebar tab geçişleri **replace + saveState** (back stack birikmez)

---

## 12 · Build & dağıtım

### Geliştirme

```bash
# İlk kurulum
cd genc_iptv_windows
npm install
npm run tauri dev    # Frontend hot-reload + Rust auto-rebuild
```

### Production build

```bash
npm run tauri build
```

Çıktılar:
- `src-tauri/target/release/bundle/msi/Genc IPTV_1.0.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Genc IPTV_1.0.0_x64-setup.exe`

### Code signing (önerilir)

SmartScreen reputation için EV code signing certificate:
1. Sertifika satın al (Sectigo, DigiCert vb. ~$300-600/yıl)
2. `tauri.conf.json` → `bundle.windows.signCommand` ekle:
   ```json
   {
     "signCommand": "signtool sign /tr http://timestamp.sectigo.com /td sha256 /fd sha256 /a %1"
   }
   ```

### Auto-update endpoint

```toml
# tauri.conf.json
"updater": {
  "active": true,
  "endpoints": ["https://updates.genciptv.com/{{target}}/{{current_version}}"],
  "pubkey": "..."
}
```

Backend (Github Releases örneği): JSON manifest döner, signature ile imzalı.

### Sürüm numaralama

Semver: `1.0.0` ilk release.
- `1.0.x` → bug fix
- `1.x.0` → yeni özellik
- `x.0.0` → breaking schema veya nav change

---

## 13 · Test stratejisi

### Unit (Rust)

```rust
#[tokio::test]
async fn parses_m3u_with_relative_logo() {
    let m3u = "#EXTM3U\n#EXTINF:-1 tvg-logo=\"images/trt1.png\",TRT 1\nhttp://stream.url";
    let entries = parse_m3u(m3u);
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].tvg_logo, Some("images/trt1.png".to_string()));
}
```

Tüm parser'lar (M3U, XMLTV, Xtream JSON) için ≥10 fixture test.

### Component (React)

Vitest + Testing Library:
```ts
test('SearchInput debounces and pushes to VM', async () => {
  const onChange = vi.fn();
  render(<SearchInput onChange={onChange} debounceMs={250} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
  expect(onChange).not.toHaveBeenCalled();
  await waitFor(() => expect(onChange).toHaveBeenCalledWith('test'), { timeout: 500 });
});
```

### E2E (manuel + Playwright opsiyonel)

Manuel test list (her release öncesi):
- [ ] Cold start: animated splash → Home, sync gate doğru tetikleniyor
- [ ] Yeni M3U ekle → senkronize ediliyor → kanal listesi geliyor
- [ ] Yeni Xtream ekle → user info doğrulaması, login başarısızsa hata mesajı
- [ ] Canlı kanal aç → 5sn'de oynamaya başlıyor
- [ ] EPG: Guide ekranına girince program rehberi yükleniyor
- [ ] Film aç → poster + plot + cast geliyor
- [ ] Dizi aç → sezon listesi → bölüm aç → izle → sonraki bölüme geç → Devam Et'te tek satır
- [ ] Favoriye ekle → Favoriler sekmesinde gözüküyor → kaldır
- [ ] Search Ctrl+F → "trt" yaz → 3 bölümde sonuç
- [ ] Tema değiştir (light/dark/system) → tüm ekranlar düzgün
- [ ] Accent değiştir → buton/slider rengi değişiyor
- [ ] Subtitle ayarları → live preview anında güncelliyor
- [ ] Pencere boyutlandır → sidebar collapse, grid sütun sayısı responsive
- [ ] Multi-monitor: ikinci ekrana sürükle, fullscreen aç
- [ ] Sistem tray: simgeyi sağ tık menü çalışıyor
- [ ] Drag-drop M3U: dosyayı pencereye bırak, "Yeni Playlist" doluyor
- [ ] Klavye kısayolları (Ctrl+F, Space, F11, Esc, vs.)
- [ ] Auto-update: yeni sürüm geldiğinde dialog açılıyor

---

## 14 · Performans hedefleri

| Metrik | Hedef |
|---|---|
| Cold start (splash → Home) | <2 sn (taze sync), <8 sn (stale sync) |
| Channel list scroll (1000 kanal) | 60fps |
| Movie grid scroll | 60fps |
| Player ilk kare (HLS) | <3 sn |
| Sidebar tab switch | <50ms perceived (instant) |
| Memory (idle) | <250MB |
| Memory (player + grid) | <500MB |
| Disk: DB (1000 kanal + 5000 program + 2000 VOD) | <50MB |
| Final installer | <15MB |

---

## 15 · Acceptance kriterleri (v1 release için)

1. ✅ Phase 1-3 tüm özellikler çalışıyor (MVP + VOD + Polish)
2. ✅ Phase 4'ten en az: tray icon, klavye kısayolları, splash sekansı
3. ✅ MSI installer + EXE installer üretiliyor, code-sign'lı
4. ✅ Auto-update mekanizması aktif (manifest endpoint çalışıyor)
5. ✅ Tüm kritik kullanıcı yolu manuel testten geçti (yukarıdaki E2E listesi)
6. ✅ Crash/error logging dosya bazlı çalışıyor
7. ✅ Performans hedeflerinin %90'ı tutturuluyor
8. ✅ Light + Dark tema, 8 accent renk hepsi deploy ediliyor
9. ✅ En az 3 farklı IPTV sağlayıcısıyla test edildi (M3U + Xtream karışık)
10. ✅ Tasarım brief'iyle (`design-brief-windows.md`) görsel uyum %95+

---

## 16 · Referanslar

| Konu | Dosya |
|---|---|
| Tasarım brief'i | `design-brief-windows.md` |
| Splash animasyonu | `Splash.html` |
| Logo asset spec'i | `App Icon.html` |
| Mevcut Android tüm kaynak | `app/src/main/java/com/genciptv/player/` |
| Renk + typography token tanımları | `app/.../core/designsystem/Color.kt`, `Typography.kt` |
| Davranış dokümantasyonu (yorumlu kod) | `app/.../data/repository/*.kt`, `feature/*/ViewModel.kt` |
| Migration örneği | `app/.../data/source/local/AppDatabase.kt` (v3 = resume_episode_id) |
| Mevcut HTML mockup'lar | `genc-iptv-ui-referans-guncel.html` (eski Android UI), `new_design/` |

---

## 17 · İlk hafta sprint önerisi

**Gün 1-2: Skeleton**
- Tauri 2 projesi başlat, React + TS + Vite + Tailwind kur
- Sidebar + dummy pages (Home, Channels, Settings)
- Custom title bar + window controls
- Dark theme tokens (CSS vars), accent palette switcher

**Gün 3-4: Data layer**
- SQLite migration runner, ilk şema
- Tauri commands: `add_m3u_playlist`, `add_xtream_playlist`, `sync_playlist`
- M3U parser + Xtream client (Rust)
- TanStack Query + ilk channels query

**Gün 5-7: Channel flow**
- Channels page: kategori picker + liste
- HLS.js entegre edip Live Player MVP
- Onboarding ekranı (playlist add)
- Settings: Playlist Yönetimi temel
- Animated splash (Splash.html port → React + framer-motion)

İkinci hafta: VOD path. Üçüncü hafta: EPG + Search. Dördüncü hafta: polish + installer.

---

**Implementer notu**: Android kodu çalışan referans, ama re-implement çoğu
yerde daha doğal. Davranış spec'ini Kotlin satırlarından değil bu brief'in
"11. Davranış kalıpları" bölümünden tetkik et — orada zaten distile edilmiş.
Sıkıştığında Android codebase'i okumak hızlı (özellikle ViewModel'lar).
Sorudan kaçma; bu ürün polish'ten yaşıyor — küçük UX detayları (marquee
delay'i, fade easing'i, splash timing'i) kalitesini belirliyor.
