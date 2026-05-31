# M1 Supabase Smoke Results - 2026-05-31

This result records the browser-assisted Supabase validation run. It intentionally omits API keys, passwords, Recovery Keys, and full project refs.

## Run Metadata

| Field | Value |
| --- | --- |
| Date | 2026-05-31 |
| Tester | Codex, with the user's logged-in Supabase dashboard |
| Git branch / commit | `feature/m1-auth-sync` / pending local doc update |
| Supabase project ref | Real project restored and used; full ref redacted in repo |
| App profile A | Supabase client session A using a dashboard-created confirmed smoke user |
| App profile B | Supabase client session B using the same smoke user |
| EPUB title / hash | Synthetic smoke EPUB bytes, `DeepReader Smoke EPUB` / `smoke-book-1780236318957` |

## Supabase Project State

| Check | Result | Evidence |
| --- | --- | --- |
| Project can be accessed | Passed | Dashboard organization had one project; it was restored from paused state |
| Project status | Passed | Dashboard showed `Healthy` after restoration |
| Project URL available | Passed | Dashboard exposed the Supabase project URL after restoration |

## Supabase Migration

| Check | Result | Evidence |
| --- | --- | --- |
| `001_m1_auth_sync.sql` ran without error | Passed | SQL Editor returned `Success. No rows returned.` |
| Sync tables exist | Passed | SQL verification returned `tables = 10` |
| RLS enabled on sync tables | Passed | SQL verification returned `rls_enabled = 10` |
| Owner policies exist | Passed | SQL verification returned `owner_policies = 10` |
| `epubs` storage bucket exists and is private | Passed | SQL verification returned `epubs_bucket_private = false` |
| `epubs_owner_policy` exists on `storage.objects` | Passed | SQL verification returned `epubs_storage_policy = 1` |

## Auth

| Check | Result | Evidence |
| --- | --- | --- |
| Email signup path | Partial | Client `signUp` created an unconfirmed user, then Supabase email rate limit blocked additional signup attempts |
| Confirmed disposable test user | Passed | Created from Dashboard Auth Users with `Auto confirm user` checked |
| Email login works in Profile A | Passed | Client A `signInWithPassword` succeeded |
| Email login works in Profile B | Passed | Client B `signInWithPassword` succeeded with the same account |
| GitHub OAuth is not presented as supported M1 login | Not retested in this run | Covered by prior local UI/docs verification |

## Reading Progress

| Check | Result | Evidence |
| --- | --- | --- |
| Profile A creates or updates `book_status` | Passed | Client A upserted `book_status` with `progress_current = 37`, `progress_total = 100` |
| Cloud `book_status.user_id` equals active account | Passed | Insert was accepted only with the authenticated user's `user_id` |
| Profile B restores progress | Passed | Client B selected one `book_status` row and read `progress_current = 37` |
| Newer local progress is not overwritten by older remote data | Not retested in live Supabase | Covered by local LWW tests; no desktop UI two-profile conflict run was performed |

## Account Boundary

| Check | Result | Evidence |
| --- | --- | --- |
| Anonymous user cannot see account rows | Passed | Anonymous client selected zero rows for the smoke book |
| Account A/B cursor UI behavior | Not retested in live desktop UI | Covered by local state tests and account-boundary UI implementation |
| Background/import-time account-boundary warnings | Not retested in live desktop UI | Requires interactive Tauri UI profile run |

## EPUB Binary Sync

| Check | Result | Evidence |
| --- | --- | --- |
| Profile A uploads EPUB to Storage | Passed | Client A uploaded synthetic EPUB bytes |
| Storage object path is `epubs/{userId}/{bookId}/...` | Passed | Path shape verified as `{userId}/{bookId}/book.epub` inside private `epubs` bucket |
| Profile B downloads missing EPUB | Passed at Storage API level | Download returned 19 bytes from the uploaded object |
| Restored local `books.file_path` is relative and under `books/{bookId}/...` | Passed at row level | Smoke row used `books/smoke-book-1780236318957/book.epub` |
| Restored local `books.file_path` has no absolute path or `..` traversal segments | Passed at row level | Smoke row used a safe relative path |
| Profile B opens restored EPUB in reader | Not retested in live desktop UI | Requires Tauri UI run with a real EPUB file |
| Deleted/tombstoned books are not active downloads | Not retested in live Supabase | Covered by local sync tests |

## Provider Config / API Keys

| Check | Result | Evidence |
| --- | --- | --- |
| `user_configs` table accepts scoped provider backup row | Passed | Client A inserted a smoke `user_configs` row |
| `user_configs.encrypted_value` is not readable provider JSON | Passed at row-shape level | Stored value was a non-JSON smoke encrypted payload placeholder |
| Recovery Key backup/restore round trip | Not retested in live desktop UI | Covered by local tests; requires real app UI and Recovery Key entry |
| Wrong Recovery Key fails without overwriting local config | Not retested in live desktop UI | Covered by local tests |

## Tombstones

| Check | Result | Evidence |
| --- | --- | --- |
| Recreating a deleted tag name syncs without remote unique errors | Passed | Old tag was tombstoned, new same-name active tag inserted |
| Recreating a deleted skill name syncs without remote unique errors | Passed | Old skill was tombstoned, new same-name active skill inserted |
| No duplicate active tag/skill names exist for one `user_id` | Passed | Follow-up select returned one active tag and one active skill |
| Book/note/session cascade tombstones | Not retested in live Supabase | Covered by Rust/local tests |
| Optional same-name offline conflict probe | Not run | Still a possible follow-up design question |

## Final Decision

- [ ] Passed
- [ ] Failed
- [x] Passed with follow-up issues

Follow-up issues:

- Live desktop UI smoke was not run end-to-end with two separate Tauri app profiles and a real EPUB open in the reader.
- Recovery Key provider config restore was not retested through the live desktop UI.
- Android native build remains deferred because the Android SDK/JDK/NDK toolchain is not installed and is too large for the current goal.
- The next product route should replace the near-term Android app track with a Mobile PWA Companion PRD focused on phone reading progress sync.
