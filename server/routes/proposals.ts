/**
 * Proposal-related endpoints
 */

import { Router, Request, Response } from 'express';
import { generateCode } from '../../src/generator.js';
import { approveProposal, approveAll, rejectProposal as rejectProposalModule } from '../../src/approver.js';
import { readFile, readdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { PLANS_DIR, STAGING_DIR, STAGING_INDEX_FILE } from '../../src/config.js';
import { StagedProposal } from '../../src/types.js';
import { sendProgress, removeSSEClient } from '../sse.js';

const router = Router();

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

    if (operationId) {
      sendProgress(operationId, { type: 'progress', message: 'Reading plan...' });
    }

    const proposals = await generateCode(planPath);

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
    let indexData: Array<{ id: string; planId: string; filePath: string; createdAt: string; approved: boolean }>;

    try {
      const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
      indexData = JSON.parse(indexContent);
    } catch {
      indexData = [];
    }

    const proposals: StagedProposal[] = [];

    for (const entry of indexData) {
      try {
        const proposalPath = join(STAGING_DIR, `${entry.id}.json`);
        const content = await readFile(proposalPath, 'utf-8');
        const proposal = JSON.parse(content);
        proposals.push(proposal);
      } catch {
        // Skip corrupted proposals
      }
    }

    // Sort by creation date descending
    proposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    const proposalPath = join(STAGING_DIR, `${req.params.id}.json`);
    const content = await readFile(proposalPath, 'utf-8');
    const proposal = JSON.parse(content);
    res.json(proposal);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(404).json({ error: message });
  }
});

/**
 * POST /api/approve/:id
 * Approve a proposal
 */
router.post('/approve/:id', async (req: Request, res: Response) => {
  try {
    await approveProposal(req.params.id, true); // Skip confirmation
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
    
    // Read proposal to get file path
    const proposalPath = join(STAGING_DIR, `${req.params.id}.json`);
    const content = await readFile(proposalPath, 'utf-8');
    const proposal: StagedProposal = JSON.parse(content);
    
    // Use reviewer's rejectProposal which regenerates code
    const { rejectProposal: rejectWithFeedback } = await import('../../src/reviewer.js');
    await rejectWithFeedback(proposal.filePath, reason || 'No reason provided');
    
    res.json({ success: true, id: req.params.id });
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
    
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
