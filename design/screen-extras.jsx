// Favoriler + Arama (Ctrl+K) + Ayarlar (5 alt-bölüm)

// ─── Favoriler ─────────────────────────────────────────────
const FavoritesScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Favoriler" right={<PlaylistSelectorMini />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="fav" />
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding: '36px 56px 0' }}>
          <EditorialHeader
            eyebrow="01 · Koleksiyon"
            title={<>Favoriler</>}
            meta="48 KANAL · 26 FİLM · 12 DİZİ"
            right={<button className="btn btn-ghost">Toplu seç</button>}
          />
          {/* Tabs */}
          <div style={{ display:'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
            {[
              ['Kanallar', 48, true],
              ['Filmler', 26, false],
              ['Diziler', 12, false],
            ].map(([n, c, on]) => (
              <div key={n} style={{
                padding: '14px 22px', display:'flex', alignItems:'center', gap: 10,
                borderBottom: '2px solid ' + (on ? 'var(--accent)' : 'transparent'),
                marginBottom: -1, color: on ? 'var(--text)' : 'var(--text-3)',
              }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{n}</span>
                <span className="mono" style={{ fontSize: 10.5, color: on ? 'var(--accent)' : 'var(--text-4)' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow:'auto', padding: '0 56px 60px' }}>
          {/* Sub-categories within Kanallar tab */}
          <div style={{ display:'flex', gap: 8, padding: '20px 0', flexWrap:'wrap' }}>
            {['Tümü · 48', 'Spor · 12', 'Haber · 8', 'Ulusal · 18', 'Yabancı · 10'].map((c, i) => (
              <span key={c} className={`pill ${i === 0 ? 'pill-accent' : ''}`}>{c}</span>
            ))}
          </div>
          <div style={{ background: 'var(--bg-elev)', borderRadius: 12, border: '1px solid var(--border)', overflow:'hidden' }}>
            {[
              ['TRT', 'TRT 1', 'Kanlı Banker · 19.00 - 21.00', true, true],
              ['ATV', 'ATV', 'Kahve Sohbetleri · 14.00 - 16.30', true, true],
              ['SHO', 'SHOW TV', 'Reyhan · 14.30 - 17.00', true, true],
              ['BEN', 'beIN Sports 1', 'Maç Önü · canlı', true, true],
              ['BEN', 'beIN Sports 2', 'Maç Sonrası', false, true],
              ['NTV', 'NTV', 'Ekonomi Bülteni · canlı', true, true],
              ['CNN', 'CNN Türk', 'Dünya Bülteni · 15.00 - 16.00', true, true],
              ['BLO', 'Bloomberg HT', 'Piyasa · canlı', true, true],
              ['TRT', 'TRT Spor', 'Maç Yayını · canlı', true, true],
              ['HBO', 'HBO Türk', 'House of the Dragon S2', false, true],
            ].map(([abbr, n, now, live, hd], i) => (
              <ChannelRow key={i} abbr={abbr} name={n} now={now} live={live} hd={hd} fav />
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: '14px 4px' }}>
            <span className="meta-caps" style={{ fontSize: 10 }}>10 / 48 GÖSTERİLİYOR</span>
            <button className="btn btn-link">Daha fazla göster</button>
          </div>
        </div>
      </main>
    </div>
  </div>
);

// Empty state for favorites
const FavoritesEmptyScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Favoriler / Filmler" right={<PlaylistSelectorMini />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="fav" />
      <main style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ padding: '36px 56px 0' }}>
          <EditorialHeader eyebrow="02 · Koleksiyon" title="Favoriler" meta="48 KANAL · 0 FİLM · 12 DİZİ" />
          <div style={{ display:'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
            {[
              ['Kanallar', 48, false],
              ['Filmler', 0, true],
              ['Diziler', 12, false],
            ].map(([n, c, on]) => (
              <div key={n} style={{ padding: '14px 22px', display:'flex', alignItems:'center', gap: 10, borderBottom: '2px solid ' + (on ? 'var(--accent)' : 'transparent'), marginBottom: -1, color: on ? 'var(--text)' : 'var(--text-3)' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{n}</span>
                <span className="mono" style={{ fontSize: 10.5, color: on ? 'var(--accent)' : 'var(--text-4)' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap: 22, padding: 60 }}>
          <div style={{
            width: 96, height: 96, borderRadius:'50%',
            background: 'radial-gradient(120% 120% at 30% 25%, #243133, #0E1213 70%)',
            border: '1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize: 36, color: 'var(--copper)',
          }}>★</div>
          <div style={{ textAlign:'center', maxWidth: 420 }}>
            <h2 className="h-display" style={{ fontSize: 36, margin: '0 0 8px' }}>Henüz <span className="h-italic">favori film</span> yok.</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
              Beğendiğin filmleri ★ ile işaretle, hepsi burada toplansın.
            </p>
          </div>
          <button className="btn btn-primary" style={{ height: 42 }}>Filmleri keşfet →</button>
        </div>
      </main>
    </div>
  </div>
);

// ─── Arama (Ctrl+K) ────────────────────────────────────────
const SearchPaletteScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', position:'relative', background: 'var(--bg)' }}>
    {/* Faded home behind */}
    <div style={{ position:'absolute', inset:0, opacity: 0.35, filter: 'blur(2px)', pointerEvents:'none' }}>
      <HomeStillFaded />
    </div>
    <div style={{ position:'absolute', inset:0, background: 'rgba(10,13,14,0.6)', backdropFilter:'blur(6px)' }} />
    {/* Palette */}
    <div style={{
      position:'absolute', top: '12%', left: '50%', transform:'translateX(-50%)',
      width: 720, maxWidth: '90%',
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      borderRadius: 16, overflow:'hidden',
      boxShadow:'var(--shadow-pop)',
    }}>
      {/* Search row */}
      <div style={{ display:'flex', alignItems:'center', gap: 14, padding: '18px 22px', borderBottom: '1px solid var(--hairline)' }}>
        <SideIcon name="search" active={false} />
        <input style={{ flex: 1, background:'transparent', border:0, outline:0, color:'var(--text)', fontSize: 18, fontFamily:'var(--sans)' }}
          placeholder="Kanal, film, dizi ara…"
          defaultValue="dune" />
        <span className="pill" style={{ height: 22 }}>ESC</span>
      </div>
      {/* Categories */}
      <div style={{ display:'flex', flexDirection:'column', maxHeight: 480, overflow:'auto' }}>
        <PaletteSection title="Filmler" count={4}>
          <PaletteItem icon="film" tone="copper" title="Dune: Part Two" sub="2024 · 2 sa 46 dk · 4K" highlight />
          <PaletteItem icon="film" tone="copper" title="Dune" sub="2021 · 2 sa 35 dk · HD" />
          <PaletteItem icon="film" tone="cool" title="Dune: Prophecy" sub="2024 · spin-off · HD" />
          <PaletteItem icon="film" tone="warm" title="Dune (1984)" sub="1984 · 2 sa 17 dk" />
        </PaletteSection>
        <PaletteSection title="Diziler" count={2}>
          <PaletteItem icon="series" tone="plum" title="Dune: Prophecy" sub="S1 · 6 bölüm · 2024" />
          <PaletteItem icon="series" tone="cool" title="Foundation" sub="S3 · benzer önerisi" />
        </PaletteSection>
        <PaletteSection title="Kanallar" count={1}>
          <PaletteItem icon="channel" tone="cool" title="Dune Movies HD" sub="Kanal 372 · Yabancı" />
        </PaletteSection>
      </div>
      {/* Footer hint */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: '10px 16px', borderTop: '1px solid var(--hairline)', background: 'var(--bg)' }}>
        <span className="meta-caps" style={{ fontSize: 9.5 }}>↑↓ GEZIN · ↵ AÇ · ESC ÇIKIŞ</span>
        <span className="meta-caps" style={{ fontSize: 9.5, color:'var(--accent)' }}>9 SONUÇ · 22 MS</span>
      </div>
    </div>
  </div>
);

const PaletteSection = ({ title, count, children }) => (
  <div>
    <div style={{ padding: '10px 22px 6px', display:'flex', alignItems:'center', gap: 12 }}>
      <span className="meta-caps" style={{ fontSize: 9.5, color: 'var(--text-3)' }}>{title}</span>
      <span className="mono" style={{ fontSize: 9.5, color:'var(--text-4)' }}>{count}</span>
    </div>
    {children}
  </div>
);

const PaletteItem = ({ icon, tone = 'cool', title, sub, highlight }) => (
  <div style={{
    display:'grid', gridTemplateColumns:'40px 1fr auto', alignItems:'center', gap: 14,
    padding: '10px 22px',
    background: highlight ? 'color-mix(in oklab, var(--accent) 10%, transparent)' : 'transparent',
    borderLeft: highlight ? '2px solid var(--accent)' : '2px solid transparent',
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 6,
      background: tone === 'copper' ? 'linear-gradient(135deg, #2C1F14, #15100A)'
                : tone === 'plum'   ? 'linear-gradient(135deg, #221726, #100A14)'
                : tone === 'warm'   ? 'linear-gradient(135deg, #2A211A, #150F0C)'
                : 'linear-gradient(135deg, #1F2A2C, #0E1213)',
      border: '1px solid var(--border)',
      display:'flex', alignItems:'center', justifyContent:'center', flex: '0 0 auto',
      fontFamily:'var(--mono)', fontSize: 9, color:'var(--text-3)', letterSpacing: '0.06em',
    }}>{icon === 'film' ? 'FLM' : icon === 'series' ? 'DIZ' : 'KAN'}</div>
    <div style={{ display:'flex', flexDirection:'column', gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
      <span className="meta-caps" style={{ fontSize: 9 }}>{sub}</span>
    </div>
    <span className="mono" style={{ fontSize: 10, color: highlight ? 'var(--accent)' : 'var(--text-4)' }}>{highlight ? '↵' : ''}</span>
  </div>
);

const HomeStillFaded = () => (
  <div style={{ width:'100%', height:'100%', display:'flex', background:'var(--bg)' }}>
    <Sidebar active="home" />
    <div style={{ flex:1, padding: '40px 48px' }}>
      <span className="meta-caps" style={{ fontSize: 10 }}>CUMA · 09 MAYIS</span>
      <div className="h-display" style={{ fontSize: 60, marginTop: 10 }}>Hoş geldin, Berke.</div>
    </div>
  </div>
);

// ─── Ayarlar ───────────────────────────────────────────────
const SettingsScreen = ({ section = 'theme' }) => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb={`Ayarlar / ${SECTIONS.find(s=>s[0]===section)?.[1] || ''}`} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="" mini />
      <SettingsNav active={section} />
      <main style={{ flex:1, overflow:'auto', padding: '40px 56px 80px', maxWidth: 880 }}>
        {section === 'theme' && <SettingsTheme />}
        {section === 'profile' && <SettingsProfile />}
        {section === 'playlist' && <SettingsPlaylist />}
        {section === 'player' && <SettingsPlayer />}
        {section === 'subs' && <SettingsSubs />}
      </main>
    </div>
  </div>
);

const SECTIONS = [
  ['profile', 'Hesap & Profil'],
  ['playlist', 'Playlist'],
  ['player', 'Oynatıcı'],
  ['subs', 'Altyazı'],
  ['theme', 'Tema & Renk'],
];

const SettingsNav = ({ active }) => (
  <nav style={{
    width: 240, flex: '0 0 240px', borderRight: '1px solid var(--line)',
    padding: '40px 18px', display:'flex', flexDirection:'column', gap: 4,
  }}>
    <span className="meta-caps" style={{ fontSize: 10, padding: '0 10px 12px' }}>Ayarlar</span>
    {SECTIONS.map(([k, n]) => (
      <div key={k} style={{
        padding: '10px 12px', borderRadius: 8,
        background: k === active ? 'var(--bg-elev2)' : 'transparent',
        color: k === active ? 'var(--text)' : 'var(--text-2)',
        fontSize: 13.5, fontWeight: k === active ? 500 : 400,
        position: 'relative',
      }}>
        {k === active && <span style={{ position:'absolute', left: 0, top: 8, bottom: 8, width: 2.5, background: 'var(--accent)', borderRadius: 2 }} />}
        {n}
      </div>
    ))}
  </nav>
);

const SettingsTheme = () => (
  <div>
    <h1 className="h-display" style={{ fontSize: 44, margin: '0 0 8px' }}>Tema & <span className="h-italic">Renk</span></h1>
    <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 32px' }}>Genç IPTV görsel kimliği nasıl davransın?</p>

    <h2 className="h-serif" style={{ fontSize: 22, margin: '0 0 14px' }}>Tema modu</h2>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
      {[
        ['Açık',  'paper',  false],
        ['Koyu',  'ink',    true],
        ['Sistem','auto',   false],
      ].map(([n, k, on]) => (
        <div key={k} style={{
          padding: '20px 18px 16px', borderRadius: 12,
          border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
          background: on ? 'color-mix(in oklab, var(--accent) 8%, transparent)' : 'var(--bg-elev)',
          display:'flex', flexDirection:'column', gap: 14,
        }}>
          <div style={{ height: 70, borderRadius: 6, background:
            k === 'paper' ? 'linear-gradient(180deg, #FFFFFF, #F6F2EC)' :
            k === 'ink'   ? 'linear-gradient(180deg, #1F2A2C, #0E1213)' :
            'linear-gradient(90deg, #FFFFFF 50%, #0E1213 50%)' }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{n}</span>
            {on && <span className="meta-caps" style={{ fontSize: 9, color: 'var(--accent)' }}>● SEÇİLİ</span>}
          </div>
        </div>
      ))}
    </div>

    <h2 className="h-serif" style={{ fontSize: 22, margin: '0 0 14px' }}>Vurgu rengi</h2>
    <p className="meta-caps" style={{ fontSize: 9.5, marginBottom: 16 }}>BUTONLAR, SLIDER VE SEÇILI DURUMLAR BU RENGI KULLANIR</p>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap: 10, marginBottom: 32 }}>
      {[
        ['#9D7BD8','Mor'], ['#E07A6F','Kırmızı'], ['#6FA8E0','Mavi'], ['#86C97A','Yeşil'],
        ['#C68A5C','Bakır'], ['#3FD0BD','Turkuaz'], ['#D4B86A','Sarı'], ['#B0BAB8','Gri'],
      ].map(([c, n], i) => (
        <div key={c} style={{
          padding: 16, borderRadius: 12,
          border: '1px solid ' + (i === 5 ? 'var(--accent)' : 'var(--border)'),
          background: i === 5 ? 'color-mix(in oklab, var(--accent) 8%, transparent)' : 'var(--bg-elev)',
          display:'flex', flexDirection:'column', alignItems:'center', gap: 10,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)' }} />
          <span className="meta-caps" style={{ fontSize: 9 }}>{n}</span>
        </div>
      ))}
    </div>

    <h2 className="h-serif" style={{ fontSize: 22, margin: '0 0 6px' }}>Pencere</h2>
    <SettingRow title="Özel başlık çubuğu" hint="Marka renkleri pencere kenarına uzansın"><Toggle on /></SettingRow>
    <SettingRow title="Mica / akrilik blur" hint="Windows 11'de arka plan saydamlığı"><Toggle on /></SettingRow>
    <SettingRow title="Sidebar daraltılmış başlat" hint="Sadece ikonlar gösterilir"><Toggle /></SettingRow>
    <SettingRow title="Kayıt modu" hint="Tüm kontrolleri gizler"><Toggle /></SettingRow>
  </div>
);

const SettingsProfile = () => (
  <div>
    <h1 className="h-display" style={{ fontSize: 44, margin: '0 0 8px' }}>Hesap & <span className="h-italic">Profil</span></h1>
    <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 32px' }}>Görünüm bilgilerin ve oturum durumun.</p>
    <div style={{ display:'flex', alignItems:'center', gap: 18, padding: 18, borderRadius: 12, border:'1px solid var(--border)', background:'var(--bg-elev)', marginBottom: 28 }}>
      <Avatar size={64} initials="B" />
      <div style={{ flex:1 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Berke</div>
        <div className="meta-caps" style={{ fontSize: 9.5, marginTop: 4 }}>YEREL · 47 GÜNDÜR ETKİN</div>
      </div>
      <button className="btn btn-ghost">Avatarı değiştir</button>
    </div>
    <SettingRow title="Görünen ad" hint="Anasayfa karşılamasında geçer"><div className="input" style={{ minWidth: 220 }}>Berke</div></SettingRow>
    <SettingRow title="Dil" hint="Şu an yalnızca Türkçe destekleniyor"><div className="input" style={{ minWidth: 220 }}>Türkçe ▾</div></SettingRow>
    <SettingRow title="Cihaz adı" hint="EPG ve playlist senkronu için"><div className="input" style={{ minWidth: 220 }}><span className="mono" style={{fontSize: 12}}>BERKE-WIN-01</span></div></SettingRow>
    <SettingRow title="Otomatik açılış" hint="Windows başlarken arka planda başlat"><Toggle /></SettingRow>
    <div style={{ height: 32 }} />
    <button className="btn btn-ghost" style={{ color: '#E07A6F', borderColor: 'rgba(224,122,111,0.3)' }}>Çıkış yap</button>
  </div>
);

const SettingsPlaylist = () => (
  <div>
    <h1 className="h-display" style={{ fontSize: 44, margin: '0 0 8px' }}>Playlist <span className="h-italic">yönetimi</span></h1>
    <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 24px' }}>M3U URL veya Xtream Codes kaynaklarını yönet.</p>
    <button className="btn btn-primary" style={{ marginBottom: 22 }}>+ Yeni playlist ekle</button>
    {[
      ['Premium TR', 'Xtream Codes', 'http://server.example:8080', '2 sa önce', 1247, true],
      ['Yedek M3U',  'M3U URL',     'http://backup.example/playlist.m3u', '1 gün önce', 932,  false],
      ['Dünya Kanalları', 'M3U URL', 'http://world.example/list.m3u',     '4 gün önce', 2104, false],
    ].map(([n, t, url, sync, ch, active], i) => (
      <div key={i} style={{
        padding: 18, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elev)',
        marginBottom: 12, display:'grid', gridTemplateColumns:'auto 1fr auto', gap: 18, alignItems:'center',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: active ? 'linear-gradient(135deg, var(--accent-deep), var(--accent))' : 'var(--bg-elev2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)', fontSize: 11, color: active ? 'var(--accent-ink)' : 'var(--text-3)' }}>
          {t === 'Xtream Codes' ? 'XTR' : 'M3U'}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap: 4, minWidth: 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <span style={{ fontSize: 14.5, fontWeight: 500 }}>{n}</span>
            {active && <span className="pill pill-accent">Aktif</span>}
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</span>
          <span className="meta-caps" style={{ fontSize: 9.5, marginTop: 2 }}>{ch} kanal · son sync {sync}</span>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ height: 32 }}>↻ Sync</button>
          {!active && <button className="btn btn-ghost" style={{ height: 32 }}>Aktif yap</button>}
          <button className="btn btn-icon">⋯</button>
        </div>
      </div>
    ))}
    <div style={{ height: 24 }} />
    <SettingRow title="Otomatik güncelleme" hint="24 saatte bir aktif playlist'i yenile"><Toggle on /></SettingRow>
    <SettingRow title="EPG önbelleği" hint="Program rehberi verisini yerel olarak sakla"><Toggle on /></SettingRow>
  </div>
);

const SettingsPlayer = () => (
  <div>
    <h1 className="h-display" style={{ fontSize: 44, margin: '0 0 8px' }}>Oynatıcı <span className="h-italic">ayarları</span></h1>
    <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 32px' }}>Akış kalitesi, kod çözücü ve ses ayarları.</p>
    <SettingRow title="Varsayılan kalite" hint="Yetersiz bant genişliğinde otomatik düşer">
      <RadioRow opts={['Auto', '1080p', '720p', '480p']} active={0} />
    </SettingRow>
    <SettingRow title="Kod çözücü tercihi" hint="Donanım hızlandırma genelde daha düşük güç tüketimi sağlar">
      <RadioRow opts={['Auto', 'Donanım', 'Yazılım']} active={1} />
    </SettingRow>
    <SettingRow title="Tercih edilen ses dili" hint="ISO 639-1, varsayılan: tr">
      <div className="input" style={{ minWidth: 120 }}><span className="mono" style={{fontSize: 12}}>tr</span></div>
    </SettingRow>
    <SettingRow title="Ses normalleştirme" hint="Reklam ve diyalog arası seviye farkını dengeler"><Toggle on /></SettingRow>
    <SettingRow title="Resim İçinde Resim" hint="Mini player her zaman üstte"><Toggle on /></SettingRow>
    <SettingRow title="User-Agent override" hint="İleri seviye: bazı sağlayıcılar User-Agent kontrol eder">
      <div className="input" style={{ minWidth: 280 }}><span className="mono" style={{fontSize: 11.5}}>VLC/3.0.20</span></div>
    </SettingRow>
    <SettingRow title="SSL doğrulamayı atla" hint="Yalnızca güvenilir sağlayıcılarla kullan — uyarı verilecek"><Toggle /></SettingRow>
    <SettingRow title="Tampon süresi" hint="Düşük: anlık, Yüksek: stabil">
      <div style={{ width: 220 }}><Slider pct={45} label="6 sn" /></div>
    </SettingRow>
  </div>
);

const SettingsSubs = () => (
  <div>
    <h1 className="h-display" style={{ fontSize: 44, margin: '0 0 8px' }}>Altyazı <span className="h-italic">ayarları</span></h1>
    <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 24px' }}>13 kontrol · canlı önizleme aşağıda.</p>

    {/* Live preview */}
    <div style={{ borderRadius: 14, padding: 28, background: 'radial-gradient(80% 60% at 50% 45%, rgba(63,208,189,0.10), transparent 70%), linear-gradient(180deg, #0F1517 0%, #050708 100%)', border: '1px solid var(--border)', minHeight: 160, display:'flex', alignItems:'flex-end', justifyContent:'center', marginBottom: 28 }}>
      <div style={{
        padding: '6px 14px', borderRadius: 4,
        background: 'rgba(0,0,0,0.55)',
        fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 19, color: '#fff',
        textAlign: 'center', textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
      }}>
        Çöl, kehanetin gerçek olduğunu sandığında konuşmaya başlar.
      </div>
    </div>

    <SettingRow title="Font ailesi"><RadioRow opts={['Sans','Serif','Mono','Sistem']} active={0} /></SettingRow>
    <SettingRow title="Font stili"><RadioRow opts={['Regular','Bold','Italic','Bold I.']} active={1} /></SettingRow>
    <SettingRow title="Metin boyutu"><div style={{width:220}}><Slider pct={62} label="125%" /></div></SettingRow>
    <SettingRow title="Metin rengi"><ColorRow active={0} /></SettingRow>
    <SettingRow title="Metin opaklığı"><div style={{width:220}}><Slider pct={100} label="100%" /></div></SettingRow>
    <SettingRow title="Arka plan rengi"><ColorRow active={1} hasTransparent /></SettingRow>
    <SettingRow title="Arka plan opaklığı"><div style={{width:220}}><Slider pct={55} label="55%" /></div></SettingRow>
    <SettingRow title="Pencere rengi"><ColorRow active={8} hasTransparent /></SettingRow>
    <SettingRow title="Pencere opaklığı"><div style={{width:220}}><Slider pct={0} label="0%" /></div></SettingRow>
    <SettingRow title="Kenar tipi"><RadioRow opts={['Yok','Outline','Shadow','Raised','Depressed']} active={1} /></SettingRow>
    <SettingRow title="Kenar rengi"><ColorRow active={1} /></SettingRow>
    <SettingRow title="Dikey konum"><RadioRow opts={['Bottom','Center','Top']} active={0} /></SettingRow>
    <div style={{ display:'flex', justifyContent:'flex-end', paddingTop: 20 }}>
      <button className="btn btn-ghost">Sıfırla</button>
    </div>
  </div>
);

const RadioRow = ({ opts, active = 0 }) => (
  <div style={{ display:'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
    {opts.map((o, i) => (
      <span key={o} style={{
        padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
        color: i === active ? 'var(--accent-ink)' : 'var(--text-2)',
        background: i === active ? 'var(--accent)' : 'transparent',
      }}>{o}</span>
    ))}
  </div>
);

const ColorRow = ({ active = 0, hasTransparent = false }) => {
  const colors = ['#FFFFFF','#000000','#3FD0BD','#E07A6F','#D4B86A','#6FA8E0','#9D7BD8','#86C97A'];
  return (
    <div style={{ display:'flex', gap: 6 }}>
      {colors.map((c, i) => (
        <div key={i} style={{
          width: 24, height: 24, borderRadius: '50%', background: c,
          boxShadow: i === active ? '0 0 0 1.5px var(--bg), 0 0 0 3px var(--accent)' : 'inset 0 0 0 1px rgba(255,255,255,0.15)',
        }} />
      ))}
      {hasTransparent && (
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'repeating-conic-gradient(#1F2A2C 0% 25%, #0E1213 0% 50%) 50% / 8px 8px',
          boxShadow: active === 8 ? '0 0 0 1.5px var(--bg), 0 0 0 3px var(--accent)' : 'inset 0 0 0 1px rgba(255,255,255,0.15)',
        }} />
      )}
    </div>
  );
};

Object.assign(window, { FavoritesScreen, FavoritesEmptyScreen, SearchPaletteScreen, SettingsScreen });
