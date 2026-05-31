# External Validation Runbook - 2026-05-24

This runbook covers the remaining gates for PR #10 after the local M1 Sync and Android preflight work. It intentionally avoids storing secrets, private EPUBs, API keys, or Supabase credentials in the repo.

## Current PR

- Draft PR: `https://github.com/AlphaMao1/deepreader/pull/10`
- Branch: `feature/m1-auth-sync`
- Local completion audit: `docs/handoff/m1-sync-completion-audit-2026-05-24.md`
- Local verification record: `docs/testing/local-verification-2026-05-23.md`
- Android preflight record: `docs/testing/android-preflight-2026-05-24.md`

## Supabase Smoke Gate

2026-05-31 status: backend/client Supabase smoke passed with follow-up UI gaps. See:

- `docs/testing/m1-supabase-smoke-results-2026-05-31.md`
- `docs/handoff/m1-supabase-validation-and-pwa-handoff-2026-05-31.md`

Use this only with a real Supabase project and disposable test account/API keys.

1. Apply the migration:

   ```sql
   -- Run in Supabase SQL editor
   -- Source file:
   -- packages/app/supabase/migrations/001_m1_auth_sync.sql
   ```

2. Configure the desktop app with:

   - Supabase URL.
   - Supabase anon key.
   - A disposable email/password account.
   - One small non-private EPUB.
   - One disposable provider API key if provider-config restore is tested.

3. Run the manual checklist:

   - `docs/testing/m1-supabase-smoke.md`

4. Record the result:

   - Copy `docs/testing/m1-supabase-smoke-results-template.md`.
   - Name it `docs/testing/m1-supabase-smoke-results-YYYY-MM-DD.md`.
   - Do not commit real project refs, passwords, API keys, Recovery Keys, screenshots with secrets, or private EPUB content.

5. Required pass evidence:

   - Migration ran without error.
   - RLS and Storage policies are enabled and user-scoped.
   - Profile A -> Profile B restores `book_status`.
   - EPUB uploads to `epubs/{userId}/{bookId}/...`, downloads on Profile B, and opens.
   - Provider config backup is encrypted in `user_configs.encrypted_value`.
   - Correct Recovery Key restores config; wrong Recovery Key does not overwrite local config.
   - Tombstones remain tombstones and same-name tag/skill restore works with active-row unique indexes.

## Android Toolchain Gate

2026-05-31 status: native Android validation is deferred. The next planned route is Mobile PWA Companion, because the current product goal is phone reading/progress sync and this machine does not have the large Android toolchain installed.

Current machine state from the preflight:

- Rust Android targets are installed.
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` are not set.
- `adb`, `sdkmanager`, `avdmanager`, `java`, and `javac` were not found on `PATH`.
- `tauri android init --ci` did not create `packages/app/src-tauri/gen/android`.
- Android target `cargo check` now reaches missing NDK clang after the Rustls fix.

Install/configure these before rerunning Android checks:

- JDK.
- Android SDK Command-line Tools.
- Android Platform-Tools.
- Android Build-Tools.
- Android NDK.
- Environment variables: `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME`, `NDK_HOME`.

Suggested verification commands after setup:

```powershell
$env:PYTHONIOENCODING='utf-8'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

where.exe java
where.exe javac
where.exe adb
where.exe sdkmanager
where.exe avdmanager
rustup target list --installed | Select-String 'android'

pnpm --filter app tauri android init --ci
pnpm --filter app tauri android build
```

Optional Rust-only check after NDK setup:

```powershell
cd packages/app/src-tauri
cargo check --lib --target aarch64-linux-android
```

## Final PR Decision

Keep PR #10 as draft until the team chooses one of these routes:

- Treat Supabase backend smoke as sufficient for M1 backend merge, then finish only the remaining desktop UI smoke.
- Or keep PR #10 draft until the remaining live desktop UI smoke is done.
- Or explicitly split mobile into a new PWA PRD/issues track and move native Android verification to a later optional PR.

After those decisions, update:

- `docs/handoff/m1-sync-completion-audit-2026-05-24.md`
- `docs/testing/local-verification-2026-05-23.md`
- GitHub issues #8 and #9
- PR #10 body/status
