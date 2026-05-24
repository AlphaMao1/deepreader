# Android Preflight - 2026-05-24

This note records the automated Android preflight performed for issue #9. It does not replace the later M3 Android device/emulator spike.

## Commands Run

- `pnpm --filter app tauri android --help`
  - Result: passed; confirmed available commands are `init`, `dev`, and `build`.

- `pnpm --filter app tauri android init --ci`
  - Result: stopped before usable Android initialization.
  - Output: `ANDROID_HOME` is not set and Android support is not usable until the issue is fixed.
  - Follow-up inspection: `packages/app/src-tauri/gen/android` was not created.

- `pnpm --filter app tauri android build`
  - Result: failed before compilation.
  - Output: `packages/app/src-tauri/gen/android` does not exist and Tauri requests `tauri android init`.

- Android environment scan
  - Result: no SDK found at common local paths such as `C:\Users\lenovo\AppData\Local\Android\Sdk`, `D:\Android\Sdk`, or `D:\Android\android-sdk`.
  - Result: `ANDROID_HOME` and `ANDROID_SDK_ROOT` are unset.
  - Result: `adb`, `sdkmanager`, `avdmanager`, `java`, and `javac` were not found on `PATH`.

- `pnpm --filter app tauri info`
  - Result: desktop Tauri environment is healthy.
  - Result: Tauri packages are older than latest, but this was not changed as part of the M1 continuation scope.

- `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
  - Result: passed; Rust Android targets are installed.

- `cargo check --lib --target aarch64-linux-android`
  - First result: failed in `openssl-sys` because `reqwest` default TLS pulled OpenSSL into the Android cross-compile path.
  - Fix applied: Rust-side `reqwest` dependencies in the app, `tauri-plugin-epub`, and `jan-utils` now use `default-features = false` with `rustls-tls`.
  - Second result: progressed past OpenSSL and failed in `ring` because the Android NDK clang toolchain is unavailable: `aarch64-linux-android-clang` / `clang.exe` not found.

- Desktop regression after Rustls switch
  - `cargo check --lib`: passed.
  - `cargo test --lib`: passed, 11 tests.
  - `pnpm --filter app tauri build`: passed and produced the Windows `deepreader.exe`, MSI, and NSIS setup bundles after the Rustls switch.

## Code Changes From This Preflight

- `packages/app/src-tauri/Cargo.toml`
  - `reqwest` now uses Rustls TLS instead of default TLS.
- `packages/app/src-tauri/plugins/tauri-plugin-epub/Cargo.toml`
  - `reqwest` now uses Rustls TLS instead of default TLS.
- `packages/app/src-tauri/utils/Cargo.toml`
  - `reqwest` now uses Rustls TLS instead of default TLS.

## Remaining Android Environment Gate

Android build verification still requires:

- Accepting the Android SDK license terms.
- Installing an Android SDK, Platform-Tools, Build-Tools, Command-line Tools, and NDK.
- Installing or configuring a JDK.
- Setting `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME`, and `NDK_HOME`.
- Re-running `pnpm --filter app tauri android init --ci`.
- Re-running `pnpm --filter app tauri android build`.

Official references checked:

- Tauri Android prerequisites: `https://v2.tauri.app/start/prerequisites/`
- Android command-line tools download and SDK license page: `https://developer.android.com/studio`
- Microsoft OpenJDK downloads: `https://learn.microsoft.com/en-us/java/openjdk/download`

## Current Judgment

Issue #9 is stronger than static inspection now: desktop build/tests pass after the Rustls change, Rust Android targets are installed, and the first Android cross-target compile blocker caused by OpenSSL was fixed. The remaining failure is an Android SDK/NDK/JDK environment gate, not currently a proven DeepReader code regression.
