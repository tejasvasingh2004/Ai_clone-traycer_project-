/**
 * Verification endpoint
 */

import { verifyAccessToken } from '../middleware/auth.ts';
import { Router, Request, Response } from 'express';
import { verifyCode } from '../../src/verifier.js';
import { sendProgress, removeSSEClient } from '../sse.js';

const router = Router();

/**
 * POST /api/verify
 * Run TypeScript + ESLint checks
 */
router.post('/verify', verifyAccessToken, async (req: Request, res: Response) => {
  try {
    const { operationId } = req.body;

    if (operationId) {
      sendProgress(operationId, { type: 'progress', message: 'Running TypeScript checks...' });
    }

    const result = await verifyCode();

    if (operationId) {
      sendProgress(operationId, { type: 'complete', result });
      removeSSEClient(operationId);
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (req.body.operationId) {
      sendProgress(req.body.operationId, { type: 'error', error: message });
      removeSSEClient(req.body.operationId);
    }
    res.status(500).json({ error: message });
  }
});

export default router;
