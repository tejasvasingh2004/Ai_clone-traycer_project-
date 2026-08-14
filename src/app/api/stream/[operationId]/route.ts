import { NextRequest, NextResponse } from 'next/server';
import { sseClients } from '@/lib/sse';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operationId: string }> }
) {
  const { operationId } = await params;
  
  const stream = new ReadableStream({
    start(controller) {
      sseClients.set(operationId, controller);
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    },
    cancel() {
      // Clean up on client disconnect
      sseClients.delete(operationId);
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
