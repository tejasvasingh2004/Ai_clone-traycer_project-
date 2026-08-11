import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../traycer-mini-frontend/src/api/client.ts';

describe('Frontend API Client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('createPlan should post taskDescription and return plan', async () => {
    const mockPlan = { id: 'plan-1', taskName: 'Test task', steps: [], filesToModify: [] };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlan,
    });

    const result = await api.createPlan('Test task');
    expect(global.fetch).toHaveBeenCalledWith('/api/plan', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ taskDescription: 'Test task', autoGenerate: false, operationId: undefined }),
    }));
    expect(result).toEqual(mockPlan);
  });

  it('getPlans should fetch plans list', async () => {
    const mockPlans = [{ id: 'p1' }, { id: 'p2' }];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlans,
    });

    const result = await api.getPlans();
    expect(global.fetch).toHaveBeenCalledWith('/api/plans');
    expect(result).toEqual(mockPlans);
  });

  it('importRepository should post repo URL', async () => {
    const mockRepo = { id: 'r1', name: 'Repo1', url: 'https://github.com/foo/bar' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRepo,
    });

    const result = await api.importRepository('https://github.com/foo/bar');
    expect(global.fetch).toHaveBeenCalledWith('/api/import', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ url: 'https://github.com/foo/bar' }),
    }));
    expect(result).toEqual(mockRepo);
  });

  it('runTerminalCommand should post command', async () => {
    const mockResponse = { output: 'hello world', status: 'completed' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await api.runTerminalCommand('repo-1', 'echo hello world');
    expect(global.fetch).toHaveBeenCalledWith('/api/repositories/repo-1/terminal', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ command: 'echo hello world' }),
    }));
    expect(result).toEqual(mockResponse);
  });

  it('should throw an error when API response is not ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Bad Request' }),
    });

    await expect(api.createPlan('')).rejects.toThrow('Bad Request');
  });

  it('generateCode normalizes ack-only response to empty proposals array (regression)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ack: true, operationId: 'op-exec-123' }),
    });

    const result = await api.generateCode('plan-1', 'op-exec-123');
    expect(result.proposals).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.operationId).toBe('op-exec-123');
  });

  it('generateCode returns proposals array when operationId present (fixed contract)', async () => {
    const mockProposals = [{ id: 'prop-1', filePath: 'start.md', approved: false }];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ proposals: mockProposals, count: 1, operationId: 'op-exec-456' }),
    });

    const result = await api.generateCode('plan-1', 'op-exec-456');
    expect(result.proposals).toEqual(mockProposals);
    expect(result.count).toBe(1);
  });

  it('approveAll normalizes response to always include files and proposals arrays', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await api.approveAll('repo-1');
    expect(result.success).toBe(true);
    expect(result.approved).toBe(0);
    expect(result.files).toEqual([]);
    expect(result.deleted).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.failures).toEqual([]);
    expect(result.proposals).toEqual([]);
  });
});
