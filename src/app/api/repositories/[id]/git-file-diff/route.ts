import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';

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
    const absoluteFilePath = resolve(repoPath, filePath);
    
    let diff = '';
    let oldValue = '';
    let newValue = '';
    
    try {
      const { stdout } = await execAsync(`git diff HEAD -- "${filePath}"`, { cwd: repoPath });
      diff = stdout;
      
      try {
        const { stdout: oldOutput } = await execAsync(`git show HEAD:"${filePath}"`, { cwd: repoPath, maxBuffer: 1024 * 1024 * 10 });
        oldValue = oldOutput;
      } catch {
        oldValue = '';
      }
      
      try {
        newValue = await fs.readFile(absoluteFilePath, 'utf-8');
      } catch {
        newValue = '';
      }
    } catch {}
    
    return NextResponse.json({ diff, oldValue, newValue });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get file diff' }, { status: 500 });
  }
}
