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
    const { message } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Commit message is required' }, { status: 400 });
    }
    
    const projectRoot = resolve(process.cwd(), '..');
    const repoPath = resolve(projectRoot, 'repositories', id);
    
    // Make sure git user identity is set for the repo
    try {
      await execAsync('git config user.email "traycer@ai.bot"', { cwd: repoPath });
      await execAsync('git config user.name "Traycer AI"', { cwd: repoPath });
    } catch {}
    
    const escapedMsg = message.replace(/"/g, '\\"');
    const { stdout } = await execAsync(`git commit -m "${escapedMsg}"`, { cwd: repoPath });
    
    return NextResponse.json({ success: true, output: stdout });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to commit changes' }, { status: 500 });
  }
}
