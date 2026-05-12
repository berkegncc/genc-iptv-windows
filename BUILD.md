# Build & Release — Genç IPTV (Windows)

Bu doküman üretim build'ini, code signing'i ve MSI/NSIS installer'ı oluşturma adımlarını içerir. Faz 1-5 boyunca eklenen tüm parçaların release-ready hâle getirilmesi için referans kontrol listesidir.

## 0. Önkoşullar

- **Rust** ≥ 1.77.2 (`rustc --version`)
- **Node.js** ≥ 20 LTS + npm
- **WiX Toolset 3.x** (MSI build için) — `dotnet tool install --global wix` veya `https://wixtoolset.org/`
- **NSIS 3.x** (NSIS build için) — Tauri default'ta NSIS önerir
- **Visual Studio Build Tools** (Rust MSVC toolchain için)
- **`signtool.exe`** (Windows SDK ile gelir) — code signing için PATH'te olmalı

### mpv binaries

`libmpv-2.dll` + `mpv.exe` (her biri ~115 MB) GitHub'ın 100 MB per-file
sınırını aştığı için repo'da saklanmıyor. Dev makinene **manuel olarak
indirip yerleştirmen** gerek:

1. **mpv** Windows build'i: https://sourceforge.net/projects/mpv-player-windows/files/64bit/
2. İndirdiğin archive'den:
   - `libmpv-2.dll` → `src-tauri/binaries/libmpv/libmpv-2.dll`
   - `mpv.exe` → `src-tauri/binaries/mpv/mpv.exe`
   - **Aynı `mpv.exe`'yi** ikinci bir kopya olarak →
     `src-tauri/binaries/mpv-x86_64-pc-windows-msvc.exe` (Tauri sidecar
     beklediği platform-suffixed isim).

Yerleştirildikten sonra `npm run tauri dev` çalıştırabilir + Rust
tarafı libmpv2 crate'i DLL'i bulup linkleyebildiğinden derleme başarılı
olur.

## 1. Geliştirme

```bash
npm install
npm run tauri dev
```

`tauri dev` arka planda Rust backend'i ve Vite dev server'ı paralel çalıştırır; frontend'de hot-reload, Rust kodu kaydedildiğinde otomatik rebuild + restart.

## 2. Üretim build'i (imzasız)

```bash
npm run tauri build
```

Çıktı:
- `src-tauri/target/release/genc-iptv.exe`
- `src-tauri/target/release/bundle/msi/Genç IPTV_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Genç IPTV_0.1.0_x64-setup.exe`

İmzasız EXE/MSI, Windows SmartScreen tarafından "bilinmeyen yayıncı" uyarısıyla bloklanır. Üretim release'i için Bölüm 4'teki imzalama akışı zorunludur.

## 3. Sürüm yönetimi

Üç dosyada `version` alanını eşit tutmak gerek:

| Dosya | Alan |
|-------|------|
| `package.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version =` |
| `src-tauri/tauri.conf.json` | `"version"` |

Semver politikası:
- `1.0.x` → bug fix
- `1.x.0` → yeni özellik (Faz 2/3/4 sürüm bumpları gibi)
- `x.0.0` → schema breaking veya nav değişikliği

## 4. Code signing

### 4.1 Sertifika satın alımı

**EV (Extended Validation) Code Signing Certificate önerilir** — Windows SmartScreen'de anında reputation kazandırır, normal OV sertifikalar 1000+ kurulumdan sonra trust kazanır.

Sağlayıcılar (Mayıs 2026 fiyatları, ~$300-600/yıl):
- DigiCert / Sectigo / SSL.com
- HSM/USB token gerekir (key OS'a kaydedilemez)

### 4.2 `tauri.conf.json` — sign command

```json
{
  "bundle": {
    "windows": {
      "signCommand": "signtool sign /tr http://timestamp.sectigo.com /td sha256 /fd sha256 /a %1"
    }
  }
}
```

`%1` Tauri tarafından imzalanacak EXE'nin yoluyla değiştirilir. `signtool` ortam değişkenlerinden HSM PIN'ini alır:

```bash
set SIGNTOOL_PIN=<HSM PIN>
npm run tauri build
```

### 4.3 Doğrulama

```bash
signtool verify /pa /v "src-tauri\target\release\bundle\msi\Genç IPTV_0.1.0_x64_en-US.msi"
```

`Successfully verified` çıkmalı, "expected to be signed by valid X.509 certificate chain".

## 5. Auto-update endpoint (Faz 4 scaffold)

`tauri.conf.json` → `plugins.updater`:

```json
{
  "active": true,
  "endpoints": [
    "https://updates.genciptv.com/{{target}}/{{current_version}}"
  ],
  "pubkey": "<tauri signer generate çıktısı>",
  "windows": {
    "installMode": "passive"
  }
}
```

### 5.1 Updater key üretimi

```bash
npx @tauri-apps/cli signer generate -w ~/.tauri/genciptv.key
```

- Public key → `tauri.conf.json` `pubkey` alanı
- Private key → release CI runner secrets (asla commit etmeyin)

### 5.2 Manifest server şeması

Endpoint cevabı:

```json
{
  "version": "1.0.1",
  "notes": "Bug fix release",
  "pub_date": "2026-05-15T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<base64 imza>",
      "url": "https://updates.genciptv.com/genc-iptv-1.0.1-x64-setup.exe.tar.gz"
    }
  }
}
```

`signature` → `npx @tauri-apps/cli signer sign -k ~/.tauri/genciptv.key <installer.exe>` çıktısı.

`active: false` (varsayılan) ise updater no-op döner — endpoint hazır olana kadar geliştirme akışı bozulmaz.

## 6. Release kontrol listesi

Her release'den önce:

- [ ] `package.json` / `Cargo.toml` / `tauri.conf.json` versiyonları senkronize
- [ ] `npm run tauri build` temiz geçti (Rust + TypeScript hatasız)
- [ ] EV sertifikayla MSI + NSIS imzalı
- [ ] Manuel E2E (engineering-brief-windows.md § 13'teki liste)
  - [ ] Cold start: animasyonlu splash → Home, sync gate doğru tetikleniyor
  - [ ] M3U + Xtream playlist ekleme akışları
  - [ ] Live + VOD oynatma (libmpv ilk kare ≤ 3 sn)
  - [ ] EPG grid yükleniyor, "şu an" çizgisi doğru
  - [ ] Search Ctrl+F → 3 kategoride debounced sonuç
  - [ ] Tray icon + menü
  - [ ] Drag-drop M3U → onboarding pre-fill
  - [ ] Mini player tray'den tetikleniyor + büyütülebiliyor
  - [ ] Settings → Tema/Player/Subtitle yazıyor + okuyor
  - [ ] Klavye kısayolları (Ctrl+1..6, Ctrl+F, F11)
- [ ] Auto-update endpoint manifesti güncel + imzalı
- [ ] `BUILD.md`'deki version + tarih bumplandı
- [ ] Release notları (`CHANGELOG.md` veya GitHub Releases) hazır

## 7. CI önerisi (gelecek)

GitHub Actions workflow taslağı:

```yaml
name: Release Windows
on:
  push:
    tags: ["v*"]
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm run tauri build
        env:
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_PRIVATE_KEY_PASSWORD }}
          # signtool için HSM ortamı (cloud HSM via SignPath / Azure Key Vault)
          AZURE_KEY_VAULT_NAME: ${{ secrets.AZURE_KEY_VAULT_NAME }}
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/release/bundle/msi/*.msi
            src-tauri/target/release/bundle/nsis/*-setup.exe
            src-tauri/target/release/bundle/msi/*.msi.sig
```

Donanım HSM yerine Azure Key Vault / SignPath cloud signing önerilir — runner'ın USB token bağlamasına gerek kalmaz.

## 8. Log + crash triage

Üretimde log dosyası: `%APPDATA%\com.genciptv.player\logs\app.YYYY-MM-DD.log`

`tracing-appender` her gün yeni dosya açar; manuel rotasyon yok. Eski logları belli bir saklama süresinin ötesinde silmek için ayrı bir cleanup task (Windows Task Scheduler) kurulabilir.

Kullanıcıdan log talep ederken:

```
1. Açılışta yaşadığın hatayı tekrarla
2. %APPDATA%\com.genciptv.player\logs klasöründeki son log dosyasını gönder
3. (Player hatası ise) %APPDATA%\com.genciptv.player\mpv.log dosyasını da ekle
```
