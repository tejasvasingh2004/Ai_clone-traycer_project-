import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/lib/verifier';
import { sendProgress, removeSSEClient } from '@/lib/sse';
import { resolve } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { repositoryId, operationId } = body;
    
    if (operationId) {
      sendProgress(operationId, { type: 'progress', message: 'Running TypeScript checks...' });
    }
    
    const repoDir = resolve(process.cwd(), 'repositories');
    const projectRoot = repositoryId && repositoryId !== 'default' 
      ? resolve(repoDir, repositoryId) 
      : process.cwd();

    const result = await verifyCode(projectRoot);

    if (operationId) {
      sendProgress(operationId, { type: 'complete', result });
      removeSSEClient(operationId);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    try {
      const clonedReq = request.clone();
      const body = await clonedReq.json();
      if (body.operationId) {
        sendProgress(body.operationId, { type: 'error', error: message });
        removeSSEClient(body.operationId);
      }
    } catch (e) {}

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
