# M1 Sync Continuation Handoff - 2026-05-23

## Current State

The M1 continuation implementation has been brought to the point where local code, tests, desktop builds, and docs cover issues #2-#7 and the Android preflight issue #9, but the goal is not complete until the remaining external verification is done.

GitHub issues #1-#9 are now labeled `ready-for-human` where the remaining work requires real environment verification or human judgment.

## Implemented Locally

- Account-scoped sync cursor keyed by Supabase `user.id`.
- Existing app settings are merged with current defaults during hydration, so newly added cloud sync fields are available on upgraded installs.
- Supabase auth session persistence uses encrypted immediate-write Tauri storage, and Tauri storage removal now cancels pending writes before deleting the backing file.
- Incremental sync returns a conservative sync-start cursor (`syncStartedAt - 1ms`) to avoid skipping changes created during a sync run or on the same millisecond boundary.
- First sync with a different cloud account now requires explicit confirmation before the shared local library is merged/uploaded; import-time auto sync and background scheduler sync both skip until that confirmation path is used.
- Manual incremental/full sync reads latest settings at run time and cursor writeback time, avoiding stale settings overwrites from long-open settings dialogs.
- Background scheduler reads the latest settings at run time and no longer depends on the per-account cursor object, avoiding immediate repeated sync after cursor updates.
- Reading progress remains in the default sync table set through `book_status`.
- EPUB binary sync through Supabase Storage path `epubs/{userId}/{bookId}/...`.
- Restored EPUB `books.file_path` values are normalized to safe app-data relative paths before local upsert/download, rather than trusting absolute or traversal-like remote paths.
- EPUB restore and file-sync detection tolerates legacy or remote `format` casing such as `epub`.
- Successful book import triggers best-effort incremental sync when Cloud Sync is enabled; EPUB Cloud Sync only controls file upload/download.
- Recreating a previously deleted tag or skill now restores the newest tombstoned row when there is no active row with that name.
- Both the local SQLite schema/migration and Supabase migration keep `tags`/`skills` names unique only for active rows, so tombstones do not permanently block same-name restore/recreate flows.
- Remote `books` tombstones now cascade local tombstones to stale `book_status`, `book_notes`, `notes`, and `reading_sessions` rows when the remote book row is actually applied, without overwriting newer local child rows.
- Default skill startup updates now mark rows as pending for sync instead of changing local skill content without cloud visibility.
- Provider config backup/restore uses Recovery Key encryption and validates decrypted backup structure before local restore.
- The local SQLite schema file now parses cleanly for a fresh database and defines the required sync columns for the 8 synced local tables.
- GitHub OAuth is deferred from the supported M1 login path.
- `tauri-plugin-global-shortcut` and `tauri-plugin-llamacpp` are desktop-only target dependencies/registrations.
- `global-shortcut` and `llamacpp` Tauri permissions have been moved out of the cross-platform default capability into a desktop-only capability for `macOS`, `windows`, and `linux`.
- Rust local Llama module and invoke commands are excluded from Android/iOS targets.
- Llama cleanup and Windows decoration paths are compile-time target guarded.
- Frontend local LLM startup and local Llama.cpp server controls are gated away from Android/iOS targets, and local Llama client/model-service modules are dynamically imported only after platform guards.
- Manual book vectorization now resolves vector config inside its handled failure path; on mobile, missing remote embeddings configuration is surfaced to the user before any indexing state is written.
- EPUB cloud sync now treats a missing local file for an active EPUB row as a pre-upload failure, so `books` metadata is not published to Supabase without its binary.
- Recovery Key backup/restore now includes remote embeddings model configs/API Keys, and `llama-store` uses encrypted Tauri storage so those local API Keys are not left in plaintext after the next write.
- `tts-store` also uses encrypted Tauri storage for its local TTS API Key; TTS cloud backup/restore is intentionally not part of the current M1 Recovery Key scope.
- `tts-store` keeps read compatibility for the legacy localStorage key, then writes future changes to encrypted Tauri storage.
- Recovery Key backup restore validates selected chat/memory provider references and selected vector model references before applying local config.
- Recovery Key generation falls back to `crypto.getRandomValues` when `crypto.randomUUID` is unavailable.
- Local encrypted payload decrypt validates AES-GCM nonce length and returns an error for malformed payloads instead of panicking.
- `runIncrementalSync` has a shared in-process sync gate so background, import-time, manual incremental, and manual full sync entry points cannot overlap.
- `mark_synced` now receives uploaded row snapshots and only marks rows synced when the local `updated_at` still matches that snapshot, preventing a newer local edit made during sync from being cleared.
- `docs/adr/001-secret-storage-and-recovery.md` captures the Device Key vs Recovery Key decision boundary for future desktop/mobile secret storage work.
- Manual Supabase smoke checklist exists at `docs/testing/m1-supabase-smoke.md`.
- Supabase smoke result template exists at `docs/testing/m1-supabase-smoke-results-template.md`.
- Local verification record exists at `docs/testing/local-verification-2026-05-23.md`.
- Acceptance evidence audit exists at `docs/testing/m1-acceptance-audit-2026-05-23.md`.
- Completion audit exists at `docs/handoff/m1-sync-completion-audit-2026-05-24.md`.
- External validation runbook exists at `docs/handoff/external-validation-runbook-2026-05-24.md`.
- Dirty worktree inventory exists at `docs/m1-worktree-inventory-2026-05-23.md`.

## Verified Locally

The 2026-05-24 continuation run completed these automated checks:

- `pnpm --filter app test` passed: 5 test files, 30 tests.
- `pnpm --filter app build` passed.
- `cargo check --lib` passed from `packages/app/src-tauri`.
- `cargo test --lib` passed from `packages/app/src-tauri`: 11 Rust tests.
- `pnpm --filter app tauri build` passed and produced the Windows `deepreader.exe`, MSI bundle, and NSIS setup bundle.
- `pnpm --filter app tauri android build` was attempted and stopped before compilation because `packages/app/src-tauri/gen/android` does not exist; Tauri requested `tauri android init`.
- `pnpm --filter app tauri android init --ci` was attempted and stopped because `ANDROID_HOME` is not set; `gen/android` was not created.
- Rust Android targets were installed. `cargo check --lib --target aarch64-linux-android` exposed an OpenSSL TLS blocker, which was fixed by switching Rust `reqwest` dependencies to Rustls; the check now reaches the missing Android NDK clang environment gate.
- After the Rustls change, `pnpm --filter app tauri build` passed again and produced the Windows `deepreader.exe`, MSI, and NSIS setup bundles.

## Remaining Required Verification

### Issue #3 - Reading Progress Restore

- Run Profile A -> Supabase -> Profile B smoke test.
- Confirm `book_status` progress restores on Profile B and does not overwrite newer local progress.

### Issue #4 - EPUB Binary Sync

- Upload one small EPUB from Profile A.
- Confirm `storage.objects` has `epubs/{userId}/{bookId}/...`.
- Sync Profile B and confirm the local file exists and opens in the reader.

### Issue #5 - Provider Config Restore

- Back up provider config from Profile A.
- Confirm Supabase `user_configs.encrypted_value` is encrypted, not provider JSON.
- Restore on Profile B with the correct Recovery Key.
- Attempt restore with a wrong Recovery Key and confirm local config is not overwritten.

### Issue #8 - Supabase End-to-End Smoke

- Run `packages/app/supabase/migrations/001_m1_auth_sync.sql` in a real project.
- Verify auth, RLS, table sync, storage sync, provider config restore, and tombstones.
- Record results and residual risks by copying `docs/testing/m1-supabase-smoke-results-template.md` to a dated result file.

### Issue #9 - Android Preflight

- Verify Android build excludes `global-shortcut` and `llamacpp`.
- Verify `tauri-plugin-epub` on Android.
- Initialize the Android project with `tauri android init` as part of the M3 spike before treating Android build failures as code regressions.
- Install/configure Android SDK, NDK, and JDK first; accepting SDK licenses is a human/environment step.

## Verification Constraints

`CLAUDE.md` contains an older caution about not running `pnpm`, `cargo`, or code-check tools unless the user actively requests them. The user has now resumed development and explicitly authorized automated verification except real Supabase/manual device checks, so the local test/build commands above were executed.

## Recommended Next Commands

From `D:\Project\deepreader-m1-auth-sync`:

```powershell
git diff --check
```

GitHub issue bodies and comments were updated with the latest verification evidence on 2026-05-24. Android checks should follow the M3 spike PRD rather than being treated as part of the desktop M1 merge gate. See `docs/testing/android-preflight-2026-05-24.md` for the Android environment status, `docs/handoff/m1-sync-completion-audit-2026-05-24.md` for the final issue-by-issue audit, and `docs/handoff/external-validation-runbook-2026-05-24.md` for the remaining external verification steps.
