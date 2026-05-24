# DeepReader Project Recovery - 2026-05-23

## Purpose

This document reconstructs the project state after a long pause. It separates confirmed local evidence from historical PRD intent, so future work can continue from files in the repository instead of Antigravity session memory.

## Source Map

| Item | Current location | Status |
| --- | --- | --- |
| Main worktree | `D:\Project\deepreader-publish-20260415-193455` | Branch `main`, remote `https://github.com/AlphaMao1/deepreader.git` |
| M1 sync worktree | `D:\Project\deepreader-m1-auth-sync` | Branch `feature/m1-auth-sync`, many uncommitted M1 changes |
| Release fix worktree | `D:\Project\deepreader-release-fix` | Branch `release-fix-macos-env`, already contained in main history |
| Old path | `D:\Project\deepreader` | Not present on disk |
| Recovered PRDs | `docs/prd/archive/` | Copied from Antigravity artifacts |

## Git State Snapshot

Current worktree `feature/m1-auth-sync` starts from commit `73f005b` (`feat: expose Obsidian vault path in settings, auto-save digest to Obsidian`). It has uncommitted M1 Auth Sync changes across frontend, Rust core, Supabase migration, package manifests, and docs.

Main worktree `deepreader-publish-20260415-193455` is also on commit `73f005b`, but contains separate uncommitted M2a UI reskin changes and brand assets. These changes are not in the M1 worktree.

## Phase Status

| Phase | Intended scope | Current state | Confidence |
| --- | --- | --- | --- |
| Baseline release/brand/Obsidian fixes | Release workflow, brand assets, Obsidian vault path setting, auto-save digest | Present in main history through `v0.2.7` | High |
| M1 Auth Sync | Supabase login, account sync, tombstones, local encryption, sync settings UI | Implemented in `feature/m1-auth-sync`, uncommitted and not merged | Medium-high |
| M2a UI Reskin | Desktop visual token reskin without structural changes | Partial uncommitted changes in main worktree plus Stitch prompt doc | Medium |
| M2b Mobile Layout | Mobile layout shell and navigation | No dedicated implementation found | Low |
| M3 Android Port | Tauri Android app, Android storage/touch/plugin work | Not started beyond existing Android icons and `mobile_entry_point` attribute | High |

## M1 Auth Sync Evidence

Implemented or present in the M1 worktree:

- Supabase auth service and account sync settings UI.
- Sync scheduler attached from the reader layout.
- Local SQLite `deleted_at` and `sync_status` migration support.
- Soft delete and tombstone-aware changes for books, notes, tags, skills, memories, reading sessions, and book notes.
- Rust sync commands for changed rows, tombstones, bulk upsert, and marking rows synced.
- Supabase migration at `packages/app/supabase/migrations/001_m1_auth_sync.sql`.
- Encrypted local storage wrapper and Rust AES-GCM helper.
- Frontend tests for LWW conflict resolution and encrypted-storage envelope detection.

Known M1 limits and contradictions:

- `docs/m1-auth-sync-review-notes.md` says M1 is complete enough to enter the next PRD, but the branch is uncommitted and not merged.
- The recovered M1 PRD excluded AI conversation history sync, while the current product goal includes AI conversations.
- Recovery Key backup/restore is present and now validates decrypted provider config shape before restore; real cloud smoke testing is still needed.
- EPUB binary upload/download is now wired through Supabase Storage when the EPUB switch is enabled; real upload/download/open smoke testing is still needed.
- OS keychain/credential store is not implemented; current local encryption uses an app-level device key.
- GitHub OAuth is deferred from the accepted M1 path and the UI marks it as later support.
- Real cross-device restore is not confirmed.

## M2a UI Reskin Evidence

Main worktree has uncommitted changes in UI and theme files:

- `packages/app/src/themes/default.css`
- `packages/app/src/index.css`
- Library components, sidebar, settings dialog, reader layout, and base controls.
- Brand assets including `deepreader-logo-master.*` and illustration files.
- `docs/m2a-ui-reskin-stitch-prompts.md`

No current evidence was found for completed visual QA, screenshots, regression testing, or merge readiness. Treat M2a as an interrupted partial implementation.

## M2b and M3 Evidence

No `BottomTabBar`, `MobileDrawer`, `MobileSettingsPage`, `MobileReaderChrome`, or `PlatformLayoutSwitch` implementation was found. M2b should be treated as not started.

Android-specific work has not reached the full M3 spike. The code currently has `#[cfg_attr(mobile, tauri::mobile_entry_point)]`; `tauri_plugin_global_shortcut` and `tauri_plugin_llamacpp` are now desktop-target dependencies/registrations, and the local Llama Rust module, invoke commands, and cleanup path are cfg-guarded away from Android/iOS. Frontend local LLM startup and local server controls are also gated away from mobile targets, while remote vector model configuration remains available. The 2026-05-24 Android preflight installed Rust Android targets, fixed a Rust `reqwest`/OpenSSL cross-compile blocker by switching Rust HTTP dependencies to Rustls, and then reached the missing Android SDK/NDK/JDK environment gate. `tauri android init --ci` still cannot generate `gen/android` until `ANDROID_HOME` and the Android toolchain are configured. The M3 spike still needs to verify `tauri-plugin-epub` on Android.

## Workflow Going Forward

Use this repository as the durable source of truth:

1. Grill: resolve open questions before rewriting a phase PRD.
2. PRD: create a current PRD from the resolved decisions, not from the archive alone.
3. Issues: split the PRD into vertical-slice task cards in `docs/issues/`.
4. Implement: make changes in the relevant worktree and update this recovery state when the status changes.

The local `CLAUDE.md` says not to run `pnpm` or `cargo` commands unless the user explicitly asks. For now, verification records should distinguish old claimed test output from commands freshly run in the current session.

## Recommended Next Work

1. Finish M1 takeover first. Audit the uncommitted diff, resolve doc/code contradictions, keep verification evidence current, then prepare a clean commit or PR.
2. Run a focused grill on AI Conversation History Sync. This is the largest product-scope conflict between the user's current goal and the old M1 PRD.
3. Decide whether M2a UI reskin should be rescued from the main worktree before or after M1 merge. Because M2a changes live in a different worktree, merging blindly will be messy.
4. After M1 is stable, rewrite M2a and M2b as current PRDs and split them into task cards.
5. Start M3 only with the PRD-required Android spike. Do not build the full Android app before the spike passes.
