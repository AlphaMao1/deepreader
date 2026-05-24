## Parent

PRD: M1 Sync Continuation - https://github.com/AlphaMao1/deepreader/issues/1

## What to build

Prepare the codebase for the later M3 Android spike by guarding desktop-only Tauri plugins and cleanup paths. This does not implement Android UI or packaging; it only removes obvious compile blockers.

## Acceptance criteria

- [x] `tauri-plugin-global-shortcut` is only registered on supported desktop targets.
- [x] `tauri-plugin-llamacpp` is a desktop-target dependency only, and its registration/cleanup path is guarded for Android/iOS.
- [x] Desktop-only plugin permissions are not granted by the cross-platform default Tauri capability; `global-shortcut` and `llamacpp` permissions live in a desktop-only capability.
- [x] Rust local Llama module and invoke commands are excluded from Android/iOS targets.
- [x] Frontend local LLM startup and local Llama.cpp server controls are gated away from Android/iOS.
- [x] Frontend local Llama client/model-service modules are dynamically imported only after platform guards, so mobile settings/store paths do not eagerly load local Llama invoke wrappers.
- [x] Mobile vector capability checks do not fall back to persisted local Llama model paths; Android/iOS require a configured remote embeddings model.
- [x] Manual book vectorization surfaces the missing remote embeddings configuration error before indexing starts, without writing a premature vectorization state.
- [x] Window decoration code is desktop-only where necessary.
- [x] The change does not alter desktop behavior.
- [x] Rust Android target preflight no longer fails on `reqwest` OpenSSL TLS; Rust HTTP dependencies use Rustls and the remaining Android cross-target failure is the missing NDK clang toolchain.
- [x] Remaining Android spike risks are documented.

## Blocked by

Android SDK/JDK/NDK setup and later device/emulator verification.

## Remaining environment gate

- Android SDK/JDK/NDK are not installed/configured in the current environment.
- `tauri android init --ci` currently stops because `ANDROID_HOME` is missing and `gen/android` is not created.
- Actual Android build/device or emulator verification remains part of the M3 Android spike.
