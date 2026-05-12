// Kanallar — Kategori picker + Kanal liste

const ChannelsCategoryScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Kanallar" right={<PlaylistSelectorMini />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="channels" />
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding: '40px 56px 28px', overflow:'auto' }}>
          <EditorialHeader
            eyebrow="01 · Koleksiyon"
            title={<>Kategoriler</>}
            meta="12 KOLEKSIYON · 1 247 KANAL · GÜNCELLEME 2 SA ÖNCE"
            right={<div className="input"><span style={{color:'var(--text-3)'}}>Ara…</span><span className="mono" style={{color:'var(--text-4)', fontSize: 10, marginLeft:'auto'}}>⌃F</span></div>}
          />
          <div className="hairline" style={{ margin: '12px 0 6px' }} />

          {/* Tümü row */}
          <div style={{
            display:'grid', gridTemplateColumns:'auto 1fr auto auto', alignItems:'center', gap: 18,
            padding: '18px 0', borderBottom: '1px solid var(--hairline)',
          }}>
            <GlyphChip abbr="✦" size={50} accent />
            <div style={{ display:'flex', flexDirection:'column', gap: 4 }}>
              <span className="h-italic" style={{ fontSize: 24 }}>Tümü</span>
              <span className="meta-caps" style={{ fontSize: 9.5 }}>Tüm kategoriler · 1 247 kanal</span>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>1 247</span>
            <span style={{ color: 'var(--accent)', fontSize: 16 }}>›</span>
          </div>

          {[
            ['SPO', 'Spor',           184, false],
            ['HAB', 'Haber',           62, false],
            ['ULU', 'Ulusal',         126, false],
            ['BEL', 'Belgesel',        48, false],
            ['ÇOC', 'Çocuk',           34, false],
            ['MÜZ', 'Müzik',           52, false],
            ['UHD', '4K · UHD',        18, false],
            ['YER', 'Yerel',           94, false],
            ['DIZ', 'Dizi & Sinema',  213, false],
            ['DIN', 'Dini',            27, false],
            ['YAB', 'Yabancı',        389, false],
          ].map(([abbr, n, c]) => (
            <CategoryRow key={n} abbr={abbr} name={n} count={c} />
          ))}
          <div style={{ height: 80 }} />
        </div>
      </main>
    </div>
  </div>
);

const ChannelsListScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Kanallar / Ulusal" right={<PlaylistSelectorMini />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="channels" />
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding: '32px 56px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 16, marginBottom: 12 }}>
            <span className="meta-caps" style={{ fontSize: 10, color: 'var(--text-3)' }}>← Geri</span>
            <span className="meta-caps" style={{ fontSize: 10, color: 'var(--text-4)' }}>·</span>
            <span className="meta-caps" style={{ fontSize: 10 }}>Ulusal</span>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 16 }}>
            <h1 className="h-display" style={{ fontSize: 44, margin: 0 }}>Ulusal</h1>
            <div style={{ display:'flex', gap: 10 }}>
              <div className="input" style={{ minWidth: 280 }}>
                <span style={{ color:'var(--text-3)' }}>🔍</span>
                <span style={{ color:'var(--text-3)' }}>Kanal ara</span>
              </div>
              <button className="btn btn-ghost">Sırala ▾</button>
            </div>
          </div>
          {/* Chips */}
          <div style={{ display:'flex', gap: 8, flexWrap:'wrap', marginBottom: 18 }}>
            {['Tümü', 'Yalnızca canlı', 'Favoriler', 'HD', '4K'].map((c, i) => (
              <span key={c} className={`pill ${i === 0 ? 'pill-accent' : ''}`}>{c}</span>
            ))}
          </div>
        </div>
        <div className="hairline" />
        <div style={{ flex:1, overflow:'auto', padding: '0 56px' }}>
          {[
            ['TRT', 'TRT 1',   'Canlı: Kanlı Banker · 19.00 - 21.00', true,  true,  true],
            ['ATV', 'ATV',     'Kahve Sohbetleri · 14.00 - 16.30',     true,  true,  true],
            ['SHO', 'SHOW TV', 'Reyhan · 14.30 - 17.00',               true,  true,  false],
            ['STR', 'STAR',    'Star Haber · 14.30 - 15.30',           true,  true,  false],
            ['FOX', 'FOX',     'Magazin Pazar · 13.00 - 15.00',        true,  true,  false],
            ['KAN', 'Kanal D', 'Yargı · 20.00 - 23.30 (sonra)',        false, true,  true],
            ['NTV', 'NTV',     'Ekonomi Bülteni · canlı',              true,  true,  false],
            ['CNN', 'CNN Türk', 'Dünya Bülteni · 15.00 - 16.00',       true,  true,  false],
            ['HBR', 'HaberTürk', 'Gündem · canlı',                     true,  true,  false],
            ['TV8', 'TV8',     'Survivor · 20.00 - 23.00 (sonra)',     false, true,  false],
            ['BEN', 'beIN Sports 1', 'Maç Önü · canlı',                true,  true,  true],
            ['BLO', 'Bloomberg HT', 'Piyasa · canlı',                  true,  true,  false],
          ].map(([abbr, n, now, live, hd, fav], i) => (
            <ChannelRow key={n} abbr={abbr} name={n} now={now} live={live} hd={hd} fav={fav} />
          ))}
        </div>
        {/* Footer count */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: '12px 56px', borderTop: '1px solid var(--line)' }}>
          <span className="meta-caps" style={{ fontSize: 10 }}>126 KANAL · 84 CANLI</span>
          <span className="meta-caps" style={{ fontSize: 10 }}>SAYFA 1 / 3</span>
        </div>
      </main>
    </div>
  </div>
);

const PlaylistSelectorMini = () => (
  <div style={{
    height: 28, padding: '0 10px', borderRadius: 8,
    background: 'transparent', border: '1px solid var(--border)',
    display:'flex', alignItems:'center', gap: 8,
    color: 'var(--text-3)', fontSize: 10.5, fontFamily: 'var(--mono)', letterSpacing: '0.08em',
    marginRight: 12,
  }}>
    <span className="live-dot" />
    PREMIUM TR
    <span>▾</span>
  </div>
);

Object.assign(window, { ChannelsCategoryScreen, ChannelsListScreen, PlaylistSelectorMini });
