import { describe, it, expect } from 'vitest';
import {
  parseGitStatusFiles,
  comparePlanToExecution,
  formatReviewReport,
} from '../../traycer-mini-frontend/src/utils/planReview.ts';

describe('Plan Review Utilities', () => {
  it('parseGitStatusFiles extracts paths from porcelain lines', () => {
    const lines = [' M src/app.ts', '?? new.txt', 'M  src/index.ts'];
    expect(parseGitStatusFiles(lines)).toEqual(['src/app.ts', 'new.txt', 'src/index.ts']);
  });

  it('comparePlanToExecution identifies matched, extra, and missing files', () => {
    const planned = ['src/app.ts', 'src/utils.ts'];
    const gitLines = [' M src/app.ts', '?? src/extra.ts'];

    const result = comparePlanToExecution(planned, gitLines);
    expect(result.matchedFiles).toEqual(['src/app.ts']);
    expect(result.extraFiles).toEqual(['src/extra.ts']);
    expect(result.missingFiles).toEqual(['src/utils.ts']);
  });

  it('formatReviewReport renders structured summary', () => {
    const report = formatReviewReport('Add feature', {
      matchedFiles: ['a.ts'],
      extraFiles: ['b.ts'],
      missingFiles: ['c.ts'],
    });

    expect(report).toContain('REVIEW REPORT');
    expect(report).toContain('Add feature');
    expect(report).toContain('a.ts');
    expect(report).toContain('b.ts');
    expect(report).toContain('c.ts');
    expect(report).toContain('1 matched, 1 extra, 1 missing');
  });
});
