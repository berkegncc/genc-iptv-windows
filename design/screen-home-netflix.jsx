// Anasayfa — Netflix tarzı 4 varyant
// A · Klasik Billboard      — saf Netflix: full-bleed hero + 2:3 rails
// B · Top 10 + Cinematic    — yan-hizalı hero + dev rakamlı Top 10 rail
// C · Editorial Hibrit      — brand serif başlıklar + hairline'lı rails
// D · Wide Tile / Apple TV+ — 16:9 immersive tiles, featured + grid

// ─── Cinematic backdrop placeholder ─────────────────────────
const CinematicBackdrop = ({ tone = 'dune', children, fade = 'bottom', height = '100%' }) => {
  const palettes = {
    dune:   ['#3a2b1a', '#1a1108', '#0a0605'],   // çöl/kum
    cukur:  ['#2a1218', '#15080c', '#080304'],   // koyu kırmızı/kömür
    sever:  ['#1a2233', '#0c1119', '#04080d'],   // mavi noir
    yargi:  ['#241817', '#10080a', '#070303'],   // bordo
    civil:  ['#231a1c', '#100808', '#060303'],   // kömür
    inter:  ['#1c2228', '#0c1218', '#04080a'],   // soğuk
    oppen:  ['#2a1f12', '#150d07', '#070403'],   // sepia ateş
    tenet:  ['#0e1b22', '#070d11', '#020608'],   // turkuaz noir
  };
  const p = palettes[tone] || palettes.dune;
  return (
    <div style={{
      position: 'relative', width: '100%', height,
      overflow: 'hidden', isolation: 'isolate',
      background: `radial-gradient(120% 90% at 70% 30%, ${p[0]} 0%, ${p[1]} 55%, ${p[2]} 100%)`,
    }}>
      {/* Diagonal stripes texture (placeholder for poster) */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.5,
        background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 9px)',
      }} />
      {/* Film grain */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(80% 60% at 80% 20%, rgba(255,255,255,0.05), transparent 60%), radial-gradient(60% 40% at 20% 80%, rgba(0,0,0,0.4), transparent 60%)',
        mixBlendMode: 'screen',
      }} />
      {/* Bottom fade to bg */}
      {fade === 'bottom' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 30%, rgba(14,18,19,0.4) 60%, var(--bg) 96%)',
        }} />
      )}
      {fade === 'left' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, var(--bg) 0%, rgba(14,18,19,0.85) 28%, transparent 60%), linear-gradient(180deg, transparent 70%, var(--bg) 100%)',
        }} />
      )}
      {fade === 'sides' && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(14,18,19,0.5) 0%, transparent 35%, transparent 70%, var(--bg) 100%)',
        }} />
      )}
      {/* Caption (placeholder marker) */}
      <div style={{
        position: 'absolute', top: 14, right: 18,
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em',
        color: 'rgba(232,237,236,0.32)', textTransform: 'uppercase',
      }}>backdrop · {tone}</div>
      <div style={{ position: 'relative', height: '100%', zIndex: 1 }}>{children}</div>
    </div>
  );
};

// Tall poster placeholder used inside Netflix rails (less captioned than StripePoster)
const NetflixPoster = ({ tone = 'cool', label = '', w = 200, ratio = '2 / 3', children }) => {
  const tones = {
    cool:   'linear-gradient(160deg, #1A2224 0%, #0F1517 100%)',
    warm:   'linear-gradient(160deg, #2A211A 0%, #150F0C 100%)',
    teal:   'linear-gradient(160deg, #173033 0%, #0A1518 100%)',
    copper: 'linear-gradient(160deg, #2C1F14 0%, #15100A 100%)',
    plum:   'linear-gradient(160deg, #221726 0%, #100A14 100%)',
    sand:   'linear-gradient(160deg, #2A2418 0%, #14120A 100%)',
    rust:   'linear-gradient(160deg, #2B1612 0%, #150807 100%)',
    ice:    'linear-gradient(160deg, #1A2A30 0%, #0A1418 100%)',
  };
  return (
    <div style={{
      width: w, aspectRatio: ratio, borderRadius: 8,
      background: `repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 9px), ${tones[tone] || tones.cool}`,
      border: '1px solid var(--border)',
      position: 'relative', overflow: 'hidden', flex: '0 0 auto',
    }}>
      <div style={{
        position: 'absolute', inset: 'auto 0 10px 0', textAlign: 'center',
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em',
        color: 'var(--text-3)', textTransform: 'uppercase',
      }}>{label || 'film posteri'}</div>
      {children}
    </div>
  );
};

// ─── A · Klasik Billboard ───────────────────────────────────
const HomeNetflixA = () => (
  <div className="gi" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
    <TitleBar breadcrumb="Anasayfa" right={
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight: 12 }}>
        <span className="pill"><span className="live-dot" /> PREMIUM TR</span>
      </div>
    } />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="home" />
      <main style={{ flex:1, overflow:'hidden', position:'relative' }}>
        {/* Hero billboard */}
        <div style={{ position:'absolute', inset:0, overflow:'auto' }}>
          <div style={{ position:'relative', height: 540, marginBottom: -90 }}>
            <CinematicBackdrop tone="dune" fade="bottom" height="100%">
              {/* Content panel — left aligned */}
              <div style={{ height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'0 56px 100px' }}>
                <span className="meta-caps" style={{ fontSize: 10, color:'rgba(232,237,236,0.7)', marginBottom: 14 }}>
                  <span style={{ color: 'var(--accent)' }}>● </span>1 NUMARA · TÜRKİYE'DE BUGÜN
                </span>
                <h1 className="h-display" style={{ fontSize: 84, margin: 0, color:'#fff', textShadow: '0 4px 24px rgba(0,0,0,0.6)', maxWidth: 760 }}>
                  Dune: <span className="h-italic">Part Two</span>
                </h1>
                <div style={{ display:'flex', gap: 16, alignItems:'center', marginTop: 18, color:'rgba(255,255,255,0.85)', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>%96 Eşleşme</span>
                  <span>2024</span>
                  <span className="pill" style={{ background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.18)', height: 20 }}>13+</span>
                  <span>2 sa 46 dk</span>
                  <span className="pill pill-hd" style={{ background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid rgba(255,255,255,0.18)', height: 20 }}>4K · UHD</span>
                  <span className="pill pill-hd" style={{ background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid rgba(255,255,255,0.18)', height: 20 }}>HDR</span>
                </div>
                <p style={{ marginTop: 18, maxWidth: 580, fontSize: 15, lineHeight: 1.55, color:'rgba(255,255,255,0.78)' }}>
                  Paul Atreides, Fremen halkıyla birleşip ailesini yok edenlerden intikam almak için yıldızlararası bir savaşa hazırlanır.
                </p>
                <div style={{ display:'flex', gap: 12, marginTop: 28, alignItems:'center' }}>
                  <button className="btn btn-primary" style={{ height: 48, padding: '0 28px', fontSize: 15, background:'#fff', color:'#0E1213' }}>
                    <span style={{ display:'inline-block', width:0, height:0, borderLeft:'10px solid #0E1213', borderTop:'6px solid transparent', borderBottom:'6px solid transparent' }} />
                    İzle
                  </button>
                  <button className="btn" style={{ height: 48, padding: '0 22px', fontSize: 14, background:'rgba(40,46,48,0.7)', color:'#fff', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.12)' }}>
                    ⓘ &nbsp;Daha fazla bilgi
                  </button>
                  <button className="btn-icon" style={{ width: 48, height: 48, background:'rgba(40,46,48,0.5)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:'50%' }}>+</button>
                  <button className="btn-icon" style={{ width: 48, height: 48, background:'rgba(40,46,48,0.5)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:'50%' }}>♡</button>
                </div>
              </div>
              {/* Dot indicators (slide pos) */}
              <div style={{ position:'absolute', right: 56, bottom: 110, display:'flex', gap: 6 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    width: i===0 ? 24 : 6, height: 6, borderRadius: 3,
                    background: i===0 ? 'var(--accent)' : 'rgba(255,255,255,0.35)',
                  }} />
                ))}
              </div>
            </CinematicBackdrop>
          </div>

          {/* Rails — float over the gradient bottom */}
          <div style={{ position:'relative', padding:'0 56px 60px' }}>
            <NetflixRail title="Devam Et" items={[
              { t:'Çukur', tone:'rust',   pct:64, sub:'S2 · B7' },
              { t:'Yargı', tone:'sand',   pct:22, sub:'S1 · B12' },
              { t:'Inception', tone:'ice', pct:78, sub:'1 sa 8 dk kaldı' },
              { t:'Severance', tone:'plum', pct:41, sub:'S2 · B3' },
              { t:'Oppenheimer', tone:'warm', pct:12, sub:'2 sa 18 dk kaldı' },
            ]} progress />
            <NetflixRail title="Türkiye'de Trend Olanlar" rank items={[
              { t:'Kuzey Yıldızı', tone:'cool' },
              { t:'Bizim Hikaye',  tone:'warm' },
              { t:'Ölüm Bize Yakışır', tone:'plum' },
              { t:'Gönül Dağı', tone:'sand' },
              { t:'Yalı Çapkını', tone:'rust' },
              { t:'Aile', tone:'cool' },
              { t:'Şahsiyet', tone:'ice' },
              { t:'Behzat Ç.', tone:'copper' },
              { t:'Bahar', tone:'plum' },
              { t:'Adım Farah', tone:'warm' },
            ]} />
            <NetflixRail title="Son Eklenen Filmler" items={[
              { t:'Dune', tone:'sand' },
              { t:'Civil War', tone:'rust' },
              { t:'Furiosa', tone:'warm' },
              { t:'Tenet', tone:'ice' },
              { t:'Inception', tone:'cool' },
              { t:'Interstellar', tone:'plum' },
              { t:'Oppenheimer', tone:'warm' },
              { t:'The Batman', tone:'rust' },
            ]} />
            <NetflixRail title="Türk Dizileri" items={[
              { t:'Çukur', tone:'rust' },
              { t:'Yargı', tone:'sand' },
              { t:'Bir Başkadır', tone:'plum' },
              { t:'Şahsiyet', tone:'ice' },
              { t:'Atiye', tone:'copper' },
              { t:'Hakan: Muhafız', tone:'cool' },
              { t:'Kulüp', tone:'warm' },
              { t:'Yakamoz S-245', tone:'ice' },
            ]} />
          </div>
        </div>
      </main>
    </div>
  </div>
);

// Netflix-style horizontal rail, optional rank numerals overlay & progress
const NetflixRail = ({ title, items, rank = false, progress = false }) => (
  <section style={{ marginTop: 44 }}>
    <div style={{ display:'flex', alignItems:'baseline', gap: 14, marginBottom: 14 }}>
      <h3 style={{ fontFamily:'var(--sans)', fontSize: 19, fontWeight: 600, margin:0, letterSpacing:'-0.005em' }}>{title}</h3>
      <span className="meta-caps" style={{ fontSize: 9.5, color:'var(--text-3)' }}>Tümünü gör →</span>
      <div style={{ flex:1 }} />
      <div style={{ display:'flex', gap: 4 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ width: 14, height: 2, borderRadius: 1, background: i===1 ? 'var(--text)' : 'var(--bg-elev3)' }} />
        ))}
      </div>
    </div>
    <div style={{ display:'flex', gap: rank ? 0 : 14, overflow:'hidden' }}>
      {items.map((it, i) => (
        <div key={i} style={{ position:'relative', display:'flex', alignItems:'flex-end', gap: 0, flex:'0 0 auto', marginRight: rank ? -22 : 0 }}>
          {rank && (
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 220, fontWeight: 400, lineHeight: 0.78,
              color: 'transparent',
              WebkitTextStroke: '2px rgba(232,237,236,0.16)',
              marginRight: -36, paddingBottom: 4,
              fontFeatureSettings: '"lnum"',
            }}>{i+1}</div>
          )}
          <div style={{ position:'relative' }}>
            <NetflixPoster w={i === 0 && !rank ? 210 : 184} tone={it.tone} label="" />
            {progress && it.pct != null && (
              <>
                <div style={{ position:'absolute', left: 8, right: 8, bottom: 8, height: 3, background:'rgba(0,0,0,0.6)', borderRadius:3 }}>
                  <div style={{ width: `${it.pct}%`, height:'100%', background:'var(--copper)', borderRadius:3 }} />
                </div>
                <div style={{ marginTop: 8, display:'flex', flexDirection:'column', gap: 2 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{it.t}</span>
                  <span className="meta-caps" style={{ fontSize: 9 }}>{it.sub}</span>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── B · Top 10 + Cinematic Hero ────────────────────────────
const HomeNetflixB = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Anasayfa" right={
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:12 }}>
        <span className="pill"><span className="live-dot" /> PREMIUM TR</span>
      </div>
    } />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="home" />
      <main style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, overflow:'auto' }}>
          {/* Cinematic hero — slimmer, side-anchored */}
          <div style={{ position:'relative', height: 460 }}>
            <CinematicBackdrop tone="cukur" fade="left" height="100%">
              <div style={{ height:'100%', display:'grid', gridTemplateColumns:'minmax(440px, 540px) 1fr', alignItems:'center', padding:'0 56px' }}>
                <div>
                  <span className="meta-caps" style={{ fontSize: 10, color:'var(--accent)' }}>● Öne Çıkan · Bu Hafta</span>
                  <h1 className="h-display" style={{ fontSize: 92, margin:'14px 0 10px', color:'#fff', letterSpacing:'-0.035em', lineHeight: 0.95 }}>
                    Çukur
                  </h1>
                  <div className="meta-caps" style={{ fontSize: 10, color:'rgba(232,237,236,0.7)', marginBottom: 16 }}>
                    SUÇ · DRAM · 2017–2021 · 4 SEZON · 132 BÖLÜM
                  </div>
                  <p style={{ fontSize: 14.5, lineHeight: 1.6, color:'rgba(232,237,236,0.78)', maxWidth: 480, margin: 0 }}>
                    İstanbul'un Çukur mahallesinde geçen ve Koçovalı ailesinin mahalleyi uyuşturucudan koruma mücadelesini anlatan dizinin tüm bölümleri.
                  </p>
                  <div style={{ display:'flex', gap:10, marginTop: 24, alignItems:'center' }}>
                    <button className="btn btn-primary" style={{ height: 44, padding:'0 24px', fontSize: 14, background:'#fff', color:'#0E1213' }}>
                      <span style={{ display:'inline-block', width:0, height:0, borderLeft:'9px solid #0E1213', borderTop:'5px solid transparent', borderBottom:'5px solid transparent' }} />
                      Devam Et · S2 B7
                    </button>
                    <button className="btn" style={{ height: 44, padding:'0 18px', fontSize: 13, background:'rgba(255,255,255,0.08)', color:'#fff', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.14)' }}>+ Listem</button>
                    <button className="btn-icon" style={{ width: 44, height: 44, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.14)', color:'#fff' }}>♡</button>
                  </div>
                  <div style={{ marginTop: 24, display:'flex', alignItems:'center', gap: 16, color:'rgba(232,237,236,0.65)', fontSize: 12 }}>
                    <span style={{ display:'flex', alignItems:'center', gap: 6 }}>
                      <span style={{ color:'var(--copper)', fontSize: 14 }}>★</span>
                      8.7 / 10
                    </span>
                    <span style={{ width: 1, height: 12, background:'rgba(255,255,255,0.18)' }} />
                    <span>%94 izleyici puanı</span>
                  </div>
                </div>
              </div>
              {/* Episode thumbnails on right */}
              <div style={{ position:'absolute', right: 56, top: 60, display:'flex', flexDirection:'column', gap: 10 }}>
                <div className="meta-caps" style={{ fontSize: 9, marginBottom: 4, color:'rgba(232,237,236,0.7)' }}>Sıradaki Bölümler →</div>
                {[
                  { s:'S2 · B8', t:'Mahalle' },
                  { s:'S2 · B9', t:'Borç' },
                  { s:'S2 · B10', t:'Aile' },
                ].map((e,i) => (
                  <div key={i} style={{ display:'flex', gap: 10, alignItems:'center', padding: 6, borderRadius: 6, background:'rgba(20,12,14,0.5)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.06)', width: 240 }}>
                    <NetflixPoster w={64} ratio="16 / 9" tone="rust" label="" />
                    <div style={{ display:'flex', flexDirection:'column', gap: 2, flex:1, minWidth:0 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color:'#fff' }}>{e.s} · {e.t}</span>
                      <span className="meta-caps" style={{ fontSize: 8.5, color:'rgba(232,237,236,0.55)' }}>52 DK</span>
                    </div>
                  </div>
                ))}
              </div>
            </CinematicBackdrop>
          </div>

          {/* Rails */}
          <div style={{ padding:'18px 56px 60px' }}>
            {/* TOP 10 with giant numerals */}
            <NetflixRail title="🇹🇷 Türkiye'de Bugünün Top 10'u" rank items={[
              { t:'Çukur', tone:'rust' },
              { t:'Bahar', tone:'sand' },
              { t:'Yalı Çapkını', tone:'plum' },
              { t:'Aile', tone:'cool' },
              { t:'Adım Farah', tone:'warm' },
              { t:'Kara Tahta', tone:'ice' },
              { t:'Kızılcık Şerbeti', tone:'copper' },
              { t:'Yargı', tone:'rust' },
              { t:'Ömer', tone:'plum' },
              { t:'Zümrüdüanka', tone:'cool' },
            ]} />

            <NetflixRail title="Devam Et" progress items={[
              { t:'Inception', tone:'ice', pct:78, sub:'1 sa 8 dk kaldı' },
              { t:'Yargı', tone:'sand', pct:22, sub:'S1 · B12' },
              { t:'Severance', tone:'plum', pct:41, sub:'S2 · B3' },
              { t:'Dune', tone:'sand', pct:54, sub:'1 sa 4 dk kaldı' },
              { t:'Oppenheimer', tone:'warm', pct:12, sub:'2 sa 18 dk kaldı' },
            ]} />

            <NetflixRail title="Çünkü Şunu İzledin: Inception" items={[
              { t:'Tenet', tone:'ice' },
              { t:'Interstellar', tone:'cool' },
              { t:'The Prestige', tone:'plum' },
              { t:'Memento', tone:'warm' },
              { t:'Shutter Island', tone:'rust' },
              { t:'Source Code', tone:'cool' },
              { t:'Edge of Tomorrow', tone:'ice' },
              { t:'Looper', tone:'plum' },
            ]} />
          </div>
        </div>
      </main>
    </div>
  </div>
);

// ─── C · Editorial × Netflix Hibrit ──────────────────────────
const HomeNetflixC = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Anasayfa" right={
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:12 }}>
        <span className="pill"><span className="live-dot" /> PREMIUM TR</span>
      </div>
    } />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="home" />
      <main style={{ flex:1, overflow:'hidden' }}>
        <div style={{ height:'100%', overflow:'auto' }}>
          {/* Hero — editorial typography, contained 16:9 backdrop */}
          <div style={{ padding: '28px 48px 0' }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 18 }}>
              <span className="meta-caps" style={{ fontSize: 10.5, color:'var(--text-2)' }}>
                Cuma · 09 Mayıs · 14.32
              </span>
              <span className="meta-caps" style={{ fontSize: 10, color:'var(--text-3)' }}>
                <span style={{ color:'var(--accent)' }}>● </span>BU HAFTA ÖNE ÇIKANLAR · 01 / 05
              </span>
            </div>
            <div style={{ position:'relative', borderRadius: 14, overflow:'hidden', height: 420, border:'1px solid var(--border)' }}>
              <CinematicBackdrop tone="sever" fade="sides" height="100%">
                <div style={{ height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding: '0 44px 36px' }}>
                  <span className="meta-caps" style={{ fontSize: 10, color:'rgba(232,237,236,0.78)', marginBottom: 14 }}>
                    APPLE TV+ · DRAM · 2024 · S2
                  </span>
                  <h1 className="h-display" style={{ fontSize: 88, margin: 0, color:'#fff', maxWidth: 800 }}>
                    Severance: <span className="h-italic">Ayrılma</span>
                  </h1>
                  <p style={{ marginTop: 14, maxWidth: 540, fontSize: 14.5, lineHeight: 1.6, color:'rgba(232,237,236,0.74)' }}>
                    Lumon Industries'de iş ve özel hayatlarını bilinçli olarak ayıran çalışanlar, kendi yaşamlarındaki bilinmezliklerle yüzleşir.
                  </p>
                  <div style={{ display:'flex', gap: 10, marginTop: 22, alignItems:'center' }}>
                    <button className="btn btn-primary" style={{ height: 42, padding:'0 22px', fontSize: 13.5 }}>
                      <span style={{ display:'inline-block', width:0, height:0, borderLeft:'8px solid var(--accent-ink)', borderTop:'5px solid transparent', borderBottom:'5px solid transparent' }} />
                      Devam Et · S2 B3
                    </button>
                    <button className="btn btn-ghost" style={{ height: 42 }}>Detaylar</button>
                  </div>
                </div>
                {/* Slide indicators in editorial mono */}
                <div style={{ position:'absolute', top: 28, right: 32, display:'flex', flexDirection:'column', gap: 8, alignItems:'flex-end' }}>
                  {['Severance', 'Dune', 'Çukur', 'Oppenheimer', 'Civil War'].map((n, i) => (
                    <span key={i} className="meta-caps" style={{ fontSize: 9.5, color: i===0 ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                      {String(i+1).padStart(2,'0')} · {n}
                    </span>
                  ))}
                </div>
              </CinematicBackdrop>
            </div>
          </div>

          {/* Editorial rails with hairlines */}
          <div style={{ padding:'8px 48px 60px' }}>
            <EditorialNetflixRail eyebrow="DEVAM ET" title="İzlemeye devam et" meta="3 başlık · 1 sa 47 dk toplam" rail={
              <>
                {[
                  { t:'Çukur', tone:'rust', pct:64, sub:'S2 · B7 · 18 dk kaldı', n:'01' },
                  { t:'Inception', tone:'ice', pct:78, sub:'1 sa 8 dk kaldı', n:'02' },
                  { t:'Severance', tone:'plum', pct:41, sub:'S2 · B3 · 32 dk kaldı', n:'03' },
                ].map((it,i) => (
                  <div key={i} style={{ width: 320, flex:'0 0 auto', display:'flex', flexDirection:'column', gap: 10 }}>
                    <div style={{ position:'relative' }}>
                      <NetflixPoster w={320} ratio="16/9" tone={it.tone} label="banner" />
                      <div style={{ position:'absolute', bottom: 0, left: 0, right: 0, height: 3, background:'rgba(0,0,0,0.5)' }}>
                        <div style={{ width:`${it.pct}%`, height:'100%', background:'var(--copper)' }} />
                      </div>
                      <span className="meta-caps" style={{ position:'absolute', top: 10, left: 12, fontSize: 8.5, color:'rgba(232,237,236,0.55)' }}>{it.n}</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{it.t}</span>
                      <span className="meta-caps" style={{ fontSize: 9.5 }}>{it.sub}</span>
                    </div>
                  </div>
                ))}
              </>
            } />

            <EditorialNetflixRail eyebrow="TÜRKİYE'DE TREND" title="Bu hafta en çok izlenenler" meta="10 başlık · TR sıralaması" rail={
              [
                { t:'Çukur', tone:'rust' },
                { t:'Bahar', tone:'sand' },
                { t:'Yalı Çapkını', tone:'plum' },
                { t:'Aile', tone:'cool' },
                { t:'Adım Farah', tone:'warm' },
                { t:'Kara Tahta', tone:'ice' },
                { t:'Kızılcık Şerbeti', tone:'copper' },
                { t:'Yargı', tone:'rust' },
              ].map((it,i) => (
                <div key={i} style={{ width: 162, flex:'0 0 auto', display:'flex', flexDirection:'column', gap: 8 }}>
                  <div style={{ position:'relative' }}>
                    <NetflixPoster w={162} tone={it.tone} label="" />
                    <span className="meta-caps" style={{ position:'absolute', top: 8, left: 10, fontSize: 8.5, color:'var(--accent)', textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{it.t}</span>
                </div>
              ))
            } />

            <EditorialNetflixRail eyebrow="SİZİN İÇİN" title="Çünkü Inception'ı izledin" meta="Mind-bending sci-fi · 12 öneri" rail={
              [
                { t:'Tenet', tone:'ice' },
                { t:'Interstellar', tone:'cool' },
                { t:'The Prestige', tone:'plum' },
                { t:'Memento', tone:'warm' },
                { t:'Shutter Island', tone:'rust' },
                { t:'Source Code', tone:'cool' },
                { t:'Edge of Tomorrow', tone:'ice' },
                { t:'Looper', tone:'plum' },
              ].map((it,i) => (
                <div key={i} style={{ width: 162, flex:'0 0 auto', display:'flex', flexDirection:'column', gap: 8 }}>
                  <NetflixPoster w={162} tone={it.tone} label="" />
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{it.t}</span>
                </div>
              ))
            } />
          </div>
        </div>
      </main>
    </div>
  </div>
);

const EditorialNetflixRail = ({ eyebrow, title, meta, rail }) => (
  <section style={{ marginTop: 36 }}>
    <div className="hairline" style={{ marginBottom: 22 }} />
    <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap: 32, alignItems:'flex-start' }}>
      <div style={{ display:'flex', flexDirection:'column', gap: 6, paddingTop: 4 }}>
        <span className="meta-caps" style={{ fontSize: 10, color: 'var(--accent)' }}>{eyebrow}</span>
        <h3 className="h-serif" style={{ fontSize: 28, margin: 0 }}>{title}</h3>
        <span className="meta-caps" style={{ fontSize: 10, color:'var(--text-3)', marginTop: 4 }}>{meta}</span>
        <span className="meta-caps" style={{ fontSize: 9.5, color:'var(--text-2)', marginTop: 14, cursor:'default' }}>Tümünü gör →</span>
      </div>
      <div style={{ display:'flex', gap: 14, overflow:'hidden' }}>{rail}</div>
    </div>
  </section>
);

// ─── D · Wide Tile / Apple TV+ Hibrit ────────────────────────
const HomeNetflixD = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="Anasayfa" right={
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:12 }}>
        <span className="pill"><span className="live-dot" /> PREMIUM TR</span>
      </div>
    } />
    <div style={{ flex:1, display:'flex', minHeight: 0 }}>
      <Sidebar active="home" />
      <main style={{ flex:1, overflow:'hidden' }}>
        <div style={{ height:'100%', overflow:'auto', padding: '28px 48px 60px' }}>
          {/* Genre pills */}
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 22 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize: 10, color:'var(--text-3)', letterSpacing:'0.16em', textTransform:'uppercase', marginRight: 4 }}>Filtrele:</span>
            {['Tümü', 'Filmler', 'Diziler', 'Türk Yapımı', 'Aksiyon', 'Bilim Kurgu', 'Belgesel', '4K · UHD'].map((g, i) => (
              <span key={i} className="pill" style={{
                background: i===0 ? 'var(--text)' : 'transparent',
                color: i===0 ? 'var(--bg)' : 'var(--text-2)',
                borderColor: i===0 ? 'var(--text)' : 'var(--border)',
                cursor:'default',
              }}>{g}</span>
            ))}
            <div style={{ flex:1 }} />
            <span className="meta-caps" style={{ fontSize: 9.5 }}>↕ Sırala · Önerilen</span>
          </div>

          {/* Featured grid: 1 large + 2 stacked */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap: 16, marginBottom: 36 }}>
            <FeaturedTile size="lg" tone="oppen" eyebrow="ÖNE ÇIKAN FİLM" title="Oppenheimer" meta="2023 · 3 sa · 8.4★" desc="Atom bombasının babası J. Robert Oppenheimer'ın hayatı." />
            <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
              <FeaturedTile size="sm" tone="sever" eyebrow="YENİ SEZON" title="Severance" meta="S2 · 10 bölüm" />
              <FeaturedTile size="sm" tone="dune" eyebrow="4K · HDR" title="Dune: Part Two" meta="2024 · 2 sa 46 dk" />
            </div>
          </div>

          {/* Wide rails (16:9) */}
          <WideRail title="Devam Et" badge="3" items={[
            { t:'Çukur', sub:'S2 · B7 · 18 dk kaldı', tone:'rust', pct:64 },
            { t:'Inception', sub:'1 sa 8 dk kaldı', tone:'ice', pct:78 },
            { t:'Severance', sub:'S2 · B3 · 32 dk kaldı', tone:'plum', pct:41 },
            { t:'Yargı', sub:'S1 · B12', tone:'sand', pct:22 },
          ]} progress />

          <WideRail title="Bu Hafta Türkiye" badge="10" items={[
            { t:'Bahar', sub:'Star TV · S1', tone:'sand' },
            { t:'Yalı Çapkını', sub:'Star TV · S2', tone:'plum' },
            { t:'Aile', sub:'Show TV · S1', tone:'cool' },
            { t:'Adım Farah', sub:'FOX · S1', tone:'warm' },
            { t:'Kara Tahta', sub:'NOW · S1', tone:'ice' },
          ]} />

          <WideRail title="Canlı: Şu An Yayında" badge="LIVE" live items={[
            { t:'TRT 1 · Kanlı Banker', sub:'Akşam Filmi · 14.30 — 16.20', tone:'cool' },
            { t:'beIN Sports 1', sub:'Galatasaray — Fenerbahçe · 21.00', tone:'rust' },
            { t:'NTV', sub:'Ekonomi Bülteni · 14.00 — 14.45', tone:'ice' },
            { t:'CNN Türk', sub:'Dünya Bülteni · 14.30 — 15.30', tone:'plum' },
          ]} />
        </div>
      </main>
    </div>
  </div>
);

const FeaturedTile = ({ size = 'lg', tone, eyebrow, title, meta, desc }) => {
  const h = size === 'lg' ? 380 : 182;
  return (
    <div style={{ position:'relative', borderRadius: 14, overflow:'hidden', height: h, border:'1px solid var(--border)' }}>
      <CinematicBackdrop tone={tone} fade="bottom" height="100%">
        <div style={{ height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding: size === 'lg' ? '0 32px 28px' : '0 22px 20px' }}>
          <span className="meta-caps" style={{ fontSize: 9.5, color:'var(--accent)', marginBottom: size === 'lg' ? 12 : 8 }}>{eyebrow}</span>
          <h2 className="h-display" style={{ fontSize: size === 'lg' ? 56 : 32, margin: 0, color:'#fff', letterSpacing:'-0.025em' }}>{title}</h2>
          <span className="meta-caps" style={{ fontSize: 9.5, color:'rgba(232,237,236,0.7)', marginTop: 8 }}>{meta}</span>
          {desc && size === 'lg' && (
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color:'rgba(232,237,236,0.72)', maxWidth: 480, margin:'12px 0 0' }}>{desc}</p>
          )}
          {size === 'lg' && (
            <div style={{ display:'flex', gap: 10, marginTop: 18 }}>
              <button className="btn btn-primary" style={{ height: 38, padding:'0 18px', fontSize: 13, background:'#fff', color:'#0E1213' }}>▶ İzle</button>
              <button className="btn" style={{ height: 38, background:'rgba(255,255,255,0.08)', color:'#fff', border:'1px solid rgba(255,255,255,0.14)' }}>+ Listem</button>
            </div>
          )}
        </div>
      </CinematicBackdrop>
    </div>
  );
};

const WideRail = ({ title, badge, items, progress, live }) => (
  <section style={{ marginTop: 32 }}>
    <div style={{ display:'flex', alignItems:'baseline', gap: 12, marginBottom: 14 }}>
      <h3 style={{ fontFamily:'var(--sans)', fontSize: 18, fontWeight: 600, margin:0, letterSpacing:'-0.005em' }}>{title}</h3>
      {badge && (
        <span className="pill" style={{
          background: live ? 'rgba(63,208,189,0.1)' : 'var(--bg-elev2)',
          color: live ? 'var(--teal)' : 'var(--text-3)',
          borderColor: live ? 'rgba(63,208,189,0.3)' : 'var(--border)',
          height: 18,
        }}>{live && <span className="live-dot" />} {badge}</span>
      )}
      <div style={{ flex:1 }} />
      <span className="meta-caps" style={{ fontSize: 9.5, color:'var(--text-3)' }}>Tümünü gör →</span>
    </div>
    <div style={{ display:'grid', gridAutoFlow:'column', gridAutoColumns: '300px', gap: 16, overflow:'hidden' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          <div style={{ position:'relative' }}>
            <NetflixPoster w={300} ratio="16/9" tone={it.tone} label="" />
            {progress && it.pct != null && (
              <div style={{ position:'absolute', bottom: 0, left: 0, right: 0, height: 3, background:'rgba(0,0,0,0.5)' }}>
                <div style={{ width:`${it.pct}%`, height:'100%', background:'var(--copper)' }} />
              </div>
            )}
            {live && (
              <span className="pill pill-live" style={{ position:'absolute', top: 10, left: 10, height: 18 }}>
                <span className="live-dot" /> CANLI
              </span>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 3 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{it.t}</span>
            <span className="meta-caps" style={{ fontSize: 9 }}>{it.sub}</span>
          </div>
        </div>
      ))}
    </div>
  </section>
);

Object.assign(window, { HomeNetflixA, HomeNetflixB, HomeNetflixC, HomeNetflixD });
