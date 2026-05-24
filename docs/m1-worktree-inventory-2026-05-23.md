# M1 Worktree Inventory - 2026-05-23

This inventory classifies the current dirty worktree for M1 Auth Sync continuation. It is based on static inspection only; build/test execution is still gated by `CLAUDE.md`.

## Intentional M1 Product Changes

- `packages/app/src/components/settings/cloud-sync.tsx`: Supabase login/settings UI, manual incremental/full sync, provider config backup/restore, GitHub OAuth deferred UI, changed-account confirmation.
- `packages/app/src/hooks/use-sync-scheduler.ts`: background incremental sync, per-account cursor usage, changed-account guard, latest-settings runtime read to avoid cursor update loops.
- `packages/app/src/hooks/use-book-upload.ts`: import-time best-effort cloud sync; Cloud Sync controls metadata sync, EPUB Cloud Sync controls file binary sync.
- `packages/app/src/services/auth-service.ts`: Supabase client, email/password auth, deferred GitHub OAuth helper.
- `packages/app/src/services/sync-service.ts`: table sync, LWW conflict resolution, tombstones, Supabase Storage EPUB upload/download.
- `packages/app/src/services/cloud-sync-state.ts`: account-scoped sync cursor helpers and account-boundary guard.
- `packages/app/src/services/cloud-config-service.ts`: Recovery Key encryption for provider config backup/restore.
- `packages/app/src/lib/encrypted-storage.ts`: encrypted local settings/provider storage.
- `packages/app/src/types/settings.ts` and `packages/app/src/services/constants.ts`: cloud sync settings and defaults.
- `packages/app/supabase/migrations/001_m1_auth_sync.sql`: Supabase schema, RLS policies, and private EPUB Storage bucket.

## Intentional Local Rust/SQLite Changes

- `packages/app/src-tauri/src/core/sync.rs`: schema migration helpers, changed-row/tombstone fetch, bulk upsert, mark-synced commands.
- `packages/app/src-tauri/src/core/crypto.rs`: local secret encryption commands.
- `packages/app/src-tauri/src/core/books/commands.rs`: soft-delete cascade, re-upload recovery for tombstoned books, pending sync status updates.
- `packages/app/src-tauri/src/core/{database,notes,tags,skills,memories}/commands.rs`: sync/tombstone compatibility updates, including same-name tag/skill tombstone restore.
- `packages/app/src-tauri/src/core/schema.sql`: local schema additions for tombstones and sync status.
- `packages/app/src-tauri/src/lib.rs` and `packages/app/src-tauri/src/core/mod.rs`: register sync/crypto commands and guard desktop-only Llama/global-shortcut paths.
- `packages/app/src-tauri/Cargo.toml` and `Cargo.lock`: crypto dependencies plus desktop-only plugin target dependency placement.

## Intentional Android Preflight Changes

- `packages/app/src/utils/platform-features.ts`: platform feature gates for local LLM.
- `packages/app/src/store/llama-store.ts`: skip local LLM startup on Android/iOS while preserving remote vector model support.
- `packages/app/src/components/settings/llama.tsx`: hide local Llama controls on mobile targets.

## Intentional UI Wiring

- `packages/app/src/components/settings/settings-dialog.tsx`: adds the `账号同步` settings entry.
- `packages/app/src/components/reader-layout.tsx`: mounts the sync scheduler.

## Test Files Present But Not Yet Re-run

- `packages/app/src/services/sync-service.test.ts`
- `packages/app/src/services/cloud-sync-state.test.ts`
- `packages/app/src/services/cloud-config-service.test.ts`
- `packages/app/src/utils/platform-features.test.ts`
- `packages/app/src/lib/encrypted-storage.test.ts`

## Documentation And Tracker Files

- `CONTEXT.md`: current glossary and product decisions.
- `docs/prd/archive/`: recovered historical PRDs and audit docs.
- `docs/prd/current/m1-sync-continuation-prd.md`: current M1 source of truth.
- `docs/issues/github/`: local mirrors of GitHub issues #1-#9.
- `docs/testing/`: smoke checklist, result template, local verification notes, acceptance evidence audit.
- `docs/handoff/m1-sync-continuation-handoff-2026-05-23.md`: current handoff.
- `docs/agents/` and `CLAUDE.md`: GitHub issue tracker and triage-label guidance.
- `M1_AUTH_SYNC_MANUAL_REVIEW.md`: current human smoke checklist.

## Dependency Metadata

- `packages/app/package.json` and `pnpm-lock.yaml`: add Supabase client, Vitest script/dependency, and related lockfile updates.

## Known Follow-Up / Verification

- Real Supabase smoke: migration, auth, RLS, table sync, Storage upload/download, provider config restore, tombstones.
- Test execution: `pnpm --filter app test` and build/type checks after explicit approval.
- Rust/Android verification: `cargo check --lib` and Android/Tauri checks after explicit approval.
- Desktop runtime check: verify Android preflight guards did not alter desktop Llama/settings behavior.
