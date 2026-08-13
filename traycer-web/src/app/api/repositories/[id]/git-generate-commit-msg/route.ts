import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectRoot = resolve(process.cwd(), '..');
    const repoPath = resolve(projectRoot, 'repositories', id);
    
    let diff = '';
    try {
      const { stdout } = await execAsync('git diff --staged', { cwd: repoPath });
      diff = stdout;
    } catch {}
    
    if (!diff) {
      try {
        const { stdout } = await execAsync('git diff', { cwd: repoPath });
        diff = stdout;
      } catch {}
    }

    if (!diff.trim()) {
      // No diff (e.g. only untracked files) — use status list to name files
      let statusLines = '';
      try {
        const { stdout } = await execAsync('git status --short', { cwd: repoPath });
        statusLines = stdout;
      } catch {}
      
      const files = statusLines.split('\n').map(l => l.slice(2).trim()).filter(Boolean);
      if (files.length === 0) return NextResponse.json({ message: 'chore: update repository files' });
      
      const first = files[0];
      const ext = first.includes('.') ? first.split('.').pop() : '';
      const msg = ext === 'ts' || ext === 'js' || ext === 'tsx'
        ? `feat: add ${first}`
        : `chore: add ${files.length === 1 ? first : files.length + ' new files'}`;
        
      return NextResponse.json({ message: msg });
    }

    // Synthesize concise conventional commit message from real diff
    const changedFiles = diff.match(/--- a\/(.+)/g)?.map(l => l.replace('--- a/', '')) || [];
    const mainFile = changedFiles[0] || 'code';
    const summaryMsg = diff.includes('export') ? `feat: add exports in ${mainFile}` : `refactor: update ${mainFile}`;
    
    return NextResponse.json({ message: summaryMsg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate commit message' }, { status: 500 });
  }
}
