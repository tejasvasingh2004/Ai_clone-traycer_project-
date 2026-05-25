/**
 * Server-Sent Events (SSE) helper for streaming progress updates
 */

import { Response } from 'express';

// Store SSE clients for streaming
const sseClients = new Map<string, Response>();

/**
 * Send progress update to SSE client
 * @param operationId - Unique identifier for the operation
 * @param data - Data to send to the client
 */
export function sendProgress(operationId: string, data: any): void {
  const client = sseClients.get(operationId);
  if (client) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

/**
 * Register an SSE client for an operation
 * @param operationId - Unique identifier for the operation
 * @param res - Express response object
 */
export function registerSSEClient(operationId: string, res: Response): void {
  sseClients.set(operationId, res);
}

/**
 * Remove and clean up an SSE client
 * @param operationId - Unique identifier for the operation
 */
export function removeSSEClient(operationId: string): void {
  const client = sseClients.get(operationId);
  if (client) {
    client.end();
    sseClients.delete(operationId);
  }
}

/**
 * Setup SSE response headers
 * @param res - Express response object
 */
export function setupSSEResponse(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
}
