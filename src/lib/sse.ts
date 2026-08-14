/**
 * Server-Sent Events (SSE) helper for streaming progress updates in Next.js App Router
 */

// Store SSE clients for streaming
export const sseClients = new Map<string, ReadableStreamDefaultController>();

/**
 * Send progress update to SSE client
 * @param operationId - Unique identifier for the operation
 * @param data - Data to send to the client
 */
export function sendProgress(operationId: string, data: any): void {
  const controller = sseClients.get(operationId);
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // Stream might already be closed/cancelled
      console.error(`Failed to send progress to ${operationId}:`, e);
    }
  }
}

/**
 * Remove and clean up an SSE client
 * @param operationId - Unique identifier for the operation
 */
export function removeSSEClient(operationId: string): void {
  const controller = sseClients.get(operationId);
  if (controller) {
    try {
      controller.close();
    } catch (e) {
      // Ignore errors if already closed
    }
    sseClients.delete(operationId);
  }
}
