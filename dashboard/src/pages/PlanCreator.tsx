import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Plan } from '../types';
import StreamingLog from '../components/StreamingLog';

export default function PlanCreator() {
  const navigate = useNavigate();
  const [taskDescription, setTaskDescription] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) return;

    setLoading(true);
    setLogs([]);
    const newOperationId = `plan-${Date.now()}`;
    setOperationId(newOperationId);

    try {
      // Connect to SSE for streaming logs
      const eventSource = api.connectSSE(
        newOperationId,
        (data) => {
          if (data.message) {
            setLogs((prev) => [...prev, data.message]);
          }
        },
        (error) => {
          console.error('SSE error:', error);
        }
      );

      // Create the plan
      const createdPlan = await api.createPlan(taskDescription, autoGenerate, newOperationId);
      setPlan(createdPlan);
      
      // Close SSE connection after a delay
      setTimeout(() => {
        eventSource.close();
      }, 2000);

      if (autoGenerate) {
        navigate('/proposals');
      }
    } catch (error) {
      console.error('Failed to create plan:', error);
      setLogs((prev) => [...prev, `Error: ${error instanceof Error ? error.message : 'Failed to create plan'}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-[220px] p-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-text mb-6">Create New Plan</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Task Description
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe the task you want to accomplish..."
              className="w-full h-40 px-4 py-3 bg-surface border border-border rounded-lg text-text placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoGenerate"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surface text-primary focus:ring-primary"
              disabled={loading}
            />
            <label htmlFor="autoGenerate" className="text-sm text-text">
              Auto-generate code after plan creation
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !taskDescription.trim()}
            className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Plan...' : 'Create Plan'}
          </button>
        </form>

        {logs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text mb-4">Progress Log</h2>
            <StreamingLog logs={logs} />
          </div>
        )}

        {plan && !autoGenerate && (
          <div className="mt-8 p-6 bg-surface border border-border rounded-lg">
            <h2 className="text-lg font-semibold text-text mb-4">Plan Created</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-textMuted">Task:</span>
                <p className="text-text">{plan.taskName}</p>
              </div>
              <div>
                <span className="text-sm text-textMuted">Steps:</span>
                <ul className="mt-2 space-y-1">
                  {plan.steps.map((step, index) => (
                    <li key={index} className="text-sm text-text flex items-start gap-2">
                      <span className="text-primary">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-sm text-textMuted">Files to Modify:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.filesToModify.map((file) => (
                    <span
                      key={file}
                      className="px-2 py-1 bg-surfaceHover text-textMuted text-xs rounded"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate('/proposals')}
                className="mt-4 px-4 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg text-sm font-medium transition-colors"
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
