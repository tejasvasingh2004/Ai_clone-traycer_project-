import { describe, it, expect } from 'vitest';
import {
  parseGitStatusLine,
  splitGitStatusLines,
} from '../../src/utils/gitStatus';

describe('Git Status Parsing Utilities', () => {
  it('parseGitStatusLine identifies untracked files', () => {
    const parsed = parseGitStatusLine('?? untracked.txt');
    expect(parsed.path).toBe('untracked.txt');
    expect(parsed.isUntracked).toBe(true);
    expect(parsed.isStaged).toBe(false);
    expect(parsed.isUnstaged).toBe(true);
  });

  it('parseGitStatusLine identifies staged and unstaged modifications', () => {
    const staged = parseGitStatusLine('M  staged.ts');
    expect(staged.path).toBe('staged.ts');
    expect(staged.isStaged).toBe(true);
    expect(staged.isUnstaged).toBe(false);

    const unstaged = parseGitStatusLine(' M unstaged.ts');
    expect(unstaged.path).toBe('unstaged.ts');
    expect(unstaged.isStaged).toBe(false);
    expect(unstaged.isUnstaged).toBe(true);
  });

  it('splitGitStatusLines separates staged and unstaged lists', () => {
    const lines = ['M  staged.ts', ' M unstaged.ts', '?? new.ts'];
    const { staged, unstaged } = splitGitStatusLines(lines);

    expect(staged.map((f: { path: string }) => f.path)).toEqual(['staged.ts']);
    expect(unstaged.map((f: { path: string }) => f.path)).toEqual(['unstaged.ts', 'new.ts']);
  });
});
