// Onboarding (3 step) + Auto-sync gate

const OnboardingFrame = ({ step = 1, children, totalSteps = 3 }) => (
  <div className="gi" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
    <TitleBar breadcrumb="İlk kurulum" right={null} />
    <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden' }}>
      {/* Left: brand panel */}
      <div style={{
        position:'relative', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center',
        gap: 24, padding: 60,
        background:'radial-gradient(120% 120% at 35% 25%, #1F2A2C, #0A0D0E 70%)',
        borderRight: '1px solid var(--line)',
        overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', inset:0,
          background:'radial-gradient(circle at 50% 38%, rgba(63,208,189,0.10), transparent 60%)' }} />
        <div style={{
          width:160, height:160, position:'relative',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{
            position:'absolute', inset:-30, borderRadius:'50%',
            border:'1px solid rgba(63,208,189,0.30)',
          }} />
          <div style={{
            position:'absolute', inset:-60, borderRadius:'50%',
            border:'1px solid rgba(63,208,189,0.15)',
          }} />
          <Logo size={120} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 10 }}>
          <div className="h-italic" style={{ fontSize: 56, lineHeight:1 }}>Genç</div>
          <div className="meta-caps" style={{ fontSize: 11, letterSpacing:'0.32em', color:'var(--text-3)' }}>IPTV PLAYER</div>
        </div>
        <div style={{ height: 16 }} />
        <div className="meta-caps" style={{ fontSize: 9.5, color: 'var(--teal)' }}>v 2.0 · Windows</div>
      </div>
      {/* Right: step content */}
      <div style={{ display:'flex', flexDirection:'column', padding: '48px 64px 36px' }}>
        <StepIndicator step={step} total={totalSteps} />
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', maxWidth: 480 }}>
          {children}
        </div>
        <div className="hairline" />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop: 20 }}>
          <span className="meta-caps" style={{ fontSize: 10 }}>Adım {step} / {totalSteps}</span>
          <div style={{ display:'flex', gap: 10 }}>
            {step > 1 && <button className="btn btn-ghost">← Geri</button>}
            <button className="btn btn-primary">{step === totalSteps ? 'Bitir' : 'Devam'} →</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StepIndicator = ({ step, total }) => (
  <div style={{ display:'flex', gap: 6, marginBottom: 36 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        flex: 1, height: 3, borderRadius: 3,
        background: i < step ? 'var(--accent)' : 'var(--bg-elev2)',
      }} />
    ))}
  </div>
);

const OnboardingStep1 = () => (
  <OnboardingFrame step={1}>
    <span className="meta-caps" style={{ fontSize: 10.5, color:'var(--accent)' }}>Hoş geldin</span>
    <h1 className="h-display" style={{ fontSize: 56, margin: '14px 0 18px' }}>
      Premium IPTV.<br/><span className="h-italic">Şık, hızlı, anlaşılır.</span>
    </h1>
    <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 28px', maxWidth: 420 }}>
      M3U ve Xtream Codes destekli, canlı kanal + film + dizi yayınınızı tek pencerede yönetin.
      Başlamak için yalnızca abone olduğunuz sağlayıcının bilgileri gerekiyor.
    </p>
    <div style={{ display:'flex', flexDirection:'column', gap: 14, padding: 18, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-elev)' }}>
      {[
        ['M3U & Xtream Codes', 'İki format da desteklenir.'],
        ['EPG entegrasyonu', 'Program rehberi otomatik içe aktarılır.'],
        ['Çok cihaz, tek tasarım', 'Mobil uygulamayla birebir akış.'],
      ].map(([t, s]) => (
        <div key={t} style={{ display:'flex', gap: 12, alignItems:'flex-start' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginTop: 8, flex: '0 0 auto' }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{s}</div>
          </div>
        </div>
      ))}
    </div>
  </OnboardingFrame>
);

const OnboardingStep2 = () => (
  <OnboardingFrame step={2}>
    <span className="meta-caps" style={{ fontSize: 10.5, color:'var(--accent)' }}>02 · Sağlayıcı</span>
    <h1 className="h-display" style={{ fontSize: 44, margin: '14px 0 12px' }}>
      Playlist <span className="h-italic">ekle.</span>
    </h1>
    <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 24px' }}>
      Sağlayıcınızdan aldığınız bağlantıyı veya kullanıcı bilgilerini girin.
    </p>
    {/* Tabs */}
    <div style={{ display:'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
      {['M3U URL', 'Xtream Codes'].map((t, i) => (
        <div key={t} style={{
          padding: '10px 20px', fontSize: 13, fontWeight: 500,
          color: i === 1 ? 'var(--text)' : 'var(--text-3)',
          borderBottom: '2px solid ' + (i === 1 ? 'var(--accent)' : 'transparent'),
          marginBottom: -1,
        }}>{t}</div>
      ))}
    </div>
    {/* Form */}
    <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
      <Field label="Görünen ad" value="Premium TR" />
      <Field label="Sunucu URL" value="http://server.example.com:8080" mono />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
        <Field label="Kullanıcı adı" value="kullanici_42" mono />
        <Field label="Parola" value="••••••••••••" mono />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-elev)' }}>
        <Toggle on />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Otomatik güncelle</div>
          <div style={{ fontSize: 11.5, color:'var(--text-3)' }}>24 saatte bir sağlayıcıdan içeriği yenile</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 8, fontSize: 12, color: 'var(--teal)', padding: '6px 0' }}>
        <span className="live-dot" /> Bağlantı doğrulandı · 1 247 kanal · 832 film · 214 dizi
      </div>
    </div>
  </OnboardingFrame>
);

const OnboardingStep3 = () => (
  <OnboardingFrame step={3}>
    <span className="meta-caps" style={{ fontSize: 10.5, color:'var(--accent)' }}>03 · Profil</span>
    <h1 className="h-display" style={{ fontSize: 44, margin: '14px 0 12px' }}>
      Sana nasıl <span className="h-italic">hitap edelim?</span>
    </h1>
    <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 24px' }}>
      Profil görüntü adın anasayfada karşılama metninde geçer.
    </p>
    <Field label="Görünen ad" value="Berke" />
    <div style={{ height: 16 }} />
    <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
      <span className="meta-caps" style={{ fontSize: 10 }}>Vurgu rengi</span>
      <div style={{ display:'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          ['#9D7BD8','Mor'], ['#E07A6F','Kırmızı'], ['#6FA8E0','Mavi'], ['#86C97A','Yeşil'],
          ['#C68A5C','Bakır'], ['#3FD0BD','Turkuaz'], ['#D4B86A','Sarı'], ['#B0BAB8','Gri'],
        ].map(([c, n], i) => (
          <div key={c} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: c,
              boxShadow: i === 5
                ? '0 0 0 1.5px var(--bg), 0 0 0 3px var(--accent)'
                : 'inset 0 0 0 1px rgba(0,0,0,0.3)',
            }} />
            <span className="meta-caps" style={{ fontSize: 8.5 }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
    <div style={{ height: 24 }} />
    <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
      <span className="meta-caps" style={{ fontSize: 10 }}>Tema</span>
      <div style={{ display:'flex', gap: 10 }}>
        {['Açık', 'Koyu', 'Sistem'].map((t, i) => (
          <div key={t} style={{
            flex: 1, padding: '14px 16px', borderRadius: 10,
            border: '1px solid ' + (i === 1 ? 'var(--accent)' : 'var(--border)'),
            background: i === 1 ? 'color-mix(in oklab, var(--accent) 8%, transparent)' : 'var(--bg-elev)',
            display:'flex', flexDirection:'column', gap: 6,
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: i === 1 ? 'var(--text)' : 'var(--text-2)' }}>{t}</div>
            <div className="meta-caps" style={{ fontSize: 9, color: i === 1 ? 'var(--accent)' : 'var(--text-3)' }}>{i === 1 ? 'Seçili' : 'Önizle'}</div>
          </div>
        ))}
      </div>
    </div>
  </OnboardingFrame>
);

const Field = ({ label, value, mono = false }) => (
  <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
    <span className="meta-caps" style={{ fontSize: 9.5 }}>{label}</span>
    <div style={{
      height: 42, padding: '0 14px', borderRadius: 10,
      background: 'var(--bg-elev)', border: '1px solid var(--border)',
      display:'flex', alignItems:'center',
      fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
      fontSize: mono ? 12.5 : 13.5,
      color: 'var(--text)',
    }}>{value}</div>
  </div>
);

// Auto-sync gate (overlay over home)
const SyncOverlay = () => (
  <div className="gi" style={{ width:'100%', height:'100%', position:'relative', background:'var(--bg)' }}>
    {/* Faded home behind */}
    <div style={{ position:'absolute', inset:0, opacity: 0.4, filter: 'blur(2px)' }}>
      <HomeStill />
    </div>
    <div style={{ position:'absolute', inset:0, background: 'rgba(10,13,14,0.65)', backdropFilter:'blur(8px)' }} />
    <div style={{
      position:'absolute', top: '50%', left:'50%', transform:'translate(-50%, -50%)',
      width: 480, padding: 36, borderRadius: 20,
      background:'var(--bg-elev)', border: '1px solid var(--border)',
      boxShadow:'var(--shadow-pop)',
      display:'flex', flexDirection:'column', alignItems:'center', gap: 18,
    }}>
      <div style={{ position:'relative', width: 72, height: 72 }}>
        <div style={{ position:'absolute', inset: -8, borderRadius:'50%', border:'1.5px solid rgba(63,208,189,0.4)' }} />
        <Logo size={72} />
      </div>
      <h2 className="h-serif" style={{ fontSize: 28, margin: 0, textAlign:'center' }}>Sağlayıcı içeriği güncelleniyor</h2>
      <span className="meta-caps" style={{ fontSize: 10, color:'var(--text-3)' }}>Premium TR · son sync 6 sa önce</span>
      <div style={{ width: '100%', height: 4, borderRadius: 4, background:'var(--bg-elev2)', overflow:'hidden', marginTop: 8 }}>
        <div style={{ width: '64%', height: '100%', background: 'var(--accent)' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', width: '100%' }}>
        <span className="meta-caps" style={{ fontSize: 9.5 }}>%64</span>
        <span className="meta-caps" style={{ fontSize: 9.5 }}>1 247 / 1 950</span>
      </div>
    </div>
  </div>
);

// minimal Home placeholder for sync overlay backdrop
const HomeStill = () => (
  <div style={{
    width:'100%', height:'100%', display:'flex',
    background: 'var(--bg)',
  }}>
    <Sidebar active="home" mini />
    <div style={{ flex:1, padding: 48 }}>
      <div className="h-display" style={{ fontSize: 64, color: 'var(--text-2)', opacity: 0.5 }}>Hoş geldin, Berke.</div>
    </div>
  </div>
);

Object.assign(window, { OnboardingStep1, OnboardingStep2, OnboardingStep3, SyncOverlay });
