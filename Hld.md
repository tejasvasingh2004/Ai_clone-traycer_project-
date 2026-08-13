# HLD.md — High-Level Design: Traycer-mini on Next.js

## 1. Why this migration

The project currently has architectural sprawl: a root project (`server/` Express API + root `src/` business logic + CLI) and a separate, Bolt.new-scaffolded `traycer-mini-frontend/` project with its own Prisma schema and its own `src/api/`. This has already caused at least one confirmed class of bug (auth requests behaving inconsistently, traced back to structural ambiguity about which backend/schema is authoritative). Consolidating into a single Next.js project removes this ambiguity structurally: one server process, one schema, one auth layer, one deployable unit.

## 2. Target architecture

```
Browser
  │
  ▼
Next.js App Router (single project)
  ├── app/(dashboard)/*          — Dashboard, Repositories, Repository Editor, History, Settings pages (React Server/Client Components)
  ├── app/login                  — Auth UI
  ├── app/api/*                  — Route Handlers (backend logic, Node runtime)
  ├── middleware.ts              — Route-level auth guard (replaces Express verifyAccessToken as global gate)
  ├── components/*               — All UI components (ported from traycer-mini-frontend/src/components)
  ├── lib/*                      — Business logic: planner, generator, approver, reviewer, verifier, context, db (Prisma), jwt, config, types
  ├── prisma/schema.prisma       — Single schema, single source of truth
  └── server.ts                  — Custom Node server wrapping Next.js + WebSocket (node-pty terminal), IF Path A chosen
                                     [CONFIRM: Path A vs Path B — see MIGRATION_PLAN.md Phase 1]
  │
  ▼
PostgreSQL (Neon) — single database, single Prisma client instance
  │
  ▼
Filesystem — `repositories/<id>/` persistent git clones (unchanged from current design)
```

## 3. Core data flow (unchanged conceptually from current app, just relocated)

```
User request (chat/UI action)
  → Next.js Route Handler (app/api/...)
  → auth guard (middleware.ts or per-route check) validates access token
  → business logic (lib/planner.ts, lib/generator.ts, etc.)
  → filesystem (repositories/<id>/) and/or Prisma (Postgres)
  → JSON response
  → React component state
  → UI
```

## 4. Auth architecture

- **Access token**: short-lived (15 min) JWT, returned in response body, held in memory/React state on the client (not localStorage).
- **Refresh token**: long-lived (7 day) JWT, stored server-side as a **SHA-256 hash** (deterministic, lookup-safe — NOT bcrypt, per the bug already diagnosed and fixed in this project) in a `RefreshToken` table, delivered to the client as an httpOnly, `sameSite: strict` cookie.
- **Rotation**: enabled — each refresh issues a new refresh token and revokes the old one (already implemented in the current `server/routes/auth.ts`; carry forward unchanged).
- **Route protection**: `middleware.ts` at the Next.js root checks for a valid access token on protected route groups (`app/api/plans/*`, `/proposals/*`, `/repositories/*`, `/verify/*`, `/generate/*`, `/approve*`, etc.) and rejects with 401 if missing/invalid — mirroring `verifyAccessToken`'s current behavior exactly. `app/api/auth/*` remains explicitly excluded from this guard.

## 5. Terminal architecture — CONFIRMED: Path A

**Path A (confirmed):** Custom Node server (`server.ts`) wraps Next.js's request handler AND attaches a WebSocket server running `node-pty`, exactly mirroring the current `setupTerminalWebSocket`/`terminalPty.ts` design. Single deployable process. This requires a host that supports long-running Node processes — satisfied by the confirmed container-style deployment target (§8).

## 6. SSE (progress streaming)

Next.js Route Handlers support streaming via `ReadableStream` — `app/api/stream/[operationId]/route.ts` reimplements the current `sse.ts` registration/broadcast pattern using a `ReadableStream` controller instead of raw Express `res.write()`.

## 7. What is explicitly NOT changing in this migration

- Business logic in `planner.ts` / `generator.ts` / `approver.ts` / `reviewer.ts` / `verifier.ts` / `context.ts` — ported with import-path changes only, unless a specific bug fix is separately documented.
- The Plan → Execute → Review conceptual workflow.
- The git-based source control model (stage/unstage/discard/commit/diff/rollback via real `git` shell commands).
- The persistent, filesystem-based repository workspace model (`repositories/<id>/`, survives restarts, deleted only explicitly).

## 8. Architecture decisions — CONFIRMED

1. **Terminal architecture: Path A** (custom Node server + in-process `node-pty`/WebSocket). See §5.
2. **Deployment target: container-style host** (e.g. Docker on Railway/Render/Fly.io/self-hosted VM — not plain serverless Vercel). This is what makes Path A viable: the container runs one long-lived Node process.
3. **CLI (`src/cli.ts`): kept, not disturbed.** The AI pipeline/CLI layer is treated as a stable, working subsystem — it should be **migrated/relocated** to fit the new Next.js project's file structure (e.g. moved into `lib/` alongside the other business logic it already shares, per HLD §2/§7), and its internal file structure may be adjusted as needed to fit Next.js conventions, but its actual logic and behavior must not be rewritten or functionally changed as part of this migration. Treat this the same as the other `lib/*` business logic ports (planner, generator, etc. — see HLD §7): relocate, don't rewrite.
4. **Styling: Tailwind.** Adopt Tailwind CSS during the frontend component port (Phase 5), replacing the current inline JS style objects (e.g. in `LoginForm.tsx`).
5. **`traycer-mini-frontend` backend audit** — still open, this is Phase 0's job specifically (see MIGRATION_PLAN.md Phase 0, task 2) and cannot be pre-answered without reading the actual repo.