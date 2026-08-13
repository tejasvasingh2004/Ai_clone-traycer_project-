/**
 * Express REST API server for Traycer-mini Dashboard
 * Wraps existing backend modules as HTTP endpoints
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import prisma from '../src/db.ts';
import plansRouter from './routes/plans.ts';
import proposalsRouter from './routes/proposals.ts';
import repositoriesRouter from './routes/repositories.ts';
import repositoryRoutes from './routes/repositoryRoutes.ts';
import verifyRouter from './routes/verify.ts';
import authRouter from './routes/auth.ts';
import { verifyAccessToken } from './middleware/auth.ts';
import { registerSSEClient, removeSSEClient, setupSSEResponse } from './sse.ts';

const app = express();
const PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  credentials: true,
}));

// Request timeout middleware (default 5 minutes, configurable via REQUEST_TIMEOUT_MS)
app.use((req, res, next) => {
  const timeoutMs = process.env.REQUEST_TIMEOUT_MS ? parseInt(process.env.REQUEST_TIMEOUT_MS) : 5 * 60 * 1000; // 5 minutes
  req.setTimeout(timeoutMs);
  next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));

// Mount route modules
app.use('/api', plansRouter);
app.use('/api', proposalsRouter);
app.use('/api', repositoriesRouter);
app.use('/api', repositoryRoutes);
app.use('/api', verifyRouter);
app.use('/api/auth', authRouter);

// Global error handler will be registered at the very end

// ==================== STATUS ENDPOINT ====================

/**
 * GET /api/status
 * Overall system status summary
 */
app.get('/api/status', verifyAccessToken, async (req: Request, res: Response) => {
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

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler (must be registered after all routes)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Express Error Handler:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
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

import http from 'http';
import { setupTerminalWebSocket } from './terminalPty.ts';

export { app };

// ==================== START SERVER ====================

let serverInstance: http.Server | null = null;

if (process.env.NODE_ENV !== 'test') {
  initDatabase()
    .then(() => {
      serverInstance = http.createServer(app);
      setupTerminalWebSocket(serverInstance);
      serverInstance.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Traycer-mini API server running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('❌ Critical database error on startup. Aborting server launch:', error);
      process.exit(1);
    });
}

