import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({ error: 'path parameter is required' }, { status: 400 });
    }
    
    const projectRoot = process.cwd();
    const repoPath = resolve(projectRoot, 'repositories', id);
    
    let diff = '';
    try {
      const { stdout } = await execAsync(`git diff HEAD -- "${filePath}"`, { cwd: repoPath });
      diff = stdout;
    } catch {}
    
    return NextResponse.json({ diff });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get file diff' }, { status: 500 });
  }
}
