import { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { Plan } from '../../types/backend';

export function History() {
  const { plans, fetchPlans, setCurrentPage } = useApp();
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans().finally(() => setLoading(false));
  }, [fetchPlans]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-400">Loading plan history...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold text-white mb-2">Plan History</h1>
        <p className="text-gray-400">View all your previously created plans.</p>

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No plans created yet.</p>
            <button
              onClick={() => setCurrentPage('plan-creator')}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            >
              Create First Plan
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="p-6 rounded-xl glass border border-white/5 hover:border-white/10 cursor-pointer transition-all"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {plan.taskName}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Created: {formatDate(plan.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-white/5 text-gray-400 text-xs rounded border border-white/10">
                      {plan.steps.length} steps
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {plan.filesToModify.slice(0, 3).map((file) => (
                    <span
                      key={file}
                      className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded border border-white/10"
                    >
                      {file}
                    </span>
                  ))}
                  {plan.filesToModify.length > 3 && (
                    <span className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded border border-white/10">
                      +{plan.filesToModify.length - 3} more
                    </span>
                  )}
                </div>

                {plan.rationale && (
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {plan.rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0f] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/10">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {selectedPlan.taskName}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Created: {formatDate(selectedPlan.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-6">
                {selectedPlan.rationale && (
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Rationale</h4>
                    <p className="text-sm text-gray-400">{selectedPlan.rationale}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Steps</h4>
                  <ul className="space-y-2">
                    {selectedPlan.steps.map((step, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-blue-400">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Files to Modify</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlan.filesToModify.map((file) => (
                      <span
                        key={file}
                        className="px-3 py-1.5 bg-white/5 text-gray-400 text-sm rounded border border-white/10"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedPlan(null);
                    setCurrentPage('repositories');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
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
