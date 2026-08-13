# Kickoff Task for Agent Manager

Six planning documents have been added to the root of this repository: `rules.md`, `HLD.md`, `PRD.md`, `BUGS.md`, `MIGRATION_PLAN.md`, `PROGRESS.md`. Read all six in full before doing anything else — in this order: `rules.md` first (these are standing rules that apply to every task in this project, no exceptions), then `HLD.md`, `PRD.md`, `BUGS.md`, then `MIGRATION_PLAN.md` (this is your execution plan), then `PROGRESS.md` (this is where you log everything as you go).

## What this project is

This is a migration of an existing AI-powered coding-agent web app (Traycer-mini) from its current messy structure — a root Express/TypeScript backend, a separate root CLI, and a Bolt.new-scaffolded frontend project with its own Prisma schema — into a single, consolidated Next.js (App Router) application. The migration plan and every architectural decision have already been made and are recorded in `HLD.md` §8 and `MIGRATION_PLAN.md` — you do not need to ask about those again. The four architecture decisions are confirmed:

1. Terminal: custom Node server + in-process `node-pty` (Path A).
2. Deployment target: container-style host.
3. The CLI/AI agent pipeline logic (planner/generator/approver/reviewer/verifier/CLI): migrate and relocate its files to fit the new Next.js structure, but do not rewrite or functionally change its actual logic — treat it as a stable subsystem being moved, not redesigned.
4. Styling: adopt Tailwind CSS during the frontend port.

## What to do

Follow `MIGRATION_PLAN.md` exactly, phase by phase, in order:

- **Phase 0**: pure inventory — read the real repository and resolve every `[CONFIRM]` marker in `PRD.md` by updating it in place with what you actually find. Specifically determine whether `traycer-mini-frontend/` has its own competing backend/auth logic — this is directly tied to `BUGS.md` BUG-012 and is the single most important thing to establish before writing any new code. Make no code changes in this phase.
- **Phase 1**: architecture decisions are already confirmed (see above and `HLD.md` §8) — just confirm the one remaining open item (`traycer-mini-frontend` backend audit result from Phase 0) is reflected in `PROGRESS.md`, then proceed.
- **Phases 2–6**: execute as written in `MIGRATION_PLAN.md`, in order, each with its own exit criteria. Do not proceed to the next phase until the current phase's exit criteria are met with real evidence, per `rules.md`.

## Standing requirements (from rules.md — repeated here for emphasis)

- Every claim of "done" or "fixed" needs real evidence attached — actual command output, actual DB query result, actual screenshot or recording, not a description of expected behavior. This project has a documented history (see `BUGS.md`) of prior agent work reporting false success on destructive operations and unverified features — do not repeat that pattern.
- Root-cause before fixing. Reproduce first, then fix.
- Update `PROGRESS.md` after every individual task, not just at the end of a phase, so progress is visible incrementally.
- If you hit a decision point not already answered in `HLD.md`, stop and ask rather than assuming.
- Known bugs are logged in `BUGS.md` with status fields — check it before working on any related file, and update bug statuses as you resolve (or fail to resolve) them, rather than leaving stale status.

## First action

Start Phase 0 now. Report back with the completed `PRD.md` (all `[CONFIRM]` markers resolved) and your finding on the `traycer-mini-frontend` backend audit before proceeding to Phase 2.