fn main() {
    // Phase 1.7 — libmpv link configuration (Windows only).
    //
    // The mpv-dev package from zhongfly ships a MinGW import lib (`.dll.a`).
    // The MSVC linker doesn't grok MinGW import libs, so we either need to
    // generate a `.lib` from the DLL with `lib.exe /def`, or rely on the
    // libmpv2 crate's runtime DLL discovery (it dlopens the DLL from PATH or
    // the linker search dirs at first call).
    //
    // We add the binaries/libmpv directory to the linker search path so any
    // `.lib` placed there is picked up automatically; runtime discovery picks
    // up `libmpv-2.dll` from the same directory once we copy it next to the
    // resulting exe (Tauri build resources handle that for production).
    #[cfg(target_os = "windows")]
    {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
        let libmpv_dir = format!(r"{manifest_dir}\binaries\libmpv");
        println!("cargo:rustc-link-search=native={libmpv_dir}");
        // tell rustc to link mpv at static-name time; the actual binding is
        // done at load time by libmpv2 against libmpv-2.dll.
        println!("cargo:rustc-link-lib=dylib=mpv");
        println!("cargo:rerun-if-changed=binaries/libmpv");
    }

    tauri_build::build()
}
