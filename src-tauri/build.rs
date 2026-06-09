fn main() {
    #[cfg(target_os = "windows")]
    {
        use std::path::PathBuf;

        let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
        let libmpv_dir = manifest_dir.join("binaries").join("libmpv");
        let dll = libmpv_dir.join("libmpv-2.dll");

        println!("cargo:rustc-link-search=native={}", libmpv_dir.display());
        println!("cargo:rustc-link-lib=dylib=mpv");
        println!("cargo:rerun-if-changed={}", dll.display());

        // libmpv is loaded at runtime. After `cargo clean` or when using a
        // custom target-dir, copy the DLL next to the debug/release exe so
        // `tauri dev` keeps working without manual file copying.
        if let Ok(out_dir) = std::env::var("OUT_DIR") {
            let out_dir = PathBuf::from(out_dir);
            if let Some(profile_dir) = out_dir.ancestors().nth(3) {
                let target = profile_dir.join("libmpv-2.dll");
                let _ = std::fs::copy(&dll, target);
            }
        }
    }

    tauri_build::build()
}
