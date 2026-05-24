# M1 Sync Completion Audit - 2026-05-24

This audit checks the active goal against the current worktree and GitHub issues #2-#9. It distinguishes what is proven by local automated evidence from what still requires real Supabase or Android environment verification.

## Goal Scope

Objective:

- Complete DeepReader M1 Sync Continuation and the Android plugin preflight work.
- Continue against GitHub issues #2-#9.
- Update documentation and verification evidence to a handoff-ready state.
- Do not stop except for real Supabase or human/device verification.

## Verification Commands With Passing Evidence

- `pnpm --filter app test`
  - Passed: 5 test files, 30 tests.
- `pnpm --filter app build`
  - Passed.
- `cargo check --lib`
  - Passed.
- `cargo test --lib`
  - Passed: 11 tests.
- `pnpm --filter app tauri build`
  - Passed after the Android/Rustls preflight fix.
  - Generated Windows `deepreader.exe`, MSI, and NSIS setup bundles.
- `git diff --check`
  - Passed; only the existing `Cargo.lock` LF-to-CRLF warning appears.
- `cargo check --lib --target aarch64-linux-android`
  - First run found a real OpenSSL/TLS cross-target blocker.
  - After switching Rust `reqwest` dependencies to Rustls, the check progressed to the Android NDK clang environment gate.
- External validation runbook exists at `docs/handoff/external-validation-runbook-2026-05-24.md`.

After this audit was added, the main local verification commands were re-run and remained green:

- `pnpm --filter app test`: passed, 5 test files / 30 tests.
- `pnpm --filter app build`: passed.
- `cargo check --lib`: passed.
- `cargo test --lib`: passed, 11 tests.

## Issue-by-Issue Result

| Issue | Current result | Proof | Remaining requirement |
| --- | --- | --- | --- |
| #2 Account-scoped sync state | Local automatable scope complete | `cloud-sync-state.test.ts`, `sync-service.test.ts`, `cargo test --lib`, updated GitHub issue body | Real account/profile smoke is covered by #8 |
| #3 Reading progress sync | Local automatable scope complete | `sync-service.test.ts` LWW coverage, Rust tombstone cascade tests, smoke checklist | Profile A -> Supabase -> Profile B progress restore in #8 |
| #4 EPUB binary sync | Local automatable scope complete | EPUB upload/download ordering and safe restore-path tests, desktop Tauri build, smoke checklist | Real Supabase Storage upload/download/open smoke in #8 |
| #5 Secure provider config sync | Local automatable scope complete | `cloud-config-service.test.ts`, Rust malformed encrypted payload tests, ADR and UI docs | Real Supabase `user_configs.encrypted_value` inspection and fresh profile restore in #8 |
| #6 GitHub OAuth deferred | Complete for M1 | UI/docs mark email/password as supported and GitHub OAuth as later support | None for M1 |
| #7 Docs and UI scope cleanup | Complete for M1 local scope | PRD/docs/issues/handoff updated and GitHub issue body synchronized | None beyond human review |
| #8 Real Supabase smoke | Not complete by design | Checklist and result template exist | Requires real Supabase project/account, RLS/Storage policies, Profile A/B restore, EPUB open, provider restore, tombstones |
| #9 Android plugin preflight | Local preflight complete up to environment gate | Desktop cfg/capability guards, Android Rust target preflight, Rustls fix, desktop regression build/test | Requires Android SDK/JDK/NDK setup, `tauri android init/build`, and device/emulator verification in M3 spike |

## Current External Gates

### Real Supabase

Requires a real Supabase project/account and manual evidence capture:

- Apply `packages/app/supabase/migrations/001_m1_auth_sync.sql`.
- Verify RLS and Storage policies.
- Run Profile A -> Profile B sync restore.
- Confirm reading progress, EPUB binary restore/open, provider config restore, tombstones, and active-name tag/skill behavior.
- Record results using `docs/testing/m1-supabase-smoke-results-template.md`.
- Follow `docs/handoff/external-validation-runbook-2026-05-24.md`.

### Android Environment

Requires Android SDK/JDK/NDK installation and license acceptance:

- Set `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME`, and `NDK_HOME`.
- Re-run `pnpm --filter app tauri android init --ci`.
- Re-run `pnpm --filter app tauri android build`.
- Verify on emulator/device in the M3 spike.
- Follow `docs/handoff/external-validation-runbook-2026-05-24.md`.

## Handoff Judgment

The requested automated portion is at a handoff-ready state: issues, PRD, docs, tests, desktop build, Android preflight notes, and GitHub issue bodies have been synchronized. The active goal is not complete because #8 and the Android SDK/device gates remain unverified external dependencies.
