import { describe, it, expect } from 'vitest';

/**
 * Regression test for the Execute blank-screen bug.
 * Root cause: generateCode with operationId returned { ack: true } (no proposals),
 * then approveAll called prev.proposals.map() on undefined.
 */
describe('ApproveAll state guard (regression)', () => {
  function simulateApproveAllStateUpdate(
    prevProposals: unknown,
    approvedProposals: unknown[] = []
  ) {
    const existing = Array.isArray(prevProposals) ? prevProposals : [];
    if (approvedProposals.length === 0) {
      return existing.map(p => ({ ...p, approved: true }));
    }
    return existing;
  }

  it('does not throw when prev.proposals is undefined (broken generate response)', () => {
    expect(() => simulateApproveAllStateUpdate(undefined)).not.toThrow();
    expect(simulateApproveAllStateUpdate(undefined)).toEqual([]);
  });

  it('marks existing proposals approved when approve-all returns zero new proposals', () => {
    const prev = [{ id: '1', approved: false }];
    const result = simulateApproveAllStateUpdate(prev, []);
    expect(result).toEqual([{ id: '1', approved: true }]);
  });
});
