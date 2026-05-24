# M1 Supabase Smoke Results Template

Copy this file to `docs/testing/m1-supabase-smoke-results-YYYY-MM-DD.md` after running the smoke test. Do not commit real API keys, passwords, recovery keys, or private EPUB files.

## Run Metadata

| Field | Value |
| --- | --- |
| Date | TODO |
| Tester | TODO |
| Git branch / commit | TODO |
| Supabase project ref | TODO |
| App profile A | TODO |
| App profile B | TODO |
| EPUB title / hash | TODO |

## Supabase Migration

| Check | Result | Evidence |
| --- | --- | --- |
| `001_m1_auth_sync.sql` ran without error | TODO | TODO |
| Sync tables exist | TODO | TODO |
| RLS enabled on sync tables | TODO | TODO |
| Active-name unique indexes exist for `tags` and `skills` | TODO | TODO |
| `epubs` storage bucket exists and is private | TODO | TODO |
| `epubs_owner_policy` exists on `storage.objects` | TODO | TODO |

## Auth

| Check | Result | Evidence |
| --- | --- | --- |
| Email signup works | TODO | TODO |
| Email login works in Profile A | TODO | TODO |
| Email login works in Profile B | TODO | TODO |
| GitHub OAuth is not presented as supported M1 login | TODO | TODO |

## Reading Progress

| Check | Result | Evidence |
| --- | --- | --- |
| Profile A creates or updates `book_status` | TODO | TODO |
| Cloud `book_status.user_id` equals active account | TODO | TODO |
| Profile B full sync restores progress | TODO | TODO |
| Newer local progress is not overwritten by older remote data | TODO | TODO |

Suggested Supabase evidence query:

```sql
select user_id, book_id, progress_current, progress_total, location, updated_at, deleted_at
from public.book_status
order by updated_at desc
limit 10;
```

## Account Boundary

| Check | Result | Evidence |
| --- | --- | --- |
| Account A last synced time is preserved after logout/login | TODO | TODO |
| Account B starts with unsynced cursor state | TODO | TODO |
| Background sync does not silently upload shared local library to account B | TODO | TODO |
| Import-time auto sync skips until account B is manually confirmed | TODO | TODO |
| Manual sync for account B shows account-boundary confirmation | TODO | TODO |

## EPUB Binary Sync

| Check | Result | Evidence |
| --- | --- | --- |
| Profile A uploads EPUB to Storage | TODO | TODO |
| Storage object path is `epubs/{userId}/{bookId}/...` | TODO | TODO |
| Profile B downloads missing EPUB | TODO | TODO |
| Restored local `books.file_path` is relative and under `books/{bookId}/...` | TODO | TODO |
| Restored local `books.file_path` has no absolute path or `..` traversal segments | TODO | TODO |
| Profile B opens restored EPUB in reader | TODO | TODO |
| Deleted/tombstoned books are not active downloads | TODO | TODO |

Suggested Supabase evidence query:

```sql
select bucket_id, name, owner, created_at, updated_at
from storage.objects
where bucket_id = 'epubs'
order by updated_at desc
limit 20;
```

## Provider Config / API Keys

| Check | Result | Evidence |
| --- | --- | --- |
| Profile A backs up provider config with Recovery Key | TODO | TODO |
| `user_configs.encrypted_value` is not readable provider JSON | TODO | TODO |
| Profile B restores config with correct Recovery Key | TODO | TODO |
| Wrong Recovery Key fails without overwriting local config | TODO | TODO |

Suggested Supabase evidence query:

```sql
select user_id, key, left(encrypted_value, 32) as encrypted_prefix, iv, updated_at
from public.user_configs
where key = 'model-provider'
order by updated_at desc
limit 10;
```

## Tombstones

| Check | Result | Evidence |
| --- | --- | --- |
| Deleting a book sets `books.deleted_at` | TODO | TODO |
| Related `book_status`, notes/annotations, and reading sessions are soft-deleted | TODO | TODO |
| Another profile does not resurrect deleted visible data | TODO | TODO |
| Recreating a deleted tag name syncs without remote unique errors | TODO | TODO |
| Recreating a deleted skill name syncs without remote unique errors | TODO | TODO |
| No duplicate active tag/skill names exist for one `user_id` | TODO | TODO |
| Optional: same-name offline tag/skill conflict is recorded as pass/follow-up | TODO | TODO |

Suggested Supabase evidence query:

```sql
select user_id, id, title, deleted_at, updated_at
from public.books
order by updated_at desc
limit 10;
```

```sql
select user_id, name, count(*) as active_count
from public.tags
where deleted_at is null
group by user_id, name
having count(*) > 1
union all
select user_id, name, count(*) as active_count
from public.skills
where deleted_at is null
group by user_id, name
having count(*) > 1;
```

## Residual Risks

- Same-name tag/skill conflicts created independently on two offline profiles may require a follow-up conflict-resolution design if the active-row unique index rejects the second ID.

## Final Decision

- [ ] Passed
- [ ] Failed
- [ ] Passed with follow-up issues

Follow-up issues:

- TODO
