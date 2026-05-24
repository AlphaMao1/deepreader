## Parent

PRD: M1 Sync Continuation - https://github.com/AlphaMao1/deepreader/issues/1

## What to build

Run and document a real Supabase end-to-end smoke test for the accepted M1 continuation scope.

## Acceptance criteria

- [ ] Supabase SQL migration runs in a real project.
- [ ] Email signup/login works.
- [ ] Books metadata, reading progress, notes/annotations, tags, skills, memories, and reading sessions can sync.
- [ ] EPUB binary upload/download works for a small EPUB.
- [ ] Provider config backup/restore works with encrypted cloud storage.
- [ ] Tombstone delete behavior is verified.
- [ ] Same-name tag/skill restore after tombstone is verified against the active-row unique indexes.
- [ ] Results and remaining risks are recorded in repository docs.

## Blocked by

- https://github.com/AlphaMao1/deepreader/issues/2
- https://github.com/AlphaMao1/deepreader/issues/3
- https://github.com/AlphaMao1/deepreader/issues/4
- https://github.com/AlphaMao1/deepreader/issues/5
- https://github.com/AlphaMao1/deepreader/issues/6
- https://github.com/AlphaMao1/deepreader/issues/7
