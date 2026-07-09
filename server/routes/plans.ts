// server/routes/plans.ts
/**
 * Plan-related endpoints using Prisma
 */

import { Router, Request, Response } from 'express';
import { createPlan } from '../../src/planner.js';
import { sendProgress, removeSSEClient } from '../sse.js';
import { unlink, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { PLANS_DIR, STAGING_DIR, STAGING_INDEX_FILE } from '../../src/config.js';
import prisma from '../../src/db.ts';

const router = Router();

/**
 * Helper to parse stringified JSON fields from database Plan record to match frontend expectations
 */
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

/**
 * POST /api/plan
 * Create a new plan and persist with Prisma
 */
router.post('/plan', async (req: Request, res: Response) => {
  try {
    const { taskDescription, autoGenerate = false, operationId } = req.body;

    if (!taskDescription) {
      return res.status(400).json({ error: 'taskDescription is required' });
    }

    if (operationId) {
      sendProgress(operationId, { type: 'progress', message: 'Building context...' });
    }

    // Existing planner returns a Plan object
    const plan = await createPlan(taskDescription, autoGenerate);

    // Persist the plan in the database
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
      }
    });

    const parsedPlan = parseDbPlan(dbPlan);

    if (operationId) {
      sendProgress(operationId, { type: 'complete', plan: parsedPlan });
      removeSSEClient(operationId);
    }

    res.json(parsedPlan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (req.body.operationId) {
      sendProgress(req.body.operationId, { type: 'error', error: message });
      removeSSEClient(req.body.operationId);
    }
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/plans
 * List all saved plans from the database
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(plans.map(parseDbPlan));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/plans/:id
 * Retrieve a specific plan by ID
 */
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.json(parseDbPlan(plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/plans/:id
 * Delete a specific plan from the database and clean up filesystem files
 */
router.delete('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the plan exists
    const dbPlan = await prisma.plan.findUnique({ where: { id } });
    if (!dbPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Delete database plan (proposals cascade delete in database)
    await prisma.plan.delete({ where: { id } });

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

    res.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
