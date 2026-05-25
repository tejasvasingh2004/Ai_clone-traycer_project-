import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { StagedProposal } from '../types';
import StatusBadge from '../components/StatusBadge';
import DiffViewer from '../components/DiffViewer';

export default function Proposals() {
  const [proposals, setProposals] = useState<StagedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<StagedProposal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchProposals = async () => {
    try {
      const data = await api.getProposals();
      setProposals(data);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.approveProposal(id);
      await fetchProposals();
      setSelectedProposal(null);
    } catch (error) {
      console.error('Failed to approve proposal:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectProposal(id, rejectReason);
      await fetchProposals();
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedProposal(null);
    } catch (error) {
      console.error('Failed to reject proposal:', error);
    }
  };

  const handleApproveAll = async () => {
    try {
      await api.approveAll();
      await fetchProposals();
    } catch (error) {
      console.error('Failed to approve all:', error);
    }
  };

  const handleClean = async () => {
    try {
      await api.cleanProposals();
      await fetchProposals();
    } catch (error) {
      console.error('Failed to clean proposals:', error);
    }
  };

  const pendingProposals = proposals.filter((p) => !p.approved);
  const approvedProposals = proposals.filter((p) => p.approved);

  if (loading) {
    return (
      <div className="ml-[220px] p-8">
        <div className="text-textMuted">Loading proposals...</div>
      </div>
    );
  }

  return (
    <div className="ml-[220px] p-8">
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text">Proposals</h1>
          <div className="flex gap-3">
            {pendingProposals.length > 0 && (
              <button
                onClick={handleApproveAll}
                className="px-4 py-2 bg-success hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Approve All ({pendingProposals.length})
              </button>
            )}
            <button
              onClick={handleClean}
              className="px-4 py-2 bg-surfaceHover hover:bg-border text-text rounded-lg text-sm font-medium transition-colors"
            >
              Clean Approved
            </button>
          </div>
        </div>

        {pendingProposals.length === 0 && approvedProposals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-textMuted">No proposals yet. Create a plan to get started.</p>
          </div>
        ) : (
          <>
            {pendingProposals.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-text mb-4">
                  Pending ({pendingProposals.length})
                </h2>
                <div className="space-y-4">
                  {pendingProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="p-4 bg-surface border border-border rounded-lg hover:border-primary cursor-pointer transition-colors"
                      onClick={() => setSelectedProposal(proposal)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <StatusBadge status={proposal.operation} />
                            <span className="text-sm font-medium text-text">
                              {proposal.filePath}
                            </span>
                          </div>
                          {proposal.aiReviewSummary && (
                            <p className="text-sm text-textMuted mt-2">
                              {proposal.aiReviewSummary}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(proposal.id);
                            }}
                            className="px-3 py-1.5 bg-success hover:bg-green-600 text-white rounded text-sm font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProposal(proposal);
                              setShowRejectModal(true);
                            }}
                            className="px-3 py-1.5 bg-error hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approvedProposals.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-text mb-4">
                  Approved ({approvedProposals.length})
                </h2>
                <div className="space-y-4">
                  {approvedProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="p-4 bg-surface border border-border rounded-lg opacity-75"
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status="approved" />
                        <span className="text-sm text-textMuted">{proposal.filePath}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedProposal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">
                  {selectedProposal.filePath}
                </h3>
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="text-textMuted hover:text-text"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <DiffViewer diff={selectedProposal.diff} filename={selectedProposal.filePath} />
              </div>
              <div className="p-4 border-t border-border flex justify-end gap-3">
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="px-4 py-2 bg-surfaceHover hover:bg-border text-text rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleApprove(selectedProposal.id)}
                  className="px-4 py-2 bg-success hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && selectedProposal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-text mb-4">
                Reject Proposal
              </h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)..."
                className="w-full h-32 px-4 py-3 bg-surfaceHover border border-border rounded-lg text-text placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 bg-surfaceHover hover:bg-border text-text rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedProposal.id)}
                  className="px-4 py-2 bg-error hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
