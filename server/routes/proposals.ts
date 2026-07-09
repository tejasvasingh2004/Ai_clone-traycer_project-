/**
 * Proposal-related endpoints using Prisma and filesystem fallback
 */

import { Router, Request, Response } from 'express';
import { generateCode } from '../../src/generator.js';
import { approveProposal, approveAll } from '../../src/approver.js';
import { readFile, readdir, unlink, writeFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import { PLANS_DIR, STAGING_DIR, STAGING_INDEX_FILE } from '../../src/config.js';
import { StagedProposal } from '../../src/types.js';
import { sendProgress, removeSSEClient } from '../sse.js';
import prisma from '../../src/db.ts';

const router = Router();

/**
 * Synchronize the staging filesystem to the Prisma database
 */
async function syncStagingToDb(): Promise<void> {
  let indexData: Array<{ id: string; planId: string; filePath: string; createdAt: string }>;

  try {
    const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
    indexData = JSON.parse(indexContent);
  } catch {
    indexData = [];
  }

  const indexIds = indexData.map(e => e.id);

  // Delete database proposals that are no longer in the staging index
  await prisma.proposal.deleteMany({
    where: {
      id: {
        notIn: indexIds,
      },
    },
  });

  // Upsert current staged proposals
  for (const entry of indexData) {
    try {
      const proposalPath = join(STAGING_DIR, `${entry.id}.json`);
      const content = await readFile(proposalPath, 'utf-8');
      const prop: StagedProposal = JSON.parse(content);

      await prisma.proposal.upsert({
        where: { id: prop.id },
        update: {
          planId: prop.planId,
          filePath: prop.filePath,
          newContent: prop.newContent,
          diff: prop.diff,
          operation: prop.operation,
          approved: prop.approved,
          createdAt: new Date(prop.createdAt),
          generationContext: prop.generationContext ? JSON.stringify(prop.generationContext) : null,
          rejectionHistory: prop.rejectionHistory ? JSON.stringify(prop.rejectionHistory) : null,
          originalContent: prop.originalContent || null,
        },
        create: {
          id: prop.id,
          planId: prop.planId,
          filePath: prop.filePath,
          newContent: prop.newContent,
          diff: prop.diff,
          operation: prop.operation,
          approved: prop.approved,
          createdAt: new Date(prop.createdAt),
          generationContext: prop.generationContext ? JSON.stringify(prop.generationContext) : null,
          rejectionHistory: prop.rejectionHistory ? JSON.stringify(prop.rejectionHistory) : null,
          originalContent: prop.originalContent || null,
        },
      });
    } catch (err) {
      console.error(`Error syncing staging entry ${entry.id} to DB:`, err);
    }
  }
}

/**
 * POST /api/generate
 * Generate code from a plan
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { planId, operationId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

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
          rationale: dbPlan.rationale,
          dependencyOrder: dbPlan.dependencyOrder ? JSON.parse(dbPlan.dependencyOrder) : undefined,
          contextSnapshot: dbPlan.contextSnapshot ? JSON.parse(dbPlan.contextSnapshot) : undefined,
          createdAt: dbPlan.createdAt.toISOString(),
        };
        await mkdir(PLANS_DIR, { recursive: true });
        await writeFile(planPath, JSON.stringify(planJson, null, 2), 'utf-8');
      } else {
        return res.status(404).json({ error: `Plan not found in database: ${planId}` });
      }
    }

    if (operationId) {
      sendProgress(operationId, { type: 'progress', message: 'Reading plan...' });
    }

    const proposals = await generateCode(planPath);

    // Sync to database
    await syncStagingToDb();

    if (operationId) {
      sendProgress(operationId, { type: 'complete', proposals });
      removeSSEClient(operationId);
    }

    res.json({ proposals, count: proposals.length });
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
 * GET /api/proposals
 * List all staged proposals
 */
router.get('/proposals', async (req: Request, res: Response) => {
  try {
    const dbProposals = await prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const proposals: StagedProposal[] = dbProposals.map(p => ({
      id: p.id,
      planId: p.planId,
      filePath: p.filePath,
      newContent: p.newContent,
      diff: p.diff || '',
      operation: p.operation as 'create' | 'modify',
      approved: p.approved,
      createdAt: p.createdAt.toISOString(),
      generationContext: p.generationContext ? JSON.parse(p.generationContext) : undefined,
      rejectionHistory: p.rejectionHistory ? JSON.parse(p.rejectionHistory) : undefined,
      originalContent: p.originalContent || null,
    }));

    res.json(proposals);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/proposals/:id
 * Get a specific proposal with diff
 */
router.get('/proposals/:id', async (req: Request, res: Response) => {
  try {
    const p = await prisma.proposal.findUnique({
      where: { id: req.params.id },
    });

    if (!p) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const proposal: StagedProposal = {
      id: p.id,
      planId: p.planId,
      filePath: p.filePath,
      newContent: p.newContent,
      diff: p.diff || '',
      operation: p.operation as 'create' | 'modify',
      approved: p.approved,
      createdAt: p.createdAt.toISOString(),
      generationContext: p.generationContext ? JSON.parse(p.generationContext) : undefined,
      rejectionHistory: p.rejectionHistory ? JSON.parse(p.rejectionHistory) : undefined,
      originalContent: p.originalContent || null,
    };

    res.json(proposal);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/approve/:id
 * Approve a proposal
 */
router.post('/approve/:id', async (req: Request, res: Response) => {
  try {
    await approveProposal(req.params.id, true); // Skip confirmation

    // Sync database with updated staging status
    await syncStagingToDb();

    res.json({ success: true, id: req.params.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/approve-all
 * Approve all pending proposals
 */
router.post('/approve-all', async (req: Request, res: Response) => {
  try {
    await approveAll();

    // Sync database with updated staging status
    await syncStagingToDb();

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/reject/:id
 * Reject a proposal with optional reason
 */
router.post('/reject/:id', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;

    const proposal = await prisma.proposal.findUnique({
      where: { id: req.params.id },
    });

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Use reviewer's rejectProposal which regenerates code
    const { rejectProposal: rejectWithFeedback } = await import('../../src/reviewer.js');
    await rejectWithFeedback(proposal.filePath, reason || 'No reason provided');

    // Sync regenerated proposals to database
    await syncStagingToDb();

    res.json({ success: true, id: req.params.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/rollback/:id
 * Rollback an approved proposal: restores previous file contents and updates status.
 */
router.post('/rollback/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find proposal
    const proposal = await prisma.proposal.findUnique({ where: { id } });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (!proposal.approved) {
      return res.status(400).json({ error: 'Proposal is not approved/deployed' });
    }

    // Rollback filesystem content
    const filePath = proposal.filePath;
    if (proposal.operation === 'create') {
      try {
        await unlink(filePath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    } else {
      if (proposal.originalContent !== null) {
        await writeFile(filePath, proposal.originalContent, 'utf-8');
      } else {
        return res.status(400).json({ error: 'Original content was not captured for this proposal, cannot rollback' });
      }
    }

    // Update proposal to not approved
    await prisma.proposal.update({
      where: { id },
      data: { approved: false }
    });

    // Mirror to staging filesystem JSON file
    try {
      const proposalPath = join(STAGING_DIR, `${id}.json`);
      const content = await readFile(proposalPath, 'utf-8');
      const prop = JSON.parse(content);
      prop.approved = false;
      await writeFile(proposalPath, JSON.stringify(prop, null, 2), 'utf-8');

      // Update staging index.json
      const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
      const indexData = JSON.parse(indexContent);
      const indexEntry = indexData.find((e: any) => e.id === id);
      if (indexEntry) {
        indexEntry.approved = false;
        await writeFile(STAGING_INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf-8');
      }
    } catch (e) {
      console.error('Error updating staging files on rollback:', e);
    }

    res.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/clean
 * Clear all staged proposals
 */
router.delete('/clean', async (req: Request, res: Response) => {
  try {
    const files = await readdir(STAGING_DIR);

    for (const file of files) {
      if (file.endsWith('.json') && file !== 'index.json') {
        await unlink(join(STAGING_DIR, file));
      }
    }

    // Clear index
    await writeFile(STAGING_INDEX_FILE, '[]', 'utf-8');

    // Sync database with now‑empty staging filesystem
    await syncStagingToDb();

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
