# ADR 001: Secret Storage And Recovery

Status: Accepted for M1 continuation

Date: 2026-05-24

## Context

DeepReader is local-first, but M1 sync introduces account login and cross-device recovery for model configuration. The app now handles several secret-bearing values:

- Supabase auth session
- model provider API Keys
- remote embeddings API Keys
- TTS API Key
- Supabase anon key, which is public-client configuration rather than a secret

The old recovered M1 PRD discussed Recovery Key backup, but it did not clearly separate local device encryption from cloud recovery.

## Decision

Use two separate mechanisms.

Device Key is local-only. Desktop Tauri stores a generated device key under the app config directory and uses it to encrypt local persisted stores through `encrypt_secret_payload` / `decrypt_secret_payload`. The encrypted storage wrapper can still read legacy plaintext values and will rewrite encrypted values on the next store write. Current local encrypted stores include app settings, Supabase auth session, model provider config, remote embeddings config, and TTS config.

Recovery Key is user-held and cloud-only. It is used to encrypt/decrypt the `user_configs` cloud backup with PBKDF2-SHA256 and AES-GCM. Current Recovery Key backup scope includes chat / memory extraction model provider config, selected model state, remote embeddings config, selected vector model state, and their API Keys.

Recovery Key does not restore books, reading progress, login sessions, local Device Key, app layout, or TTS config in M1 continuation.

Supabase auth session persistence must use immediate encrypted local storage so sign-in/sign-out state is not left behind by delayed writes.

OS keychain / Android keystore integration is deferred from M1 continuation. Android work must revisit this ADR before shipping mobile secret storage.

## Consequences

- Losing the local Device Key can make local encrypted stores unreadable.
- Losing the Recovery Key prevents cloud recovery of model provider and remote embeddings API Keys.
- A fresh device can recover provider and remote embeddings config from cloud only when the user supplies the Recovery Key.
- TTS API Key is locally encrypted but not cloud-backed in M1 continuation.
- This is safe enough for the M1 continuation only after real Supabase smoke verifies that `user_configs.encrypted_value` is not readable JSON and wrong Recovery Key input does not mutate local config.

## Verification

- Static code evidence:
  - `packages/app/src-tauri/src/core/crypto.rs`
  - `packages/app/src/lib/encrypted-storage.ts`
  - `packages/app/src/services/cloud-config-service.ts`
  - `packages/app/src/services/auth-service.ts`
  - `packages/app/src/store/provider-store.ts`
  - `packages/app/src/store/llama-store.ts`
  - `packages/app/src/store/tts-store.ts`
- Pending automated checks:
  - `packages/app/src/services/cloud-config-service.test.ts`
  - `packages/app/src/lib/encrypted-storage.test.ts`
- Required manual smoke:
  - `docs/testing/m1-supabase-smoke.md`
