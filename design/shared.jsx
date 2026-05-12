// Shared components for Genç IPTV Windows mockups.
// Logo, title bar, sidebar, glyph chips, posters, EPG bits.

const Logo = ({ size = 28, mono = false }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block', flex: '0 0 auto' }}>
    <defs>
      <linearGradient id={`gi-silver-${size}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#E2E6E7" />
        <stop offset="0.55" stopColor="#9FA5A7" />
        <stop offset="1" stopColor="#4F5557" />
      </linearGradient>
      <linearGradient id={`gi-copper-${size}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#E0A878" />
        <stop offset="1" stopColor="#7A4A2A" />
      </linearGradient>
      <linearGradient id={`gi-teal-${size}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#5DEAD8" />
        <stop offset="1" stopColor="#0E8A7C" />
      </linearGradient>
    </defs>
    <path d="M16 4a12 12 0 1 0 12 12h-3a9 9 0 1 1-9-9z" fill={mono ? '#fff' : `url(#gi-silver-${size})`} />
    <path d="M28 16a12 12 0 0 1-12 12v-3a9 9 0 0 0 9-9z" fill={mono ? 'rgba(255,255,255,0.85)' : `url(#gi-copper-${size})`} />
    <path d="m13 11 8 5-8 5z" fill={mono ? '#0E1213' : `url(#gi-teal-${size})`} />
  </svg>
);

const Wordmark = ({ size = 18 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
    <span className="h-italic" style={{ fontSize: size }}>Genç</span>
    <span className="meta-caps" style={{ fontSize: 8.5, letterSpacing: '0.22em', color: 'var(--text-4)' }}>IPTV PLAYER</span>
  </div>
);

// ─── Window chrome ───────────────────────────────────────────
const TitleBar = ({ title = '', breadcrumb = null, right = null }) => (
  <div style={{
    height: 'var(--titlebar-h)',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    padding: '0 0 0 12px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--bg)',
    fontFamily: 'var(--mono)',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-3)',
    userSelect: 'none',
    flex: '0 0 auto',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Logo size={16} />
      <span style={{ color: 'var(--text-2)' }}>Genç IPTV</span>
      {breadcrumb && <>
        <span style={{ color: 'var(--text-4)' }}>/</span>
        <span>{breadcrumb}</span>
      </>}
    </div>
    <div style={{ color: 'var(--text-3)', fontSize: 10 }}>{title}</div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
      {right}
      <WinButtons />
    </div>
  </div>
);

const WinButtons = () => (
  <div style={{ display: 'flex', height: 'var(--titlebar-h)' }}>
    {['—', '▢', '✕'].map((g, i) => (
      <div key={i} style={{
        width: 46, height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: i === 2 ? 'var(--text-2)' : 'var(--text-3)',
        fontSize: i === 1 ? 10 : 13,
        fontFamily: 'var(--sans)',
      }}>{g}</div>
    ))}
  </div>
);

// ─── Sidebar ────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { key: 'home', icon: 'home', label: 'Anasayfa' },
  { key: 'channels', icon: 'play', label: 'Kanallar' },
  { key: 'films', icon: 'star', label: 'Filmler' },
  { key: 'series', icon: 'square', label: 'Diziler' },
  { key: 'epg', icon: 'cal', label: 'Program Rehberi' },
  { key: 'fav', icon: 'heart', label: 'Favoriler' },
];

const SideIcon = ({ name, active }) => {
  const stroke = active ? 'var(--accent)' : 'var(--text-2)';
  const sw = 1.5;
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home': return (<svg {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>);
    case 'play': return (<svg {...common}><polygon points="6 4 20 12 6 20 6 4" /></svg>);
    case 'star': return (<svg {...common}><polygon points="12 3 14.6 8.6 21 9.5 16.5 13.9 17.6 20 12 17 6.4 20 7.5 13.9 3 9.5 9.4 8.6 12 3" /></svg>);
    case 'square': return (<svg {...common}><rect x="4" y="4" width="16" height="16" rx="1.5" /><line x1="8" y1="4" x2="8" y2="20" /><line x1="16" y1="4" x2="16" y2="20" /></svg>);
    case 'cal': return (<svg {...common}><rect x="4" y="5" width="16" height="15" rx="2" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="9" y1="3" x2="9" y2="7" /><line x1="15" y1="3" x2="15" y2="7" /></svg>);
    case 'heart': return (<svg {...common}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>);
    case 'gear': return (<svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.4 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.4l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.6 7l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>);
    case 'search': return (<svg {...common}><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></svg>);
    default: return null;
  }
};

const Sidebar = ({ active = 'home', mini = false, profile = 'Berke' }) => {
  const w = mini ? 'var(--sidebar-w-mini)' : 'var(--sidebar-w)';
  return (
    <aside style={{
      width: w, flex: `0 0 ${w}`,
      borderRight: '1px solid var(--line)',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      padding: mini ? '14px 8px' : '14px 14px 14px 18px',
      gap: 4,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: mini ? '6px 6px 14px' : '6px 4px 14px',
        justifyContent: mini ? 'center' : 'flex-start',
      }}>
        <Logo size={mini ? 22 : 24} />
        {!mini && <Wordmark size={17} />}
      </div>
      <div className="hairline" style={{ marginBottom: 10 }} />
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 34, padding: mini ? 0 : '0 10px',
        borderRadius: 8, background: 'var(--bg-elev)', border: '1px solid var(--border)',
        margin: mini ? '0 4px 12px' : '0 0 12px',
        justifyContent: mini ? 'center' : 'flex-start',
      }}>
        <SideIcon name="search" />
        {!mini && <>
          <span style={{ color: 'var(--text-3)', fontSize: 12, flex: 1 }}>Ara</span>
          <span className="mono" style={{ color: 'var(--text-4)', fontSize: 9.5, letterSpacing: '0.06em' }}>⌃F</span>
        </>}
      </div>
      <div className="hairline" style={{ marginBottom: 8 }} />
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SIDEBAR_ITEMS.map((it) => {
          const isActive = it.key === active;
          return (
            <div key={it.key} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              height: 34, padding: mini ? 0 : '0 10px',
              borderRadius: 8,
              background: isActive ? 'var(--bg-elev2)' : 'transparent',
              color: isActive ? 'var(--text)' : 'var(--text-2)',
              fontSize: 13, fontWeight: isActive ? 500 : 400,
              position: 'relative',
              justifyContent: mini ? 'center' : 'flex-start',
            }}>
              {isActive && !mini && <span style={{
                position: 'absolute', left: 0, top: 7, bottom: 7, width: 2.5,
                background: 'var(--accent)', borderRadius: 2,
              }} />}
              <SideIcon name={it.icon} active={isActive} />
              {!mini && <span>{it.label}</span>}
            </div>
          );
        })}
      </nav>
      <div style={{ flex: 1 }} />
      <div className="hairline" style={{ marginBottom: 8 }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        height: 34, padding: mini ? 0 : '0 10px', borderRadius: 8,
        color: 'var(--text-2)', fontSize: 13,
        justifyContent: mini ? 'center' : 'flex-start',
      }}>
        <SideIcon name="gear" />
        {!mini && <span>Ayarlar</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginTop: 4, padding: mini ? '6px 0' : '8px 10px',
        borderRadius: 8, background: 'var(--bg-elev)', border: '1px solid var(--border)',
        justifyContent: mini ? 'center' : 'flex-start',
      }}>
        <Avatar size={mini ? 26 : 28} initials="B" />
        {!mini && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{profile}</span>
            <span className="meta-caps" style={{ fontSize: 9 }}>Çevrim içi</span>
          </div>
        )}
        {!mini && <span style={{ color: 'var(--text-3)', fontSize: 11 }}>▾</span>}
      </div>
    </aside>
  );
};

const Avatar = ({ size = 28, initials = 'B' }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-deep), var(--accent))',
    color: 'var(--accent-ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--serif)', fontSize: size * 0.5,
    flex: '0 0 auto',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
  }}>{initials}</div>
);

// ─── Top bar (page title row) ───────────────────────────────
const TopBar = ({ children, right }) => (
  <div style={{
    height: 'var(--topbar-h)', flex: '0 0 auto',
    display: 'flex', alignItems: 'center', gap: 18,
    padding: '0 32px',
    borderBottom: '1px solid var(--line)',
  }}>
    {children}
    <div style={{ flex: 1 }} />
    {right}
  </div>
);

// ─── Glyph chip ────────────────────────────────────────────
const GlyphChip = ({ abbr = 'SPO', size = 46, accent = false }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: accent
      ? 'linear-gradient(135deg, var(--accent-deep), var(--accent))'
      : 'radial-gradient(120% 120% at 30% 25%, #243133, #0E1213 70%)',
    boxShadow: accent
      ? 'inset 0 0 0 1.2px rgba(255,255,255,0.18), 0 0 18px rgba(63,208,189,0.18)'
      : 'inset 0 0 0 1.2px rgba(232,237,236,0.12)',
    color: accent ? 'var(--accent-ink)' : 'var(--text-2)',
    fontFamily: 'var(--mono)', fontSize: size * 0.24,
    letterSpacing: '0.06em', fontWeight: 500,
    flex: '0 0 auto', textTransform: 'uppercase',
  }}>{abbr}</div>
);

// ─── Stripe poster placeholder ─────────────────────────────
const StripePoster = ({ ratio = '2 / 3', label = 'film posteri', num = '01', tone = 'cool', style = {} }) => {
  const tones = {
    cool: 'linear-gradient(160deg, #1A2224 0%, #0F1517 100%)',
    warm: 'linear-gradient(160deg, #2A211A 0%, #150F0C 100%)',
    teal: 'linear-gradient(160deg, #173033 0%, #0A1518 100%)',
    copper: 'linear-gradient(160deg, #2C1F14 0%, #15100A 100%)',
    plum: 'linear-gradient(160deg, #221726 0%, #100A14 100%)',
  };
  return (
    <div className="stripe-poster" style={{ aspectRatio: ratio, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: `repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 8px), ${tones[tone] || tones.cool}`, ...style }}>
      <div className="stripe-num">{num}</div>
      <div className="stripe-cap">{label}</div>
    </div>
  );
};

// Banner placeholder (16:9)
const StripeBanner = ({ label = 'devam et', num = '01', tone = 'cool', children, style = {} }) => (
  <StripePoster ratio="16 / 9" label={label} num={num} tone={tone} style={style}>{children}</StripePoster>
);

// Channel logo tile (1:1)
const ChannelTile = ({ abbr = 'TRT', label = 'TRT 1', sub = '', tone = 'cool' }) => (
  <div style={{ width: 132, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div className="stripe-poster" style={{
      aspectRatio: '1 / 1', borderRadius: 'var(--r-md)',
      border: '1px solid var(--border)',
      background: tone === 'paper'
        ? 'linear-gradient(160deg, #F6F2EC 0%, #DDD6C9 100%)'
        : 'radial-gradient(140% 140% at 30% 25%, #1F2A2C, #0F1517 80%)',
      display:'flex', alignItems:'center', justifyContent:'center',
      position: 'relative',
    }}>
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 18, letterSpacing: '0.04em', fontWeight: 500,
        color: tone === 'paper' ? '#14120E' : 'var(--text)',
      }}>{abbr}</span>
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap: 2, paddingLeft: 2 }}>
      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
      {sub && <span className="meta-caps" style={{ fontSize: 9 }}>{sub}</span>}
    </div>
  </div>
);

// ─── Editorial header ──────────────────────────────────────
const EditorialHeader = ({ eyebrow, title, meta, right }) => (
  <div style={{ display:'flex', alignItems:'flex-end', gap: 24, padding: '4px 0 18px' }}>
    <div style={{ flex: 1, display:'flex', flexDirection:'column', gap: 10 }}>
      {eyebrow && <span className="meta-caps" style={{ fontSize: 10 }}>{eyebrow}</span>}
      <h1 className="h-display" style={{ fontSize: 52, margin: 0 }}>{title}</h1>
      {meta && <span className="meta-caps" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{meta}</span>}
    </div>
    {right}
  </div>
);

// Section title (rail header)
const RailHeader = ({ title, count, accent = false, action }) => (
  <div style={{ display:'flex', alignItems:'baseline', gap: 16, padding: '0 0 14px' }}>
    <h3 className="h-serif" style={{ fontSize: 26, margin: 0, color: accent ? 'var(--accent)' : 'var(--text)' }}>{title}</h3>
    {count != null && <span className="meta-caps" style={{ fontSize: 10 }}>{count}</span>}
    <div style={{ flex: 1 }} />
    {action && <span className="meta-caps" style={{ fontSize: 10, color: 'var(--text-2)' }}>{action} →</span>}
  </div>
);

// Row glyph (kategori liste row)
const CategoryRow = ({ abbr, name, count, accent = false }) => (
  <div style={{
    display:'grid', gridTemplateColumns:'auto 1fr auto auto', alignItems:'center', gap: 18,
    padding: '14px 0',
    borderBottom: '1px solid var(--hairline)',
  }}>
    <GlyphChip abbr={abbr} size={46} accent={accent} />
    <div style={{ display:'flex', flexDirection:'column', gap: 4 }}>
      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.005em' }}>{name}</span>
      <span className="meta-caps" style={{ fontSize: 9.5 }}>{count} kanal</span>
    </div>
    <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{count}</span>
    <span style={{ color: 'var(--text-3)', fontSize: 14 }}>›</span>
  </div>
);

// Kanal liste row
const ChannelRow = ({ abbr, name, now = '', live = false, hd = true, fav = false }) => (
  <div style={{
    display:'grid', gridTemplateColumns:'48px 1fr auto auto', alignItems:'center', gap: 16,
    height: 74, padding: '0 16px',
    borderBottom: '1px solid var(--hairline)',
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 9,
      background: 'radial-gradient(140% 140% at 30% 25%, #1F2A2C, #0F1517 80%)',
      border: '1px solid var(--border)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 500,
    }}>{abbr}</div>
    <div style={{ display:'flex', flexDirection:'column', gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
      {now && <span style={{ fontSize: 12, color:'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{now}</span>}
    </div>
    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
      {live && <span className="pill pill-live"><span className="live-dot"></span> Canlı</span>}
      {hd && <span className="pill pill-hd">HD</span>}
    </div>
    <span style={{ color: fav ? 'var(--copper)' : 'var(--text-4)', fontSize: 16, marginLeft: 8 }}>{fav ? '★' : '☆'}</span>
  </div>
);

// Progress bar
const Progress = ({ pct = 40, accent = false }) => (
  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
    <div style={{ width: `${pct}%`, height: '100%', background: accent ? 'var(--accent)' : 'var(--copper)' }} />
  </div>
);

// Toggle
const Toggle = ({ on = false }) => (
  <div style={{
    width: 40, height: 24, borderRadius: 999,
    background: on ? 'var(--accent)' : 'var(--bg-elev3)',
    border: '1px solid ' + (on ? 'transparent' : 'var(--border)'),
    position: 'relative', flex: '0 0 auto',
    transition: 'all 200ms ease',
  }}>
    <div style={{
      position: 'absolute', top: 2, left: on ? 18 : 2,
      width: 18, height: 18, borderRadius: '50%',
      background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    }} />
  </div>
);

// Slider
const Slider = ({ pct = 50, label }) => (
  <div style={{ display:'flex', alignItems:'center', gap: 14, flex: 1 }}>
    <div style={{ position:'relative', flex: 1, height: 24, display:'flex', alignItems:'center' }}>
      <div style={{ position:'absolute', left: 0, right: 0, height: 3, borderRadius: 3, background: 'var(--bg-elev3)' }} />
      <div style={{ position:'absolute', left: 0, width: `${pct}%`, height: 3, borderRadius: 3, background: 'var(--accent)' }} />
      <div style={{ position:'absolute', left: `calc(${pct}% - 8px)`, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
    </div>
    {label && <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', minWidth: 38, textAlign:'right' }}>{label}</span>}
  </div>
);

// Section row in settings
const SettingRow = ({ title, hint, children }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 24,
    padding: '18px 0', borderBottom: '1px solid var(--hairline)', minHeight: 56,
  }}>
    <div style={{ display:'flex', flexDirection:'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
      {hint && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{hint}</span>}
    </div>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap: 12 }}>{children}</div>
  </div>
);

// Expose
Object.assign(window, {
  Logo, Wordmark, TitleBar, Sidebar, TopBar,
  GlyphChip, StripePoster, StripeBanner, ChannelTile,
  EditorialHeader, RailHeader, CategoryRow, ChannelRow,
  Progress, Toggle, Slider, SettingRow, Avatar, SideIcon,
});
