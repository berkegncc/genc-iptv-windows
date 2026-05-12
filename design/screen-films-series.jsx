// Filmler — grid + film detay; Diziler — grid + dizi detay (sezon/bölüm)

const FilmsGridScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Filmler" right={<PlaylistSelectorMini />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="films" />
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding: '36px 56px 18px' }}>
          <EditorialHeader
            eyebrow="Koleksiyon"
            title={<>Filmler</>}
            meta="832 BAŞLIK · YENİDEN ESKİYE"
            right={<>
              <div className="input" style={{ minWidth: 240 }}>
                <span style={{color:'var(--text-3)'}}>🔍</span>
                <span style={{color:'var(--text-3)'}}>Film ara</span>
                <span className="mono" style={{ marginLeft:'auto', color:'var(--text-4)', fontSize: 10 }}>⌃F</span>
              </div>
              <div style={{ width: 12 }} />
              <button className="btn btn-ghost">Sırala · Yeni ▾</button>
            </>}
          />
          {/* Tabs / chip row */}
          <div style={{ display:'flex', gap: 8, flexWrap:'wrap', alignItems:'center', marginBottom: 4 }}>
            <span className="pill pill-accent">Tümü · 832</span>
            {['Aksiyon', 'Bilim Kurgu', 'Dram', 'Komedi', 'Korku', 'Gerilim', 'Romantik', 'Belgesel', 'Animasyon', 'Türk Sineması'].map((c) => (
              <span key={c} className="pill">{c}</span>
            ))}
          </div>
        </div>
        <div className="hairline" />
        <div style={{ flex:1, overflow:'auto', padding: '28px 56px 60px' }}>
          {/* Devam et rail */}
          <RailHeader title="Devam et" count="2 film" />
          <div className="lane" style={{ marginBottom: 32 }}>
            {[['Dune: Part Two', '1 sa 8 dk kaldı', 78, 'plum'], ['Oppenheimer', '24 dk kaldı', 92, 'warm']].map(([t, s, p, tone], i) => (
              <ResumeCard key={i} title={t} sub={s} pct={p} tone={tone} num={String(i+1).padStart(2, '0')} />
            ))}
          </div>
          <RailHeader title="Tüm filmler" count="6 sütun · 1440px" />
          {/* Grid 6 col */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 22 }}>
            {[
              ['Inception', '2010 · 8.8', 'cool'],
              ['Dune', '2021 · 8.0', 'copper'],
              ['Oppenheimer', '2023 · 8.4', 'warm'],
              ['Interstellar', '2014 · 8.7', 'plum'],
              ['Civil War', '2024 · 7.2', 'teal'],
              ['Furiosa', '2024 · 7.5', 'cool'],
              ['Tenet', '2020 · 7.3', 'warm'],
              ['Blade Runner 2049', '2017 · 8.0', 'plum'],
              ['Arrival', '2016 · 7.9', 'cool'],
              ['The Batman', '2022 · 7.8', 'warm'],
              ['Sicario', '2015 · 7.6', 'copper'],
              ['Heat', '1995 · 8.3', 'cool'],
              ['No Time to Die', '2021 · 7.3', 'teal'],
              ['Top Gun: Maverick', '2022 · 8.3', 'warm'],
              ['Mad Max: Fury Road', '2015 · 8.1', 'copper'],
              ['John Wick: Chapter 4', '2023 · 7.7', 'plum'],
              ['Mission: Impossible 7', '2023 · 7.7', 'cool'],
              ['Civil War', '2024 · 7.2', 'warm'],
              ['Aftersun', '2022 · 7.7', 'cool'],
              ['The Brutalist', '2024 · 8.0', 'copper'],
              ['Conclave', '2024 · 7.5', 'plum'],
              ['Anora', '2024 · 7.6', 'warm'],
              ['Killers of the Flower Moon', '2023 · 7.6', 'copper'],
              ['Past Lives', '2023 · 7.8', 'teal'],
            ].map(([t, m, tone], i) => (
              <PosterCard key={i} title={t} meta={m} tone={tone} num={String(i+1).padStart(3, '0')} w={'100%'} />
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);

const FilmDetailScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Filmler / Detay" right={<PlaylistSelectorMini />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="films" />
      <main style={{ flex:1, overflow:'auto' }}>
        {/* Backdrop */}
        <div style={{ position:'relative', height: 480, overflow:'hidden' }}>
          <div className="stripe-poster" style={{
            position:'absolute', inset: 0, borderRadius: 0, border: 'none',
            background: 'linear-gradient(160deg, #2A211A 0%, #150F0C 100%)',
          }}>
            <div className="stripe-num">backdrop · 1920×1080</div>
            <div className="stripe-cap">film backdrop</div>
            {/* Diagonal stripes overlay */}
            <div style={{ position:'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 12px)' }} />
          </div>
          {/* Gradient fade to bg */}
          <div style={{ position:'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,18,19,0.0) 0%, rgba(14,18,19,0.6) 60%, var(--bg) 100%)' }} />
          {/* Back row */}
          <div style={{ position:'absolute', top: 24, left: 56, right: 56, display:'flex', alignItems:'center', gap: 12 }}>
            <span className="meta-caps" style={{ fontSize: 10, color:'var(--text-2)' }}>← Filmler</span>
            <span className="meta-caps" style={{ fontSize: 10, color: 'var(--text-4)' }}>·</span>
            <span className="meta-caps" style={{ fontSize: 10, color:'var(--text-3)' }}>Aksiyon</span>
          </div>
        </div>
        {/* Hero panel */}
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap: 36, padding: '0 56px', marginTop: -200, position:'relative', zIndex:2 }}>
          <StripePoster ratio="2 / 3" label="film posteri" num="01" tone="copper" style={{ width: 260, boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }} />
          <div style={{ paddingTop: 200 }}>
            <span className="meta-caps" style={{ fontSize: 10, color: 'var(--copper)' }}>2024 · 2 SA 46 DK · BİLİM KURGU</span>
            <h1 className="h-display" style={{ fontSize: 88, margin: '12px 0 4px', letterSpacing:'-0.035em' }}>Dune: <span className="h-italic">Part&nbsp;Two</span></h1>
            <div style={{ display:'flex', alignItems:'center', gap: 20, marginTop: 16, marginBottom: 22 }}>
              <span style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 14 }}><span style={{color:'var(--copper)'}}>★★★★</span><span style={{color:'var(--text-4)'}}>★</span> <span className="mono" style={{fontSize:12, color:'var(--text-2)'}}>8.4</span></span>
              <span className="pill pill-hd">4K · UHD</span>
              <span className="pill">5.1 AUDIO</span>
              <span className="pill">TR · ALTYAZI</span>
            </div>
            <div style={{ display:'flex', gap: 10, marginBottom: 22 }}>
              <button className="btn btn-primary" style={{ height: 48, padding: '0 22px', fontSize: 14 }}>
                <div style={{ width:0, height:0, borderLeft:'10px solid currentColor', borderTop:'6px solid transparent', borderBottom:'6px solid transparent', marginRight: 4 }} />
                Devam et · 1.08.42 kaldı
              </button>
              <button className="btn btn-ghost" style={{ height: 48, padding: '0 18px' }}>★ Favori</button>
              <button className="btn btn-ghost" style={{ height: 48, padding: '0 16px' }}>↓ İndir</button>
              <button className="btn btn-icon" style={{ width: 48, height: 48, border: '1px solid var(--border)' }}>⋯</button>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', maxWidth: 720, margin: 0 }}>
              Paul Atreides, Chani ve Fremen'lerle birlikte ailesini yok edenlerden öç almak için yola çıkar.
              Evrenin gördüğü en kapsamlı kehanetin eşiğinde, sevdiği insan ile geleceğin kaderi arasında seçim yapmalı.
            </p>
            {/* Progress */}
            <div style={{ marginTop: 22, maxWidth: 480 }}>
              <div className="meta-caps" style={{ fontSize: 9.5, marginBottom: 8 }}>İLERLEME · %78 · 1.46 / 2.46</div>
              <Progress pct={78} />
            </div>
          </div>
        </div>

        {/* Cast + Info */}
        <div style={{ padding: '56px 56px 28px', display:'grid', gridTemplateColumns:'1fr 320px', gap: 56 }}>
          <div>
            <RailHeader title="Oyuncu" count="6 isim" />
            <div className="lane">
              {[
                ['Timothée Chalamet', 'Paul Atreides'],
                ['Zendaya', 'Chani'],
                ['Rebecca Ferguson', 'Lady Jessica'],
                ['Javier Bardem', 'Stilgar'],
                ['Austin Butler', 'Feyd-Rautha'],
                ['Florence Pugh', 'Princess Irulan'],
                ['Christopher Walken', 'Imp. Shaddam IV'],
              ].map(([n, c], i) => (
                <div key={i} style={{ width: 120, display:'flex', flexDirection:'column', gap: 8 }}>
                  <div style={{
                    width: 120, height: 120, borderRadius: '50%',
                    background: 'radial-gradient(140% 140% at 30% 25%, #1F2A2C, #0F1517 80%)',
                    border: '1px solid var(--border)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily: 'var(--serif)', fontSize: 36, color:'var(--text-3)',
                  }}>{n.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, textAlign:'center' }}>{n}</div>
                  <div className="meta-caps" style={{ fontSize: 8.5, textAlign:'center' }}>{c}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <RailHeader title="Bilgi" />
            <div style={{ display:'flex', flexDirection:'column', gap: 0 }}>
              {[
                ['Yönetmen', 'Denis Villeneuve'],
                ['Tür', 'Bilim Kurgu, Macera'],
                ['Yapım', 'ABD, Kanada'],
                ['Süre', '2 sa 46 dk'],
                ['IMDb', '8.4 / 10'],
                ['TMDB', '8.2 / 10'],
                ['Eklenme', '12 Mayıs 2024'],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}>
                  <span className="meta-caps" style={{ fontSize: 9.5 }}>{k}</span>
                  <span style={{ fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Similar */}
        <div style={{ padding: '0 56px 80px' }}>
          <RailHeader title="Benzer filmler" count="10 başlık" action="Tümünü gör" />
          <div className="lane">
            {[
              ['Dune', '2021', 'copper'],
              ['Blade Runner 2049', '2017', 'plum'],
              ['Arrival', '2016', 'cool'],
              ['Sicario', '2015', 'copper'],
              ['Prisoners', '2013', 'warm'],
              ['Enemy', '2013', 'plum'],
              ['Interstellar', '2014', 'cool'],
              ['2001: A Space Odyssey', '1968', 'cool'],
              ['Tenet', '2020', 'warm'],
            ].map(([t, m, tone], i) => (
              <PosterCard key={i} title={t} meta={`${m} · 7.x`} tone={tone} num={String(i+1).padStart(2,'0')} />
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);

// ─── Diziler ────────────────────────────────────────────────
const SeriesGridScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Diziler" right={<PlaylistSelectorMini />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="series" />
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding: '36px 56px 18px' }}>
          <EditorialHeader
            eyebrow="Koleksiyon"
            title="Diziler"
            meta="214 BAŞLIK · 2 184 BÖLÜM"
            right={<><div className="input" style={{minWidth:240}}><span style={{color:'var(--text-3)'}}>🔍 Dizi ara</span></div><div style={{width:12}}/><button className="btn btn-ghost">Sırala · Yeni ▾</button></>}
          />
          <div style={{ display:'flex', gap: 8, flexWrap:'wrap' }}>
            <span className="pill pill-accent">Tümü · 214</span>
            {['Türk Dizileri', 'Yabancı', 'Aksiyon', 'Dram', 'Suç', 'Gerilim', 'Komedi', 'Bilim Kurgu', 'Animasyon'].map((c) => (
              <span key={c} className="pill">{c}</span>
            ))}
          </div>
        </div>
        <div className="hairline" />
        <div style={{ flex:1, overflow:'auto', padding: '28px 56px 60px' }}>
          <RailHeader title="Devam et" count="3 dizi" />
          <div className="lane" style={{ marginBottom: 32 }}>
            {[
              ['Çukur', 'S2 · B7 · 18 dk kaldı', 64, 'cool'],
              ['Yargı', 'S1 · B12 · 41 dk kaldı', 22, 'warm'],
              ['Severance', 'S2 · B4 · 12 dk kaldı', 88, 'plum'],
            ].map(([t, s, p, tone], i) => (
              <ResumeCard key={i} title={t} sub={s} pct={p} tone={tone} num={String(i+1).padStart(2,'0')} />
            ))}
          </div>
          <RailHeader title="Tüm diziler" count="6 sütun" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 22 }}>
            {[
              ['Severance', 'S2 · 2025', 'plum'],
              ['The Bear', 'S3 · 2024', 'warm'],
              ['Succession', 'S4 · 2023', 'copper'],
              ['Yargı', 'S3 · 2024', 'cool'],
              ['Çukur', 'S4 · 2021', 'warm'],
              ['Atatürk', 'S1 · 2024', 'copper'],
              ['Kıvılcım', 'S1 · 2024', 'plum'],
              ['Aile', 'S2 · 2024', 'cool'],
              ['Shōgun', 'S1 · 2024', 'warm'],
              ['Slow Horses', 'S4 · 2024', 'cool'],
              ['Mr. Robot', 'S4 · 2019', 'plum'],
              ['Better Call Saul', 'S6 · 2022', 'copper'],
              ['Andor', 'S2 · 2025', 'cool'],
              ['Dark', 'S3 · 2020', 'plum'],
              ['Babylon Berlin', 'S4 · 2022', 'warm'],
              ['House of the Dragon', 'S2 · 2024', 'copper'],
              ['Foundation', 'S3 · 2025', 'plum'],
              ['Silo', 'S2 · 2025', 'cool'],
              ['The Last of Us', 'S2 · 2025', 'cool'],
              ['Fallout', 'S1 · 2024', 'warm'],
              ['Ripley', 'S1 · 2024', 'plum'],
              ['Masters of the Air', 'S1 · 2024', 'copper'],
              ['True Detective N. C.', 'S4 · 2024', 'cool'],
              ['Reacher', 'S2 · 2024', 'warm'],
            ].map(([t, m, tone], i) => (
              <PosterCard key={i} title={t} meta={m} tone={tone} num={String(i+1).padStart(3, '0')} w={'100%'} />
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);

const SeriesDetailScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Diziler / Severance" right={<PlaylistSelectorMini />} />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="series" />
      <main style={{ flex:1, overflow:'auto' }}>
        <div style={{ position:'relative', height: 420, overflow:'hidden' }}>
          <div style={{
            position:'absolute', inset:0,
            background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 8px), linear-gradient(160deg, #221726 0%, #100A14 100%)',
          }}>
            <div style={{ position:'absolute', top: 14, left: 24, fontFamily:'var(--mono)', fontSize: 9, color:'var(--text-4)', letterSpacing:'0.12em', textTransform:'uppercase' }}>backdrop · dizi</div>
          </div>
          <div style={{ position:'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,18,19,0.1) 0%, rgba(14,18,19,0.4) 50%, var(--bg) 100%)' }} />
          <div style={{ position:'absolute', top: 24, left: 56, display:'flex', alignItems:'center', gap: 12 }}>
            <span className="meta-caps" style={{ fontSize: 10, color:'var(--text-2)' }}>← Diziler</span>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap: 36, padding: '0 56px', marginTop: -180 }}>
          <StripePoster ratio="2 / 3" label="dizi posteri" num="01" tone="plum" style={{ width: 240, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }} />
          <div style={{ paddingTop: 180 }}>
            <span className="meta-caps" style={{ fontSize: 10, color: 'var(--accent)' }}>2025 · 2 SEZON · 19 BÖLÜM · GERİLİM</span>
            <h1 className="h-display" style={{ fontSize: 76, margin: '12px 0 8px', letterSpacing:'-0.035em' }}>Severance</h1>
            <div style={{ display:'flex', alignItems:'center', gap: 16, marginTop: 12, marginBottom: 18 }}>
              <span style={{fontSize: 13, color:'var(--text-2)'}}><span style={{color:'var(--copper)'}}>★</span> 8.7</span>
              <span className="pill pill-hd">4K · HDR</span>
              <span className="pill">DOLBY ATMOS</span>
              <span className="pill pill-live"><span className="live-dot" /> Devam ediyor</span>
            </div>
            <div style={{ display:'flex', gap: 10, marginBottom: 18 }}>
              <button className="btn btn-primary" style={{ height: 44, padding: '0 18px' }}>▶ Devam et · S2 · B4</button>
              <button className="btn btn-ghost" style={{ height: 44 }}>★ Favori</button>
              <button className="btn btn-ghost" style={{ height: 44 }}>Baştan başla</button>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text-2)', maxWidth: 720, margin: 0 }}>
              Lumon Industries çalışanlarının iş ve özel hayat anılarını cerrahi olarak ayıran bir prosedüre tabi tutulduğu, distopik bir gerilim. İkinci sezonda Mark, Innie ve Outie hayatlarının sınırını sorgulamaya başlar.
            </p>
          </div>
        </div>

        {/* Sezon seçici + bölüm listesi */}
        <div style={{ padding: '48px 56px 80px' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 16, marginBottom: 22 }}>
            <h2 className="h-serif" style={{ fontSize: 28, margin: 0 }}>Bölümler</h2>
            <div style={{ flex: 1 }} />
            <div style={{ display:'flex', gap: 6 }}>
              {['S1', 'S2', 'S3'].map((s, i) => (
                <span key={s} className={`pill ${i === 1 ? 'pill-accent' : ''}`} style={{ height: 30, padding: '0 14px', fontSize: 11 }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            {[
              ['01', 'Hello, Ms. Cobel',          '52 dk', 'Mark, Helly\'nin işyerinde geçirdiği ilk gününü hatırlamaya çalışır.', 0,    false],
              ['02', 'Goodbye, Mrs. Selvig',      '49 dk', 'Innie\'lerin hayatı dış dünyaya sızmaya başlar. Cobel\'in geçmişi sorgulanır.', 100, false],
              ['03', 'Who Is Alive?',             '54 dk', 'Mark ve Outie hayatları arasında bir köprü kurmaya çalışır.', 100, false],
              ['04', 'Woe\'s Hollow',             '55 dk', 'MDR ekibi şirket dışında bir tatil için Woe\'s Hollow\'a gönderilir.', 22,  true],
              ['05', 'Trojan\'s Horse',           '47 dk', 'Devorah ve takım, Lumon\'un asıl amacını sorgulamaya başlar.', 0,    false],
              ['06', 'Attila',                    '49 dk', 'Yeni karakterler işyerinde tedirginliğe yol açar.', 0,    false],
              ['07', 'Chikhai Bardo',             '63 dk', 'Mark\'ın eşi Gemma\'nın gerçek kaderi açığa çıkar.', 0,    false],
              ['08', 'Sweet Vitriol',             '46 dk', 'Cobel kendi annesinin Lumon ile bağını araştırır.', 0,    false],
            ].map(([n, t, dur, syn, p, current]) => (
              <div key={n} style={{
                display:'grid', gridTemplateColumns:'auto 160px 1fr auto', gap: 20, alignItems:'center',
                padding: '16px 0', borderBottom: '1px solid var(--hairline)',
                background: current ? 'color-mix(in oklab, var(--accent) 5%, transparent)' : 'transparent',
                marginLeft: -16, paddingLeft: 16, marginRight: -16, paddingRight: 16, borderRadius: 8,
              }}>
                <span className="mono" style={{ fontSize: 11, color: current ? 'var(--accent)' : 'var(--text-3)', width: 30 }}>B{n}</span>
                <StripePoster ratio="16 / 9" label="" num={n} tone="plum" style={{ width: 160 }} />
                <div style={{ display:'flex', flexDirection:'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{t}</span>
                    <span className="meta-caps" style={{ fontSize: 9 }}>{dur}</span>
                    {current && <span className="pill pill-accent">Devam et · {p}%</span>}
                  </div>
                  <span style={{ fontSize: 12.5, color: 'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{syn}</span>
                  {current && <div style={{ marginTop: 4 }}><Progress pct={p} accent /></div>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <button className="btn btn-icon" style={{ background: current ? 'var(--accent)' : 'transparent', color: current ? 'var(--accent-ink)' : 'var(--text-2)', border: current ? 'none' : '1px solid var(--border)' }}>▶</button>
                  <button className="btn btn-icon">⋯</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);

Object.assign(window, { FilmsGridScreen, FilmDetailScreen, SeriesGridScreen, SeriesDetailScreen });
