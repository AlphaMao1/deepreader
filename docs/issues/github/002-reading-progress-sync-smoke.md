## Parent

PRD: M1 Sync Continuation - https://github.com/AlphaMao1/deepreader/issues/1

## What to build

Prove the mandatory reading progress sync path end to end. A user should be able to read on one device/profile, sync, and see the correct `book_status` progress restored on another device/profile with the same account.

## Acceptance criteria

- [x] `book_status` changes upload with the active user's `user_id`.
- [x] LWW code path downloads remote `book_status` without overwriting newer local progress.
- [x] LWW reading-progress behavior is verified by running the local test or manual scenario.
- [x] Full sync can bootstrap reading progress on a fresh local profile.
- [x] Tombstoned books do not restore stale progress as visible data, including applied remote book tombstones cascading to stale local `book_status` and reading sessions without overwriting newer local child rows.
- [ ] A documented smoke path verifies desktop/profile A -> cloud -> desktop/profile B progress restore.

## Blocked by

- https://github.com/AlphaMao1/deepreader/issues/2
