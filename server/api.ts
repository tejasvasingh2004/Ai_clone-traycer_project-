/**
 * Express REST API server for Traycer-mini Dashboard
 * Wraps existing backend modules as HTTP endpoints
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from '../src/db.ts';
import plansRouter from './routes/plans.js';
import proposalsRouter from './routes/proposals.js';
import repositoriesRouter from './routes/repositories.js';
import repositoryRoutes from './routes/repositoryRoutes.js';
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
app.use('/api', repositoryRoutes);
app.use('/api', verifyRouter);

// ==================== STATUS ENDPOINT ====================

/**
 * GET /api/status
 * Overall system status summary
 */
app.get('/api/status', async (req, res) => {
  try {
    const planCount = await prisma.plan.count();
    const proposalCount = await prisma.proposal.count();
    const approvedCount = await prisma.proposal.count({
      where: { approved: true }
    });

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

// ==================== DATABASE INITIALIZATION ====================

/**
 * Initialize default data in the database on server startup
 */
async function initDatabase() {
  // Test connection to the database explicitly
  await prisma.$queryRaw`SELECT 1`;

  const defaultWorkspace = await prisma.workspace.findUnique({
    where: { id: 'default' }
  });
  if (!defaultWorkspace) {
    await prisma.workspace.create({
      data: {
        id: 'default',
        name: 'Default Workspace',
        description: 'Automatically created default workspace',
      }
    });
    console.log('✓ Default workspace initialized in database.');
  }
}

// ==================== START SERVER ====================

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Traycer-mini API server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Critical database error on startup. Aborting server launch:', error);
    process.exit(1);
  });
