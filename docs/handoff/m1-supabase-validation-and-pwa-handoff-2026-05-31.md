# DeepReader M1 Supabase Validation And PWA Handoff - 2026-05-31

This handoff is intended as the starting point for a fresh conversation. It closes the current Supabase validation pass as far as Codex could safely automate from the logged-in dashboard, and it records the decision to pivot the mobile track toward a PWA first.

## Current Repo State

- Workspace: `D:\Project\deepreader-m1-auth-sync`
- Branch: `feature/m1-auth-sync`
- Draft PR: `https://github.com/AlphaMao1/deepreader/pull/10`
- Main PRD: `docs/prd/current/m1-sync-continuation-prd.md`
- Prior completion audit: `docs/handoff/m1-sync-completion-audit-2026-05-24.md`
- Supabase smoke result: `docs/testing/m1-supabase-smoke-results-2026-05-31.md`

## What Was Verified In This Conversation

Supabase dashboard:

- The user's Supabase dashboard was already logged in.
- Organization contained one project.
- The project was paused; Codex resumed it from the dashboard.
- Restoration completed and the project returned to `Healthy`.
- `packages/app/supabase/migrations/001_m1_auth_sync.sql` was executed in SQL Editor.

Schema and policy verification:

- 10 public sync tables exist.
- RLS is enabled on all 10 sync tables.
- 10 owner policies exist.
- `epubs` bucket exists and is private.
- `epubs_owner_policy` exists on `storage.objects`.

Client-side Supabase smoke:

- A confirmed disposable smoke user was created from Dashboard Auth Users.
- Client A logged in with email/password.
- Client A upserted rows for books, book status, book notes, notes, memories, reading sessions, user config, and user devices.
- Client A uploaded and downloaded synthetic EPUB bytes in `epubs/{userId}/{bookId}/book.epub`.
- Client B logged in with the same account and read restored reading progress.
- Anonymous client could not see the account-scoped smoke book row.
- Tombstoned tag/skill rows did not block same-name active replacements.

## What Was Not Fully Verified

These are still not live-desktop proven:

- Two real Tauri desktop profiles importing/opening a real EPUB and syncing through the UI.
- Profile B opening the restored EPUB in the reader.
- Recovery Key backup/restore through the live settings UI.
- Wrong Recovery Key failure through the live settings UI.
- Account-boundary confirmation UI with two different accounts.

The backend and policy layer is now proven enough to stop treating Supabase setup itself as the blocker. The remaining gaps are product/UI smoke checks, not schema/RLS/Storage unknowns.

## Android Decision

Android native/Tauri Android should be deferred for now.

Reason:

- This machine does not have Android Studio, JDK, Android SDK, Build Tools, Platform Tools, NDK, emulator, or device setup.
- A minimal Android build environment is likely 15-25 GB without emulator and 25-40+ GB with Android Studio plus one emulator image.
- The actual product goal is cross-device reading sync, not a native Android package specifically.

## Next Direction: Mobile PWA Companion

Start the next conversation by creating a new PRD and issues for a Mobile PWA Companion.

Recommended product boundary:

- Keep desktop as Tauri: local SQLite, local EPUB files, full AI/provider settings, exports, local Llama where available.
- Add a web/PWA mobile client: login, cloud library, EPUB reading, progress sync, notes/annotations, and selected AI conversation continuity.
- Treat Supabase as the source of truth on mobile rather than trying to reproduce the full desktop local database/sync engine in the browser.

Suggested MVP:

- PWA shell with manifest and service worker.
- Mobile login using existing Supabase email/password.
- Mobile cloud library view from Supabase `books`.
- Download/open EPUB from private `epubs` Storage using `foliate-js`.
- Read/write `book_status` directly to Supabase.
- Basic notes/annotations sync.
- Minimal AI conversation read/write if the existing thread schema is ready; otherwise defer.
- No local Llama, no global shortcuts, no native file paths, no Obsidian export in PWA M1.

Key implementation idea:

```text
Desktop Tauri local DB <-> Supabase <-> Mobile PWA
```

## Recommended Next Conversation Prompt

Use this as the first message in the new thread:

```text
请接手 DeepReader。当前仓库在 D:\Project\deepreader-m1-auth-sync，分支 feature/m1-auth-sync，PR #10。

Supabase backend smoke 已在 docs/testing/m1-supabase-smoke-results-2026-05-31.md 记录：migration、RLS、Storage policy、客户端进度/Storage/tombstone smoke 已通过；剩余是桌面 UI 真实双 profile、Recovery Key UI、以及移动端路线。

我们决定先暂缓原生 Android/Tauri Android，把移动端改成 Mobile PWA Companion。请先按 grill-me / PRD gate / to-prd / to-issues 的新规范，基于 docs/handoff/m1-supabase-validation-and-pwa-handoff-2026-05-31.md 写 PWA PRD，并拆 GitHub issues。目标是让手机浏览器/PWA 能登录同一个 Supabase 账号，看到云端书库，打开 EPUB，同步阅读进度和笔记。
```

## Security Notes

- Do not commit Supabase API keys, passwords, Recovery Keys, screenshots containing secrets, or private EPUB content.
- The smoke result intentionally redacts the full project ref and all credentials.
- The disposable smoke user and synthetic rows can remain in the test project, or be cleaned up later from Supabase Auth/Table Editor if desired.
