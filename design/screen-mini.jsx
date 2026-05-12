// Mini player widget + component library page

const MiniPlayerWidget = ({ size = 'lg', state = 'playing' }) => {
  const w = size === 'sm' ? 280 : size === 'md' ? 320 : 380;
  const h = w * 9 / 16 + 64;
  return (
    <div className="gi" style={{ width: w, height: h, borderRadius: 14, background:'#0A0D0E', border:'1px solid var(--border)', boxShadow:'var(--shadow-pop)', overflow:'hidden', position:'relative' }}>
      {/* Drag handle */}
      <div style={{ position:'absolute', top: 6, left: '50%', transform:'translateX(-50%)', width: 36, height: 3, borderRadius: 3, background:'rgba(255,255,255,0.15)', zIndex: 5 }} />
      {/* Video area */}
      <div style={{ position:'relative', width: '100%', aspectRatio: '16 / 9', background: 'linear-gradient(140deg, #1A2628 0%, #0B1012 100%)', overflow:'hidden' }}>
        {/* fake content */}
        <div style={{ position:'absolute', inset: 0, background: 'repeating-linear-gradient(115deg, transparent 0 36px, rgba(63,208,189,0.05) 36px 38px)' }} />
        <div style={{ position:'absolute', left: 14, top: 14, display:'flex', alignItems:'center', gap: 8 }}>
          <span className="live-dot" />
          <span className="meta-caps" style={{ fontSize: 9, color: '#fff' }}>CANLI</span>
        </div>
        <div style={{ position:'absolute', right: 12, top: 10, display:'flex', gap: 6 }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background:'rgba(0,0,0,0.45)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize: 10, color:'#fff' }}>↗</span>
          <span style={{ width: 22, height: 22, borderRadius: 6, background:'rgba(0,0,0,0.45)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize: 10, color:'#fff' }}>✕</span>
        </div>
        <div style={{ position:'absolute', left: 0, right: 0, bottom: 0, padding: '34px 14px 12px', background:'linear-gradient(180deg, transparent, rgba(0,0,0,0.78))' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 5, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', color:'#0E1213', fontFamily:'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}>TRT</div>
            <div style={{ flex:1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color:'#fff', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>TRT 1</div>
              <div className="meta-caps" style={{ fontSize: 8.5, color:'rgba(255,255,255,0.65)' }}>KANLI BANKER · 19.00 - 21.00</div>
            </div>
          </div>
        </div>
      </div>
      {/* Controls strip */}
      <div style={{ display:'grid', gridTemplateColumns:'auto auto 1fr auto auto', alignItems:'center', gap: 12, padding: '12px 14px' }}>
        <span style={{ width: 30, height: 30, borderRadius:'50%', background:'var(--accent)', color:'var(--accent-ink)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 11, paddingLeft: state === 'playing' ? 0 : 1 }}>{state === 'playing' ? '❚❚' : '▶'}</span>
        <span style={{ fontSize: 14, color:'var(--text-2)' }}>🔊</span>
        <div style={{ height: 3, borderRadius: 3, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
          <div style={{ width: '64%', height:'100%', background:'var(--accent)' }} />
        </div>
        <span className="mono" style={{ fontSize: 10, color:'var(--text-3)', whiteSpace:'nowrap' }}>01:23:45</span>
        <span style={{ fontSize: 12, color:'var(--text-2)' }}>⛶</span>
      </div>
    </div>
  );
};

// ─── Component library page ───────────────────────────────
const ComponentsScreen = () => (
  <div className="gi" style={{ width:'100%', minHeight:'100%', background: 'var(--bg)', padding: '40px 56px 80px', color: 'var(--text)', display:'flex', flexDirection:'column', gap: 36 }}>
    <div>
      <span className="meta-caps" style={{ fontSize: 10 }}>00 · BİLEŞEN KÜTÜPHANESİ</span>
      <h1 className="h-display" style={{ fontSize: 48, margin: '8px 0 6px' }}>Tasarım <span className="h-italic">sistemi</span>.</h1>
      <p style={{ color:'var(--text-2)', fontSize: 14, maxWidth: 540, lineHeight: 1.6 }}>
        Renk tokenları, tipografi, butonlar, durumlar — tüm ekranlar bu yapı taşları üzerinden inşa edildi.
      </p>
    </div>

    <Block title="Renk · Yüzey">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 12 }}>
        {[
          ['Bg', '#0E1213'], ['BgElev', '#161B1D'], ['BgElev2', '#1F2A2C'],
          ['Border', '#1F2A2C'], ['Line', '#161B1D'],
        ].map(([n, c]) => (
          <div key={n} style={{ borderRadius: 10, overflow:'hidden', border:'1px solid var(--border)' }}>
            <div style={{ height: 76, background: c }} />
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
              <div className="mono" style={{ fontSize: 10, color:'var(--text-3)' }}>{c}</div>
            </div>
          </div>
        ))}
      </div>
    </Block>

    <Block title="Renk · Vurgu">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 12 }}>
        {[
          ['Accent', '#3FD0BD', 'Vurgu / butonlar'],
          ['Accent strong', '#5DEAD8', 'Hover'],
          ['Accent deep', '#0F8A7E', 'Active / pressed'],
          ['Copper', '#C68A5C', 'Favori, ★'],
          ['Live', '#3FD0BD', 'Yayında dot'],
        ].map(([n, c, h]) => (
          <div key={n} style={{ borderRadius: 10, overflow:'hidden', border:'1px solid var(--border)' }}>
            <div style={{ height: 76, background: c }} />
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
              <div className="mono" style={{ fontSize: 10, color:'var(--text-3)' }}>{c} · {h}</div>
            </div>
          </div>
        ))}
      </div>
    </Block>

    <Block title="Tipografi">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 24 }}>
        <div style={{ padding: 24, borderRadius: 12, border:'1px solid var(--border)', background:'var(--bg-elev)' }}>
          <span className="meta-caps" style={{ fontSize: 10 }}>INSTRUMENT SERIF · DISPLAY</span>
          <div className="h-display" style={{ fontSize: 56, lineHeight: 1.05, marginTop: 12 }}>Hoş geldin, <span className="h-italic">Berke.</span></div>
          <div className="h-serif" style={{ fontSize: 22, marginTop: 8 }}>Devam Et — son izlediğin dizi seni bekliyor.</div>
        </div>
        <div style={{ padding: 24, borderRadius: 12, border:'1px solid var(--border)', background:'var(--bg-elev)' }}>
          <span className="meta-caps" style={{ fontSize: 10 }}>GEIST · BODY + GEIST MONO · CAPS</span>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 12 }}>Aksiyon Filmleri</div>
          <p style={{ fontSize: 14, color:'var(--text-2)', lineHeight: 1.6, margin: '8px 0' }}>
            Çöl, kehanetin gerçek olduğunu sandığında konuşmaya başlar. Uzun gecelerde rüzgar bir isim taşır.
          </p>
          <div className="mono" style={{ fontSize: 11, color:'var(--text-3)', letterSpacing: '0.06em' }}>01:23:45 · 4K HDR · DOLBY ATMOS</div>
        </div>
      </div>
    </Block>

    <Block title="Butonlar · Durumlar">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, auto)', gap: 14, alignItems:'center' }}>
        <button className="btn btn-primary">Primary</button>
        <button className="btn btn-primary" style={{ filter:'brightness(1.1)' }}>Hover</button>
        <button className="btn btn-primary" style={{ filter:'brightness(0.92)', transform:'scale(0.98)' }}>Active</button>
        <button className="btn btn-primary" style={{ outline:'2px solid var(--accent-strong)', outlineOffset: 4 }}>Focus</button>
        <button className="btn btn-primary" style={{ opacity: 0.4 }}>Disabled</button>

        <button className="btn btn-ghost">Ghost</button>
        <button className="btn btn-ghost" style={{ background:'var(--bg-elev2)' }}>Hover</button>
        <button className="btn btn-ghost" style={{ background:'var(--bg-elev2)', transform:'scale(0.98)' }}>Active</button>
        <button className="btn btn-ghost" style={{ outline:'2px solid var(--accent)', outlineOffset: 4 }}>Focus</button>
        <button className="btn btn-ghost" style={{ opacity: 0.4 }}>Disabled</button>

        <button className="btn btn-icon">★</button>
        <button className="btn btn-icon" style={{ background:'var(--bg-elev2)' }}>★</button>
        <button className="btn btn-icon" style={{ color:'var(--copper)' }}>★</button>
        <span className="pill pill-live">● CANLI</span>
        <span className="pill pill-accent">HD · 4K</span>
      </div>
    </Block>

    <Block title="Liste · Kart · EPG">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 24 }}>
        <div style={{ padding: 0, borderRadius: 12, border:'1px solid var(--border)', background:'var(--bg-elev)', overflow:'hidden' }}>
          <ChannelRow abbr="TRT" name="TRT 1" now="Kanlı Banker · 19.00 - 21.00" live hd fav />
          <ChannelRow abbr="ATV" name="ATV" now="Esra Erol · 14.00 - 16.30" live hd />
          <ChannelRow abbr="SHO" name="SHOW TV" now="Reyhan · 14.30 - 17.00" live hd />
        </div>
        <div style={{ padding: 24, borderRadius: 12, border:'1px solid var(--border)', background:'var(--bg-elev)' }}>
          <span className="meta-caps" style={{ fontSize: 10 }}>20:00 — 21:00 · CANLI</span>
          <div className="h-serif" style={{ fontSize: 22, margin: '6px 0' }}>Kanlı Banker</div>
          <p style={{ fontSize: 13, color:'var(--text-2)', lineHeight: 1.55, margin: 0 }}>İstanbul'un karanlık koridorlarında geçen polisiye drama; Cengiz Çetin'in başrolde olduğu yeni sezonun ilk bölümü.</p>
          <div style={{ display:'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" style={{ height: 34 }}>▶ Kanalı aç</button>
            <button className="btn btn-ghost" style={{ height: 34 }}>★ Hatırlat</button>
          </div>
        </div>
      </div>
    </Block>
  </div>
);

const Block = ({ title, children }) => (
  <section style={{ display:'flex', flexDirection:'column', gap: 14 }}>
    <div style={{ display:'flex', alignItems:'baseline', gap: 14, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
      <h2 className="h-serif" style={{ fontSize: 24, margin: 0 }}>{title}</h2>
    </div>
    {children}
  </section>
);

Object.assign(window, { MiniPlayerWidget, ComponentsScreen });
