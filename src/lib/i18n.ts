/**
 * Tiny in-house i18n. The app ships in Turkish only, but isolating string
 * literals here keeps a future translation pass cheap — the only thing
 * that has to change is `STRINGS` (or load locale-specific files).
 *
 * Usage:
 *   import { t, tFmt } from "@/lib/i18n";
 *   t("nav.home")                       // → "Anasayfa"
 *   tFmt("home.welcome", { name: "B" }) // → "Hoş geldin, B."
 *
 * Keys are flat dotted strings — no namespacing class, no provider, no
 * Context. Dead simple, easy to grep, type-safe via the `StringKey` union.
 *
 * Untranslated keys return the key itself (so missing strings don't
 * silently render as empty text — they show up in the UI as "nav.foo"
 * which makes the regression obvious during dev).
 */

const STRINGS = {
  // ── App-level navigation ────────────────────────────────────────────
  "nav.home": "Anasayfa",
  "nav.channels": "Kanallar",
  "nav.films": "Filmler",
  "nav.series": "Diziler",
  "nav.guide": "Program Rehberi",
  "nav.favorites": "Favoriler",
  "nav.search": "Arama",
  "nav.settings": "Ayarlar",
  "nav.onboarding": "İlk kurulum",
  "nav.profile_account": "Hesap & Profil",
  "nav.settings_playlists": "Playlist Yönetimi",
  "nav.settings_player": "Oynatıcı",
  "nav.settings_subtitles": "Altyazı",
  "nav.settings_theme": "Tema & Renk",

  // ── Common verbs / labels ───────────────────────────────────────────
  "common.back": "Geri",
  "common.cancel": "İptal",
  "common.save": "Kaydet",
  "common.retry": "Tekrar dene",
  "common.delete": "Sil",
  "common.confirm_delete": "Emin misiniz? Tıklayın",
  "common.loading": "Yükleniyor…",
  "common.empty": "boş raf",
  "common.search": "Ara",
  "common.see_all": "Tümünü gör →",
  "common.show_details": "Detayları göster",
  "common.reset_default": "Varsayılana döndür",
  "common.confirm_reset": "Ayarlar varsayılana döndürülsün mü?",
  "common.no_active_playlist": "Aktif playlist yok.",
  "common.fetching": "güncelleniyor…",

  // ── Player overlay ──────────────────────────────────────────────────
  "player.live": "Canlı",
  "player.failed_title": "Yayın açılamıyor",
  "player.failed_body":
    "Sağlayıcıya birkaç saniye boyunca bağlanılamadı. Yayın geçici olarak düşmüş olabilir; tekrar denemek ya da başka bir kanala geçmek seçeneklerin var.",
  "player.reconnecting": "YENİDEN BAĞLANIYOR…",

  // ── Errors ──────────────────────────────────────────────────────────
  "error.title": "Bir şeyler yanlış gitti.",
  "error.body":
    "Tekrar denemeyi seç, çoğu zaman geçici bir hatadır. Sürekli karşılaşıyorsan uygulamayı yeniden başlat ve hata detaylarını kaydet.",
  "error.btn_reload": "Yeniden başlat",
  "error.eyebrow": "Uygulama hatası",

  // ── Home ────────────────────────────────────────────────────────────
  "home.welcome_eyebrow": "Hoş geldin",
  "home.welcome": "Hoş geldin, {name}.",
  "home.welcome_anonymous": "Hoş geldin.",
  "home.continue_watching": "Devam Et",
  "home.watched": "İzledikleriniz",
  "home.recent_channels": "Son izlenen kanallar",
  "home.recent_movies": "Son eklenen filmler",
  "home.recent_series": "Son eklenen diziler",
  "home.count_titles": "{count} başlık",
  "home.count_channels": "{count} kanal",
  // ContinueWatching resume-subtitle: how much time is left in the
  // film/episode. Three branches because Turkish doesn't pluralise the
  // way English does, so a single template string with `{count}` would
  // look awkward (e.g. "1 dakika kaldı" feels formal; we use the
  // shorter "dk kaldı").
  "home.cw_remaining_near": "az kaldı",
  "home.cw_remaining_minutes": "{minutes} dk kaldı",
  "home.cw_remaining_hours": "{hours} sa {minutes} dk kaldı",
  "home.no_epg": "EPG yok",
  "home.featured_eyebrow": "Bugünün Önerisi",
  "home.continue_resume": "Devam Et",
  "home.continue_recent": "İzlemeye devam et",
  "home.top10": "En çok izlenenler",
  "home.this_week_trend": "Bu hafta trend",
  "home.recommended_films": "Önerilen Filmler",
  "home.random_meta": "Her oturumda farklı seçilir",
  "home.because_watched": "Senin için seçtiklerimiz",
  "home.live_now": "Şu an yayında",
  "home.featured_film": "Öne çıkan film",
  "home.new_season": "Yeni sezon",
  "home.hd_4k": "4K · HDR",
  "home.play": "İzle",
  "home.add_list": "+ Listem",
  "home.more_info": "Daha fazla bilgi",
  "home.match": "%{pct} eşleşme",
  "home.greeting_eyebrow": "Bugün",
  "home.featured_meta": "Bu hafta öne çıkanlar · 01 / 05",

  // ── Onboarding ──────────────────────────────────────────────────────
  "onboarding.brand_version": "v 1.0 · Windows",
  "onboarding.step_indicator": "Adım {step} / {total}",
  "onboarding.step1_eyebrow": "Hoş geldin",
  "onboarding.step1_title_a": "Premium IPTV.",
  "onboarding.step1_title_b": "Şık, hızlı, anlaşılır.",
  "onboarding.step1_intro":
    "M3U ve Xtream Codes destekli, canlı kanal + film + dizi yayınınızı tek pencerede yönetin. Başlamak için yalnızca abone olduğunuz sağlayıcının bilgileri gerekiyor.",
  "onboarding.feature_formats_title": "M3U & Xtream Codes",
  "onboarding.feature_formats_sub": "İki format da desteklenir.",
  "onboarding.feature_epg_title": "EPG entegrasyonu",
  "onboarding.feature_epg_sub": "Program rehberi otomatik içe aktarılır.",
  "onboarding.feature_consistency_title": "Çok cihaz, tek tasarım",
  "onboarding.feature_consistency_sub": "Mobil uygulamayla birebir akış.",
  "onboarding.continue": "Devam →",
  "onboarding.go_back": "← Geri",
  "onboarding.finish": "Bitir →",
  "onboarding.step2_eyebrow": "02 · Sağlayıcı",
  "onboarding.step2_title_a": "Playlist",
  "onboarding.step2_title_b": "ekle.",
  "onboarding.step2_intro":
    "Sağlayıcınızdan aldığınız bağlantıyı veya kullanıcı bilgilerini girin.",
  "onboarding.tab_m3u": "M3U URL",
  "onboarding.tab_xtream": "Xtream Codes",
  "onboarding.field_name": "Görünen ad",
  "onboarding.field_name_placeholder": "Örn: Premium TR",
  "onboarding.field_m3u_url": "M3U URL",
  "onboarding.field_m3u_url_placeholder": "http://server.example.com/playlist.m3u",
  "onboarding.field_epg_url": "EPG URL (opsiyonel)",
  "onboarding.field_epg_url_placeholder": "http://server.example.com/xmltv.php",
  "onboarding.field_server": "Sunucu URL",
  "onboarding.field_server_placeholder": "http://server.example.com:8080",
  "onboarding.field_username": "Kullanıcı adı",
  "onboarding.field_password": "Parola",
  "onboarding.submit_loading": "Doğrulanıyor + Senkronize ediliyor...",
  "onboarding.submit": "Ekle ve Devam Et →",
  "onboarding.step3_eyebrow": "03 · Profil",
  "onboarding.step3_title_a": "Sana nasıl",
  "onboarding.step3_title_b": "hitap edelim?",
  "onboarding.step3_intro": "Profil görüntü adın anasayfada karşılama metninde geçer.",
  "onboarding.accent_label": "Vurgu rengi",
  "onboarding.theme_label": "Tema",
  "onboarding.theme_light": "Açık",
  "onboarding.theme_dark": "Koyu",
  "onboarding.theme_system": "Sistem",

  // ── Settings shell ──────────────────────────────────────────────────
  "settings.title_pref": "Tercihler",
  "settings.account_eyebrow": "Hesap",
  "settings.account_title": "Hesap & Profil",
  "settings.account_intro":
    "Görünen ad anasayfadaki karşılama metninde ve sol kenardaki profil rozetinde geçer. İstediğin zaman değiştirebilirsin.",
  "settings.field_display_name": "Görünen ad",

  // ── Settings · Player ───────────────────────────────────────────────
  "settings.player.eyebrow": "Oynatıcı tercihleri",
  "settings.player.title": "Oynatıcı",
  "settings.player.section_video": "Görüntü",
  "settings.player.section_video_hint":
    "Yayın açılırken libmpv'nin tercih edeceği kalite ve decoder.",
  "settings.player.row_quality": "Varsayılan kalite",
  "settings.player.row_decoder": "Decoder tercihi",
  "settings.player.section_audio": "Ses",
  "settings.player.section_audio_hint":
    "Ses kanalı seçimi ve loudness normalleştirme. Çoğu sağlayıcıda Türkçe altyazılı varsayılan trk'tir.",
  "settings.player.row_audio_lang": "Tercih edilen ses dili",
  "settings.player.row_loudness": "Loudness normalleştirme",
  "settings.player.row_loudness_hint":
    "Yüksek/düşük seviyeli yayınları otomatik dengeler.",
  "settings.player.section_window": "Pencere",
  "settings.player.section_window_hint": "Mini player ve tam ekran davranışı.",
  "settings.player.row_pip": "Mini player (Picture-in-Picture)",
  "settings.player.row_pip_hint":
    "Player küçültüldüğünde always-on-top mini görünüm.",
  "settings.player.section_network": "Ağ",
  "settings.player.section_network_hint":
    "Bazı sağlayıcılar varsayılan tarayıcı UA'sını veya self-signed sertifikalarını kabul etmez. Bu seçenekler sorun çıkan playlist'leri kurtarır.",
  "settings.player.row_cache": "Ön-bellekleme süresi",
  "settings.player.row_cache_hint":
    "İleride hazır tutulan video uzunluğu. Yüksek değer dalgalı internette tampon vermeyi azaltır, başlama gecikmesini artırır.",
  "settings.player.row_timeout": "Ağ bekleme süresi",
  "settings.player.row_timeout_hint":
    "Sağlayıcı yavaş cevap verdiğinde mpv'nin pes etmeden bekleyeceği süre. Yavaş upstream'ler için 90s üstüne çıkarın.",
  "settings.player.unit_seconds": "sn",
  "settings.player.row_ua": "User-Agent override",
  "settings.player.row_ua_placeholder":
    "VLC/3.0.20 LibVLC/3.0.20 (boş bırak = varsayılan)",
  "settings.player.row_ua_hint":
    "Yayın indirilirken libmpv'nin göndereceği User-Agent.",
  "settings.player.row_trust": "Tüm sertifikaları güven (riskli)",
  "settings.player.row_trust_hint":
    "Self-signed veya süresi dolmuş HTTPS sertifikalarını kabul eder. Sadece güvenilir bir sağlayıcı için aç.",
  "settings.player.diag_active": "Aktif yapılandırma",
  "settings.player.quality_auto": "Otomatik",
  "settings.player.decoder_auto": "Otomatik",
  "settings.player.decoder_hardware": "Donanım",
  "settings.player.decoder_software": "Yazılım",

  // ── Settings · Subtitles ────────────────────────────────────────────
  "settings.subs.eyebrow": "Altyazı stili",
  "settings.subs.title": "Altyazı",
  "settings.subs.section_font": "Yazı tipi",
  "settings.subs.row_family": "Aile",
  "settings.subs.row_style": "Stil",
  "settings.subs.row_size": "Boyut · %{pct}",
  "settings.subs.section_color": "Renk & opaklık",
  "settings.subs.row_text": "Metin",
  "settings.subs.row_bg": "Arka plan",
  "settings.subs.row_window": "Pencere",
  "settings.subs.section_edge": "Kenar & konum",
  "settings.subs.row_edge_type": "Kenar tipi",
  "settings.subs.row_edge_color": "Kenar rengi",
  "settings.subs.row_position": "Dikey konum",
  "settings.subs.preview_eyebrow": "Canlı önizleme",
  "settings.subs.preview_caption": "Altyazılar bu görünümde gösterilir.",
  "settings.subs.preview_note":
    "Önizleme oynatıcı dışında salt görsel; yapılan değişiklikler sonraki oynatmada libmpv'ye uygulanır.",
  "settings.subs.family_sans": "Sans",
  "settings.subs.family_serif": "Serif",
  "settings.subs.family_mono": "Mono",
  "settings.subs.style_regular": "Düz",
  "settings.subs.style_bold": "Kalın",
  "settings.subs.style_italic": "İtalik",
  "settings.subs.edge_none": "Yok",
  "settings.subs.edge_outline": "Çerçeve",
  "settings.subs.edge_drop_shadow": "Gölge",
  "settings.subs.edge_raised": "Kabartma",
  "settings.subs.position_top": "Üst",
  "settings.subs.position_middle": "Orta",
  "settings.subs.position_bottom": "Alt",

  // ── Settings · Playlists ────────────────────────────────────────────
  "settings.playlists.eyebrow": "Playlist'lerim",
  "settings.playlists.title": "Playlist Yönetimi",
  "settings.playlists.add_new": "+ Yeni Playlist",
  "settings.playlists.add_from_file": "M3U dosyasından ekle…",
  "settings.playlists.dialog_title": "M3U dosyası seç",
  "settings.playlists.empty":
    "Henüz playlist eklenmedi. Üstteki butonlarla ya da ana pencereye .m3u dosyası sürükleyerek ekleyebilirsin.",
  "settings.playlists.row_active": "Aktif",
  "settings.playlists.btn_activate": "Aktif Yap",
  "settings.playlists.btn_sync": "Şimdi Sync Et",
  "settings.playlists.btn_syncing": "Senkronize ediliyor...",
  "settings.playlists.btn_enrich": "Posterleri Tamamla",
  "settings.playlists.btn_enriching": "TMDB taranıyor…",
  "settings.playlists.btn_enrich_tooltip":
    "Eksik posterleri ve oyuncu listelerini TMDB'den getir. GENC_TMDB_API_KEY ortam değişkeni gerektirir.",
  "settings.playlists.last_sync_never": "Hiç senkronize edilmedi",
  "settings.playlists.tmdb_disabled":
    "TMDB enrichment kapalı. Etkinleştirmek için GENC_TMDB_API_KEY ortam değişkenini ayarla ve uygulamayı yeniden başlat.",
  "settings.playlists.enrich_summary":
    "{movies}/{moviesTotal} film · {series}/{seriesTotal} dizi zenginleştirildi.",

  // ── Settings · Theme ────────────────────────────────────────────────
  "settings.theme.eyebrow": "Tema · canlı önizleme",
  "settings.theme.title": "Tema & Renk",
  "settings.theme.section_mode": "Tema modu",
  "settings.theme.section_accent": "Vurgu rengi",
  "settings.theme.section_typography": "Tipografi sistemi",
  "settings.theme.section_typography_hint":
    "Başlık serif + gövde sans + tag mono üçlüsü. Tüm uygulamada anında değişir.",
  "settings.theme.section_home_style": "Anasayfa stili",
  "settings.theme.section_home_style_hint":
    "Anasayfanın yerleşimi: kart boyutları, hero, rail tipleri.",
  "settings.theme.mode_now_dark": "Şu an Koyu",
  "settings.theme.mode_now_light": "Şu an Açık",
  "settings.theme.option_selected": "Seçili",
  "settings.theme.option_preview": "Önizle",

  // ── Channels ────────────────────────────────────────────────────────
  "channels.title_categories": "Kategoriler",
  "channels.all": "Tümü",
  "channels.eyebrow_collection": "Koleksiyon",
  "channels.collections_count": "{count} koleksiyon · {channels} kanal",
  "channels.search_placeholder": "Kanal ara...",
  "channels.empty_search": "“{query}” için sonuç yok.",
  "channels.empty_category": "Bu kategoride kanal yok.",
  "channels.back_to_categories": "← Kategoriler",
  "channels.live_pill": "Canlı",

  // ── Films / Series shared ───────────────────────────────────────────
  "vod.eyebrow_collection": "Koleksiyon",
  "vod.films_title": "Filmler",
  "vod.series_title": "Diziler",
  "vod.films_search_placeholder": "Film ara…",
  "vod.series_search_placeholder": "Dizi ara…",
  "vod.sort_label": "Sırala",
  "vod.sort_az": "A → Z",
  "vod.sort_year_desc": "Yeni → Eski",
  "vod.sort_year_asc": "Eski → Yeni",
  "vod.sort_rating_desc": "Puana göre",
  "vod.header_meta": "{count} BAŞLIK · {sort}",
  "vod.empty_films_search": "“{query}” için film bulunamadı.",
  "vod.empty_films": "Bu kategoride henüz film yok. Aktif playlist'i senkronlamayı deneyin.",
  "vod.empty_series_search": "“{query}” için dizi bulunamadı.",
  "vod.empty_series": "Bu kategoride henüz dizi yok. Aktif playlist'i senkronlamayı deneyin.",
  "vod.chip_all": "Tümü · {count}",
  "vod.category_picker_meta_films": "{count} koleksiyon · {films} film",
  "vod.category_picker_meta_series": "{count} koleksiyon · {series} dizi",
  "vod.back_to_categories": "← Kategoriler",
  "vod.all": "Tümü",

  // ── Detail (Film + Series) ──────────────────────────────────────────
  "detail.btn_play": "Oynat",
  "detail.btn_resume": "Devam et · %{pct}",
  "detail.btn_fav": "☆ Favori",
  "detail.btn_fav_active": "★ Favoride",
  "detail.btn_back_films": "← Filmler",
  "detail.btn_back_series": "← Diziler",
  "detail.section_cast": "Oyuncu",
  "detail.section_info": "Bilgi",
  "detail.cast_count": "{count} isim",
  "detail.info_director": "Yönetmen",
  "detail.info_genre": "Tür",
  "detail.info_year": "Yıl",
  "detail.info_duration": "Süre",
  "detail.info_score": "Puan",
  "detail.info_empty": "Bilgi yok",
  "detail.progress_label": "İLERLEME · %{pct}",
  "detail.not_found_film": "Film bulunamadı",
  "detail.not_found_series": "Dizi bulunamadı",
  "detail.episodes_title": "Bölümler",
  "detail.episodes_meta": "{episodes} bölüm · {seasons} sezon",
  "detail.episodes_loading": "yükleniyor…",
  "detail.episodes_empty": "henüz bölüm yok",
  "detail.episodes_error": "Bölüm listesi alınamadı: {message}",
  "detail.episode_progress": "devam · %{pct}",
  "detail.btn_play_episode": "▶ Devam · S{season}·B{episode}",
  "detail.btn_episodes_loading": "Bölüm yükleniyor…",
  "detail.series_progress_label": "BÖLÜM İLERLEMESİ · %{pct}",

  // ── Favorites ───────────────────────────────────────────────────────
  "favorites.eyebrow": "Koleksiyon",
  "favorites.title": "Favoriler",
  "favorites.meta": "{count} BAŞLIK · KANAL/FİLM/DİZİ",
  "favorites.tab_channel": "Kanallar",
  "favorites.tab_movie": "Filmler",
  "favorites.tab_series": "Diziler",
  "favorites.empty_channel": "Henüz favori kanal eklenmedi.",
  "favorites.empty_movie": "Henüz favori film eklenmedi.",
  "favorites.empty_series": "Henüz favori dizi eklenmedi.",
  "favorites.empty_hint":
    "İlgilendiğin başlığa girdiğinde sağ üstteki ★ ile favorilere ekleyebilirsin.",

  // ── Watch / Player overlay ──────────────────────────────────────────
  "watch.loading": "{title} yükleniyor…",
  "watch.controls_back": "Geri (Esc)",
  "watch.controls_pause": "Duraklat (Space)",
  "watch.controls_play": "Oynat (Space)",
  "watch.controls_mute_off": "Sustur (M)",
  "watch.controls_mute_on": "Sesi aç (M)",
  "watch.controls_fullscreen": "Tam ekran (F)",
  "watch.controls_tracks": "Ses ve altyazı",
  "watch.controls_mini": "Mini pencereye küçült",
  "watch.controls_tools": "Oynatma seçenekleri",
  "shortcuts.title": "Klavye Kısayolları",
  "shortcuts.subtitle": "? ile aç, Esc ile kapat",
  "shortcuts.section_nav": "Gezinme",
  "shortcuts.section_playback": "Oynatma",
  "shortcuts.section_help": "Yardım",
  "watch.tools_title": "Oynatma",
  "watch.tools_speed": "Hız",
  "watch.tools_subdelay": "Altyazı senkron",
  "watch.buffer_stalled": "Yükleniyor…",
  "watch.buffer_title": "Tampon süresi",
  "watch.failure_eyebrow": "Yayın açılamıyor",
  "watch.failure_body":
    "Sağlayıcıya birkaç saniye boyunca bağlanılamadı. Yayın geçici olarak düşmüş olabilir; tekrar denemek ya da geri dönmek seçeneklerin var.",
  "watch.failure_retry": "Tekrar dene",
  "watch.failure_back": "Geri",
  "watch.reconnecting": "YENİDEN BAĞLANIYOR…",
  "watch.autonext_eyebrow": "Sonraki Bölüm",
  "watch.autonext_play_now": "Şimdi oynat ({seconds})",
  "watch.autonext_dismiss": "İptal",
  "watch.tracks_title": "Ses ve altyazı",
  "watch.tracks_audio": "Ses",
  "watch.tracks_audio_empty": "Ses kanalı bulunamadı.",
  "watch.tracks_subtitle": "Altyazı",
  "watch.tracks_subtitle_off": "Kapalı",
  "watch.tracks_refresh": "Yenile",
  "watch.tracks_close": "Kapat",
  "watch.controls_skip_back": "-10 sn (←)",
  "watch.controls_skip_forward": "+10 sn (→)",
  "watch.controls_prev_ep": "Önceki bölüm (P)",
  "watch.controls_next_ep": "Sonraki bölüm (N)",
  "watch.controls_prev_channel": "Önceki kanal (←)",
  "watch.controls_next_channel": "Sonraki kanal (→)",
  "watch.controls_volume_label": "Ses",
  "watch.shortcut_play": "Oynat/Duraklat",
  "watch.shortcut_fs": "Tam ekran",
  "watch.shortcut_mute": "Sustur",
  "watch.shortcut_volume": "Ses",
  "watch.shortcut_channel": "Kanal",
  "watch.shortcut_back": "Geri",
  "watch.episode_subtitle": "S{season} · B{episode} · {title}",
  "watch.unknown_type": "Tanınmayan içerik tipi.",
  "watch.episode_resolve_error":
    "Bu bölümü açmak için diziye geri dönüp tekrar deneyin.",
  "watch.not_found_movie": "Film bulunamadı",
  "watch.not_found_episode": "Bölüm bulunamadı",
  "watch.btn_back": "← Geri",

  // ── Guide ───────────────────────────────────────────────────────────
  "guide.eyebrow": "Yayın akışı",
  "guide.title": "Program Rehberi",
  "guide.meta": "{channels} KANAL · {hours} SAATLİK PENCERE",
  "guide.day_today": "BUGÜN",
  "guide.day_tomorrow": "YARIN",
  "guide.day_yesterday": "DÜN",
  "guide.empty_title": "rehber boş",
  "guide.empty_body":
    "Aktif playlist için EPG kaynağı bulunamadı. Xtream sağlayıcınız XMLTV endpoint'i sunmuyor olabilir; M3U playlist'lerde EPG URL'i ekleyerek rehberi besleyebilirsin.",
} as const;

export type StringKey = keyof typeof STRINGS;

/** Look up a translation key. Returns the key itself when missing so a
 *  typo surfaces visibly during development. */
export function t(key: StringKey): string {
  return STRINGS[key] ?? key;
}

/** Same as `t` but interpolates `{name}` placeholders from `params`.
 *  Unknown placeholders pass through untouched. */
export function tFmt(
  key: StringKey,
  params: Record<string, string | number>,
): string {
  const tpl = t(key);
  return tpl.replace(/\{(\w+)\}/g, (_, name) => {
    const v = params[name];
    return v == null ? `{${name}}` : String(v);
  });
}
