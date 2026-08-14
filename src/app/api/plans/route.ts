import { NextRequest, NextResponse } from 'next/server';
import { createPlan } from '@/lib/planner';
import prisma from '@/lib/db';
import { resolve } from 'path';

// Note: SSE streaming for plans will be handled via a separate route or readable stream in Phase 4.
// For now we just implement the synchronous HTTP response part.

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskDescription, autoGenerate = false, repositoryId } = body;

    if (!taskDescription) {
      return NextResponse.json({ error: 'taskDescription is required' }, { status: 400 });
    }

    // Determine the root of the project to analyze
    const repoDir = resolve(process.cwd(), 'repositories');
    const projectRoot = repositoryId && repositoryId !== 'default' 
      ? resolve(repoDir, repositoryId) 
      : process.cwd();

    const plan = await createPlan(taskDescription, autoGenerate, projectRoot);

    const dbPlan = await prisma.plan.create({
      data: {
        id: plan.id,
        workspaceId: 'default', // Using 'default' as the workspace placeholder
        taskName: plan.taskName,
        taskDescription: taskDescription,
        steps: JSON.stringify(plan.steps),
        filesToModify: JSON.stringify(plan.filesToModify),
        rationale: plan.rationale,
        dependencyOrder: plan.dependencyOrder ? JSON.stringify(plan.dependencyOrder) : null,
        contextSnapshot: plan.contextSnapshot ? JSON.stringify(plan.contextSnapshot) : null,
        // BUG-014 fix: saving filesToDelete
        filesToDelete: JSON.stringify(plan.filesToDelete || []),
      }
    });

    const parsedPlan = {
      ...parseDbPlan(dbPlan),
      filesToDelete: Array.isArray(plan.filesToDelete) ? plan.filesToDelete : [],
    };

    return NextResponse.json(parsedPlan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { createdAt: 'desc' } });
    const parsedPlans = plans.map(p => {
      const parsed = parseDbPlan(p);
      if (p.filesToDelete) {
         parsed.filesToDelete = JSON.parse(p.filesToDelete);
      }
      return parsed;
    });
    return NextResponse.json(parsedPlans);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
