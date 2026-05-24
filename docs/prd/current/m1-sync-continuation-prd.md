# PRD: M1 Sync Continuation

## Problem Statement

DeepReader has an interrupted M1 Auth Sync implementation. It already contains Supabase login, local tombstones, sync commands, settings UI, and encrypted local/provider storage, but it is not ready to become the durable desktop-phone sync foundation.

The current product need is narrower and sharper than the old M1 PRD in some places and broader in others:

- Reading progress sync is mandatory.
- EPUB file sync is mandatory.
- Model provider configuration and API keys should sync safely.
- GitHub OAuth can be deferred.
- AI conversation history sync can be deferred.
- Account-partitioned local libraries are not needed yet, but account changes must not corrupt or silently skip data.

## Solution

Finish M1 as a reliable sync foundation for one primary user moving between desktop and mobile.

The accepted M1 continuation should support:

1. Email/password login through Supabase.
2. Account-scoped sync cursor and safe account-change behavior.
3. Bidirectional sync for books metadata, reading progress, notes, annotations, tags, skills, memories, and reading sessions.
4. EPUB binary upload/download through Supabase Storage.
5. Safe model provider configuration sync using a Recovery Key or a safer replacement.
6. Clear UI copy that only advertises completed capabilities.

GitHub OAuth and AI conversation history sync are explicitly deferred.

## User Stories

1. As a reader, I want my reading progress to sync across desktop and phone, so that I can continue a book where I left off.
2. As a reader, I want the same EPUB file to be available on a new device, so that I do not need to manually re-import every book.
3. As a reader, I want my annotations and notes to sync with the book, so that my reading context is preserved.
4. As a reader, I want deleted books and notes to stay deleted after sync, so that old data is not resurrected.
5. As a reader, I want sync status to be understandable, so that I know whether data has moved successfully.
6. As a reader, I want a full sync option, so that I can recover or bootstrap a new device.
7. As a reader, I want my model provider settings and API keys to sync safely, so that a new device can use the same AI setup.
8. As a reader, I want secrets to be encrypted before cloud storage, so that the cloud database cannot read my API keys.
9. As a reader, I want GitHub login not to be shown as a finished feature if it is not ready, so that I do not hit a dead-end login flow.
10. As a developer, I want account sync cursors scoped safely, so that logging into a different account does not skip or leak data.
11. As a developer, I want real Supabase smoke verification, so that schema, RLS, and storage policies are proven outside unit tests.
12. As a future Android implementer, I want M1 sync assumptions documented, so that Android work can reuse the desktop sync foundation.

## Implementation Decisions

- Use GitHub Issues as the project tracker for this repo.
- Use `ready-for-agent` as the default AFK-ready label.
- Keep email/password as the accepted M1 auth path.
- Defer GitHub OAuth until a real desktop callback/deep-link flow exists.
- Defer AI conversation history sync. Do not add `threads` to M1 continuation unless the scope is reopened.
- Add user-scoped sync state instead of one global `lastSyncedAtCloud`.
- Do not implement fully separate local libraries per account in this milestone.
- Treat account changes as a safety case: reset/partition sync cursor and avoid accidental cross-account upload surprises.
- Make EPUB binary sync a first-class M1 continuation requirement, not just an optional toggle.
- Keep Supabase as the backend for Auth, PostgreSQL sync tables, and Storage.
- Decide the final secrets sync model before shipping provider config sync. The current Recovery Key design can be used only if reviewed as safe enough.
- Keep archived Antigravity PRDs under `docs/prd/archive/`; use this PRD as the current working source for M1 continuation.

## Implementation Status - 2026-05-24

- Account sync cursor is now scoped by Supabase `user.id`; `lastSyncedAtCloud` remains only as a legacy compatibility/display field.
- The local library is still shared across accounts, but first sync with a different cloud account now requires explicit confirmation; import-time auto sync and background scheduler sync both skip until the user confirms from settings.
- Incremental sync now advances the cursor to a conservative sync-start timestamp, not the completion timestamp, to avoid skipping changes created during a sync run or on the same millisecond boundary.
- Sync completion now marks uploaded rows synced only when the local `updated_at` still matches the uploaded snapshot, so a newer local edit made during an in-flight sync is not cleared accidentally.
- Background scheduled sync reads the latest settings at run time and does not re-trigger only because the sync cursor object changed.
- GitHub OAuth is disabled in the supported login UI and marked as later support.
- EPUB binary sync is wired into incremental/full sync when the EPUB switch is enabled, using the `epubs/{userId}/{bookId}/...` Supabase Storage path.
- Active EPUB metadata is not uploaded before the local EPUB binary is uploaded, and restore writes active EPUB metadata only after the missing file is downloaded.
- Successful book import triggers a best-effort incremental sync when cloud sync is enabled; the EPUB cloud sync switch only controls whether the EPUB binary is uploaded during that sync.
- Provider config restore validates decrypted backup shape before writing local provider settings.
- Provider config and remote embeddings config/API keys are encrypted for Recovery Key cloud backup; local remote embeddings and TTS API keys persist through encrypted Tauri storage.
- Desktop-only Tauri plugin registration for `global-shortcut` and `llamacpp` is guarded away from Android/iOS targets, and `tauri-plugin-llamacpp` is now a desktop-target dependency only.
- Desktop-only Tauri permissions for `global-shortcut` and `llamacpp` are split out of the cross-platform default capability.
- Rust local Llama module and invoke commands are excluded from Android/iOS targets.
- Frontend local LLM startup and local Llama.cpp controls are gated away from Android/iOS targets while remote vector configuration remains available.
- Rust Android targets were installed during preflight. Android target `cargo check` exposed and then passed the OpenSSL TLS blocker after Rust `reqwest` dependencies were switched to Rustls; the remaining Android target failure is missing Android NDK clang.
- Local automated checks passed: `pnpm --filter app test`, `pnpm --filter app build`, `cargo check --lib`, `cargo test --lib`, and `pnpm --filter app tauri build`.
- Manual Supabase smoke steps are documented in `docs/testing/m1-supabase-smoke.md`.
- Supabase smoke results should be recorded with `docs/testing/m1-supabase-smoke-results-template.md`.
- Local verification notes are recorded in `docs/testing/local-verification-2026-05-23.md`.
- Acceptance evidence is mapped in `docs/testing/m1-acceptance-audit-2026-05-23.md`.
- Handoff status is recorded in `docs/handoff/m1-sync-continuation-handoff-2026-05-23.md`.
- Final issue-by-issue completion audit is recorded in `docs/handoff/m1-sync-completion-audit-2026-05-24.md`.
- Real Supabase smoke verification, Android SDK/NDK/JDK setup, Android build verification, and device-level restore/open testing are still outstanding.

## Testing Decisions

- Unit tests should cover LWW conflict resolution, account-scoped sync cursor behavior, tombstones, and encrypted payload handling.
- Rust tests should cover local schema migration, soft delete, bulk upsert, and preventing older remote rows from overwriting newer local rows.
- Supabase integration must be manually smoke-tested because RLS, storage policies, OAuth settings, and cross-device restore cannot be fully proven with local unit tests.
- EPUB sync requires a real upload/download smoke test with at least one small EPUB.
- Provider config sync requires verification that the cloud value is encrypted and restorable with the expected recovery mechanism.

## Out of Scope

- GitHub OAuth as a supported login path.
- AI conversation history sync.
- Separate per-account local libraries.
- Android packaging and mobile UI layout work.
- Paid quota, billing, or multi-tenant operations beyond personal use.

## Further Notes

- The old M1 PRD excluded AI conversation history and made EPUB binary sync optional. This PRD supersedes those two assumptions for current development.
- The next PRD after M1 continuation should be M2a UI Reskin rescue or M2b Mobile Layout, depending on whether the interrupted main-worktree UI changes are preserved.
