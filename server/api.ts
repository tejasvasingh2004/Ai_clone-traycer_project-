/**
 * Express REST API server for Traycer-mini Dashboard
 * Wraps existing backend modules as HTTP endpoints
 */

import express from 'express';
import cors from 'cors';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { PLANS_DIR, STAGING_INDEX_FILE } from '../src/config.js';
import plansRouter from './routes/plans.js';
import proposalsRouter from './routes/proposals.js';
import repositoriesRouter from './routes/repositories.js';
import verifyRouter from './routes/verify.js';
import { registerSSEClient, removeSSEClient, setupSSEResponse } from './sse.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json());

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Mount route modules
app.use('/api', plansRouter);
app.use('/api', proposalsRouter);
app.use('/api', repositoriesRouter);
app.use('/api', verifyRouter);

// ==================== STATUS ENDPOINT ====================

/**
 * GET /api/status
 * Overall system status summary
 */
app.get('/api/status', async (req, res) => {
  try {
    // Count plans
    let planCount = 0;
    try {
      const planFiles = await readdir(PLANS_DIR);
      planCount = planFiles.filter(f => f.endsWith('.json')).length;
    } catch {}

    // Count proposals
    let proposalCount = 0;
    let approvedCount = 0;
    try {
      const indexContent = await readFile(STAGING_INDEX_FILE, 'utf-8');
      const indexData = JSON.parse(indexContent);
      proposalCount = indexData.length;
      approvedCount = indexData.filter((e: any) => e.approved).length;
    } catch {}

    res.json({
      plans: planCount,
      proposals: proposalCount,
      approved: approvedCount,
      pending: proposalCount - approvedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ==================== SSE ENDPOINT ====================

/**
 * GET /api/stream/:operationId
 * Server-Sent Events for streaming progress
 */
app.get('/api/stream/:operationId', (req, res) => {
  const operationId = req.params.operationId;

  setupSSEResponse(res);
  registerSSEClient(operationId, res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Clean up on client disconnect
  req.on('close', () => {
    removeSSEClient(operationId);
  });
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Traycer-mini API server running on http://localhost:${PORT}`);
});
