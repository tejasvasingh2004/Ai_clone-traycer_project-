export interface PlanReviewComparison {
  matchedFiles: string[];
  extraFiles: string[];
  missingFiles: string[];
}

/** Extract file paths from git status --porcelain lines (XY path). */
export function parseGitStatusFiles(lines: string[]): string[] {
  return lines
    .map((line) => {
      if (line.length >= 3) return line.slice(3).trim();
      return line.slice(2).trim();
    })
    .filter(Boolean);
}

/** Compare planned files against actual modified files from git status. */
export function comparePlanToExecution(
  plannedFiles: string[],
  gitStatusLines: string[]
): PlanReviewComparison {
  const actualFiles = parseGitStatusFiles(gitStatusLines);
  const matchedFiles = plannedFiles.filter((f) => actualFiles.includes(f));
  const extraFiles = actualFiles.filter((f) => !plannedFiles.includes(f));
  const missingFiles = plannedFiles.filter((f) => !actualFiles.includes(f));
  return { matchedFiles, extraFiles, missingFiles };
}

/** Render a human-readable review report for chat display. */
export function formatReviewReport(
  taskName: string | undefined,
  comparison: PlanReviewComparison
): string {
  const { matchedFiles, extraFiles, missingFiles } = comparison;
  return `🔍 REVIEW REPORT: PLAN vs EXECUTION

Plan Reference: ${taskName ?? 'No active plan'}

✅ Matched Files (Planned & Modified):
${matchedFiles.length ? matchedFiles.map((f) => `  • ${f}`).join('\n') : '  (None)'}

⚠️ Extra Files (Modified but not in Plan):
${extraFiles.length ? extraFiles.map((f) => `  • ${f}`).join('\n') : '  (None)'}

❌ Missing Files (Planned but not Modified):
${missingFiles.length ? missingFiles.map((f) => `  • ${f}`).join('\n') : '  (None)'}

Summary: ${matchedFiles.length} matched, ${extraFiles.length} extra, ${missingFiles.length} missing.`;
}
