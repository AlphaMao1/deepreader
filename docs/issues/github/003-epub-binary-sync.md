## Parent

PRD: M1 Sync Continuation - https://github.com/AlphaMao1/deepreader/issues/1

## What to build

Implement EPUB file upload and download through Supabase Storage so metadata/progress sync is backed by the actual book file. EPUB binary sync is mandatory for the next sync milestone.

## Acceptance criteria

- [x] When EPUB cloud sync is enabled, importing a book uploads its EPUB file to a user-scoped Supabase Storage path.
- [x] Active EPUB files upload before `books` metadata is published to Supabase, so a failed binary upload does not mark the local book row synced or publish fresh metadata first.
- [x] Active EPUB metadata upload fails before Supabase upsert when the local EPUB file is missing, so a restorable book row is not published without its binary.
- [x] The code path can download the EPUB file for a synced book.
- [x] For applied remote `books` rows, missing active EPUB files download before local `books` metadata is written, so a failed file restore does not create a newly visible broken book row first.
- [ ] A fresh device/profile has verified EPUB download from real Supabase Storage.
- [x] The local `file_path` is rewritten to a safe app-data copy path during restore.
- [ ] The restored local `file_path` is verified in a fresh profile smoke test.
- [x] EPUB restore normalization handles legacy or remote `format` casing such as `epub`.
- [x] Deleted books do not appear as active downloadable books after tombstone sync.
- [x] UI copy no longer describes EPUB sync as only a placeholder.
- [ ] A small EPUB smoke test covers upload, download, and open/read after restore.

## Blocked by

- https://github.com/AlphaMao1/deepreader/issues/2
