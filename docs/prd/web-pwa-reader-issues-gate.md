# PRD Gate: Issue Readiness

Parent PRD: #11 `PRD: DeepReader Web/PWA Reader Rebuild`

Date: 2026-06-24

## Decision

READY FOR IMPLEMENTATION

The new Web/PWA issue set is ordered by dependency, keeps the old Tauri/M1 route out of the active queue, and gives each implementation agent an externally verifiable behavior path. The set still contains one foundational prefactor issue, but it is narrow, testable, and blocks all later work.

## Issue Review

| Issue | Classification | Severity | Why | Required Change |
|---|---|---|---|---|
| #12 Web/PWA shell | ready-for-agent | Low | This is a scaffold/prefactor slice rather than a user-complete feature, but it is the necessary package boundary for the rebuild and has concrete build/PWA/no-Tauri acceptance criteria. | None. |
| #13 Supabase auth/data foundation | ready-for-agent | Low | Establishes account, RLS, private storage, and smoke verification; dependency is explicit. | None. |
| #14 EPUB upload/restore | ready-for-agent | Low | Delivers a demoable upload and restore path with unsupported-format rejection. | None. |
| #15 Reader/progress/offline | ready-for-agent | Low | Covers render, navigation, local-first progress, sync, and offline behavior. | None. |
| #16 Selection floating menu | ready-for-agent | Low | Delivers visible reading interaction with synced annotations and Ask AI handoff. | None. |
| #17 Client-side indexing | ready-for-agent | Medium | Highest technical risk because provider limits, vector persistence, and resume behavior can be faked if not tested. Acceptance already requires progress, retry, resume, provider smoke, and vector/chunk persistence. | None before implementation; agent must produce real indexing evidence. |
| #18 AI chat routing | ready-for-agent | Medium | Depends correctly on annotation and indexing; acceptance covers local API key, responsive containers, context routing, thread sync, and offline explanation. | None. |
| #19 Confirmed memory saving | ready-for-agent | Low | Keeps memory intentional and avoids automatic pollution. | None. |
| #20 Markdown export/deletion | ready-for-agent | Low | Verifies export, storage deletion, cache invalidation, index cleanup, soft delete, and memory retention. | None. |
| #21 End-to-end acceptance pass | ready-for-agent | Low | Final smoke/QA slice validates desktop, Android PWA, Supabase, provider calls, offline, and anti-shortcut risks. | None. |

## Cross-Issue Risks

- #17 may need implementation design choices for vector search in Supabase. That can be decided inside the issue as long as the final behavior proves persisted chunks/vectors and real retrieval.
- #13 should not overbuild a full multi-tenant SaaS schema. It should create the minimum durable schema needed by #14-#21.
- #12 must not become a visual redesign detour. It should establish shell, responsive frame, PWA plumbing, and no-Tauri boundary only.
- #21 should not be skipped after automated tests pass; it exists because the product depends on real Supabase, real browser storage, Android Chrome/PWA behavior, and live provider smoke.

## Recommended Implementation Order

1. #12 Scaffold reader app shell.
2. #13 Add Supabase auth and private data foundation.
3. #14 Upload EPUB and restore library across devices.
4. #15 Build EPUB reader core with progress sync and offline read.
5. #16 Add selection floating menu for highlight, note, and Ask AI.
6. #17 Add client-side EPUB indexing with resumable RAG jobs.
7. #18 Add AI chat sidebar and bottom sheet with reading context routing.
8. #19 Add manual and confirmed AI memory saving.
9. #20 Add Markdown export and deletion semantics.
10. #21 Run end-to-end desktop and Android PWA acceptance pass.

## AI Shortcut Watchlist

- Do not count a static route shell as #12 unless build/PWA/no-Tauri criteria are proven.
- Do not count mock upload as #14 unless a private Supabase Storage object and second-session restore are proven.
- Do not count fake progress bars as #17 unless persisted chunks/vectors and resumable job state are proven.
- Do not store provider API keys in Supabase to satisfy #18 quickly.
- Do not claim Android support from desktop-only responsive screenshots; #21 requires a real Android Chrome/PWA pass.
