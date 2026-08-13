import { NextRequest, NextResponse } from 'next/server';
import { generateCode } from '@/lib/generator';
import { access, mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PLANS_DIR } from '@/lib/config';
import prisma from '@/lib/db';
import { syncStagingToDb } from '@/lib/stagingSync';
import { sendProgress, removeSSEClient } from '@/lib/sse';
// Note: SSE streaming (sendProgress) will be ported in Phase 4 Step 5.
// For now, this route will synchronously generate code without SSE, returning the final proposals.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, operationId, repositoryId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const repoDir = resolve(process.cwd(), '..', 'repositories');
    const projectRoot = repositoryId && repositoryId !== 'default' 
      ? resolve(repoDir, repositoryId) 
      : resolve(process.cwd(), '..');

    const planPath = join(PLANS_DIR, `${planId}.json`);

    // Ensure plan file exists on disk, restore from DB if missing
    try {
      await access(planPath);
    } catch {
      const dbPlan = await prisma.plan.findUnique({ where: { id: planId } });
      if (dbPlan) {
        const planJson = {
          id: dbPlan.id,
          workspaceId: dbPlan.workspaceId,
          taskName: dbPlan.taskName,
          taskDescription: dbPlan.taskDescription,
          steps: JSON.parse(dbPlan.steps),
          filesToModify: JSON.parse(dbPlan.filesToModify),
          filesToDelete: dbPlan.filesToDelete ? JSON.parse(dbPlan.filesToDelete) : [],
          rationale: dbPlan.rationale,
          dependencyOrder: dbPlan.dependencyOrder ? JSON.parse(dbPlan.dependencyOrder) : undefined,
          contextSnapshot: dbPlan.contextSnapshot ? JSON.parse(dbPlan.contextSnapshot) : undefined,
          createdAt: dbPlan.createdAt.toISOString(),
        };
        await mkdir(PLANS_DIR, { recursive: true });
        await writeFile(planPath, JSON.stringify(planJson, null, 2), 'utf-8');
      } else {
        return NextResponse.json({ error: `Plan not found in database: ${planId}` }, { status: 404 });
      }
    }

    if (operationId) {
      sendProgress(operationId, { type: 'ack', operationId, message: 'Generation started' });
    }

    const proposals = await generateCode(
      planPath,
      undefined,
      operationId ? (proposal) => {
        sendProgress(operationId, { type: 'proposal', proposal });
      } : undefined,
      projectRoot
    );

    await syncStagingToDb();

    const responseBody = {
      proposals: Array.isArray(proposals) ? proposals : [],
      count: Array.isArray(proposals) ? proposals.length : 0,
      ...(operationId ? { operationId } : {}),
    };

    if (operationId) {
      sendProgress(operationId, { type: 'complete', proposals: responseBody.proposals });
      removeSSEClient(operationId);
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // In Next.js App Router we can't easily re-read the body if request.json() already parsed it,
    // but we can try to extract operationId from the original parsed body if it failed downstream.
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
