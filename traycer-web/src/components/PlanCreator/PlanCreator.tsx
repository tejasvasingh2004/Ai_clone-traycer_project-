import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Plan } from '../../types/backend';

export function PlanCreator() {
  const { createPlan, connectSSE, waitForSSEConnection, addStreamingLog, setCurrentPage } = useApp();
  const [taskDescription, setTaskDescription] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) return;

    setLoading(true);
    const newOperationId = `plan-${Date.now()}`;
  

    try {
      // Connect to SSE for streaming logs
      const eventSource = connectSSE(newOperationId, (data) => {
        if (data.message) {
          addStreamingLog(data.message);
        }
      });
      await waitForSSEConnection(eventSource);

      // Create the plan
      const createdPlan = await createPlan(taskDescription, autoGenerate, newOperationId);
      setPlan(createdPlan);

      if (autoGenerate) {
        setCurrentPage('repositories');
      }
    } catch (error) {
      console.error('Failed to create plan:', error);
      addStreamingLog(`Error: ${error instanceof Error ? error.message : 'Failed to create plan'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold text-white mb-2">Create New Plan</h1>
        <p className="text-gray-400">Describe your task and AI will generate a step-by-step plan.</p>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Task Description
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe the task you want to accomplish..."
              className="w-full h-40 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoGenerate"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
              disabled={loading}
            />
            <label htmlFor="autoGenerate" className="text-sm text-gray-300">
              Auto-generate code after plan creation
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !taskDescription.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            {loading ? 'Creating Plan...' : 'Create Plan'}
          </button>
        </form>

        {plan && !autoGenerate && (
          <div className="mt-8 p-6 rounded-xl glass border border-white/5">
            <h2 className="text-lg font-semibold text-white mb-4">Plan Created</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-400">Task:</span>
                <p className="text-white">{plan.taskName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Rationale:</span>
                <p className="text-white mt-1">{plan.rationale}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Steps:</span>
                <ul className="mt-2 space-y-2">
                  {plan.steps.map((step, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-blue-400">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-sm text-gray-400">Files to Modify:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.filesToModify.map((file) => (
                    <span
                      key={file}
                      className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded border border-white/10"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('repositories')}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              >
                View Proposals
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
