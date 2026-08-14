import { describe, it, expect, vi } from 'vitest';
import { sseClients, removeSSEClient, sendProgress } from '../../src/lib/sse';

describe('SSE Helper', () => {
  it('should register client and send progress data', () => {
    const controller = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    const opId = 'op-123';
    sseClients.set(opId, controller);

    const payload = { type: 'progress', percent: 50 };
    sendProgress(opId, payload);

    expect(controller.enqueue).toHaveBeenCalledWith(`data: ${JSON.stringify(payload)}\n\n`);

    removeSSEClient(opId);
    expect(controller.close).toHaveBeenCalled();
  });

  it('should not throw if sending progress to non-existent client', () => {
    expect(() => sendProgress('non-existent', { status: 'test' })).not.toThrow();
  });
});
