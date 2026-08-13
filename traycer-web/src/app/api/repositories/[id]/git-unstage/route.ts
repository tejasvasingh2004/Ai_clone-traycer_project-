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
    const body = await request.json();
    const { filePath } = body;
    
    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }
    
    const projectRoot = resolve(process.cwd(), '..');
    const repoPath = resolve(projectRoot, 'repositories', id);
    
    await execAsync(`git restore --staged "${filePath}"`, { cwd: repoPath });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to unstage file' }, { status: 500 });
  }
}
