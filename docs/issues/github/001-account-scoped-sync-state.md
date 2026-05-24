## Parent

PRD: M1 Sync Continuation - https://github.com/AlphaMao1/deepreader/issues/1

## What to build

Make cloud sync state safe for the current authenticated user. The app does not need separate local libraries per account yet, but it must not reuse one global sync cursor in a way that skips data or silently uploads one account's local state into another account.

## Acceptance criteria

- [x] Sync cursor state is scoped by Supabase `user.id`, not one global `lastSyncedAtCloud`.
- [x] Logging out and logging into the same account preserves expected sync continuity.
- [x] Logging into a different account resets or isolates the sync cursor and avoids silent skipped sync.
- [x] First sync with a different cloud account requires explicit user confirmation before the shared local library is merged/uploaded, including manual sync, import-time auto sync, and background scheduler sync.
- [x] Settings UI still shows a clear "last synced" timestamp for the active account.
- [x] Registration flows that require email confirmation are not treated as logged in until Supabase returns a session.
- [x] Settings panel cloud actions share one busy gate, so manual sync/full sync/config backup/restore cannot be launched concurrently from the UI.
- [x] Sync service rejects overlapping sync runs in one app process, covering background, import-time, manual incremental, and manual full sync entry points.
- [x] Upload completion cannot clear a newer local pending edit made during the same sync run; `mark_synced` validates the uploaded row snapshot before marking local rows synced.
- [x] Tests or a manual verification note cover same-account and changed-account behavior.

## Blocked by

None - can start immediately.
