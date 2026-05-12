# Genç IPTV — Windows Masaüstü Uygulaması Tasarım Brief'i

> Bu doküman, mevcut Android uygulamasının özelliklerine birebir karşılık gelen
> bir Windows masaüstü versiyonunun **görsel ve etkileşim tasarımı** için
> hazırlanmış brief'tir. Hedef kitle: tasarımcı bir AI (Claude / GPT vb.).
> İmplementasyon platformu (Electron / Tauri / WPF / WinUI 3) ayrı bir karar;
> bu doküman implementation-agnostic.

---

## 1 · Ürün özeti

**İsim:** Genç IPTV
**Slogan adayı:** _"Premium IPTV — şık, hızlı, anlaşılır."_ (tasarımcı revize edebilir)
**Tek cümlelik tanım:** M3U ve Xtream Codes destekli, canlı kanal + film + dizi yayını izleyen, Türkiye odaklı premium IPTV oynatıcı.

**Kullanıcı persona:**
- Kendi IPTV aboneliği olan kullanıcılar (M3U URL veya Xtream credentials sahibi)
- Türkçe kullanıcı arayüzü beklentisi yüksek
- TV içerikleri kadar film ve dizi tüketimi de yüksek (catch-up VOD önemli)
- Genelde "Kodi / VLC playlist + EPG" düzeyini bulunca memnun, ama estetik beklentisi yüksek (Apple TV / Netflix'e alışmış)

**Tonal yön:**
- **Editorial premium** — magazine/nieuwslette tarzı tipografik kontrast, hairline divider, monospace meta-bilgi
- **Cold tech değil**: koyu temada bile sıcak Copper accent, hafif film grain dokular
- **Gürültüsüz**: çok az renk, ikon/glyph yerine 2-3 harflik abbreviation kullanılması tercih edilir (kategori chip'leri için)

---

## 2 · Marka kimliği (sabit, değiştirme)

### Logo
Üç katmanlı G işareti (32×32 viewport):
1. **Gümüş halka** — `#E2E6E7 → #9FA5A7 → #4F5557` linear gradient (0→55%→100%, diyagonal)
2. **Bakır alt eğri** — `#E0A878 → #7A4A2A` (G'nin sağ açıklığını kapatan ¼ daire)
3. **Teal play üçgeni** — `#5DEAD8 → #0E8A7C` (ortada, IPTV kimliği)

Vektör asset hâlihazırda hazır; bu logo **her ekranda aynı şekilde** kullanılır. Renk varyasyonları:
- **Default**: gradient gümüş+bakır+teal
- **Light tema**: aynı gradient, biraz daha koyu silver tonları
- **Mono / accent zemin**: beyaz silüet + koyu play üçgeni

### Renk paleti

| Token | Dark | Light | Kullanım |
|---|---|---|---|
| `Bg` | `#0E1213` | `#F6F2EC` | Sayfa zemini |
| `BgElev` | `#161B1D` | `#FFFFFF` | Modal, sidebar, kart |
| `BgElev2` | `#1F2A2C` | `#EFE9E0` | Hover, aktif satır |
| `TextPrimary` | `#E8EDEC` | `#14120E` | Başlık, ana metin |
| `TextSecondary` | `#9DA8A6` | `#5A564D` | Alt başlık, meta |
| `TextTertiary` | `#6A7472` | `#8A857A` | Disabled, ikincil sayaç |
| `Border` | `#1F2A2C` | `#E5DFD3` | 1.5dp kart kenarları |
| `Line` | `#161B1D` | `#EFE9E0` | 0.5dp hairline divider |
| `Copper` (sabit accent) | `#C68A5C` | `#A8693C` | Yıldız, "favori", iz bırakan vurgular |
| `Live` (canlı dot) | `#3FD0BD` | `#0F8A7E` | "Canlı", "Yükleniyor…", play durumu |

**Accent palet sistemi**: Kullanıcı 8 renkten biri seçer (Mor, Kırmızı, Mavi, Yeşil, Bakır, Turkuaz, Sarı, Gri). Seçilen accent **butonların primary rengi, slider thumb'ı, seçili kategori ring'i** vs. olur. Logo ve "Live/Copper" tokenları accent'ten BAĞIMSIZDIR (semantik anlam taşır).

### Tipografi

| Aile | Kullanım |
|---|---|
| **Instrument Serif** | Editorial başlıklar ("Kategoriler", "Hoş geldin, Berke.", "Genç" wordmark). Italic varyantı splash için |
| **Geist** (sans) | Tüm gövde metni, button, list item başlık |
| **Geist Mono** | Sayaçlar, time codes, tag'ler ("IPTV PLAYER", "12 KANAL", "01:23:45"), letter-spacing 0.06–0.18em uppercase tag |

Üç font da Google Fonts'tan ücretsiz; Windows fallback için Segoe UI (sans) + Cascadia Code (mono) + Cambria (serif) kabul edilebilir.

### Görsel kalıplar

- **Hairline dividers** (1px line, `Line` token) — kartlar arasında
- **1.5dp Border** — kart/section kutularında
- **Editorial header**: büyük Instrument Serif başlık + altta küçük mono caps meta satırı (örn. "12 koleksiyon · 1 247 kanal")
- **Glyph chip**: 46×46 daire, 1.2dp gradient ring, içinde 3-harfli mono abbreviation (örn. "SPO" / "HAB" / "UHD")
- **Pulse + halo**: splash'ta logo etrafında genişleyen teal ring
- **Marquee scroll**: dar alanda uzun isimler için yatay kayan metin (5sn duraklama)
- **Modal slide**: Player aşağıdan yukarı kayarak açılır, geri tuşunda yukarıdan aşağı kayarak kapanır

---

## 3 · Platform & teknik kısıtlar

- **Hedef OS**: Windows 10 (1809+) ve Windows 11
- **Min pencere**: 1024×640 (sidebar daraltılmış mod)
- **Önerilen pencere**: 1440×900
- **Maks**: pencere sınırsız + tam ekran (player için F11)
- **Tema**: kullanıcı seçimi (Açık / Koyu / Sistem). Sistem teması Windows'tan okunur.
- **Pencere chrome'u**: tasarımcı seçer — system title bar (mütevazı) veya custom title bar (markaya entegre, drag region ile). Önerim: custom; Mica/acrylic blur Windows 11'de tema BG ile lerp edilebilir.
- **Mouse + klavye birinci sınıf**: hover state, focus ring, tab navigation, klavye kısayolları zorunlu
- **Touch ikincil**: dokunmatik Windows tablet desteği nice-to-have

---

## 4 · Bilgi mimarisi (sidebar-first)

Sol taraf sidebar (240dp varsayılan, 64dp daraltılmış mod). Üst-alt grup mantığı:

```
┌───────────────────────┐
│  ▣  Genç              │  ← Logo + wordmark (sidebar daraltılmışsa sadece logo)
│     IPTV              │
├───────────────────────┤
│  🔍 Ara          Ctrl+F│  ← Search (kutu / link)
├───────────────────────┤
│  ⌂  Anasayfa          │
│  ▶  Kanallar          │
│  ★  Filmler           │
│  □  Diziler           │
│  📅 Program Rehberi    │
│  ♥  Favoriler         │
├───────────────────────┤
│                       │
│  ↓ (sidebar boşluğu)  │
│                       │
├───────────────────────┤
│  ⚙  Ayarlar           │
│  👤 Berke ▾           │  ← Profil avatarı + dropdown
└───────────────────────┘
```

**Top bar (içerik alanının üstünde, 56dp)**: opsiyonel breadcrumb, sağda playlist seçici (aktif playlist + dropdown), bildirim ikonu, küçült/büyüt/kapat (custom chrome'da).

**Mini player overlay**: oynatma başladığında sağ alt köşede 320×180 mini player widget (kullanıcı küçültürse). Always-on-top toggle ile pencere arkasında oynatma devam edebilir.

---

## 5 · Özellik kataloğu (sayfa sayfa)

### 5.1 Onboarding (ilk açılış)

- 2-3 step wizard
  - Hoş geldin (logo animasyonu, kısa karşılama)
  - Playlist ekle (M3U URL / Xtream credentials sekmeleri)
  - İsim gir (görünen ad)
- Geç-atla yok; playlist eklenene kadar uygulama açılmaz
- Form validation: URL formatı, Xtream auth ön testi (`get_user_info` çağrısı)
- Hata durumlarında inline mesaj + "Tekrar dene" butonu

### 5.2 Auto-sync gate

- Uygulama açılırken son sync 6 saatten eskiyse → sync ekranı
- Markalı splash sekansından sonra **veya** ana ekran üzerine overlay
- "Sağlayıcı içerikleri güncelleniyor…" + ilerleme barı (determinate ya da pulse)
- Senkron başarısız olursa silent fallback ile ana ekrana geçer (kullanıcı stale data ile devam eder)

### 5.3 Anasayfa (dashboard)

Yatay kaydırılabilir rail'lerin dikey yığını:

1. **Karşılama**: "Hoş geldin, [İsim]." (Instrument Serif 28-36sp, italic değil)
2. **Devam Et** rail (varsa) — 16:9 banner kartlar; her kart:
   - Banner üzerinde: marka rozeti + ilerleme barı (alt 3px copper accent)
   - Banner altında: dizi/film adı + alt yazı (S2·B7 gibi). **Marquee scroll** uzun metinler için.
   - Aynı dizinin farklı bölümleri için **tek satır** (en son izlenen episode'a resume)
3. **Son Eklenen Filmler** rail — 2:3 poster kartlar
4. **Son Eklenen Diziler** rail — 2:3 poster kartlar
5. **Son İzlenen Kanallar** rail — 1:1 logo tile (kanal logosu + kanal adı altta)
6. **Live şu an** önerisi (opsiyonel) — şu an yayında olan öne çıkan kanallar

Hover'da kart hafif yükselir + shadow derinleşir. Klik → ilgili detay/player.

### 5.4 Kanallar

İki modlu:

**Mod A — Kategori seçici** (varsayılan giriş ekranı):
- Editorial header: "Kategoriler" + meta "8 koleksiyon · 1 247 kanal"
- Tek sütun glyph row listesi:
  - Sol: 46dp gradient ring + 3-harfli mono abbreviation (örn. "SPO", "ULU", "UHD")
  - Orta: kategori adı (Geist 16sp SemiBold)
  - Sağ: kanal sayısı (Geist Mono 11sp) + chevron
- En üstte "Tümü" satırı (accent gradient, ✦ glyph)
- Tıklandığında: kanal listesi moduna geçer (right-pane'e açılabilir veya page transition ile)

**Mod B — Kanal listesi**:
- Üst arama kutusu (debounced), aktif kategori chip'i
- Liste satırı (74dp yükseklik):
  - 48dp kanal logosu (radius 9px, beyaz arkaplan üzerinde)
  - Kanal adı + altında **şu anki program adı** (EPG'den, varsa)
  - Sağda: yıldız (favori), CANLI / HD pill'i
- Hover'da satır arka planı `BgElev2`'ye boya
- Klik → Live Player'a geç

### 5.5 Canlı oynatıcı (Live Player)

- Tam genişlik video alanı + üstte yarı saydam top bar
- Top bar: ← Geri | Kanal logosu + adı | ★ favori | ⚙ ayarlar
- Alt bar (otomatik gizlenen, fare hareketinde gelir):
  - Sol: ▶/⏸ play-pause | 🔊 ses | mute
  - Orta: kanal değiştir oklari (◀ ▶) — önceki/sonraki kategori içi kanal
  - Sağ: 🔲 PiP | ⛶ tam ekran (F11) | aspect ratio (orijinal / 16:9 / 21:9 / stretch / fit)
- Şu anki program adı + başlangıç/bitiş saatleri overlay olarak alt-orta
- 2 saniye aktivite yoksa kontroller fade out
- Çift tıklama: tam ekran toggle
- Klavye: Space (pause), F (fullscreen), M (mute), ←/→ (kanal değiştir), Esc (geri)
- Hata durumu: "Yayın yok" + retry butonu + alternatif fallback URL'leri

### 5.6 Filmler (VOD)

- Üst tab'lar: **Tümü** (varsayılan) | kategori chip'leri (Aksiyon, Komedi, Korku, ...)
- Üst sağda: arama kutusu, sırala (Yeni / Alfabetik / Yıl / Puan)
- 6 sütun (1440px+) ya da 4 sütun (≤1280px) responsive grid:
  - Poster card (2:3 aspect, radius 12)
  - Hover'da: scale 1.02 + shadow + üstte hızlı oynat ▶ butonu
  - Altında: başlık + yıl + ⭐ puan
- "Devam Et" rail'i en üstte (varsa)
- TMDB poster fallback: poster_url null ise TMDB'den fetch (kullanıcı kodunda zaten var)
- **Sıralama**: Tümü kategorisinde **id DESC** (en yeniden eskiye), kategori spesifik seçilmişse alfabetik

### 5.7 Film detay sayfası

- Üst yarı: backdrop (TMDB) + sol alt poster + sağ panel:
  - Başlık + yıl + süre + ⭐ puan
  - **Devam Et** ya da **▶ İzle** primary butonu (büyük, accent renk)
  - ★ favori toggle, indir, paylaş (opsiyonel)
- Alt yarı:
  - **Konu özeti** (TMDB'den)
  - **Oyuncular** rail — yatay scroll, her oyuncu: yuvarlak fotoğraf + ad + karakter adı
  - **Benzer Filmler** rail — aynı kategoriden 10 film
  - **Bilgiler** tablosu — yönetmen, tür, dil, vs.

### 5.8 Diziler

- Filmler ile özdeş grid + tab yapısı, ama poster'lar **dizi posteri**
- Detay sayfası ek olarak:
  - **Sezon seçici** (S1, S2, ... pill'ler veya dropdown)
  - Seçili sezonun **bölüm listesi** — her satır: bölüm numarası, başlık, süre, küçük thumbnail, ▶ play
  - Devam edilen bölüm vurgulanır + progress bar overlay
  - "Sonraki bölüm" otomatik akış (player'da + bölüm satırında)

### 5.9 Program Rehberi (EPG)

Klasik TV guide grid:

```
       08:00   09:00   10:00   11:00   12:00   13:00   14:00
TRT 1  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░ Kanlı Banker ░░░░░░░░░░░░░░░░░░
ATV    ▓▓▓▓▓▓░░░░ Kahve... ░░░░░░░ Esra Erol ░░░░░░░░░░░░░░░
SHOW   ▓▓░░░░░░░░░░ Reyhan ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
...
```

- Sol sütun: kanal logosu + kanal adı (sticky)
- Üst satır: zaman cetveli (saat/yarım saat işaretli)
- Şu an çizgisi (kırmızı dikey line) — gerçek zamanda kayar
- Program bloğu: arka plan accent rengi (yayında olan = primary, geçmiş = soft, gelecek = transparent)
- Klik → program detay popover (özet + "kanalı oynat" butonu)
- Üst tarihe göre gün sekmesi (dün, bugün, yarın, +5 gün)
- Klavye nav: ←/→ saat değiştir, ↑/↓ kanal değiştir, Enter kanalı oynat

### 5.10 Favoriler

3 sekme: **Kanallar | Filmler | Diziler**

- Sekmeler arası sürükleyerek kayma (Windows'ta touchpad iki parmak sürükleme)
- Her sekme kendi listesini gösterir (kanal listesi item'ı / film grid'i / dizi grid'i)
- Boş state: "Henüz favori eklemediniz. Bir kanal/filmi ★ ile işaretleyin"
- Toplu silme: çoklu seçim modu (long-press veya Ctrl+click ile)

### 5.11 Devam Et

Anasayfa'da rail olarak; ama tam liste görünümü için "Tümünü Gör" linkiyle ayrı sayfa:
- Grid: aynı kart şablonu (banner + progress bar + marquee başlık)
- Filtre: Filmler / Diziler tab'ı
- Çoklu seçim ile toplu kaldırma

### 5.12 Arama

Cmd-K / Ctrl+F kısayolu ile **command palette** mantığında modal:
- Üstte arama kutusu (debounced 250ms)
- Altında 3 bölüm: **Kanallar | Filmler | Diziler**
- Her bölümde en alakalı 5-10 sonuç
- ESC ile kapanır
- Klavye nav: ↑↓ ile sonuç gez, Enter ile aç
- Alternatif: full-page arama (Anasayfa'dan kutu ile geçiş)

### 5.13 Ayarlar

Sol-iç sidebar (kategoriler) + sağ pane (form):

#### 5.13.1 Hesap & Profil
- Görünen ad düzenleme
- Çıkış yap

#### 5.13.2 Playlist Yönetimi
- Eklenmiş playlist'ler listesi (her birinde: ad, tip, son sync zamanı, kanal sayısı)
- Her satırda: aktif yap, şimdi sync et, sil
- "Yeni Ekle" → sheet/modal: M3U / Xtream sekmeleri
- M3U: ad, URL, opsiyonel EPG URL, opsiyonel User-Agent
- Xtream: ad, sunucu URL, kullanıcı adı, parola
- Toggle: "Otomatik güncelle (24 saatte bir)"
- **NOT**: "Bulut Senkronizasyon" YOK (kaldırıldı)

#### 5.13.3 Oynatıcı Ayarları
- Varsayılan kalite (Auto / 1080p / 720p / 480p) radio
- Decoder tercihi (Auto / Hardware / Software) radio
- Tercih edilen audio dili (text input, "tr" / "en" gibi ISO 639-1)
- Ses normalleştirme toggle
- Resim İçinde Resim toggle (Windows'ta: always-on-top mini player)
- User-Agent override (ileri seviye, açıklama ile)
- SSL doğrulamayı atla toggle (uyarı dialogu ile)

#### 5.13.4 Altyazı Ayarları
13 kontrol (mevcut Android'le birebir):
- Font ailesi (Sans / Serif / Mono / System) radio
- Font stili (Regular / Bold / Italic / BoldItalic) radio
- Metin boyutu slider (50-200%)
- Metin rengi (8 preset palette)
- Metin opaklığı slider (0-100%)
- Arka plan rengi (8 preset + transparent)
- Arka plan opaklığı slider
- Pencere rengi (8 preset + transparent)
- Pencere opaklığı slider
- Kenar tipi (Yok / Outline / Shadow / Raised / Depressed)
- Kenar rengi (kenar tipi != Yok ise aktif)
- Dikey konum (Bottom / Center / Top)
- **Live preview**: ayarların altında her değişikliği anında gösteren küçük örnek panel
- Sıfırla butonu (varsayılana dön)

#### 5.13.5 Tema & Renk
- Tema modu: Açık / Koyu / Sistem (radio)
- Accent renk seçici: 8 swatch (Mor, Kırmızı, Mavi, Yeşil, Bakır, Turkuaz, Sarı, Gri)
- Seçilen renk anında tüm UI'a yayılır (live preview gerekmez, ana UI zaten preview)

### 5.14 Splash sekansı (ilk açılış + ilk açıldıktan sonra her cold start)

[Splash.html'deki sekansın aynısı](Splash.html):
- 200ms: G mark fade-in + scale (overshoot 1.04→1.0)
- 200ms+: halo ring 1 dışarı genişler (sonsuz döngü)
- 760ms: "Genç" wordmark Instrument Serif italic ile süzülür
- 900ms: G mark hafif breathing pulse'a girer
- 920ms: "IPTV PLAYER" Geist Mono caps tag'i süzülür
- 1100ms: "YÜKLENİYOR…" + blink (1400ms ease-in-out)
- 1280ms: progress sweep barı
- 1700ms: overlay alpha 0'a fade
- Total ~2.1 sn

Easings:
- Ana: `cubic-bezier(.2, 0, 0, 1)`
- Pulse: `cubic-bezier(.4, 0, .4, 1)`
- Sweep: `cubic-bezier(.4, 0, .2, 1)`

---

## 6 · Bileşen kalıpları

| Bileşen | Notlar |
|---|---|
| **Button (primary)** | Accent color BG, beyaz metin, 12-14dp padding, radius 8, hover'da %10 daha açık |
| **Button (ghost)** | Transparent BG, accent metin, hover'da `BgElev2` |
| **Icon button** | 36×36 daire, hover'da `BgElev2` |
| **Toggle (switch)** | iOS tarzı, accent renk, 40×24 |
| **Slider** | Accent track, beyaz thumb, mono değer label'ı sağda |
| **Tab row** | Alt çizgi indicator (accent), seçili tab beyaz/`TextPrimary` |
| **List item** | 64-74dp yükseklik, hairline alt çizgi, hover hızlı |
| **Card** | 1.5dp Border, radius 12-16, shadow `0 4px 16px rgba(0,0,0,0.06)` light / `0 12px 32px rgba(0,0,0,0.5)` dark |
| **Modal/Dialog** | Centered, max 480px genişlik, blur backdrop, `BgElev` zemin |
| **Sheet (bottom)** | Mobile sheet karşılığı: side panel sağdan kayar (Add Playlist, Track Selection vb.) |
| **Toast** | Bottom-center, 3sn auto-dismiss, accent renkli ikon |
| **Tooltip** | Klavye/mouse hover sonrası 600ms gecikmeli, dark `Bg` BG, beyaz metin |
| **Empty state** | Büyük emoji veya ikon (96px) + Instrument Serif başlık + Geist açıklama + CTA |
| **Loading spinner** | Accent renkli, 32-48px CircularProgressIndicator |
| **Hairline divider** | 1px `Line` token, vertical/horizontal |
| **Pill / Chip** | Pilot 14dp yükseklik, radius 999, mono caps text 9-10sp |

### Hover/focus/active state kuralları
- **Mouse hover**: BG renk geçişi 200ms ease, çok hafif scale opsiyonel
- **Klavye focus**: 2dp accent ring, 4dp dış offset (focus-visible)
- **Active (basılı)**: scale 0.98 ya da BG bir ton koyu
- **Disabled**: opacity 0.4

---

## 7 · Windows-spesifik UX

### Pencere yönetimi
- Custom title bar tercih edilir (marka tutarlılığı)
- Drag region: top bar'ın içerik dışı kalan alanı
- Pencere kontrolleri (min/max/close) sağ üst köşe — Windows 11 stiline saygı
- Snap layouts (Win+Z) destekle, mini player için max button hover'da snap menu

### Klavye kısayolları (zorunlu set)
| Kısayol | Aksiyon |
|---|---|
| `Ctrl+F` veya `Ctrl+K` | Arama paletini aç |
| `Space` | Player play/pause |
| `←` / `→` | Player seek -10s / +10s (VOD), önceki/sonraki kanal (live) |
| `↑` / `↓` | Ses +/- |
| `M` | Mute toggle |
| `F` veya `F11` | Fullscreen toggle |
| `Esc` | Fullscreen çık veya modal kapat |
| `Ctrl+,` | Ayarlar |
| `Ctrl+1..9` | Sidebar item'larına direkt git |
| `Ctrl+Tab` | Son kanala geç |
| `Ctrl+R` | Aktif playlist'i sync et |

### Sağ tık context menu
- Kanal listesi: Favorilere ekle/çıkar, "Yeni pencerede oynat", "Bilgileri kopyala"
- Film/dizi kart: Favorilere ekle, "İzleme listesinden kaldır", "Detayları gör"
- Sidebar avatar: Profil, çıkış yap

### Tray icon (system tray)
- Beyaz silüet logo (mono variant)
- Sağ tık menüsü: Aç, Devam et, Mini player, Ayarlar, Çıkış
- Çift tık: pencereyi öne getir
- Pencere küçültüldüğünde "tray'e" gönderme opsiyonu (ayar)

### Drag-and-drop
- M3U dosyası ana pencereye sürükleyip bırakma → Yeni Playlist sheet'i ön-doldurulu açılır
- (Opsiyonel) çoklu pencere arası kanal sürükleme

### Multi-monitor
- Player'ı ayrı monitöre tam ekran yapma desteği
- Mini player ana ekrandayken, ana pencereyi ikinci monitöre alma

---

## 8 · Adaptive layouts (ekran genişliğine göre)

| Genişlik | Davranış |
|---|---|
| ≥1440px | Full sidebar (240px) + 6 sütun grid + büyük detay sayfası |
| 1280-1440px | Full sidebar + 5 sütun grid |
| 1024-1280px | Sidebar daraltılmış (64px, sadece ikonlar) + 4 sütun grid |
| <1024px | Sidebar gizlenir (hamburger menu açar), 3 sütun grid — ama bu min boyutun altı, yine de çalışmalı |

Mini player widget: 320×180 sabit, drag edilebilir, sağ alt köşede default; kapatma + büyütme + always-on-top toggle butonları.

---

## 9 · Tasarım çıktıları

Tasarımcıdan beklenen:
1. **Komple ekran tasarımları** (light + dark, en az şu sayfalar):
   - Onboarding (3 step)
   - Auto-sync screen
   - Anasayfa (full + boş state)
   - Kanallar (kategori picker + liste view)
   - Filmler (grid + film detay)
   - Diziler (grid + dizi detay + sezon listesi)
   - Program Rehberi (grid)
   - Favoriler (3 sekme)
   - Arama (modal + full-page)
   - Player (live + VOD, fullscreen + windowed)
   - Mini player widget
   - Ayarlar (5 alt-bölüm)
   - Splash sekansı (storyboard / animasyon timeline)
   - Tray icon menüsü

2. **Bileşen kütüphanesi** — yukarıdaki tablo'daki tüm bileşenlerin örnek varyantları (default/hover/focus/active/disabled state'leri)

3. **Iconography** — sidebar ikonları için tutarlı set (önerim: Lucide veya Phosphor, 1.5px stroke, 20-24px)

4. **Format**:
   - Tercih: **Figma** (paylaşılabilir link)
   - Alternatif: HTML mockup serisi (mevcut `Splash.html`, `App Icon.html` gibi)
   - PNG/JPG export ek

5. **Etkileşim notları**: animasyon süreleri (220ms transition vb.), micro-interactions, hover state'ler video / GIF olarak

---

## 10 · Referans materyaller (bu repoda)

| Dosya | İçerik |
|---|---|
| `App Icon.html` | Logo varyantları + adaptive icon mockup |
| `Splash.html` | Animasyonlu splash sekansı + 4 tema varyantı (dark/light/teal/copper) |
| `genc-iptv-ui-referans-guncel.html` | Mevcut Android UI'ın HTML referansı |
| `handoff/CategoryPickerScreen.kt` + `CategoryGlyph.kt` | Glyph row kategori picker örneği |
| `new_design/` | Yeni mobil tasarım iterasyonları |
| `app/src/main/res/drawable/ic_logo_g_mark.xml` | Logo vector drawable (3 path, gradient'li) |
| `app/src/main/java/.../core/designsystem/` | Color, Typography token tanımları |

---

## 11 · Kapsam dışı (yapma)

- ❌ Marka logosunu yeniden tasarlama (sabit, yukarıdaki spec)
- ❌ Yeni özellik önerme (mevcut feature listesini birebir karşıla)
- ❌ Bulut senkronizasyon, sosyal özellik, paylaşım, yorum, oylama
- ❌ Reklamlar veya mağaza
- ❌ İkinci dil (sadece Türkçe; placeholder İngilizce strings olabilir ama I18N şu an yok)
- ❌ Mobile responsive (bu Windows masaüstü app, ayrı bir mobile app zaten var)
- ❌ Touch gesture'lara birinci sınıf öncelik (ikincil destek yeterli)

---

## 12 · Başarı kriterleri

Tasarım başarılı sayılır eğer:
1. ✅ Mevcut Android app kullanıcısı geçişte hiçbir özelliği "kaybetmediğini" hissediyor
2. ✅ "Windows native bir uygulamayım" diyor (custom title bar bile olsa)
3. ✅ Mouse + klavye akışı sezgisel — fareye dokunmadan tüm önemli aksiyonlar yapılabilir
4. ✅ İlk açılış 1 dakika içinde "playlist eklendi, kanal oynatıyor" sonucuna varıyor
5. ✅ Editorial tipografi premium hissi yaratıyor — "ucuz IPTV" görünümünden uzak
6. ✅ Light + Dark tema arasında geçiş hiçbir bileşeni bozmadan çalışıyor
7. ✅ Accent renk değişiminde 8 paletin hepsi kontrast skorunu (4.5:1 metin, 3:1 büyük) tutuyor

---

## 13 · İpuçları (designer için)

- Apple TV+, Disney+, Plex Desktop ve Stremio Desktop iyi referanslar
- Kodi'den uzak dur — modern bir hava istiyoruz
- Spotify'ın sidebar nav'ı yapısal olarak iyi ama tipografisi bizim hedeften daha mütevazı; biz daha editorial istiyoruz
- The New York Times mobile / The Atlantic web — tipografik referans
- Linear app — minimal, fonksiyonel, premium hissi referansı
- VLC'nin ekran kontrolleri çok teknik; biz daha cinematik istiyoruz (Apple TV gibi)

---

**Tasarımcıya not**: Bu doküman fonksiyonel ve görsel direktif verir; **detay yorumları sana ait** — örnek: tray menüsü item sıralaması, mikro-animasyon süresi, hover state'in tam tonu. Markaya saygılı kal, kullanıcı akışını bölmeyecek mantıklı kararlar al, ve tutarlılığı sezgilere tercih et. İhtiyaç duyduğun yer için ek soru sormaktan çekinme.
