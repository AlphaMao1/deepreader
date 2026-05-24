## Parent

PRD: M1 Sync Continuation - https://github.com/AlphaMao1/deepreader/issues/1

## What to build

Make model provider configuration and API key sync safe enough to ship. If the current Recovery Key backup design is acceptable after review, harden and document it. If it is not acceptable, replace it with a safer approach before syncing secrets.

## Acceptance criteria

- [x] Device Key and Recovery Key responsibilities are documented in the current docs.
- [x] Device Key vs Recovery Key boundary is captured in `docs/adr/001-secret-storage-and-recovery.md`.
- [x] Recovery Key generation falls back to `crypto.getRandomValues` when `crypto.randomUUID` is unavailable.
- [x] Supabase auth session persistence uses encrypted immediate-write local Tauri storage.
- [x] Provider config, remote embeddings config, and API Keys are encrypted before upload.
- [x] Local remote embeddings API Key storage uses encrypted Tauri storage.
- [x] Local TTS API Key storage uses encrypted Tauri storage with legacy localStorage read compatibility; TTS cloud backup/restore is outside current M1 scope.
- [x] Malformed local encrypted storage payloads return decrypt errors instead of panicking on invalid nonce length.
- [ ] Supabase smoke evidence confirms cloud-stored provider config is not readable as JSON.
- [ ] Provider config can be restored on a fresh device/profile with the intended recovery mechanism.
- [x] Wrong recovery input, malformed backup data, and missing selected provider/vector model references are rejected before applying local config.
- [x] Wrong recovery input is verified manually or by running the local test.
- [x] UI explains what the Recovery Key can and cannot restore.
- [x] If OS keychain/keystore is deferred, the limitation is explicit.

## Blocked by

None - can start immediately.
