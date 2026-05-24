# M1 Acceptance Audit - 2026-05-23

This audit maps GitHub issues #2-#9 to current repository evidence. It is not a substitute for the real Supabase or Android smoke tests.

## Legend

- Proven locally: code, docs, static inspection, or local tests provide direct evidence.
- Needs execution: test code or checklist exists, but the command/manual run has not happened in the current state.
- Needs environment: requires Supabase, a fresh profile/device, desktop runtime, or Android build/device verification.

## #2 Account-Scoped Sync State

| Requirement | Status | Evidence |
| --- | --- | --- |
| Sync cursor state is scoped by Supabase `user.id` | Proven locally | `packages/app/src/services/cloud-sync-state.ts`; `packages/app/src/hooks/use-sync-scheduler.ts`; `packages/app/src/components/settings/cloud-sync.tsx` |
| Sync cursor avoids skipping changes created during a sync run | Proven locally | `runIncrementalSync` returns a conservative sync-start cursor (`syncStartedAt - 1ms`); `pnpm --filter app test` passed `packages/app/src/services/sync-service.test.ts` |
| Overlapping sync runs are rejected in one app process | Proven locally | `runIncrementalSync` uses a shared in-process sync gate; `pnpm --filter app test` passed `packages/app/src/services/sync-service.test.ts` |
| Upload completion does not clear newer local edits made during the sync run | Proven locally | `packages/app/src/services/sync-service.ts` passes uploaded row snapshots to `mark_synced`; `packages/app/src-tauri/src/core/sync.rs` only marks rows synced when local `updated_at` still equals the uploaded snapshot; `pnpm --filter app test` and `cargo test --lib` both passed the related guard coverage |
| Same account preserves sync continuity | Proven locally | `pnpm --filter app test` passed `packages/app/src/services/cloud-sync-state.test.ts` |
| Different account isolates cursor | Proven locally | `pnpm --filter app test` passed `packages/app/src/services/cloud-sync-state.test.ts` |
| Different account first sync avoids silent upload surprises | Proven locally | `shouldConfirmCloudSyncAccountBoundary` guards manual sync; import-time auto sync and background scheduler sync skip until settings confirmation; `pnpm --filter app test` passed `packages/app/src/services/cloud-sync-state.test.ts` |
| Settings UI shows active account last synced timestamp | Proven locally | `packages/app/src/components/settings/cloud-sync.tsx` |
| Signup without a Supabase session is not treated as logged in | Proven locally | `packages/app/src/components/settings/cloud-sync.tsx` keeps `user` null and cloud sync disabled when signup requires email confirmation |
| Settings cloud actions cannot overlap from the panel | Proven locally | `packages/app/src/components/settings/cloud-sync.tsx` uses a shared busy gate for login/logout/manual sync/full sync/config backup/config restore |
| Recovery Key generation has WebView fallback | Proven locally | `packages/app/src/services/auth-service.ts` uses `crypto.randomUUID` when available and falls back to `crypto.getRandomValues` |
| Test or manual note covers account behavior | Proven locally | `pnpm --filter app test` passed `packages/app/src/services/cloud-sync-state.test.ts` |
| Local/remote tag/skill tombstones do not permanently block same-name restore | Proven locally | SQLite schema/migration and `packages/app/supabase/migrations/001_m1_auth_sync.sql` use partial unique indexes for active `tags`/`skills` names |
| Remote book delete hides stale child reading state/notes locally | Proven locally | `bulk_upsert` cascades applied remote `books.deleted_at` tombstones to stale `book_status`, `book_notes`, `notes`, and `reading_sessions` rows while preserving newer local child rows; `cargo test --lib` passed the related Rust coverage |
| Offline same-name tag/skill conflicts across two profiles | Needs environment | Smoke checklist records this as a follow-up conflict-resolution probe rather than a current M1 blocker |
| Existing installs receive new cloud sync setting defaults | Proven locally | `packages/app/src/store/app-settings-store.ts` merges persisted settings with current defaults during hydration |
| Supabase auth session uses encrypted local persistence | Proven locally | `packages/app/src/services/auth-service.ts` supplies encrypted immediate-write Tauri storage to Supabase auth; `packages/app/src/lib/tauri-storage.ts` cancels pending writes and deletes backing files on `removeItem` |

## #3 Reading Progress Sync

| Requirement | Status | Evidence |
| --- | --- | --- |
| `book_status` uploads with active `user_id` | Proven locally | `packages/app/src/services/sync-service.ts` adds `user_id` before upsert; `SYNC_TABLES` includes `book_status` |
| Remote progress downloads without overwriting newer local progress | Proven locally | `pnpm --filter app test` passed `packages/app/src/services/sync-service.test.ts` LWW `book_id` coverage |
| Full sync can bootstrap progress | Proven locally | `runFullSync` calls `runIncrementalSync` with `lastSyncedAt: 0`; `SYNC_TABLES` includes `book_status` |
| Tombstoned books do not restore visible stale progress | Static pass, smoke pending | Local and applied-remote book tombstones cascade stale `book_status`/reading session rows; visible restore behavior still needs profile/cloud smoke |
| Profile A -> cloud -> Profile B restore | Needs environment | `docs/testing/m1-supabase-smoke.md` |

## #4 EPUB Binary Sync

| Requirement | Status | Evidence |
| --- | --- | --- |
| Import uploads EPUB when enabled | Proven locally | `packages/app/src/hooks/use-book-upload.ts`; `packages/app/src/services/sync-service.ts` |
| EPUB metadata is not published before active file upload succeeds | Proven locally | `runIncrementalSync` uploads active EPUB files before upserting `books` rows when EPUB cloud sync is enabled, and rejects active EPUB metadata upload if the local file is missing; `pnpm --filter app test` passed the related coverage |
| Restored EPUB metadata is not written before required file download succeeds | Static pass | `runIncrementalSync` downloads active EPUB files from remote `books` rows before local `bulk_upsert` when EPUB cloud sync is enabled |
| Fresh profile can download synced EPUB | Needs environment | Download path exists in `sync-service.ts`; real storage smoke required |
| Local `file_path` points to app-data copy after restore | Proven locally | `normalizeRemoteBookRow` rewrites restored EPUB rows to safe `books/{bookId}/{filename}` paths under app data, including case-insensitive `format` values; `pnpm --filter app test` passed the related coverage |
| Deleted books do not appear as active downloadable books | Proven locally | `isActiveEpubBookRow` skips rows with `deleted_at`; `pnpm --filter app test` passed the related coverage |
| UI copy no longer describes placeholder sync | Proven locally | `docs/m1-auth-sync.md`; `packages/app/src/components/settings/cloud-sync.tsx` |
| Small EPUB upload/download/open test | Needs environment | `docs/testing/m1-supabase-smoke.md` |

## #5 Secure Provider Config Sync

| Requirement | Status | Evidence |
| --- | --- | --- |
| Device Key and Recovery Key responsibilities documented | Proven locally | `docs/m1-auth-sync.md`; `CONTEXT.md`; `docs/adr/001-secret-storage-and-recovery.md` |
| Cloud-stored provider config encrypted | Proven locally | `packages/app/src/services/cloud-config-service.ts` encrypts before `user_configs` upsert and includes remote embeddings configs/API Keys |
| Fresh profile restore works | Needs environment | Requires real Supabase/fresh profile smoke |
| Wrong recovery input fails safely | Proven locally | `pnpm --filter app test` passed `packages/app/src/services/cloud-config-service.test.ts`; AES-GCM decrypt path rejects wrong key, malformed provider/vector backup data, absent selected provider/model references, and selected vector model IDs that are absent from the backup |
| UI explains Recovery Key scope | Proven locally | `docs/m1-auth-sync.md`; `packages/app/src/components/settings/cloud-sync.tsx` states Recovery Key restores only model provider / remote embeddings config and API Keys, not books, progress, or login sessions |
| Local remote-embeddings API Key storage encrypted | Proven locally | `packages/app/src/store/llama-store.ts` persists through encrypted Tauri storage |
| Local TTS API Key storage encrypted | Proven locally | `packages/app/src/store/tts-store.ts` persists through encrypted Tauri storage and can read legacy localStorage during migration; TTS cloud backup/restore is outside current M1 scope |
| Malformed local encrypted payloads fail safely | Proven locally | `packages/app/src-tauri/src/core/crypto.rs` validates AES-GCM nonce length before decrypting; `cargo test --lib` passed the related coverage |
| OS keychain/keystore deferred limitation explicit | Proven locally | `docs/m1-auth-sync.md`; `docs/m1-auth-sync-review-notes.md` |

## #6 GitHub OAuth Deferred

| Requirement | Status | Evidence |
| --- | --- | --- |
| GitHub login hidden/disabled/marked experimental | Proven locally | `packages/app/src/components/settings/cloud-sync.tsx` disables GitHub button and labels later support |
| Docs say email/password is supported login path | Proven locally | `docs/m1-auth-sync.md` |
| UI does not imply GitHub OAuth complete | Proven locally | `packages/app/src/components/settings/cloud-sync.tsx` |
| Remaining OAuth code isolated | Proven locally | `signInWithGithub` remains in `auth-service.ts` but has no active UI path |

## #7 Docs And UI Scope Cleanup

| Requirement | Status | Evidence |
| --- | --- | --- |
| Reading progress mandatory | Proven locally | `CONTEXT.md`; `docs/prd/current/m1-sync-continuation-prd.md` |
| EPUB binary sync mandatory | Proven locally | `CONTEXT.md`; `docs/prd/current/m1-sync-continuation-prd.md`; `docs/m1-auth-sync.md` |
| AI conversation history deferred | Proven locally | `CONTEXT.md`; `docs/prd/current/m1-sync-continuation-prd.md` |
| GitHub OAuth deferred | Proven locally | `docs/m1-auth-sync.md`; `docs/prd/current/m1-sync-continuation-prd.md` |
| Manual review checklist matches scope | Proven locally | `docs/m1-auth-sync-review-notes.md`; `docs/issues/github/` |
| Settings UI advertises only implemented capabilities | Proven locally | `packages/app/src/components/settings/cloud-sync.tsx`; `packages/app/src/components/settings/llama.tsx` |
| Fresh local database schema initializes required sync tables | Proven locally | `packages/app/src-tauri/src/core/schema.sql` parsed successfully in in-memory SQLite and includes the expected columns for the 8 local sync tables |
| Local sync columns match Supabase migration columns | Proven locally | Static parser compared `packages/app/src-tauri/src/core/sync.rs` column lists with `packages/app/supabase/migrations/001_m1_auth_sync.sql`; only remote `user_id` is intentionally extra |
| Default skill refreshes stay sync-visible | Proven locally | `packages/app/src-tauri/src/core/database.rs` marks default skill updates as `sync_status = 'pending'` |

## #8 Real Supabase End-To-End Smoke

All acceptance criteria for #8 remain needs environment:

- Supabase SQL migration in a real project.
- Email signup/login.
- Sync for books metadata, progress, notes/annotations, tags, skills, memories, and reading sessions.
- EPUB binary upload/download.
- Provider config encrypted backup/restore.
- Tombstone delete behavior.
- Results and risks recorded after the run.

Smoke checklist: `docs/testing/m1-supabase-smoke.md`.
Result template: `docs/testing/m1-supabase-smoke-results-template.md`.

## #9 Android Plugin Preflight

| Requirement | Status | Evidence |
| --- | --- | --- |
| `global-shortcut` only registered on supported desktop targets | Proven locally | `packages/app/src-tauri/Cargo.toml`; `packages/app/src-tauri/src/lib.rs` |
| `llamacpp` dependency/registration/cleanup guarded | Proven locally | `packages/app/src-tauri/Cargo.toml`; `packages/app/src-tauri/src/lib.rs` |
| Desktop-only plugin permissions excluded from mobile default capability | Proven locally | `packages/app/src-tauri/capabilities/default.json` removes `global-shortcut:*`/`llamacpp:default`; `packages/app/src-tauri/capabilities/desktop.json` grants them only for `macOS`, `windows`, and `linux` |
| Rust local Llama module and invoke commands excluded on mobile | Proven locally | `packages/app/src-tauri/src/core/mod.rs`; `packages/app/src-tauri/src/lib.rs` |
| Frontend local LLM guarded on mobile | Proven locally | `packages/app/src/utils/platform-features.ts`; `packages/app/src/store/llama-store.ts`; `packages/app/src/components/settings/llama.tsx`; `packages/app/src/pages/library/components/book-item.tsx`; local Llama modules are dynamically imported only behind platform guards, mobile vector capability requires a remote embeddings model, and manual book vectorization surfaces missing-remote-embeddings errors before indexing state is written; `pnpm --filter app test` passed `platform-features.test.ts` |
| Window decoration desktop-only | Proven locally | `#[cfg(target_os = "windows")]` in `packages/app/src-tauri/src/lib.rs` |
| Desktop build still passes | Proven locally | `pnpm --filter app build` and `pnpm --filter app tauri build` passed; Windows MSI and NSIS bundles were generated |
| Rust Android target preflight reaches SDK/NDK environment gate | Proven locally | Rust Android targets were installed; `cargo check --lib --target aarch64-linux-android` initially exposed and fixed an OpenSSL TLS blocker by switching Rust `reqwest` deps to Rustls, then progressed to missing Android NDK clang. See `docs/testing/android-preflight-2026-05-24.md` |
| Remaining Android risks documented | Proven locally | `docs/project-recovery-2026-05-23.md`; `docs/handoff/m1-sync-continuation-handoff-2026-05-23.md` |

## Final Gate

The goal should not be marked complete until:

1. Real Supabase smoke proves #3, #4, #5, and #8 against RLS, Storage policies, and a fresh profile.
2. Android project initialization plus build/device or emulator verification proves the plugin preflight beyond static inspection. `tauri android init --ci` currently stops because `ANDROID_HOME` is missing, and Android target `cargo check` now reaches the missing NDK clang gate after the Rustls fix.
3. Desktop runtime smoke remains useful before release, although desktop tests and build now pass locally.
