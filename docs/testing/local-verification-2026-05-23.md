# Local Verification - 2026-05-23

## Commands Run

- `git diff --check`
  - Result: passed.
  - Note: Git reported an existing `Cargo.lock` LF-to-CRLF warning; no whitespace errors were reported.
  - Re-run after the account-boundary, scheduler, provider-config test, and EPUB restore-path changes; result remained the same.

- `rg` static searches over `packages/app/src`, `docs`, and `CONTEXT.md`
  - Result: no remaining matches for stale M1 copy such as metadata-only EPUB sync, unfinished Recovery Key backup claims, or global `lastSyncedAtCloud || 0` cursor use.
  - Result: incremental sync cursor is captured as a conservative sync-start cursor, reducing the risk of skipping changes created during a sync run.
  - Result: background scheduler reads the latest settings at run time and does not depend on the per-account cursor object, avoiding an immediate re-sync loop after cursor updates.
  - Result: manual incremental/full sync reads latest settings at execution and cursor writeback time, reducing stale settings overwrite risk from long-open settings dialogs.
  - Result: `runIncrementalSync` has a shared in-process sync gate, so background, import-time, manual incremental, and manual full sync entry points cannot run overlapping sync transactions in one app process.
  - Result: app settings persistence now merges old stored settings with current defaults, so new cloud sync fields are populated for existing installs.
  - Result: Supabase auth session persistence uses encrypted immediate-write Tauri storage, and Tauri storage removal cancels pending debounced writes before deleting the backing file.
  - Result: registration UI only treats signup as logged in when Supabase returns a session; email-confirmation signup results keep cloud sync disabled and instruct the user to verify email before login.
  - Result: Recovery Key generation falls back to `crypto.getRandomValues` if `crypto.randomUUID` is unavailable in a target WebView.
  - Result: changed-account guard is present in manual sync, import-time auto sync, and background scheduler paths.
  - Result: restored EPUB rows are normalized to safe app-data relative `books/{bookId}/{filename}` paths before local upsert/download.
  - Result: EPUB format checks now tolerate remote or legacy casing such as `epub` when deciding whether to normalize and sync EPUB files.
  - Result: when EPUB cloud sync is enabled, active EPUB files are uploaded before `books` metadata is upserted to Supabase, reducing the risk of publishing restorable metadata before the binary upload succeeds.
  - Result: when EPUB cloud sync is enabled, an active EPUB row with a missing local file now fails the sync before Supabase metadata upsert, so cloud metadata is not published without its binary.
  - Result: when applying remote `books` rows with EPUB cloud sync enabled, missing active EPUB files are downloaded before local `books` metadata is upserted, reducing the risk of fresh profiles seeing newly restored but unopened book rows after a file download failure.
  - Result: tag/skill create paths reject active duplicates and restore the newest same-name tombstone when there is no active row.
  - Result: local SQLite and Supabase `tags`/`skills` schemas use active-row partial unique indexes, so tombstoned rows do not permanently block same-name restore paths.
  - Result: default skill startup updates mark `sync_status = 'pending'`, so local system skill content/state changes are not silently excluded from cloud sync.
  - Result: account sync UI now states that Recovery Key restores only encrypted model provider / remote embeddings configuration and API Keys, not books, progress, or login sessions.
  - Result: account sync UI uses one shared busy gate for login/logout/manual sync/full sync/config backup/config restore actions, preventing overlapping cloud operations from the settings panel.
  - Result: Recovery Key backup/restore includes remote embeddings model configs/API Keys in addition to chat and memory extraction provider configs.
  - Result: Recovery Key backup/download Supabase errors are wrapped as readable `Error` messages before reaching the settings UI.
  - Result: `llama-store` now uses encrypted Tauri storage, so remote embeddings API Keys are not left in plaintext local Zustand storage after the next write.
  - Result: `tts-store` now uses encrypted Tauri storage, so local TTS API Keys are not left in plaintext local Zustand storage after the next write. It can still read the legacy localStorage key during migration. TTS cloud backup/restore remains outside the current M1 Recovery Key scope.
  - Result: local encrypted storage decrypt validates AES-GCM nonce length and returns an error for malformed local payloads instead of panicking.
  - Result: `docs/adr/001-secret-storage-and-recovery.md` records the Device Key vs Recovery Key boundary and the current cloud/local secret-storage scope.
  - Result: `rg "DELETE FROM" packages/app/src-tauri/src/core` only reports `threads`, which is outside the current M1 sync scope because AI conversation history is deferred.

- SQLite schema parse check
  - Command: `python` in-memory `sqlite3.executescript()` against `packages/app/src-tauri/src/core/schema.sql`.
  - Result: passed; verified that all 8 local sync tables exist with the expected sync columns.
  - Note: this caught and fixed a schema initialization risk where malformed inline comments could hide `CREATE TABLE` or column definitions in a fresh local database.

- Android preflight static inspection
  - Result: `tauri-plugin-global-shortcut` and `tauri-plugin-llamacpp` are scoped to desktop target dependencies/registration paths.
  - Result: the Rust local Llama module and local Llama invoke commands are excluded from Android/iOS targets.
  - Result: sync and crypto invoke command names used by the frontend are present in both desktop and mobile Tauri handlers.
  - Result: llama cleanup and Windows decoration logic are behind compile-time target guards.
  - Result: frontend local LLM startup and local Llama.cpp server controls are gated away from Android/iOS targets.
  - Result: `llama-store` and `settings/llama.tsx` use dynamic imports for local Llama client/model-service code after platform guards, so mobile settings/store paths do not eagerly load local Llama invoke wrappers.

## Previously Run Local Frontend Verification

These commands were run by directly invoking already-installed local binaries, not via `pnpm`:

- `vitest run packages/app/src/services/sync-service.test.ts packages/app/src/lib/encrypted-storage.test.ts`
  - Result: 2 test files passed, 5 tests passed.

- `tsc --noEmit --pretty false`
  - Result: exited with code 0.

After that run, two more tests were added:

- `packages/app/src/services/cloud-sync-state.test.ts`
  - Covers per-account cursors and the changed-account confirmation guard.
- `packages/app/src/services/cloud-config-service.test.ts`
  - Covers malformed backup rejection, encrypted payload shape, and wrong Recovery Key rejection.
  - Covers chunked base64 encoding for larger encrypted provider-config payloads.
  - Covers selected chat/memory model reference validation while allowing empty provider model lists for manual or unrefreshed providers.
  - Covers remote embeddings vector model config acceptance, malformed vector model rejection, and selected vector model ID validation.
- `packages/app/src/utils/platform-features.test.ts`
- additional EPUB storage-path, tombstone file-sync, and sync-start cursor cases in `packages/app/src/services/sync-service.test.ts`
  - Includes safe restore-path normalization for EPUB rows whose remote `file_path` contains absolute or traversal-like path segments.
  - Includes Windows reserved path-name fallback coverage for restored EPUB rows.
  - Includes case-insensitive EPUB format coverage for restored remote rows.
  - Includes rejecting active EPUB metadata upload when the local EPUB file is missing.
  - Includes rejecting overlapping sync runs from separate entry points.
- additional remote book tombstone cascade coverage in `packages/app/src-tauri/src/core/sync.rs`
  - Covers applied remote `books.deleted_at` tombstones cascading to stale `book_status`, `book_notes`, `notes`, and `reading_sessions` rows.
  - Covers preserving newer local child rows instead of overwriting them with an older remote book tombstone.
- additional malformed encrypted-payload coverage in `packages/app/src-tauri/src/core/crypto.rs`
  - Covers invalid nonce length returning an error instead of panicking.

Those new tests were executed in the 2026-05-24 continuation run below.

## 2026-05-24 Continuation Checks

These checks were also run without `pnpm` or `cargo`.

- `git diff --check`
  - Result: passed.
  - Note: Git reported the same `Cargo.lock` LF-to-CRLF warning; no whitespace errors were reported.

- In-memory SQLite parse of `packages/app/src-tauri/src/core/schema.sql`
  - Result: passed.
  - Result: `tags` has `idx_tags_active_name_unique` where `deleted_at IS NULL`.
  - Result: `skills` has `idx_skills_active_name_unique` where `deleted_at IS NULL`.
  - Result: same-name tombstone + active row is accepted for both tables; duplicate active same-name row is rejected for both tables.

- Local/remote sync column alignment check
  - Result: `packages/app/src-tauri/src/core/sync.rs` column lists align with `packages/app/supabase/migrations/001_m1_auth_sync.sql` for the 8 sync tables, with remote `user_id` as the expected extra owner column.
  - Result: `packages/app/src/services/sync-service.ts`, `packages/app/src-tauri/src/core/sync.rs`, and `packages/app/supabase/migrations/001_m1_auth_sync.sql` agree on the 8 sync table names, order, and primary keys; Supabase primary keys are the expected `user_id + local primary key` pairs.
  - Result: remote `books` tombstones that are actually applied by `bulk_upsert` now cascade local tombstones to stale `book_status`, `book_notes`, `notes`, and `reading_sessions` rows, matching the local delete path without overwriting newer local child rows.
  - Result: `mark_synced` now receives uploaded row snapshots instead of only primary keys, and Rust only marks a row `synced` when the local `updated_at` still matches the uploaded snapshot. This prevents a sync run from clearing a newer local pending edit made while the upload was in flight.

- `rg -n 'SupportedStorage|local unique-name|name TEXT NOT NULL UNIQUE|NAME TEXT NOT NULL UNIQUE' packages/app/src packages/app/src-tauri docs -S`
  - Result: no stale `SupportedStorage` import in app code and no local schema/doc claim that active rows rely on a global local unique-name constraint.
  - Note: the only hits are this verification note and the migration detector used to identify legacy SQLite tables.

- Static Android Llama guard check
  - Result: `packages/app/src/store/llama-store.ts` checks `supportsLocalLlm()` before dynamically importing `@/components/settings/llama-client` or `@/services/model-service`.
  - Result: `packages/app/src/components/settings/llama.tsx` returns early when local LLM is unsupported and dynamically imports local Llama/model-service modules only inside guarded handlers/effects.
  - Result: vector capability detection no longer treats persisted local `modelPath` as usable on Android/iOS; mobile requires a configured remote embeddings model.
  - Result: `getCurrentVectorModelConfig()` refuses to fall back to localhost embeddings on platforms without local Llama support.
  - Result: manual book vectorization reads vector config inside the failure-handled path, so a mobile missing-remote-embeddings error is shown to the user and does not write a premature `processing` or `failed` vectorization state before indexing starts.

- Android capability split check
  - Result: `packages/app/src-tauri/capabilities/default.json` no longer grants `global-shortcut:*` or `llamacpp:default`, so Android/iOS do not inherit permissions for plugins that are not compiled on mobile targets.
  - Result: `packages/app/src-tauri/capabilities/desktop.json` carries `global-shortcut:default` and `llamacpp:default` and is limited to `platforms: ["macOS", "windows", "linux"]`.
  - Result: local generated capability schema confirms `platforms` is the supported capability-level target filter and includes `macOS`, `windows`, `linux`, `android`, and `iOS`.

- Final static sweep
  - Result: `git diff --check` passed with the same `Cargo.lock` LF-to-CRLF warning and no whitespace errors.
  - Result: fresh SQLite schema parse, sync table mapping, encrypted API-key store coverage, TTS legacy-storage migration compatibility, malformed local encrypted-payload guard, EPUB missing-file guard, signup-session guard, vector backup scope, and ADR link checks all passed via local Python scripts.
  - Result: Android plugin preflight static checks passed for capability split, desktop-only Cargo dependencies, Rust cfg gates, mobile invoke handler coverage, and guarded frontend local-Llama dynamic imports.
  - Result: static contract check confirmed the frontend invokes `mark_synced` with `rows: uploadRows`, no remaining `ids: uploadRows` call exists, and test coverage exists for the uploaded-row snapshot contract plus the Rust newer-local-edit guard.

## 2026-05-24 Automated Code Checks

These commands were run after the user explicitly resumed development and authorized automated verification except real Supabase/manual device checks.

- `pnpm --filter app test`
  - Result: passed.
  - Coverage: 5 test files passed, 30 tests passed.
  - Test files: `cloud-sync-state.test.ts`, `sync-service.test.ts`, `encrypted-storage.test.ts`, `platform-features.test.ts`, and `cloud-config-service.test.ts`.

- `pnpm --filter app build`
  - Result: passed.
  - Note: Vite reported existing warnings about mixed static/dynamic imports and large chunks; no build error.

- `cargo check --lib` from `packages/app/src-tauri`
  - Result: passed after rebinding the plugin builder chain in `src/lib.rs`.
  - Warnings: pre-existing unused imports in `jan-utils` and `tauri-plugin-llamacpp`, plus unused `soft_delete_row` in the new sync module.

- `cargo test --lib` from `packages/app/src-tauri`
  - Result: passed.
  - Coverage: 11 Rust unit tests passed, including malformed encrypted payload handling, remote book tombstone cascade behavior, and the uploaded-row snapshot guard for `mark_synced`.

- `pnpm --filter app tauri build`
  - Result: passed.
  - Output: built `packages/app/src-tauri/target/release/deepreader.exe`.
  - Bundles: `packages/app/src-tauri/target/release/bundle/msi/deepreader_0.2.2_x64_en-US.msi` and `packages/app/src-tauri/target/release/bundle/nsis/deepreader_0.2.2_x64-setup.exe`.
  - Note: Tauri warned that bundle identifier `com.deepreader.app` ending with `.app` is not recommended for macOS; the Windows build still completed.

- `pnpm --filter app tauri android build`
  - Result: failed before compilation.
  - Error: `packages/app/src-tauri/gen/android` does not exist; Tauri requested `tauri android init`.
  - Interpretation: Android build/device verification remains a separate M3 spike step because it requires initializing the Android project and validating the local Android toolchain/emulator setup.

- `pnpm --filter app tauri android init --ci`
  - Result: stopped before usable Android initialization because `ANDROID_HOME` is not set.
  - Follow-up inspection: `packages/app/src-tauri/gen/android` was not created.

- Android environment scan
  - Result: no Android SDK/JDK tools were found on this machine (`ANDROID_HOME`, `ANDROID_SDK_ROOT`, `adb`, `sdkmanager`, `avdmanager`, `java`, and `javac` unavailable in the current shell).

- `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
  - Result: passed.

- `cargo check --lib --target aarch64-linux-android`
  - Initial result: failed in `openssl-sys`, revealing that `reqwest` default TLS was not Android cross-compile friendly.
  - Fix: app/plugin utility `reqwest` dependencies now use Rustls TLS.
  - Re-run result: progressed past OpenSSL and failed in `ring` because the Android NDK compiler (`aarch64-linux-android-clang` / `clang.exe`) is not installed.

- Desktop regression after Rustls switch
  - `cargo check --lib`: passed.
  - `cargo test --lib`: passed, 11 tests.
  - `pnpm --filter app tauri build`: passed; Windows `deepreader.exe`, MSI, and NSIS setup bundles were generated after the Rustls switch.
  - Detailed Android preflight note: `docs/testing/android-preflight-2026-05-24.md`.

## 2026-05-24 Final Re-Verification

These checks were re-run after adding the completion audit and synchronizing GitHub issue bodies:

- `pnpm --filter app test`
  - Result: passed.
  - Coverage: 5 test files passed, 30 tests passed.

- `pnpm --filter app build`
  - Result: passed.
  - Note: Vite reported the existing mixed static/dynamic import and large chunk warnings; no build error.

- `cargo check --lib`
  - Result: passed.
  - Note: only existing warnings remain for unused imports in `jan-utils` / `tauri-plugin-llamacpp` and unused `soft_delete_row`.

- `cargo test --lib`
  - Result: passed.
  - Coverage: 11 tests passed.

## Not Run

- Real Supabase smoke verification was not run because it requires a configured project/account and manual evidence capture.
- Android project initialization and device/emulator verification were not run. The desktop preflight and static mobile guard checks passed, but M3 Android validation still requires `tauri android init`, an Android toolchain, and emulator/device pass.
