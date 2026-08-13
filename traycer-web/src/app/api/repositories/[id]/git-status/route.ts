import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectRoot = resolve(process.cwd(), '..');
    const repoPath = resolve(projectRoot, 'repositories', id);
    
    if (!existsSync(repoPath)) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
      const lines = stdout.split('\n').filter(l => l.trim().length > 0);
      return NextResponse.json({ files: lines, count: lines.length });
    } catch {
      return NextResponse.json({ files: [], count: 0 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get git status' }, { status: 500 });
  }
}
