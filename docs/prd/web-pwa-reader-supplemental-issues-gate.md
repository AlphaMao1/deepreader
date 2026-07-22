# PRD Gate: Supplemental Issue Readiness

Parent PRD: #11 `PRD: DeepReader Web/PWA Reader Rebuild`

Supplemental issue doc: `docs/prd/web-pwa-reader-supplemental-issues.md`

Date: 2026-06-24

## Decision

FIX ISSUES FIRST BEFORE FRONT-END IMPLEMENTATION

The supplemental issue set is now complete enough for planning, but it intentionally introduces a human design gate. The project should pause front-end development until #22 and #23 resolve the visual direction and global UI baseline. Non-visual foundation work such as #13 can proceed if the user explicitly chooses to resume backend/data work first.

## Issue Review

| Issue | Classification | Severity | Why | Required Change |
|---|---|---:|---|---|
| #22 Design direction | needs-human-decision | High | The user is building a separate front-end design system and does not want more ad hoc UI work. | Wait for user-approved design direction. |
| #23 Apply visual system | needs-human-decision until #22 closes | High | This issue depends on a not-yet-approved visual direction. | Start only after #22 has a selected direction. |
| #24 Library management | ready-for-agent after blockers | Medium | Clear behavior gap from the original release; depends on upload/restore and visual baseline. | None. |
| #25 Reader controls | ready-for-agent after blockers | Medium | Clear behavior gap from the original release; depends on reader core and visual baseline. | None. |
| #26 Notepad/digest | ready-for-agent after blockers | Medium | Needed for annotation review and Markdown export quality. | None. |
| #27 Settings/providers | ready-for-agent after blockers | High | Required by indexing and chat so provider keys and embedding config are not implicit. | None. |
| #28 Skills/slash commands | ready-for-agent after blockers | Low | Restores current product command surface without desktop plugin assumptions. | None. |
| #29 Reading statistics | ready-for-agent after blockers | Low | Useful parity surface; not core to the first reading/AI loop. | None. |
| #30 Release parity and visual QA | ready-for-agent after blockers | High | Prevents the Web/PWA rebuild from passing as a demo shell. | None. |

## Cross-Issue Risks

- The biggest near-term risk is resuming UI implementation before the external design system is ready.
- #17 and #18 now correctly depend on #27 because embedding/chat configuration must not be hidden inside those implementation tickets.
- #21 now depends on #30 so final acceptance cannot skip original release parity and visual QA.
- #24-#30 are intentionally supplemental. They should not replace #13-#21; they fill missing product surfaces around the main MVP path.

## Recommended Implementation Order

1. #22.
2. #23.
3. #13, if backend/data work resumes before UI work.
4. #14 -> #24.
5. #15 -> #25 -> #29.
6. #16 -> #26.
7. #27 -> #17 -> #18 -> #19 -> #28.
8. #20 -> #30 -> #21.

## AI Shortcut Watchlist

- Do not call static demo screens "library management" or "reader controls."
- Do not implement provider settings by storing API keys in Supabase.
- Do not count the current demo layout as the approved visual system.
- Do not claim Android/PWA readiness from desktop screenshots alone.
- Do not let #21 pass without a parity checklist against the existing release.
