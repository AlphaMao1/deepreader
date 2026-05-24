# DeepReader Code Review - 2026-05-23

Scope: static review of the interrupted M1 Auth Sync worktree plus the separate M2a UI reskin residue in the main worktree.

Verification note: no `pnpm` or `cargo` commands were run during this review, because the local project guide says those commands should only be run when explicitly requested.

## Implementation Update

The findings below captured the takeover state before continuation work. The following items have since been implemented in this worktree and still require verification:

- Sync cursor state is now scoped by Supabase `user.id`; the legacy `lastSyncedAtCloud` field is no longer used as the per-account incremental cursor.
- First sync with a different cloud account now requires explicit confirmation before the shared local library is merged/uploaded; manual sync, import-time auto sync, and background scheduler sync all respect this guard.
- Background scheduler no longer depends on the cursor object, avoiding immediate repeated sync after cursor updates.
- Manual sync reads latest settings at execution/writeback time, and persisted app settings are merged with current defaults during hydration for older installs.
- GitHub OAuth is deferred in the UI and no longer presented as a finished login path.
- EPUB upload/download is connected to Supabase Storage when EPUB cloud sync is enabled.
- Restored EPUB `file_path` values are normalized to safe app-data relative paths before local upsert/download.
- EPUB format detection is case-insensitive for remote/legacy rows.
- Import-time sync now runs when Cloud Sync is enabled; the EPUB Cloud Sync toggle only controls file binary upload/download.
- Provider config restore validates decrypted cloud backup shape before applying it locally.
- Provider config encryption now uses chunked base64 encoding to avoid large encrypted payload conversion failures.
- Recovery Key backup/restore now includes remote embeddings configs/API Keys, not only chat provider settings.
- `llama-store` now uses encrypted Tauri storage so remote embeddings API Keys are not left in plaintext local Zustand storage after the next write.
- `docs/adr/001-secret-storage-and-recovery.md` now captures the Device Key vs Recovery Key boundary.
- Signup results that require email confirmation are no longer treated as logged in until Supabase returns a session.
- Tags and skills use tombstone restore when recreating the same name after deletion, avoiding unnecessary duplicate rows.
- Local SQLite and Supabase now both use active-row partial unique indexes for tag/skill names, so tombstones do not permanently block same-name restore paths.
- Remote book tombstones now cascade local child tombstones when applied through `bulk_upsert`, aligning remote delete handling with the local delete path.
- Upload completion now marks local rows synced using the uploaded row snapshot, so a newer pending local edit made during the sync run is not cleared by a late `mark_synced`.
- Active EPUB metadata is no longer published to Supabase when EPUB cloud sync is enabled but the local active EPUB file is missing.
- The local SQLite schema file now parses cleanly for a fresh database and defines sync columns for the 8 synced local tables.
- Default skill startup updates are marked `pending`, so local skill refreshes remain visible to sync.
- `global-shortcut` and `llamacpp` plugin registration/cleanup are guarded for desktop targets, frontend local Llama modules are loaded dynamically behind platform guards, and mobile vector paths require configured remote embeddings instead of localhost fallback.

User clarification after this review: AI conversation history sync is deferred for M1 continuation. The conversation-sync finding below remains useful backlog context, but it is not a current M1 blocker.

Remaining proof gaps: real Supabase RLS/storage smoke test, small-EPUB restore/open test, Android build verification, and full TypeScript/Rust test runs.

## Findings

### P0 - Account switching can mix or skip sync data

Files:

- `packages/app/src/types/settings.ts`
- `packages/app/src/components/settings/cloud-sync.tsx`
- `packages/app/src/hooks/use-sync-scheduler.ts`
- `packages/app/src/services/sync-service.ts`

The current sync cursor is global (`lastSyncedAtCloud`) and not scoped to the authenticated Supabase user. Logout clears local React session state, but does not reset the sync cursor or create a local account boundary. The next account can reuse the previous account's cursor and local database.

Impact:

- Logging into a second account can skip remote rows whose `updated_at` is older than the first account's `lastSyncedAtCloud`.
- Local rows previously marked `synced` for account A may not upload to account B during incremental sync.
- A full sync under account B can upload the same local library into a different cloud account.
- This fails the recovered M1 PRD's intended "switch account -> local data isolation" test.

Recommended fix:

- Make sync cursors account-scoped, e.g. `cloudSyncStateByUserId[userId].lastSyncedAt`.
- Decide whether local data is shared local-first data or account-partitioned data.
- If account-partitioned, add a current-account boundary to local storage and database access before treating M1 as merge-ready.

### P0 - AI conversation history is not in sync scope (deferred after user clarification)

Files:

- `packages/app/src-tauri/src/core/schema.sql`
- `packages/app/src-tauri/src/core/threads/commands.rs`
- `packages/app/src/services/sync-service.ts`
- `docs/prd/archive/prd-m1-auth-sync-2026-04-30.md`

The app stores AI conversations in `threads` with a JSON `messages` column. The sync table list includes books, status, notes, tags, skills, memories, and sessions, but not `threads`. Thread delete is still a hard delete, and the table has no `deleted_at` or `sync_status`.

Impact:

- The user-facing target "电脑和手机上的 AI 对话同步" is not implemented.
- Adding Android after current M1 would still leave AI conversations device-local.
- Conversation sync cannot be added safely as a small config flip; it needs its own conflict, volume, privacy, deletion, and migration design.

Recommended fix:

- Run a short grill specifically on conversation sync.
- If in-scope, create an M1b PRD and vertical-slice issues for thread/message sync.
- Decide whether to keep messages as a JSON blob per thread or normalize messages into a separate table.

### P1 - Android build was expected to fail until desktop-only plugins were cfg-guarded

Files:

- `packages/app/src-tauri/Cargo.toml`
- `packages/app/src-tauri/src/lib.rs`
- `packages/app/src-tauri/capabilities/default.json`
- `packages/app/src-tauri/capabilities/desktop.json`

Original review finding: `Cargo.toml` only included `tauri-plugin-global-shortcut` for non-Android/non-iOS targets, but `src/lib.rs` registered `tauri_plugin_global_shortcut` unconditionally. The same file also registered `tauri_plugin_llamacpp` and desktop-oriented cleanup behavior unconditionally.

Continuation status: the desktop-only dependency, plugin registration, cleanup path, local Llama module, invoke handlers, frontend local-Llama imports, and desktop-only capability permissions are now guarded away from Android/iOS. The remaining proof gap is actual Rust/Android build verification.

Impact:

- Before the continuation fix, the M3 Android spike was likely blocked before runtime testing.
- This directly conflicts with the recovered M3 PRD's plugin conditional-compilation requirement.

Recommended fix:

- Run the Android/Rust build checks once the repository command policy permits `cargo`/Tauri Android commands.
- Keep treating font conversion, filesystem assumptions, `tauri-plugin-epub`, and window decoration code as Android compatibility review targets.

### P1 - GitHub OAuth entry is present but cannot complete a desktop app session reliably

Files:

- `packages/app/src/services/auth-service.ts`
- `packages/app/src/components/settings/cloud-sync.tsx`

GitHub login opens the Supabase OAuth URL in the system browser with `redirectTo: window.location.origin`. There is no Tauri deep link or callback handler that brings the session back into the app. The settings UI only fetches the current Supabase session snapshot; it does not subscribe to a successful external OAuth callback.

Impact:

- The GitHub button is likely a dead end outside a carefully configured dev browser scenario.
- This should not be counted as completed M1 auth.

Recommended fix:

- Either hide/label GitHub as experimental until callback handling exists, or implement a real desktop callback flow.
- Keep email/password as the accepted M1 auth path if OAuth is deferred.

### P1 - Recovery Key and Device Key responsibilities are ambiguous

Files:

- `packages/app/src-tauri/src/core/crypto.rs`
- `packages/app/src/lib/encrypted-storage.ts`
- `packages/app/src/services/cloud-config-service.ts`
- `packages/app/src/components/settings/cloud-sync.tsx`

Local settings/provider storage uses a local `device.key` file. Provider config backup uses a user-entered Recovery Key. These are two different encryption systems, but the UI and docs can make them sound like one recovery model.

Impact:

- Losing `device.key` can make local encrypted settings unreadable.
- Recovery Key backup currently covers provider config, not a full device-key or app-state recovery system.
- Future Android migration needs a clear security model before implementing keystore/keychain.

Recommended fix:

- Write a small ADR or PRD section defining Device Key vs Recovery Key.
- Decide whether OS keychain is required before merge or explicitly deferred.

### P1 - M2a UI reskin is in a different dirty worktree and should not be merged blindly

Files:

- `D:\Project\deepreader-publish-20260415-193455\packages\app/src/themes/default.css`
- `D:\Project\deepreader-publish-20260415-193455\packages\app/src/index.css`
- `D:\Project\deepreader-publish-20260415-193455\packages\app/src/components/*`
- `D:\Project\deepreader-publish-20260415-193455\packages\app/src/pages/library/*`

The main worktree has partial reskin changes and extra brand assets. They mostly look like visual-token and styling edits, but there is no evidence of visual QA, screenshot review, or merge strategy against the M1 worktree.

Impact:

- M2a can conflict with M1's settings dialog changes.
- Some styling choices such as global negative letter spacing should be reviewed against current UI rules and mobile readability.
- Bringing this over after M1 without a rescue branch will make conflict resolution noisy.

Recommended fix:

- Finish M1 first or explicitly create a clean M2a rescue branch.
- Treat the main-worktree UI changes as source material, not as ready code.

### P2 - M1 tests are too narrow for the sync risk surface

Files:

- `packages/app/src/services/sync-service.test.ts`
- `packages/app/src/lib/encrypted-storage.test.ts`
- `packages/app/src-tauri/src/core/sync.rs`

The current frontend tests cover LWW row selection and encrypted envelope detection. Rust tests cover migration, tombstones, pending rows, and older remote rows. They do not cover account switching, real Supabase schema compatibility, OAuth callback, scheduler behavior, or cross-device restore.

Impact:

- The most important product risks remain manual or unverified.
- "M1 complete" should mean "feature-complete with known manual gaps", not "production-ready sync".

Recommended fix:

- Add a merge-readiness checklist before running tests.
- Prioritize one integration smoke path with a real Supabase project after static fixes.

## PRD Clarity

The recovered PRDs are useful and mostly clear as historical documents, but they are not fully current.

Clear enough:

- M2a UI Reskin: clear scope. Visual-only, preserve feature entry points.
- M2b Mobile Layout: clear high-level scope. Needs current component inventory before implementation.
- M3 Android: clear sequencing. The spike gate is the right next step after M1/M2b.

Not clear enough:

- M1 Auth Sync: clear for the old scope, but no longer matches the user's current goal because AI conversation sync is excluded.
- Secret recovery: Device Key, Recovery Key, OS keychain, and cloud backup need a sharper model.
- Account isolation: local-first shared database vs account-partitioned local data must be decided.
- EPUB binary sync: the old PRD marks it optional, but the cross-device product promise may imply users expect book files to follow them.

## User Clarifications

1. Reading progress sync is mandatory.
2. Account-partitioned local libraries are not required for this phase, but first sync into a different cloud account must be explicit.
3. EPUB binary sync is mandatory.
4. GitHub OAuth can be deferred.
5. Model API keys should sync if the Recovery Key design is safe enough; otherwise replace it with a safer design.

## Recommended Takeover Order

1. Run static + automated verification after explicit approval.
2. Run the real Supabase smoke test and record evidence.
3. Run desktop and Android/Rust build verification.
4. Merge or commit M1.
5. Rescue M2a from the main worktree into a clean branch.
6. Rewrite current M2a/M2b PRDs and split implementation task cards.
7. Start Android only with the M3 spike.
