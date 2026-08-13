# rules.md — Standing Rules for This Project

These rules apply to every phase, every task, and every agent/subagent working on this migration. They are not optional and do not get relaxed under time pressure. They exist because this exact project has already produced multiple false "success" reports during earlier debugging rounds — this file encodes what was learned from that.

---

## 1. Evidence, not claims

- Never report a task as "done," "fixed," "working," or "verified" without attaching real evidence: actual command output, actual HTTP request/response, actual DB query result, actual screenshot/browser recording, actual file diff.
- A summarized result ("94 tests passed") is not sufficient on its own — attach or reference the actual raw output.
- If verification cannot be completed for a real, disclosed reason (missing credential, no network egress, etc.), state that explicitly. Do not silently substitute a mock, a stand-in, or a partial check and present it as full verification.
- A "success" message shown in the UI is not evidence that the underlying persistent effect (file write, DB row, git commit) actually happened. Independently confirm the actual state (query the DB directly, check the filesystem directly, run `git log`/`git diff` directly) — do not trust the app's own success message as proof of itself.

## 2. Root-cause before fixing

- Reproduce the actual bug first, with full visibility (browser console, network tab, backend logs, real error text/stack trace) before proposing a fix.
- Do not guess at a fix and apply it speculatively. If multiple hypotheses are plausible, state them, then investigate to confirm which is actually true before changing code.
- Do not fix a symptom by loosening validation, catching and swallowing an error, or increasing a limit/timeout without understanding why the original value was insufficient.

## 3. Fix the contract, not just one side of it

- When a frontend/backend shape mismatch causes a crash (e.g. `.map()` on `undefined`), fix both sides: the backend should return a well-formed, consistent shape for every code path (including edge cases — empty results, zero-count states), AND the frontend should defensively guard against unexpected shapes. Fixing only one side is not acceptable.

## 4. No fragile ordering-dependent fixes

- Do not fix a bug by reordering `app.use()`/middleware registration and leaving correctness dependent on that order being remembered forever. Prefer explicit, scoped application of middleware (per-route or per-router) over implicit ordering.
- After any middleware/auth-related fix, explicitly re-verify that routes which *should* remain protected still correctly reject unauthenticated requests. A fix to unblock one route must never silently unblock another.

## 5. Destructive operations must fail loudly, never silently

- Any operation that deletes, overwrites, or reverts persistent state (file delete, git discard, repository delete, rollback) must report per-item success/failure accurately. A partial failure must never be folded into a blanket "success" count.
- Confirm destructive operations actually happened by checking the real filesystem/DB/git state afterward, not by trusting the response message.

## 6. Error handling standard

- Every user-facing failure mode (validation error, duplicate resource, auth failure, network failure, backend exception) must produce a clear, specific, non-technical error message in the UI — never a silent no-op, never a raw stack trace/internal error leaked to the user, never a blank/crashed screen.
- Any component that can throw during render should be wrapped so a failure there does not take down the entire application — isolate failures to the smallest reasonable UI region.

## 7. Regression tests are part of the fix, not a follow-up

- Every bug fix ships with a regression test in the same change — a test that would have caught the original bug. "Tests unchanged" after a real behavioral fix is itself a red flag.
- Every new backend route or non-trivial frontend utility function gets at least one test in the same change it's introduced in.

## 8. Migration-specific rules

- Do not delete the old (`server/`, root `src/` app logic, `traycer-mini-frontend/`) implementation until the corresponding new Next.js implementation is fully ported AND independently verified working. Keep the old code as reference until then.
- Port business logic (`planner.ts`, `generator.ts`, `approver.ts`, `reviewer.ts`, `verifier.ts`, `context.ts`) with minimal changes — this logic is not the source of known bugs; only relocate/adjust imports unless a specific bug is being fixed during the move (and if so, document it separately, don't silently change behavior mid-migration).
- Any known, previously-diagnosed bug (see `BUGS.md`) must have its fix explicitly carried forward into the new structure — do not reintroduce a bug by copying old code that predates its fix.
- One Prisma schema, one Prisma client, for the whole project. Reconcile any divergence between the old root schema and the old `traycer-mini-frontend` schema explicitly and document what was merged/dropped and why.

## 9. Process discipline

- After any backend code change, confirm the running process actually reflects the change (via `tsx watch` reload confirmation, or an explicit restart) before testing. Do not test against a stale process.
- Confirm no duplicate/zombie process is bound to the same port before concluding a fix didn't work.

## 10. Reporting format

For every phase/task, report:
1. What was done.
2. Root cause (if this was a bug fix).
3. Real evidence (see Rule 1).
4. What was NOT verified, and why, even if the list is short — this section must exist even when empty; write "none" explicitly rather than omitting it.
5. Any assumption made that the human should confirm or override.

Do not proceed to the next phase in `MIGRATION_PLAN.md` until the current phase's exit criteria (defined per-phase in that file) are met with real evidence.