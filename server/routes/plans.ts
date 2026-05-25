/**
 * Plan-related endpoints
 */

import { Router, Request, Response } from 'express';
import { createPlan } from '../../src/planner.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { PLANS_DIR } from '../../src/config.js';
import { Plan } from '../../src/types.js';
import { sendProgress, removeSSEClient } from '../sse.js';

const router = Router();

/**
 * POST /api/plan
 * Create a new plan from task description
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

    const plan = await createPlan(taskDescription, autoGenerate);

    if (operationId) {
      sendProgress(operationId, { type: 'complete', plan });
      removeSSEClient(operationId);
    }

    res.json(plan);
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
 * List all saved plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const files = await readdir(PLANS_DIR);
    const plans: Plan[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(join(PLANS_DIR, file), 'utf-8');
        const plan = JSON.parse(content);
        plans.push(plan);
      }
    }

    // Sort by creation date descending
    plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(plans);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/plans/:id
 * Get a specific plan
 */
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const planPath = join(PLANS_DIR, `${req.params.id}.json`);
    const content = await readFile(planPath, 'utf-8');
    const plan = JSON.parse(content);
    res.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(404).json({ error: message });
  }
});

export default router;
