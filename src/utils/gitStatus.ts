export interface GitFileStatus {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  displayStatus: string;
  isStaged: boolean;
  isUnstaged: boolean;
  isUntracked: boolean;
}

/** Parse a single line from `git status --porcelain`. */
export function parseGitStatusLine(line: string): GitFileStatus {
  const indexStatus = line[0] ?? ' ';
  const workTreeStatus = line[1] ?? ' ';
  const path = line.length >= 3 ? line.slice(3).trim() : line.slice(2).trim();
  const isUntracked = indexStatus === '?' && workTreeStatus === '?';
  const isStaged = !isUntracked && indexStatus !== ' ';
  const isUnstaged = isUntracked || workTreeStatus !== ' ';
  const displayStatus = isUntracked ? '??' : `${indexStatus}${workTreeStatus}`.trim() || 'M';

  return {
    path,
    indexStatus,
    workTreeStatus,
    displayStatus,
    isStaged,
    isUnstaged,
    isUntracked,
  };
}

/** Split porcelain lines into staged and unstaged file lists. */
export function splitGitStatusLines(lines: string[]): {
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
} {
  const staged: GitFileStatus[] = [];
  const unstaged: GitFileStatus[] = [];

  for (const line of lines) {
    const parsed = parseGitStatusLine(line);
    if (parsed.isStaged) staged.push(parsed);
    if (parsed.isUnstaged) unstaged.push(parsed);
  }

  return { staged, unstaged };
}
