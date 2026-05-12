// Live Player + Mini Player Widget

const PlayerWindowedScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background: '#000' }}>
    <TitleBar breadcrumb="Oynatıcı / TRT 1" />
    <div style={{ flex:1, position:'relative', background: '#000' }}>
      {/* Video stage */}
      <div style={{
        position:'absolute', inset: 0,
        background:
          'radial-gradient(80% 60% at 50% 45%, rgba(63,208,189,0.10), transparent 70%),' +
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 12px),' +
          'linear-gradient(180deg, #0F1517 0%, #050708 100%)',
      }}>
        {/* center marker */}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <Logo size={56} />
          <span className="meta-caps" style={{ fontSize: 10, color:'var(--text-3)' }}>YAYIN GÖRÜNTÜSÜ · 1080P · H264</span>
        </div>
        {/* Faux scanlines */}
        <div style={{ position:'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 3px, rgba(255,255,255,0.012) 3px 4px)' }} />
      </div>

      {/* Top overlay bar */}
      <div style={{
        position:'absolute', top: 0, left: 0, right: 0,
        padding: '20px 28px',
        background: 'linear-gradient(180deg, rgba(10,13,14,0.85), rgba(10,13,14,0))',
        display:'flex', alignItems:'center', gap: 16,
      }}>
        <button className="btn btn-icon" style={{ background:'rgba(20,28,30,0.6)', color: 'var(--text)' }}>←</button>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: 'radial-gradient(140% 140% at 30% 25%, #1F2A2C, #0F1517 80%)',
          border: '1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--mono)', fontSize: 11, fontWeight:500,
        }}>TRT</div>
        <div style={{ display:'flex', flexDirection:'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>TRT 1</span>
          <span className="meta-caps" style={{ fontSize: 9.5 }}>ULUSAL · KAN. 1</span>
        </div>
        <span className="pill pill-live" style={{ marginLeft: 8 }}><span className="live-dot" /> Canlı</span>
        <span className="pill pill-hd">HD · 1080</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-icon" style={{ background:'rgba(20,28,30,0.6)' }}>★</button>
        <button className="btn btn-icon" style={{ background:'rgba(20,28,30,0.6)' }}>⚙</button>
        <button className="btn btn-icon" style={{ background:'rgba(20,28,30,0.6)' }}>⛶</button>
      </div>

      {/* Now playing card (lower-mid) */}
      <div style={{
        position:'absolute', bottom: 130, left: 28,
        padding: '14px 20px', borderRadius: 14,
        background: 'rgba(10,13,14,0.7)', backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.06)',
        display:'flex', flexDirection:'column', gap: 6, maxWidth: 480,
      }}>
        <span className="meta-caps" style={{ fontSize: 9.5, color: 'var(--accent)' }}>ŞIMDI · 19.00 — 21.00</span>
        <span className="h-serif" style={{ fontSize: 22, lineHeight:1.1 }}>Kanlı Banker</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Türk dizisi · Bölüm 23 · 2.sezon</span>
        <span className="meta-caps" style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 2 }}>SONRAKİ · 21.00 · ANA HABER</span>
      </div>

      {/* Bottom controls */}
      <div style={{
        position:'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 28px 22px',
        background: 'linear-gradient(0deg, rgba(10,13,14,0.92), rgba(10,13,14,0))',
      }}>
        {/* Time + scrub (live) */}
        <div style={{ display:'flex', alignItems:'center', gap: 14, marginBottom: 14 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>19.42</span>
          <div style={{ flex: 1, position:'relative', height: 4 }}>
            <div style={{ position:'absolute', inset: 0, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position:'absolute', left: 0, width: '64%', height: 4, borderRadius: 4, background: 'var(--accent)' }} />
            <div style={{ position:'absolute', left: 'calc(64% - 7px)', top: -5, width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>21.00</span>
        </div>
        {/* Buttons row */}
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <button className="btn btn-icon" style={{ background:'rgba(20,28,30,0.5)' }}>⏮</button>
          <button className="btn btn-primary" style={{ width: 52, height: 52, borderRadius:'50%', padding:0, justifyContent:'center', fontSize: 16 }}>⏸</button>
          <button className="btn btn-icon" style={{ background:'rgba(20,28,30,0.5)' }}>⏭</button>
          <div style={{ display:'flex', alignItems:'center', gap: 10, marginLeft: 10, width: 160 }}>
            <span style={{ color:'var(--text-2)' }}>🔊</span>
            <Slider pct={70} />
          </div>
          <span className="meta-caps" style={{ fontSize: 9.5, color:'var(--text-3)', marginLeft: 8 }}>SONRAKİ KANAL · ATV →</span>
          <div style={{ flex:1 }} />
          <button className="btn btn-ghost" style={{ height: 32 }}>16:9</button>
          <button className="btn btn-icon" style={{ background:'rgba(20,28,30,0.5)' }}>📺</button>
          <button className="btn btn-icon" style={{ background:'rgba(20,28,30,0.5)' }}>⛶</button>
        </div>
      </div>
    </div>
  </div>
);

const PlayerFullscreenScreen = () => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'#000' }}>
    {/* No title bar - true fullscreen */}
    <div style={{ flex:1, position:'relative', background:'#000' }}>
      <div style={{
        position:'absolute', inset: 0,
        background:
          'radial-gradient(60% 60% at 50% 45%, rgba(198,138,92,0.18), transparent 70%),' +
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 14px),' +
          'linear-gradient(180deg, #1A0F08 0%, #050300 100%)',
      }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <span className="h-italic" style={{ fontSize: 110, color: 'var(--text)', opacity: 0.55 }}>Dune</span>
          <span className="meta-caps" style={{ fontSize: 11, color:'var(--copper-2)' }}>VOD · 4K · HDR · DOLBY ATMOS</span>
        </div>
      </div>

      {/* Floating controls (fade-out shown active) */}
      <div style={{ position:'absolute', top: 28, left: 36, right: 36, display:'flex', alignItems:'center', gap: 14 }}>
        <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>←</button>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Dune: Part Two</span>
          <span className="meta-caps" style={{ fontSize: 9.5, color: 'var(--text-3)' }}>2024 · BÖLÜM YOK · 4K UHD</span>
        </div>
        <div style={{ flex:1 }} />
        <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>★</button>
        <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>CC</button>
        <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>⚙</button>
        <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>⤢</button>
      </div>

      {/* Bottom scrubber */}
      <div style={{ position:'absolute', bottom: 32, left: 36, right: 36 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 14, marginBottom: 18 }}>
          <span className="mono" style={{ fontSize: 11, color: '#fff' }}>1.46.22</span>
          <div style={{ flex: 1, position:'relative', height: 6 }}>
            <div style={{ position:'absolute', inset: 0, height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position:'absolute', left: 0, width: '64%', height: 6, borderRadius: 6, background: 'var(--accent)' }} />
            {/* chapter markers */}
            {[12, 28, 47, 64, 78, 91].map((p) => (
              <div key={p} style={{ position:'absolute', left: `${p}%`, top: -2, width: 2, height: 10, background: 'rgba(255,255,255,0.5)' }} />
            ))}
            <div style={{ position:'absolute', left: 'calc(64% - 9px)', top: -6, width: 18, height: 18, borderRadius: '50%', background: '#fff' }} />
            {/* Hover preview */}
            <div style={{ position:'absolute', left: 'calc(64% - 60px)', top: -90, width: 120, height: 68, borderRadius: 6, background:'#000', border: '1px solid rgba(255,255,255,0.18)', overflow:'hidden' }}>
              <div className="stripe-poster" style={{ width:'100%', height: '100%', borderRadius: 0, border: 'none', background:'linear-gradient(160deg, #2A211A, #150F0C)' }}>
                <div style={{ position:'absolute', bottom: 4, right: 6, fontFamily:'var(--mono)', fontSize: 9, color:'#fff' }}>1.46.42</div>
              </div>
            </div>
          </div>
          <span className="mono" style={{ fontSize: 11, color: '#fff' }}>2.46.40</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
          <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>⏪ 10</button>
          <button className="btn btn-primary" style={{ width: 64, height: 64, borderRadius:'50%', padding:0, justifyContent:'center', fontSize: 18 }}>⏸</button>
          <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>10 ⏩</button>
          <div style={{ display:'flex', alignItems:'center', gap: 10, marginLeft: 12, width: 180 }}>
            <span style={{ color:'#fff' }}>🔊</span>
            <Slider pct={82} />
          </div>
          <div style={{ flex:1 }} />
          <span className="meta-caps" style={{ fontSize: 9.5, color:'#fff', opacity: 0.7 }}>F · TAM EKRAN · ESC · ÇIKIŞ</span>
          <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>📺</button>
          <button className="btn btn-icon" style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>⛶</button>
        </div>
      </div>

      {/* Subtitle preview */}
      <div style={{
        position:'absolute', bottom: 160, left:'50%', transform:'translateX(-50%)',
        padding: '6px 16px', borderRadius: 6,
        background: 'rgba(0,0,0,0.55)',
        fontFamily: 'var(--sans)', fontSize: 21, color: '#fff', letterSpacing: '-0.005em',
        textAlign: 'center', maxWidth: '70%',
      }}>
        Çöl, kehanetin gerçek olduğunu sandığında konuşmaya başlar.
      </div>
    </div>
  </div>
);

const MiniPlayerWidget = () => (
  <div className="gi" style={{
    width:'100%', height:'100%',
    background: 'transparent', padding: 36,
    display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'flex-end',
  }}>
    {/* Faux desktop background */}
    <div style={{
      position:'absolute', inset: 0,
      background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 8px), radial-gradient(120% 120% at 30% 20%, #1F2A2C, #050708 70%)',
    }} />
    {/* Mini player */}
    <div style={{
      position:'relative',
      width: 360, height: 220, borderRadius: 14,
      overflow: 'hidden',
      background: '#000', border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
    }}>
      {/* Video bg */}
      <div style={{
        position:'absolute', inset: 0,
        background: 'radial-gradient(60% 50% at 50% 40%, rgba(63,208,189,0.16), transparent 70%), linear-gradient(160deg, #0F1517, #050708)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <Logo size={36} />
      </div>
      {/* Top chrome */}
      <div style={{
        position:'absolute', top: 0, left: 0, right: 0, padding: '8px 10px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7), rgba(0,0,0,0))',
        display:'flex', alignItems:'center', gap: 8,
      }}>
        <span className="live-dot" />
        <span className="meta-caps" style={{ fontSize: 9, color:'#fff' }}>TRT 1 · CANLI</span>
        <div style={{ flex:1 }} />
        <button className="btn btn-icon" style={{ width: 22, height: 22, fontSize: 10, background:'rgba(0,0,0,0.5)' }}>📌</button>
        <button className="btn btn-icon" style={{ width: 22, height: 22, fontSize: 10, background:'rgba(0,0,0,0.5)' }}>⛶</button>
        <button className="btn btn-icon" style={{ width: 22, height: 22, fontSize: 10, background:'rgba(0,0,0,0.5)' }}>✕</button>
      </div>
      {/* Bottom chrome */}
      <div style={{
        position:'absolute', bottom: 0, left: 0, right: 0, padding: '10px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.85), rgba(0,0,0,0))',
        display:'flex', alignItems:'center', gap: 8,
      }}>
        <button className="btn btn-icon" style={{ width: 28, height: 28, fontSize: 11, background:'rgba(255,255,255,0.1)', color:'#fff' }}>⏸</button>
        <div style={{ flex: 1, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.15)', position:'relative' }}>
          <div style={{ width: '64%', height: '100%', borderRadius: 3, background: 'var(--accent)' }} />
        </div>
        <button className="btn btn-icon" style={{ width: 28, height: 28, fontSize: 11, background:'rgba(255,255,255,0.1)', color:'#fff' }}>🔊</button>
      </div>
    </div>
    <div className="meta-caps" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 12, position:'relative' }}>
      MİNİ OYNATICI · 360×220 · SAĞ ALT KÖŞE · ALWAYS-ON-TOP TOGGLE
    </div>
  </div>
);

Object.assign(window, { PlayerWindowedScreen, PlayerFullscreenScreen, MiniPlayerWidget });
