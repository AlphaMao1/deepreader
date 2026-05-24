# DeepReader Backlog - 2026-05-23

These are local issue-style task cards reconstructed from the recovered PRDs and current code state. M1 continuation work is now tracked in GitHub issues #1-#9 under `AlphaMao1/deepreader`; this file is a local backlog mirror and follow-up queue, not the primary tracker.

## DR-000: Preserve Recovered PRDs in the Repo

Type: AFK
Blocked by: None
Status: Done in this recovery pass

### What to build

Copy the recovered Antigravity PRDs and related context docs into a repository archive and add an index explaining their status.

### Acceptance Criteria

- [x] Recovered PRDs exist under `docs/prd/archive/`.
- [x] `docs/prd/README.md` explains archive vs current source of truth.
- [x] `CONTEXT.md` captures resolved project vocabulary.

## M1-001: Make Auth Sync Merge-Ready

Type: AFK, except for verification command approval
Blocked by: None

### What to build

Turn the interrupted M1 worktree into a merge-ready change by reviewing the full diff, removing stale artifacts, reconciling docs with code, and preparing a clean verification checklist.

### Acceptance Criteria

- [x] Every uncommitted M1 file is classified as intentional, stale, or requiring follow-up.
- [x] M1 docs no longer contradict the current code.
- [x] Sync tables and local commands are listed with current coverage.
- [x] Verification commands are proposed before running, respecting the local `CLAUDE.md` rule.
- [x] Remaining non-blocking limitations are explicit.

Evidence: `docs/m1-worktree-inventory-2026-05-23.md`, `docs/testing/m1-acceptance-audit-2026-05-23.md`, and `docs/handoff/m1-sync-continuation-handoff-2026-05-23.md`.

## M1-002: Verify Real Supabase Account Sync

Type: HITL
Blocked by: M1-001

### What to build

Run a real Supabase smoke test for signup/login, upload, tombstone delete, and same-account restore.

### Acceptance Criteria

- [ ] Supabase migration runs in a real project.
- [ ] Email signup or login succeeds.
- [ ] Local data syncs to cloud tables with the correct `user_id`.
- [ ] Soft-deleted rows keep `deleted_at` tombstones.
- [ ] A second device or fresh profile can restore synced data.

## M1-003: Track Deferred AI Conversation History Sync

Type: HITL
Blocked by: None

### What to build

Keep chat threads/messages out of M1 continuation unless the scope is reopened. If conversation sync becomes required again, run a dedicated grill session before implementation.

### Acceptance Criteria

- [x] M1 continuation documents AI conversation history sync as deferred.
- [ ] Privacy, volume, conflict resolution, and deletion behavior are addressed.
- [ ] `CONTEXT.md` is updated if terminology changes.
- [ ] A new M1b PRD is created if conversation sync becomes in-scope.

## M1-004: Decide Secret Recovery and Keychain Policy

Type: HITL
Blocked by: M1-001

### What to build

Decide whether the app should keep the current device-key encryption, add OS keychain support, or implement full recovery of device secrets.

### Acceptance Criteria

- [ ] The security model is documented in a current PRD or ADR.
- [ ] Recovery Key and Device Key responsibilities are no longer ambiguous.
- [ ] Desktop and Android implications are both covered.

## M1-005: Decide EPUB Binary Capacity Policy

Type: HITL
Blocked by: M1-001

### What to build

EPUB file upload/download is part of the current M1 continuation product. The remaining decision is the capacity and operations policy around that feature.

### Acceptance Criteria

- [ ] User-level quota, per-file limit, deletion cleanup, and restore behavior are decided.
- [x] The UI copy matches the current M1 capability.
- [x] GitHub issue #4 tracks the M1 EPUB binary sync vertical slice.

## M2A-001: Rescue the Interrupted Desktop Reskin

Type: AFK plus HITL visual approval
Blocked by: M1-001 merge strategy

### What to build

Inspect the uncommitted UI changes in the main worktree, decide what belongs to M2a, and bring the intentional pieces into a clean branch or worktree.

### Acceptance Criteria

- [ ] All main-worktree UI changes are classified as M2a, unrelated, or generated asset noise.
- [ ] The reskin preserves current feature entry points.
- [ ] The implementation has screenshots for library, reader, and settings.
- [ ] The user approves the visual direction before merge.

## M2A-002: Current PRD for UI Reskin

Type: AFK with HITL approval
Blocked by: M2A-001

### What to build

Rewrite the historical M2a PRD into a current PRD using the grill-to-PRD workflow and actual code state.

### Acceptance Criteria

- [ ] The PRD defines visual tokens, protected entry points, and QA views.
- [ ] It distinguishes visual token work from layout changes.
- [ ] It produces vertical-slice task cards for implementation and QA.

## M2B-001: Mobile Layout Shell

Type: AFK after PRD approval
Blocked by: M2A-002

### What to build

Create the mobile layout shell that switches between desktop and mobile layouts without changing business logic.

### Acceptance Criteria

- [ ] A platform/viewport switch routes to mobile layout on small screens.
- [ ] Mobile navigation exposes library, chat, memory, skills, stats, and settings.
- [ ] Desktop layout remains unchanged.
- [ ] Behavior is verifiable in responsive browser viewports.

## M2B-002: Mobile Reader and Settings Chrome

Type: AFK after PRD approval
Blocked by: M2B-001

### What to build

Provide mobile-specific reader chrome and settings presentation while reusing existing reading and settings business components where practical.

### Acceptance Criteria

- [ ] Reader controls fit 360-414px wide screens.
- [ ] Settings are navigable without desktop modal assumptions.
- [ ] Text and controls do not overlap at mobile widths.
- [ ] Touch-specific gestures remain deferred to M3 unless explicitly approved.

## M3-001: Android Feasibility Spike

Type: AFK with device/tooling constraints
Blocked by: M1 stable, M2b mobile layout

### What to build

Run the PRD-required Android spike before full Android development: initialize Tauri Android, build or run on emulator/device, open an EPUB, and verify page turning.

### Acceptance Criteria

- [ ] `tauri android init` and Android dev/build path are validated.
- [ ] Android build handles unsupported desktop plugins with cfg guards.
- [ ] EPUB plugin dependencies compile or a fallback is documented.
- [ ] Foliate renders an EPUB in Android WebView.
- [ ] The spike produces a clear go/no-go result.

## M3-002: Android Storage and Obsidian Export

Type: AFK after spike
Blocked by: M3-001

### What to build

Implement Android-safe file import/export using SAF or fallback sharing behavior.

### Acceptance Criteria

- [ ] EPUB import works through Android file picker.
- [ ] Obsidian export does not assume direct writable filesystem paths.
- [ ] Revoked permissions and fallback share flows are handled.
- [ ] Desktop export behavior is unchanged.
