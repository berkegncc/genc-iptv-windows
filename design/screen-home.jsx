// Anasayfa (Dashboard)

const HomeScreen = ({ mini = false }) => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background: 'var(--bg)' }}>
    <TitleBar breadcrumb="Anasayfa" right={<PlaylistSelector />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="home" mini={mini} />
      <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div style={{ padding: '40px 48px 0', overflow:'auto' }}>
          {/* Welcome */}
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 6 }}>
            <div>
              <span className="meta-caps" style={{ fontSize: 10.5 }}>Cuma · 09 Mayıs · 14.32</span>
              <h1 className="h-display" style={{ fontSize: 64, margin: '12px 0 0', letterSpacing:'-0.03em' }}>
                Hoş geldin, <span className="h-italic">Berke.</span>
              </h1>
              <div className="meta-caps" style={{ fontSize: 10.5, marginTop: 12, color:'var(--text-3)' }}>
                12 KOLEKSIYON · 1 247 KANAL · 832 FİLM · 214 DİZİ
              </div>
            </div>
            <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
              <span className="pill pill-live"><span className="live-dot" /> Senkronize</span>
              <span className="pill">⌃ K · Ara</span>
            </div>
          </div>
          <div className="hairline" style={{ margin: '32px 0 28px' }} />

          {/* Devam Et */}
          <RailHeader title="Devam et" count="3 başlık" action="Tümünü gör" />
          <div className="lane">
            {[
              ['Çukur', 'S2 · B7 · 18 dk kaldı', 64, 'cool'],
              ['Yargı', 'S1 · B12 · 41 dk kaldı', 22, 'warm'],
              ['Dune: Part Two', '1 sa 8 dk kaldı', 78, 'plum'],
            ].map(([t, sub, p, tone], i) => (
              <ResumeCard key={i} title={t} sub={sub} pct={p} tone={tone} num={String(i+1).padStart(2, '0')} />
            ))}
          </div>

          <div className="hairline" style={{ margin: '36px 0 28px' }} />

          {/* Son eklenen filmler */}
          <RailHeader title="Son eklenen filmler" count="20 başlık" action="Filmler" />
          <div className="lane">
            {[
              ['Inception', '2010 · 8.8', 'cool'],
              ['Dune', '2021 · 8.0', 'copper'],
              ['Oppenheimer', '2023 · 8.4', 'warm'],
              ['Interstellar', '2014 · 8.7', 'plum'],
              ['Civil War', '2024 · 7.2', 'teal'],
              ['Furiosa', '2024 · 7.5', 'cool'],
              ['Tenet', '2020 · 7.3', 'warm'],
            ].map(([t, m, tone], i) => (
              <PosterCard key={i} title={t} meta={m} tone={tone} num={String(i+1).padStart(2,'0')} />
            ))}
          </div>

          <div className="hairline" style={{ margin: '36px 0 28px' }} />

          {/* Son izlenen kanallar */}
          <RailHeader title="Son izlenen kanallar" count="8 kanal" action="Kanallar" />
          <div className="lane">
            {[
              ['TRT 1', 'Kanlı Banker'],
              ['ATV', 'Kahve Sohbetleri'],
              ['SHOW', 'Reyhan'],
              ['STAR', 'Star Haber'],
              ['NTV', 'Ekonomi'],
              ['CNN', 'Dünya Bülteni'],
              ['BLOOM', 'Piyasa'],
              ['BEIN', 'Maç Önü'],
            ].map(([n, now], i) => (
              <ChannelTile key={i} abbr={n.slice(0,3).toUpperCase()} label={n} sub={now} tone={i === 6 ? 'paper' : 'cool'} />
            ))}
          </div>

          <div style={{ height: 60 }} />
        </div>
      </main>
    </div>
  </div>
);

const PlaylistSelector = () => (
  <div style={{
    height: 28, padding: '0 12px', borderRadius: 8,
    background: 'var(--bg-elev2)', border: '1px solid var(--border)',
    display:'flex', alignItems:'center', gap: 8,
    color: 'var(--text-2)', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.06em',
    marginRight: 12,
  }}>
    <span className="live-dot" />
    PREMIUM TR
    <span style={{ color: 'var(--text-3)' }}>▾</span>
  </div>
);

const ResumeCard = ({ title, sub, pct, tone, num }) => (
  <div style={{ width: 360, display:'flex', flexDirection:'column', gap: 10 }}>
    <div style={{ position:'relative' }}>
      <StripeBanner label="banner" num={num} tone={tone} style={{ width: 360 }} />
      {/* Play button overlay */}
      <div style={{
        position:'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 56, height: 56, borderRadius: '50%',
        background: 'rgba(14,18,19,0.7)', border: '1px solid rgba(255,255,255,0.15)',
        display:'flex', alignItems:'center', justifyContent:'center',
        backdropFilter: 'blur(6px)',
      }}>
        <div style={{
          width: 0, height: 0,
          borderLeft: '12px solid var(--accent)',
          borderTop: '7px solid transparent',
          borderBottom: '7px solid transparent',
          marginLeft: 4,
        }} />
      </div>
      {/* Progress bar */}
      <div style={{ position:'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.4)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--copper)' }} />
      </div>
      <div style={{ position:'absolute', top: 12, right: 12 }}>
        <span className="pill" style={{ background: 'rgba(14,18,19,0.7)', backdropFilter: 'blur(6px)' }}>%{pct}</span>
      </div>
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap: 3, padding: '0 2px' }}>
      <span style={{ fontSize: 14.5, fontWeight: 500 }}>{title}</span>
      <span className="meta-caps" style={{ fontSize: 9.5 }}>{sub}</span>
    </div>
  </div>
);

const PosterCard = ({ title, meta, tone, num, w = 168 }) => (
  <div style={{ width: w, display:'flex', flexDirection:'column', gap: 10 }}>
    <StripePoster ratio="2 / 3" label="film posteri" num={num} tone={tone} style={{ width: w }} />
    <div style={{ display:'flex', flexDirection:'column', gap: 2, padding: '0 2px' }}>
      <span style={{ fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</span>
      <span className="meta-caps" style={{ fontSize: 9 }}>
        <span style={{ color:'var(--copper)' }}>★</span> {meta}
      </span>
    </div>
  </div>
);

Object.assign(window, { HomeScreen, PosterCard, ResumeCard });
