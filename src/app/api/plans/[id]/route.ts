import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { unlink, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { PLANS_DIR, STAGING_DIR, STAGING_INDEX_FILE } from '@/lib/config';

function parseDbPlan(dbPlan: any) {
  if (!dbPlan) return null;
  return {
    ...dbPlan,
    steps: dbPlan.steps ? JSON.parse(dbPlan.steps) : [],
    filesToModify: dbPlan.filesToModify ? JSON.parse(dbPlan.filesToModify) : [],
    dependencyOrder: dbPlan.dependencyOrder ? JSON.parse(dbPlan.dependencyOrder) : undefined,
    contextSnapshot: dbPlan.contextSnapshot ? JSON.parse(dbPlan.contextSnapshot) : undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = await prisma.plan.findUnique({ where: { id } });
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    
    const parsedPlan = parseDbPlan(plan);
    if (parsedPlan && plan.filesToDelete) {
        parsedPlan.filesToDelete = JSON.parse(plan.filesToDelete);
    }
    return NextResponse.json(parsedPlan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Directly delete the plan; Prisma will throw P2025 if not found
    try {
      await prisma.plan.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === 'P2025') {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
      throw err;
    }

    // Clean up plans file if it exists
    try {
      const planFilePath = join(PLANS_DIR, `${id}.json`);
      await unlink(planFilePath);
    } catch {}

    // Clean up staged proposals for this plan in filesystem
    try {
      let indexData: Array<{ id: string; planId: string; filePath: string; createdAt: string }> = [];
      try {
        const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
        indexData = JSON.parse(indexContent);
      } catch {}

      const proposalsToDelete = indexData.filter(e => e.planId === id);
      const remainingProposals = indexData.filter(e => e.planId !== id);

      // Unlink proposal JSON files
      for (const prop of proposalsToDelete) {
        try {
          const proposalFilePath = join(STAGING_DIR, `${prop.id}.json`);
          await unlink(proposalFilePath);
        } catch {}
      }

      // Write updated index file
      await writeFile(STAGING_INDEX_FILE, JSON.stringify(remainingProposals, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error unlinking staged proposals on filesystem:', e);
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
