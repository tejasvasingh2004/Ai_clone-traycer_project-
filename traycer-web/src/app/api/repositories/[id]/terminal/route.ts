import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';
import { existsSync } from 'fs';
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
    const { command } = body;

    if (!command) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    const projectRoot = resolve(process.cwd(), '..');
    const repoPath = resolve(projectRoot, 'repositories', id);
    
    if (!existsSync(repoPath)) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Using traditional exec callback pattern to capture output streams properly
    return new Promise<NextResponse>((resolveResponse) => {
      exec(command, { cwd: repoPath }, (error, stdout, stderr) => {
        let output = '';
        if (stdout) output += stdout;
        if (stderr) output += stderr;
        if (error) {
          output += `\nError: ${error.message}`;
          resolveResponse(NextResponse.json({ output, status: 'error' }));
          return;
        }
        resolveResponse(NextResponse.json({ output, status: 'completed' }));
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to execute command' }, { status: 500 });
  }
}
