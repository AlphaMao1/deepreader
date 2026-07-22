# PRD Gate: PRD Readiness

PRD: `web-pwa-reader-prd.md`

Date: 2026-06-24

## Decision

GO TO ISSUES

The PRD is aligned with the latest product intent: Web/PWA first, EPUB-only, Supabase sync, client-side automatic indexing, local API keys, redesigned UI, basic offline reading, and Android Chrome/PWA compatibility. The remaining gaps are implementation-shaping details suitable for issue decomposition, not blockers to PRD readiness.

## Findings

| ID | Severity | Category | Location | Problem | Recommendation |
|---|---|---|---|---|---|
| G1 | Low | Design specificity | PRD lines 69-70, 130-131 | The PRD intentionally says UI must be redesigned but does not define a visual system. This is acceptable for PRD readiness but could let an implementation issue copy the old Tauri UI. | Add a dedicated design/prototype issue before full UI implementation. Acceptance should include desktop and Android screenshots. |
| G2 | Medium | Technical design detail | PRD lines 76-79, 100-103 | Client-side indexing is product-approved, but vector storage/search implementation details are not specified here. | In issue breakdown, make indexing/search a vertical slice that proves chunk storage, vector persistence, search, resume, and rate-limit recovery against Supabase. |
| G3 | Medium | External dependency risk | PRD lines 79-80, 102-103, 132 | Free/low-cost embedding APIs are assumed sufficient for personal use, but rate limits may vary by account. | Add acceptance criteria for queueing, backoff, resume, and user-visible provider errors. Include one live provider smoke test. |
| G4 | Low | Migration/old work | PRD lines 67-68, 115, 130 | The PRD supersedes old Tauri/mobile sync work, but old GitHub issues may still exist and confuse agents. | Close or relabel superseded old issues before assigning new implementation work. |

## Coverage Map

| Story / Requirement | Acceptance Scenario Present? | Notes |
|---|---:|---|
| Browser/PWA entry and Android Chrome compatibility | Yes | Covered by stories 1-3 and Android/manual PWA verification. |
| Supabase email auth | Yes | Covered by story 4 and real Supabase smoke testing. |
| EPUB-only upload and rejection of unsupported formats | Yes | Covered by stories 5-7 and anti-shortcut checks. |
| EPUB file sync | Yes | Covered by story 6, Storage verification, and deletion verification. |
| Automatic client-side indexing | Yes | Covered by stories 8-11 and indexing/resume testing. |
| Ask AI during reading | Yes | Covered by stories 18-25 and responsive AI container verification. |
| RAG behavior | Yes | Covered by stories 22-23 and provider/indexing smoke tests. |
| Basic offline reading | Yes | Covered by stories 15-17 and offline verification. |
| Highlight and note capture | Yes | Covered by stories 18-21 and sync/delete tests. |
| One default thread per book | Yes | Covered by stories 26-27. |
| Memory behavior | Yes | Covered by stories 28-32 and explicit non-goal for automatic extraction. |
| Markdown export / Obsidian handoff | Yes | Covered by story 33 and out-of-scope direct vault writing. |
| Local-only API keys | Yes | Covered by story 34 and network/persistence verification. |
| Private cloud storage and RLS | Yes | Covered by story 38 and Supabase smoke testing. |
| Delete and soft delete behavior | Yes | Covered by stories 39-40 and deletion verification. |
| Conflict resolution | Yes | Covered by story 41 and implementation decisions around `updated_at` and `deleted_at`. |
| New Web/PWA package instead of mutating Tauri app | Yes | Covered by stories 42-44 and implementation decisions. |
| Testability against static UI/mock-only completion | Yes | Covered by story 45 and anti-shortcut test requirements. |

## AI Shortcut Risks

- Building only static screens without Supabase Auth, Storage, sync, and RLS.
- Faking indexing progress without real EPUB parsing, chunk persistence, embedding calls, and recovery state.
- Hardcoding a demo EPUB instead of supporting user upload and per-user storage.
- Storing API keys in Supabase despite the local-only decision.
- Claiming Android compatibility from desktop responsive mode only, without a real Android Chrome/PWA manual pass.
- Implementing Ask AI with only selected text while ignoring current page context and RAG fallback.
- Deleting UI rows without deleting Storage objects, RAG chunks/vectors, and sync-visible soft-delete state.

## Required Fixes Before `to-issues`

None.

## Recommended Next Step

Run `to-issues` or manually split the PRD into vertical implementation issues. Recommended issue order:

1. Web/PWA app scaffold and shell.
2. Supabase auth, schema, RLS, and private Storage foundation.
3. EPUB upload, local cache, and cross-device restore.
4. Reader core with progress persistence and basic offline reading.
5. Annotation floating menu with highlight, note, and Ask AI entry.
6. Client-side indexing job with progress, resume, retry, and vector persistence.
7. AI chat containers and selected-text/page/RAG context routing.
8. Per-book default thread sync and manual/confirmed memory saving.
9. Markdown export and deletion semantics.
10. Desktop/Android visual QA and real Supabase/provider smoke pass.
