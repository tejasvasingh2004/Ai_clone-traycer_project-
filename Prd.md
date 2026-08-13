# PRD.md — Product Requirements: Traycer-mini (Next.js Consolidation)

## How to use this document

This PRD is pre-filled with everything confirmed through prior debugging/review work on this project. Anything not personally verified against the actual current source tree is marked `[CONFIRM]`. **Phase 0 of this project is to scan the real repository and resolve every `[CONFIRM]` marker in this file** — either confirming the listed info is accurate, or correcting it — before any migration work in later phases begins. Do not proceed past Phase 0 with unresolved `[CONFIRM]` markers. Update this file in place as markers are resolved; it is a living document, not a one-time spec.

Cross-reference: `rules.md` (standing rules), `HLD.md` (target architecture), `BUGS.md` (known bugs to carry forward or re-verify), `MIGRATION_PLAN.md` (phased execution), `PROGRESS.md` (live tracker).

---

## 1. Product summary

Traycer-mini is an AI-powered software development workspace: import a GitHub repository, browse/edit files, converse with an AI panel to plan and implement code changes, review diffs, verify (TypeScript/ESLint/tests/build), use a real integrated terminal, and commit/push changes back to GitHub — all with JWT-based user authentication.

## 2. Backend — API surface

### 2.1 Confirmed endpoints (verified via direct source review in prior work)

| Method | Path | Purpose | Auth required | File (current location) |
|---|---|---|---|---|
| POST | `/api/auth/register` | Create user | No | `server/routes/auth.ts` |
| POST | `/api/auth/login` | Issue access + refresh token | No | `server/routes/auth.ts` |
| POST | `/api/auth/refresh` | Rotate refresh token, issue new access token | Refresh cookie | `server/routes/auth.ts` |
| POST | `/api/auth/logout` | Revoke refresh token | Refresh cookie | `server/routes/auth.ts` |
| POST | `/api/plan` | Create a plan (Planner) | Yes | `server/routes/plans.ts` |
| GET | `/api/plans` | List plans | Yes | `server/routes/plans.ts` |
| GET | `/api/plans/:id` | Get one plan | Yes | `server/routes/plans.ts` |
| DELETE | `/api/plans/:id` | Delete plan + staged proposals | Yes | `server/routes/plans.ts` |
| POST | `/api/generate` | Generate code from a plan (Generator) | Yes | `server/routes/proposals.ts` |
| GET | `/api/proposals` | List staged proposals | Yes | `server/routes/proposals.ts` |
| GET | `/api/proposals/:id` | Get one proposal | Yes | `server/routes/proposals.ts` |
| POST | `/api/approve/:id` | Approve + apply one proposal | Yes | `server/routes/proposals.ts` |
| POST | `/api/approve-all` | Approve + apply all pending | Yes | `server/routes/proposals.ts` |
| POST | `/api/reject/:id` | Reject + regenerate proposal | Yes | `server/routes/proposals.ts` |
| POST | `/api/rollback/:id` | Revert an approved proposal | Yes | `server/routes/proposals.ts` |
| DELETE | `/api/clean` | Clear all staged proposals | Yes | `server/routes/proposals.ts` |
| GET | `/api/repositories` | List repositories | Yes | `server/routes/repositories.ts` |
| POST | `/api/repositories` | Directly register a repo record | Yes | `server/routes/repositories.ts` |
| POST | `/api/import` | Clone + register a repository | Yes | `server/routes/repositories.ts` |
| DELETE | `/api/repositories/:id` | Delete repo (DB + filesystem) | Yes | `server/routes/repositories.ts` |
| GET | `/api/repositories/:id/files` | File tree | Yes | `server/routes/repositoryRoutes.ts` |
| GET | `/api/repositories/:id/files/*` | Read file content | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/files/*` | Write file content (create/overwrite) | Yes | `server/routes/repositoryRoutes.ts` |
| PUT | `/api/repositories/:id/files/*` | Write file content (overwrite) | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/terminal` | Run one-shot shell command | Yes | `server/routes/repositoryRoutes.ts` — `[CONFIRM]` whether this is superseded by the WebSocket PTY terminal or still separately in use |
| POST | `/api/repositories/:id/create-file` | Create empty file | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/create-folder` | Create directory | Yes | `server/routes/repositoryRoutes.ts` |
| GET | `/api/repositories/:id/git-status` | Real `git status --porcelain` | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/search` | Real repo-wide text search | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/git-stage` | `git add <file>` | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/git-unstage` | `git restore --staged <file>` | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/git-discard` | `git checkout --`/`git clean -f` | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/git-commit` | Stage-all + commit | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/repositories/:id/git-generate-commit-msg` | AI/heuristic commit message | Yes | `server/routes/repositoryRoutes.ts` |
| GET | `/api/repositories/:id/git-file-diff` | `git diff HEAD -- <file>` | Yes | `server/routes/repositoryRoutes.ts` |
| POST | `/api/verify` | Run TS/ESLint/test/build checks | Yes | `server/routes/verify.ts` |
| GET | `/api/status` | Dashboard summary counts | Yes | `server/api.ts` |
| GET | `/api/stream/:operationId` | SSE progress stream | No (by design) | `server/api.ts` |
| GET | `/health` | Health check | No | `server/api.ts` |
| WS | terminal WebSocket endpoint | PTY terminal session | `[CONFIRM]` — check `terminalPty.ts` for exact path and whether it enforces auth on the WS handshake | `server/terminalPty.ts` |

### 2.2 `[CONFIRM]` — endpoints possibly present but not verified in prior work
- Anything inside `traycer-mini-frontend/src/api/` — **[CONFIRM]** whether this calls out to the root backend only, or defines its own routes/handlers. This directly bears on BUG-012 in `BUGS.md`.
- Any routes inside a `server/` or `backend/`-equivalent folder inside `traycer-mini-frontend/`, if one exists — **[CONFIRM]** existence first.

## 3. Backend — business logic modules (`src/` at root)

| File | Role | `[CONFIRM]` |
|---|---|---|
| `planner.ts` | Produces structured plans from task descriptions | Exact function signature, whether it currently supports the file-list/dependency-order fields referenced by the JWT plan work |
| `generator.ts` | Produces code proposals from a plan | Whether it currently supports a `delete` operation type (see BUGS.md BUG-007) |
| `approver.ts` | Applies approved proposals to disk | Same — confirm real delete-path implementation exists or is still missing |
| `reviewer.ts` | Handles rejection/regeneration feedback loop | — |
| `verifier.ts` | Runs TS/ESLint/test/build checks | — |
| `context.ts` | Assembles context sent to the LLM | Current chunking strategy — whole-file vs. structural (see the earlier feature-roadmap research doc); this is a planned future improvement, not a bug, but confirm current state |
| `config.ts` | Paths/constants (`PLANS_DIR`, `STAGING_DIR`, etc.) | — |
| `db.ts` | Prisma client instance (root) | Confirm which schema this actually points to |
| `types.ts` | Shared TypeScript types | — |
| `utils/jsonUtils.ts`, `utils/mathUtils.ts` | `[CONFIRM]` purpose/usage — not reviewed in prior work | |

## 4. Frontend — components (`traycer-mini-frontend/src/components/`)

| Component dir | Known purpose | `[CONFIRM]` |
|---|---|---|
| `AIAssistant` | Chat panel; Plan/Execute/Review buttons (per recent restructure request); command extraction for terminal | Full current implementation state — was mid-restructure as of last work in this project |
| `CodeWorkspace` | `[CONFIRM]` — likely the overall editor layout container | |
| `Dashboard` | Status/stats landing page | |
| `Deployments` | `[CONFIRM]` — purpose not established in prior work | |
| `ErrorBoundary` | `[CONFIRM]` — confirm this exists and is actually used; BUG-008 suggests it may not be wired around the AI panel yet | |
| `GitHubImport` | Import repository UI | |
| `History` | Chat/task history list (recently requested feature) | Confirm implementation state |
| `PlanCreator` | Plan creation UI | |
| `Repositories` | Repository list view | |
| `RepositoryEditor` | Main workspace: file tree, editor, terminal, AI panel composition | |
| `Settings` | `[CONFIRM]` — purpose not established | |
| `Sidebar` | `[CONFIRM]` — navigation? | |
| `Templates` | `[CONFIRM]` — purpose not established | |
| `Terminal` | Terminal panel (xterm.js expected per earlier spec) | Confirm xterm.js is actually in use, and current real-vs-mocked status per BUG-004 |
| `Verify` | Verification results UI | |
| `Workspaces` | `[CONFIRM]` — purpose not established, possibly workspace-switching | |
| `LoginForm.tsx` | Login/Register form | Confirmed reviewed — controlled state, correct API calls |

## 5. Frontend — services, state, utils

| File | Role | `[CONFIRM]` |
|---|---|---|
| `services/auth.ts` | Auth API client (login/register/logout/refresh) | Confirmed reviewed |
| `store/AppContext.tsx` | Global state | Contents not reviewed — `[CONFIRM]` what state lives here (current repo, current plan, auth state, etc.) |
| `types/backend.ts`, `types/index.ts` | Shared frontend types | `[CONFIRM]` contents |
| `utils/gitStatus.ts` | `[CONFIRM]` — likely git-status polling/formatting helper | |
| `utils/planReview.ts` | `[CONFIRM]` — likely the Plan-vs-Execution comparison logic for the "Review" feature | |
| `api/` directory | `[CONFIRM]` — general API client wrapper(s), contents unreviewed | |
| Custom hooks | **`[CONFIRM]` — no custom hooks (`useX.ts`) were identified in prior work. Confirm whether any exist (e.g. `useRepository`, `useTerminal`, `useAuth`) and list them.** | |

## 6. Data model (Prisma) — `[CONFIRM] full schema, this is a reconciliation target for Phase 0`

Known models (from prior work, likely incomplete):
- `Workspace` (id, name, description)
- `Plan` (id, workspaceId, taskName, taskDescription, steps [JSON string], filesToModify [JSON string], rationale, dependencyOrder, contextSnapshot, createdAt)
- `Proposal` (id, planId, filePath, newContent, diff, operation, approved, createdAt, generationContext, rejectionHistory, originalContent)
- `Repository` (id, workspaceId, name, url, githubId, description, language, stars, isPrivate, status, createdAt, updatedAt)
- `User` (id, username, password [hashed]) — `[CONFIRM]` exact fields, e.g. is there an email field, createdAt, etc.
- `RefreshToken` (id, tokenHash, userId, expiresAt, revoked) — `[CONFIRM]` exact fields

**`[CONFIRM]`**: full diff between root schema (if one exists — not confirmed to exist as of this writing) and `traycer-mini-frontend/prisma/schema.prisma`.

## 7. Non-functional requirements

- All persistent state (repos, plans, proposals, users, refresh tokens) survives backend restart.
- Repository clones are real `git` clones with working `.git/` history, not synthetic.
- All destructive operations (delete, discard, rollback) must accurately reflect real success/failure per BUG-007/rules.md §5.
- Terminal must be a real PTY session (`node-pty`), not a request/response command runner, once BUG-004 is resolved.
- Auth: 15-minute access tokens, 7-day rotating refresh tokens, SHA-256 (not bcrypt) for refresh token DB lookup per BUG-011.

## 8. Explicit non-goals for this migration

- Not rewriting the Planner/Generator/Reviewer/Approver/Verifier's actual AI logic or prompts (separate workstream, see the earlier feature-roadmap/context-engineering research doc for that track).
- Not implementing multi-agent parallel execution or MCP server exposure (flagged as later-stage in the feature roadmap, out of scope here).
- Not changing the fundamental Plan → Execute → Review product loop, only its implementation platform.