# MIGRATION_PLAN.md — Phased Execution Plan

Execute phases **in order**. Within a phase, execute tasks in order. After each phase, run its exit criteria and update `PROGRESS.md` before moving to the next phase. Do not skip ahead. If a phase's exit criteria cannot be met, stop, document why in `PROGRESS.md` under that phase, and surface it rather than proceeding.

Every task follows `rules.md` — evidence required, root-cause before fixing, no fragile fixes, regression tests included.

---

## Phase 0 — Inventory & PRD verification (no code changes)

**Tasks:**
1. Scan the full repository. Resolve every `[CONFIRM]` marker in `PRD.md` by reading the actual source — update `PRD.md` in place with confirmed info.
2. Specifically determine: does `traycer-mini-frontend/` contain its own backend logic (routes, auth middleware, server entry point) separate from root `server/`? Report explicitly, in `PROGRESS.md`, yes or no, with file paths as evidence.
3. Diff the root Prisma schema (if one exists — confirm first) against `traycer-mini-frontend/prisma/schema.prisma`. List every model/field difference.
4. List every custom React hook in the frontend, if any.
5. Confirm current status of BUG-004, BUG-005, BUG-007, BUG-008, BUG-009, BUG-010, BUG-011 in `BUGS.md` by re-reading the current source (not by trusting prior report text) — update their status fields.

**Exit criteria:** `PRD.md` has zero remaining `[CONFIRM]` markers. `BUGS.md` statuses reflect the actual current code state, confirmed by direct reading, not by assumption.

---

## Phase 1 — Architecture decisions

**Tasks:**
1. Present the terminal architecture decision (HLD.md §5, Path A vs B) to the human for confirmation — do not decide unilaterally.
2. Confirm deployment target with the human.
3. Confirm CLI retention decision with the human.
4. Confirm styling system decision (Tailwind adoption vs. preserve inline styles) with the human.
5. Update `HLD.md` to remove the `[CONFIRM]` markers in §8 once answered.

**Exit criteria:** All five items in HLD.md §8 have explicit, human-confirmed answers recorded in `HLD.md`.

---

## Phase 2 — Foundation: scaffold + data layer + auth

**Pre-scaffolding decisions (confirmed by human, 2026-08-13 — do not re-litigate):**

- **Scaffold location:** `traycer-web/` subdirectory at the project root. Old `server/` and `traycer-mini-frontend/` remain untouched during the migration window. Phase 6 promotes `traycer-web/*` to root.
- **Port:** Next.js dev server runs on **port 3000** (default). Old backend stays on **3001**. Old Vite frontend stays on **5173**. All three can run simultaneously with no conflict.
- **`repositories/` directory:** The new Next.js backend points at the **same physical `repositories/` directory** at the project root — not a copy. Path resolution in the new backend uses `path.resolve(process.cwd(), '..', 'repositories', repositoryId)` when running from `traycer-web/`, or controlled via a `REPOS_ROOT` env var. This way, repos cloned against the old backend remain valid against the new one during the transition window without any re-import.
- **Root `package.json` scripts:** `dev:next` and `dev:all` scripts already added. Use `npm run dev:next` to run only the new app, `npm run dev:all` to run old backend + old frontend + new Next.js app simultaneously.

**Tasks (in order):**

1. Scaffold new Next.js project (App Router, TypeScript) into `traycer-web/` at the project root. Set `PORT=3000` in `traycer-web/.env.local`.
2. Create the single, reconciled `prisma/schema.prisma` based on Phase 0's diff. Document every merge decision.
3. Run a real migration against the actual Neon database. Confirm `prisma migrate status` is clean.
4. Port `lib/jwt.ts`. **Explicitly implement/confirm the SHA-256 (not bcrypt) deterministic hash for refresh token lookup — BUG-011.** Do not port old code blindly if it still has the bcrypt bug.
5. Port `app/api/auth/*` routes and `middleware.ts`.
6. Test registration and login end-to-end, in this new isolated structure, before building anything on top of it — this is the feature that's been broken longest; prove it here first.

**Exit criteria:** Real user registration produces a real DB row (confirmed via direct DB query). Real login issues real tokens. A protected test route (can be a placeholder) correctly rejects requests with no token and correctly accepts requests with a valid one. Refresh flow completes successfully end-to-end (login → wait/simulate expiry → refresh → new access token issued) — this specifically closes out BUG-011.

---

## Phase 3 — Terminal (resolve BUG-004/005 fresh, do not assume prior work carries over)

**Tasks:**
1. Implement per the Path A/B decision from Phase 1.
2. Port `terminalPty.ts` logic (if Path A) with import-path updates.
3. Wire the frontend `Terminal` component (xterm.js) to the new WebSocket endpoint.
4. Verify every capability from the original terminal spec: persistent session, correct cwd, ANSI colors, Ctrl+C, resize, exit codes, reconnect behavior — with real transcripts, not standalone `node-pty` unit tests run outside the actual app.

**Exit criteria:** A real transcript exists: open terminal in the actual running app, run `pwd`, confirm correct cwd; run a colored command, confirm ANSI renders; run a long process, send Ctrl+C, confirm it stops. This phase does not close until this evidence exists — BUG-004 has failed this bar twice already in this project's history.

---

## Phase 4 — Core pipeline API routes

**Tasks (in this order):**
1. `app/api/plans/*` (port `plans.ts` logic into route handlers).
2. `app/api/generate`, `app/api/proposals/*`, `app/api/approve*`, `app/api/reject/*`, `app/api/rollback/*`, `app/api/clean` (port `proposals.ts` logic). **Explicitly resolve BUG-007 here** — implement a real `delete` action type end-to-end (Planner tags it → Generator produces it → Approver executes real `fs.unlinkSync` → accurate per-file success/failure reporting).
3. `app/api/repositories/*` and the file/git sub-routes (port `repositories.ts` + `repositoryRoutes.ts` logic).
4. `app/api/verify`.
5. `app/api/status`, `app/api/stream/[operationId]` (SSE via `ReadableStream`).

Test each group against the real dev server before moving to the next.

**Exit criteria:** For each route group, at least one real end-to-end request/response pair is documented. BUG-007's fix is verified with real before/after filesystem state (a file genuinely absent after a delete-plan execution, confirmed independent of the API's own success message).

---

## Phase 5 — Frontend components

**Tasks:**
1. Port `components/*` into the new project, wiring to the new API routes.
2. Wrap the AI Assistant panel and other major panels (source control, terminal, file explorer) in React error boundaries per `rules.md` §6 — **explicitly resolves the general risk behind BUG-008**, regardless of whether that specific bug reproduces again.
3. Port `AppContext`/state management.
4. Rebuild the Plan/Execute/Review button structure per the most recent product requirement (see PRD.md §4 `AIAssistant` note) if that work wasn't already completed pre-migration.

**Exit criteria:** Full click-through of the core loop in the actual browser: import repo → open file → chat with AI → Plan → Execute → real file changes → Review → Terminal → commit → (push, per BUG-006's caveat). Real evidence for each step, per `rules.md`.

---

## Phase 6 — Cleanup

**Tasks:**
1. **Only after Phase 5's exit criteria are fully met:** promote `traycer-web/*` to the project root:
   - Move all files and directories from `traycer-web/` up one level to the project root.
   - Replace the root `package.json` with the `traycer-web/package.json` (merging any CLI-related scripts/dependencies that need to survive — check against Phase 1's CLI decision).
   - Delete or archive the now-empty `traycer-web/` directory.
   - Remove `dev:next` and `dev:all` scripts (they referenced `cd traycer-web` which no longer applies). The new root `dev` script becomes whatever Next.js's dev command is.
2. Delete or archive `server/`, root `src/` (app portions), and `traycer-mini-frontend/`. The CLI code (`src/cli.ts`, `src/planner.ts`, etc.) must be explicitly decided: either keep in place, move into `traycer-web/src/`, or publish separately as a CLI package per Phase 1's decision.
3. **Adjust path resolution:** After promotion, the `repositories/` directory is now a sibling of `app/`, `lib/`, etc. at root — update any path resolution that used `path.resolve(process.cwd(), '..', 'repositories', ...)` to `path.resolve(process.cwd(), 'repositories', ...)`.
4. Full regression pass: re-run `npm test`, `npx playwright test` against the promoted structure. Paste raw output in `PROGRESS.md`.

**Exit criteria:** Old directories removed. Full test suite passes with raw output attached, not summarized. `PROGRESS.md` marked complete for all phases.

---

## Notes for the executing agent

- Update `PROGRESS.md` after every task, not just every phase — this is the human's visibility into what's actually happening.
- If a `[CONFIRM]` item surfaces mid-phase that wasn't caught in Phase 0, stop and resolve it before continuing rather than guessing and moving on.
- Refer to `BUGS.md` before starting any task that touches a file/feature with a known open bug — don't rediscover a bug that's already documented, and don't assume it's fixed without checking its current status field.