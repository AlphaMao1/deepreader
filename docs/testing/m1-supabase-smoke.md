# M1 Supabase Smoke Test

This checklist covers the manual proof that local tests cannot replace: RLS, Storage policies, account-scoped cursor behavior, EPUB file restore, and reading progress restore.

## Setup

1. Create or reuse one Supabase project.
2. Run `packages/app/supabase/migrations/001_m1_auth_sync.sql`.
3. Configure the app with Supabase URL and anon key.
4. Prepare two local profiles or devices: Profile A and Profile B.
5. Use a small EPUB under 50 MB.

## Reading Progress Restore

1. In Profile A, register or log in with email/password.
2. Import the EPUB.
3. Open the book, read far enough to change `book_status.progress_current`, then return to settings.
4. Enable cloud sync and EPUB file cloud sync.
5. Run full sync.
6. In Supabase Table Editor, confirm `book_status` has the active `user_id` and expected progress fields.
7. In Profile B, log in with the same account.
8. Enable cloud sync and EPUB file cloud sync.
9. Run full sync.
10. Confirm the book appears, the EPUB opens locally, and the reading progress matches Profile A.

## Account Cursor Safety

1. In Profile A, note the last synced time for account A.
2. Log out and log in again with account A.
3. Confirm the last synced time is preserved for account A.
4. Log out and log in with a different account B.
5. Confirm the last synced time starts as unsynced for account B.
6. Confirm background sync and import-time auto sync do not silently upload the shared local library to account B.
7. Click incremental sync for account B and confirm the account-boundary warning appears.
8. Accept the warning, run sync, and confirm older account-A remote rows are not skipped because of account A's cursor.

## EPUB Restore Path Safety

1. In Profile B, after full sync, inspect the restored `books.file_path` value.
2. Confirm it is a relative app-data path such as `books/{bookId}/book.epub`.
3. Confirm it is not an absolute path and does not contain `..` path traversal segments.

## Provider Config Restore

1. In Profile A, set one model provider with a test API key.
2. Enter the Recovery Key and back up model config.
3. Confirm `user_configs.encrypted_value` is encrypted text, not provider JSON.
4. In Profile B, enter the same Recovery Key and restore model config.
5. Confirm provider config appears.
6. Repeat restore with a wrong Recovery Key and confirm local config is not overwritten.

## Tombstone And Active-Name Safety

1. Create one tag and one skill in Profile A, sync, then delete them.
2. Confirm Supabase stores tombstoned rows with `deleted_at` set.
3. Recreate the same tag and skill names, sync again, and confirm the active rows are accepted without remote unique-name errors.
4. Confirm there is not more than one active row per `(user_id, name)` for `tags` or `skills`.
5. Optional conflict probe: create the same tag or skill name independently on two profiles before either profile syncs. If Supabase rejects the second active row because the IDs differ, record a follow-up conflict-resolution issue instead of treating it as a smoke failure.

## Expected Remaining Manual Evidence

Record the Supabase project date, account IDs used, EPUB title/hash, and screenshots or notes for:

- `books` row exists with correct `user_id`.
- `book_status` row has expected progress.
- `storage.objects` contains `epubs/{userId}/{bookId}/...`.
- Profile B can open the restored EPUB.
- Tag/skill tombstones do not block same-name active restore.
- Any same-name offline tag/skill conflict result is recorded.
- Wrong Recovery Key fails without local corruption.

Use `docs/testing/m1-supabase-smoke-results-template.md` to record the run. Copy it to a dated result file after the smoke test finishes.
