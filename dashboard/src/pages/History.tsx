import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Plan } from '../types';
import StepList from '../components/StepList';

export default function History() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    try {
      const data = await api.getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="ml-[220px] p-8">
        <div className="text-textMuted">Loading plan history...</div>
      </div>
    );
  }

  return (
    <div className="ml-[220px] p-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-text mb-6">Plan History</h1>

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-textMuted">No plans created yet.</p>
            <button
              onClick={() => navigate('/plan')}
              className="mt-4 px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Create First Plan
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="p-6 bg-surface border border-border rounded-lg hover:border-primary cursor-pointer transition-colors"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text mb-2">
                      {plan.taskName}
                    </h3>
                    <p className="text-sm text-textMuted">
                      Created: {formatDate(plan.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-surfaceHover text-textMuted text-xs rounded">
                      {plan.steps.length} steps
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {plan.filesToModify.slice(0, 3).map((file) => (
                    <span
                      key={file}
                      className="px-2 py-1 bg-surfaceHover text-textMuted text-xs rounded"
                    >
                      {file}
                    </span>
                  ))}
                  {plan.filesToModify.length > 3 && (
                    <span className="px-2 py-1 bg-surfaceHover text-textMuted text-xs rounded">
                      +{plan.filesToModify.length - 3} more
                    </span>
                  )}
                </div>

                {plan.rationale && (
                  <p className="text-sm text-textMuted line-clamp-2">
                    {plan.rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-text mb-2">
                    {selectedPlan.taskName}
                  </h3>
                  <p className="text-sm text-textMuted">
                    Created: {formatDate(selectedPlan.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-textMuted hover:text-text text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-6">
                {selectedPlan.rationale && (
                  <div>
                    <h4 className="text-sm font-semibold text-text mb-2">Rationale</h4>
                    <p className="text-sm text-textMuted">{selectedPlan.rationale}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-text mb-3">Steps</h4>
                  <StepList steps={selectedPlan.steps} />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text mb-3">Files to Modify</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlan.filesToModify.map((file) => (
                      <span
                        key={file}
                        className="px-3 py-1.5 bg-surfaceHover text-textMuted text-sm rounded"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedPlan.dependencyOrder && selectedPlan.dependencyOrder.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text mb-3">Dependency Order</h4>
                    <ol className="text-sm text-textMuted space-y-1">
                      {selectedPlan.dependencyOrder.map((dep, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">{index + 1}.</span>
                          <span>{dep}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {selectedPlan.contextSnapshot && (
                  <div>
                    <h4 className="text-sm font-semibold text-text mb-3">Context Snapshot</h4>
                    <div className="p-4 bg-surfaceHover rounded-lg space-y-3">
                      <div>
                        <span className="text-xs text-textMuted">Project Summary:</span>
                        <p className="text-sm text-text mt-1">
                          {selectedPlan.contextSnapshot.projectSummary}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-textMuted">Existing Patterns:</span>
                        <div className="mt-2 space-y-1">
                          <div className="text-sm text-text">
                            <span className="text-textMuted">Import Style:</span>{' '}
                            {selectedPlan.contextSnapshot.existingPatterns.importStyle}
                          </div>
                          <div className="text-sm text-text">
                            <span className="text-textMuted">Naming Convention:</span>{' '}
                            {selectedPlan.contextSnapshot.existingPatterns.namingConvention}
                          </div>
                          <div className="text-sm text-text">
                            <span className="text-textMuted">Test Framework:</span>{' '}
                            {selectedPlan.contextSnapshot.existingPatterns.testFramework}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 bg-surfaceHover hover:bg-border text-text rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedPlan(null);
                    navigate('/proposals');
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg text-sm font-medium transition-colors"
                >
                  View Proposals
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
