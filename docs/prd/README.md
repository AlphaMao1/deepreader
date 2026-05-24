# PRD Index

This directory now contains the recovered Antigravity PRD artifacts and the local rules for turning them into current implementation work.

## Archive

The files in `docs/prd/archive/` are historical source material recovered from Antigravity/Gemini artifacts. They are useful evidence, but they are not automatically the current source of truth.

| File | Meaning | Original source |
| --- | --- | --- |
| `archive/deepreader-requirements-assessment-2026-04-30.md` | Overall assessment, backend choice, sync architecture, Obsidian Android approach, phase order | `C:\Users\lenovo\.gemini\antigravity\brain\9ebc0f0d-0cd8-4541-bf4c-b0de4a536107\artifacts\deepreader-requirements-assessment.md.resolved` |
| `archive/prd-m1-auth-sync-2026-04-30.md` | M1 account login and cloud sync PRD | Same Antigravity artifact folder |
| `archive/prd-m2a-ui-reskin-2026-04-30.md` | M2a desktop visual token reskin PRD | Same Antigravity artifact folder |
| `archive/prd-m2b-mobile-layout-2026-04-30.md` | M2b mobile layout PRD | Same Antigravity artifact folder |
| `archive/prd-m3-android-2026-04-30.md` | M3 Android port PRD | Same Antigravity artifact folder |
| `archive/deepreader-audit-report-2026-04-23.md` | Earlier audit and release/settings fixes | `C:\Users\lenovo\.gemini\antigravity\brain\7644c2fd-8261-4d10-b174-14823b4a213b\artifacts\deepreader_audit_report.md.resolved` |
| `archive/readwise-vs-deepreader-vs-deeptutor-2026-04-10.md` | Product positioning and Read Agent comparison | `C:\Users\lenovo\.gemini\antigravity\brain\ca3d47e0-3206-4338-92cc-6d44334a95e9\readwise_vs_deepreader_vs_deeptutor.md.resolved` |

## Current Workflow

For future phases, use the local "Grill me to PRD to issue" flow:

1. Grill: resolve unclear product and architecture decisions against `CONTEXT.md` and the actual code.
2. PRD: write a current PRD after the grill. Do not silently carry over stale archive assumptions.
3. Issues: split the approved PRD into vertical-slice task cards. Each card should be independently verifiable.
4. Implementation: work from the task cards, then update the recovery/progress docs when status changes.

## Current Canonical Docs

- Project recovery and status: `docs/project-recovery-2026-05-23.md`
- Current backlog/task cards: `docs/issues/deepreader-backlog-2026-05-23.md`
- M1 usage and review notes: `docs/m1-auth-sync.md`, `docs/m1-auth-sync-review-notes.md`, `M1_AUTH_SYNC_MANUAL_REVIEW.md`
