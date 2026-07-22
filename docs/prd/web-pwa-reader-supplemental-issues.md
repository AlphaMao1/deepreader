# Web/PWA Supplemental Issues

Date: 2026-06-24

Parent PRD: #11 `PRD: DeepReader Web/PWA Reader Rebuild`

## Why These Issues Were Added

The original #12-#21 queue covers the MVP technical spine: app shell, Supabase, EPUB upload, reader core, annotations, indexing, AI chat, memory, export/deletion, and final E2E acceptance.

After reviewing the current Web demo shell and the existing Tauri release, the queue still needed two additions:

1. A design-system gate before more front-end implementation. The current Web shell is a demo and should not become the product UI by accident.
2. Supplemental parity issues for current DeepReader product surfaces that were too implicit in the first issue set: library management, reader controls, annotation review, settings, skills, and statistics.

## New Issues

| Issue | Title | Classification | Blocked By |
|---|---|---|---|
| #22 | `[Web/PWA][Design] Define DeepReader Web visual direction from the new design system` | `ready-for-human` | None |
| #23 | `[Web/PWA][UI] Apply selected visual system to app shell and core screens` | `ready-for-human` | #22, #12 |
| #24 | `[Web/PWA] Complete library management beyond EPUB upload` | `ready-for-agent` after blockers | #14, #23 |
| #25 | `[Web/PWA] Complete reader controls for TOC, search, reading settings, and session state` | `ready-for-agent` after blockers | #15, #23 |
| #26 | `[Web/PWA] Add annotations notepad and reading digest review surfaces` | `ready-for-agent` after blockers | #16, #23 |
| #27 | `[Web/PWA] Add settings surfaces for sync, model providers, embeddings, fonts, and local keys` | `ready-for-agent` after blockers | #13, #23 |
| #28 | `[Web/PWA] Add skills library and slash command entry points for the reader assistant` | `ready-for-agent` after blockers | #18, #19, #23 |
| #29 | `[Web/PWA] Add reading statistics and history` | `ready-for-agent` after blockers | #15, #23 |
| #30 | `[Web/PWA] Run original release parity and visual QA pass` | `ready-for-agent` after blockers | #20, #23, #24, #25, #26, #27, #28, #29 |

## Existing Issues Updated

The following existing issues were patched to reflect the supplemental dependencies:

| Issue | Updated Blockers |
|---|---|
| #17 `Add client-side EPUB indexing with resumable RAG jobs` | #14, #27 |
| #18 `Add AI chat sidebar and bottom sheet with reading context routing` | #16, #17, #27 |
| #20 `Add Markdown export and deletion semantics` | #16, #17, #19, #26 |
| #21 `Run end-to-end desktop and Android PWA acceptance pass` | #20, #30 |

## Recommended Order

1. #22 Design direction. Wait for the user's external front-end design system work and explicit approval.
2. #23 Apply selected visual system to the Web/PWA shell and core screens.
3. #13 Supabase auth/data foundation can proceed independently of visual design if desired.
4. #14 EPUB upload/restore.
5. #24 Library management.
6. #15 Reader core/progress/offline.
7. #25 Reader controls.
8. #16 Selection/highlight/note/Ask AI.
9. #26 Annotation notepad and digest review.
10. #27 Settings/model provider/embedding/local key surfaces.
11. #17 Client-side indexing.
12. #18 AI chat context routing.
13. #19 Manual/confirmed memory.
14. #28 Skills/slash commands.
15. #29 Reading statistics.
16. #20 Markdown export/deletion.
17. #30 Original release parity and visual QA.
18. #21 Full desktop and Android PWA E2E acceptance.

## Do Not Start Yet

- Do not continue front-end implementation until #22 is resolved and #23 is either completed or explicitly waived by the user.
- Do not treat the current `packages/web` demo shell as feature-complete.
- Do not close #12 solely because the demo renders; #12 still needs final review against its actual shell/PWA/no-Tauri acceptance criteria.
- Do not satisfy UI requirements with English placeholder screens or visible issue/development labels.
