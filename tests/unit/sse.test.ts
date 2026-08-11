import { describe, it, expect, vi } from 'vitest';
import { registerSSEClient, removeSSEClient, sendProgress, setupSSEResponse } from '../../server/sse.ts';
import type { Response } from 'express';

describe('SSE Helper', () => {
  it('should setup correct SSE response headers', () => {
    const res = {
      setHeader: vi.fn(),
    } as unknown as Response;

    setupSSEResponse(res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
  });

  it('should register client and send progress data', () => {
    const res = {
      write: vi.fn(),
      end: vi.fn(),
    } as unknown as Response;

    const opId = 'op-123';
    registerSSEClient(opId, res);

    const payload = { type: 'progress', percent: 50 };
    sendProgress(opId, payload);

    expect(res.write).toHaveBeenCalledWith(`data: ${JSON.stringify(payload)}\n\n`);

    removeSSEClient(opId);
    expect(res.end).toHaveBeenCalled();
  });

  it('should not throw if sending progress to non-existent client', () => {
    expect(() => sendProgress('non-existent', { status: 'test' })).not.toThrow();
  });
});
