# Genç IPTV — Windows

Modern Windows masaüstü IPTV oynatıcısı. Tauri 2 + React + TypeScript ön
yüz, doğrudan ana pencereye `wid` ile attach edilmiş **libmpv2** video
motoru. Xtream Codes ve M3U playlist'lerini, Canlı kanalları, VOD
(film + dizi), EPG ve "Devam Et" akışını destekler.

## Özellikler

- **VOD oynatıcı** — film + dizi, kaldığın yerden devam, otomatik
  sonraki bölüm, oynatma hızı, altyazı senkron + stil ayarları, ses /
  altyazı track seçimi, buffer health göstergesi.
- **Canlı kanallar** — EPG entegrasyonu, "şu an oynayan" rozetleri,
  takılma tespiti + otomatik retry, hata recovery overlay'i.
- **Anasayfa** — 5 farklı layout (Billboard, Top10, Editorial Hybrid,
  Wide Tile, Editorial Rails), session-bazlı rotating hero, "Önerilen
  Filmler", "Devam Et" ve "İzledikleriniz" rail'leri.
- **TMDB + Fanart.tv enrichment** — Türkçe başlık parser, textless +
  16:9 backdrop önceliği, lazy per-detail enrichment.
- **Ayarlar** — Oynatma (codec / decoder / cache / network timeout),
  Altyazı (font / renk / kenar / pozisyon), Tema, Playlist yönetimi.
- **Mini player** — 420×240 always-on-top tile, playback devam eder.
- **Klavye kısayolları** — `?` ile cheat sheet, gezinme + oynatma
  bağlamaları.

## Teknoloji

- **Backend (Rust)**: Tauri 2, libmpv2, sqlx (SQLite), reqwest, tokio
- **Frontend (TypeScript)**: React 18, TanStack Query, Zustand,
  framer-motion, React Router

## Kurulum (dev)

Gereksinimler:
- Node.js 20+
- Rust toolchain (`rustup`)
- Tauri sistem gereksinimleri (Windows: Microsoft Visual Studio
  Build Tools, WebView2)

```powershell
npm install
npm run tauri dev
```

İlk Cargo derlemesi 3-5 dk sürebilir; sonraki incremental build'ler
~15-30 sn.

## Ortam değişkenleri

`.env` dosyasını proje kökünde oluştur:

```
TMDB_API_KEY=<api.themoviedb.org/v3 key>
FANART_TV_API_KEY=<webservice.fanart.tv v3 key>
```

İkisi de **opsiyonel** — yoksa enrichment devre dışı kalır, app yine
çalışır. TMDB ücretsiz key veriyor; Fanart ücretsiz "personal" key
isteyebilirsiniz.

## Yapı

```
src/                  React frontend
  pages/              Route components (Home, Films, Watch, Player, ...)
  components/         Reusable UI primitives
  features/           React Query hooks per domain
  stores/             Zustand stores (theme, ui, settings)
  lib/                Tauri bindings, i18n
src-tauri/src/        Rust backend
  commands/           Tauri command surface
  source/             Data sources (mpv, xtream, m3u, tmdb, fanart_tv, ...)
  data/               SQLite + models + row mapping
  service/            Sync + enrichment services
```

## Build (release)

```powershell
npm run tauri build
```

`.exe` + MSI bundle `src-tauri/target/release/bundle/` altında oluşur.

## Lisans

Kişisel kullanım amaçlı. Lisans henüz belirlenmedi.
