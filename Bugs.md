# BUGS.md — Known Bugs Log

Status legend: **OPEN** (unresolved) · **FIXED-UNVERIFIED** (a fix was proposed/applied but not independently confirmed with real evidence) · **FIXED-CONFIRMED** (independently verified with real evidence) · **MUST-CARRY-FORWARD** (fixed in the old codebase — this fix must not be lost or reintroduced as a regression during the Next.js migration).

---

### BUG-001 — Plan creation crash: `Cannot read properties of undefined (reading 'map')`
- **Root cause:** `POST /api/plan` returned `{ ack: true, operationId }` (no `steps` array) when `operationId` was provided; frontend called `plan.steps.map()` unconditionally.
- **Fix:** Backend always returns the full parsed plan object; frontend added `Array.isArray()` guards.
- **Status:** FIXED-CONFIRMED (real before/after payloads shown). **MUST-CARRY-FORWARD.**

### BUG-002 — File explorer missing create-file/create-folder/refresh/collapse controls
- **Fix:** Added `POST /create-file`, `POST /create-folder` with path-boundary checks (`getSafePath()`); added corresponding UI buttons.
- **Status:** FIXED-CONFIRMED (real Playwright click-through + disk-level checks shown). **MUST-CARRY-FORWARD** (including the path-traversal rejection behavior — re-test explicitly post-migration).

### BUG-003 — Activity bar / source control panel missing or non-functional
- **Fix:** Added `GET /git-status` (real `git status --porcelain`), `ActivityBar.tsx`, live-updating badge, changed-files list, later extended with stage/unstage/discard/commit/diff/AI-generated-commit-message endpoints.
- **Status:** FIXED-CONFIRMED for badge + list. **Status of full stage/unstage/discard/commit/diff UI wiring: needs re-verification** — was implemented at the API level with real endpoints, but full click-through UI verification of every control was not completed as of the last report in this thread.

### BUG-004 — Terminal not functioning / not verified end-to-end through the real UI
- Multiple rounds of this bug produced evidence from standalone `node-pty` unit tests (testing the library's capability on the machine) rather than the actual app's WebSocket-based terminal panel.
- **Status:** OPEN — never received an accepted, real click-through transcript (open terminal in browser → run real command → see real output) as of the last report in this thread. **Re-verify from scratch after migration**, do not assume this was ever actually fixed.

### BUG-005 — "Run in Terminal" (AI-suggested command execution) not verified
- `extractCommands()` utility was unit-tested; the actual click → execute → real output flow was never shown with a real transcript.
- **Status:** OPEN, same caveat as BUG-004.

### BUG-006 — GitHub push never verified against real GitHub
- All commit/push verification in this project was done against a local bare repository (`test_fixtures/remote_repo.git`), explicitly disclosed as a substitute for the real GitHub remote.
- **Status:** OPEN — requires a disposable test GitHub repo + credential to close out. Not a code bug per se, but an unverified capability.

### BUG-007 — "Remove Files" plans report false success; files never actually deleted
- **Root cause hypothesis (as of last report, needs confirmation):** the proposal-apply logic in the Generator/Approver likely only ever implemented a write/create path (`fs.writeFileSync`), with no real delete path (`fs.unlinkSync`), and/or the Planner never tags a proposal with a distinguishable `delete` action type.
- **Status:** FIXED-CONFIRMED. The delete logic in `approver.ts` was present but unverified. A comprehensive E2E test script (`test_bug007.js`) was created and executed during the Phase 4 migration, explicitly confirming that generating a delete proposal and approving it physically removes the target file from the disk.

### BUG-008 — Execute crashes the whole app to a blank screen despite backend success
- Backend logs showed successful proposal application (`Applied changes to start.md`), but the frontend threw an unhandled exception rendering the result, and with no error boundary in place, this took down the entire app rather than just the affected panel.
- **Root cause:** same class of bug as BUG-001 — frontend assuming a response shape from the execute/approve endpoint that didn't match reality — plus the broader problem that no error boundary exists anywhere in the app.
- **Fix scoped:** contract fix (well-formed backend response + frontend guards) + add a React error boundary around major panels so a single panel's render error can't blank the whole app.
- **Status:** OPEN as of the last report in this thread — fix was prompted but not confirmed with real evidence. **MUST-CARRY-FORWARD the error-boundary pattern into the new Next.js component structure regardless of this specific bug's resolution — it's a general resilience requirement, not just a one-off fix.**

### BUG-009 — Diff view renders raw unformatted diff text instead of a real diff UI
- The diff icon opens what appears to be the plain file-content viewer fed raw `git diff` output as if it were file content — no color-coding, no proper diff rendering, lines appear truncated.
- **Status:** OPEN as of the last report in this thread.

### BUG-010 — "Commit Staged / Changes" button does nothing when nothing is staged
- Likely a staging gap: the `+` (stage) icon's actual behavior was unconfirmed, and the Commit button silently no-ops with `Staged Changes: 0` rather than giving feedback or auto-staging.
- **Status:** OPEN as of the last report in this thread.

### BUG-011 — Refresh token hashing uses bcrypt (non-deterministic) for exact-match DB lookup
- **Root cause:** `hashToken()` in `server/utils/jwt.ts` used bcrypt to hash the refresh token before storing/looking it up via `prisma.refreshToken.findUnique({ where: { tokenHash } })`. Bcrypt produces a different hash on every call even for identical input, so this lookup can never match, meaning `/refresh` would always fail and `/logout`'s `updateMany` would always match zero rows (tokens never actually revoked).
- **Correct fix:** use a deterministic hash (`crypto.createHash('sha256')`) for this specific lookup-by-hash use case. Bcrypt remains correct for password hashing (verified via `bcrypt.compare`), just not for this token-lookup use case.
- **Status:** identified with high confidence via direct code review of `server/routes/auth.ts`'s own in-code comment acknowledging the bug; **fix in `jwt.ts` itself not yet independently confirmed** (the file `utils/jwt.ts` was never actually shown/reviewed in this conversation). **Verify `jwt.ts` directly before assuming this is fixed. MUST-CARRY-FORWARD the deterministic-hash approach into the new structure regardless.**

### BUG-012 — `verifyAccessToken` intercepting `/api/auth/register` ("Missing or invalid authorization header")
- Extensively debugged in this project. All reviewed router files (`plans.ts`, `proposals.ts`, `repositories.ts`, `repositoryRoutes.ts`, `verify.ts`) and `server/api.ts` itself apply `verifyAccessToken` correctly, per-route — none blanket-intercept `/api/auth/*`. The middleware (`server/middleware/auth.ts`) itself is also clean.
- **Leading unresolved hypothesis:** the bug originates in a second, separate backend implementation possibly living inside the Bolt.new-scaffolded `traycer-mini-frontend/` project (evidenced by its own `prisma/schema.prisma` and `src/api/` directory), which may have its own, differently-configured auth middleware, and which the frontend's dev proxy may be hitting instead of (or in addition to) the root `server/`.
- **Status:** OPEN, unresolved as of this writing. **This entire class of bug is the primary motivation for the Next.js consolidation migration** — Phase 0 of `MIGRATION_PLAN.md` must explicitly determine whether `traycer-mini-frontend` has its own competing backend/auth logic, since that answers this bug directly.

---

### BUG-014 — `Plan` model missing `filesToDelete` field in reconciled schema

- **Root cause:** During Phase 2 schema reconciliation, the `Plan` model was found to have no field to track files a plan intends to delete. The `Proposal` model already has an `operation` field that supports a `'delete'` action type (per BUG-007's scoped fix), meaning the Generator can produce delete-type proposals. However, the `Plan` itself had no parallel `filesToDelete` array to record at the planning stage which files are targeted for deletion — only `filesToModify` existed. This asymmetry would have caused plan-level summaries and the UI to silently omit delete intentions, and made it structurally impossible to carry forward BUG-007's end-to-end delete verification (Phase 4) correctly. Consistent with the old schema predating BUG-007's fix scope.
- **Fix:** Added `filesToDelete String?` (nullable JSON array, stringified) to the `Plan` model in `traycer-web/prisma/schema.prisma`. Mirrors the existing `filesToModify String` pattern. Confirmed present in schema (line 36, comment: "added for BUG-014 fix").
- **Status:** FIXED-CONFIRMED — field confirmed in `schema.prisma` and migration `20260813225039_add_bug014_015_fields` successfully applied to Neon DB (`prisma migrate status` clean 2026-08-13). **MUST-CARRY-FORWARD.**

---

### BUG-015 — `ChatSession` missing `planId` and `repositoryId` fields

- **Root cause:** The `ChatSession` model was retained in the reconciled schema (per human confirmation that chat history is a product requirement). However, neither `planId` nor `repositoryId` were present on the model, making it structurally impossible to link a chat session to the plan it was opened for or to scope it to a specific repository. Without `planId`, the chat-history feature cannot retrieve "the conversation for this plan." Without `repositoryId`, session scoping to a workspace/repo is also lost. Both are directly required by the chat-history feature in the PRD.
- **Fix:** Added `planId String?` and `repositoryId String?` as nullable fields to `ChatSession` in `traycer-web/prisma/schema.prisma`. Confirmed present at lines 103–104 (comments: "added for BUG-015 fix").
- **Status:** FIXED-CONFIRMED — fields confirmed in `schema.prisma` and migration `20260813225039_add_bug014_015_fields` successfully applied to Neon DB (`prisma migrate status` clean 2026-08-13). **MUST-CARRY-FORWARD.**

---

## Migration-specific risk notes (not bugs yet, but flagged risks)

- **Dual Prisma schema reconciliation** (root vs. `traycer-mini-frontend`) is unaudited — diffing them is a required Phase 0 task, not optional.
- **PTY/WebSocket terminal** does not work in standard serverless deployment — architectural decision required before Phase 3 (see HLD.md §5).
- Given BUG-004/005's unresolved status, **do not assume the terminal works at all** going into this migration — treat it as needing to be built and verified fresh in the new structure, not "ported."