import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { SystemStatus } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const data = await api.getStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const quickActions = [
    {
      label: 'Create New Plan',
      icon: '✨',
      description: 'Start a new development task',
      path: '/plan',
      color: 'bg-primary hover:bg-primaryHover',
    },
    {
      label: 'Review Proposals',
      icon: '📋',
      description: 'Review and approve code changes',
      path: '/proposals',
      color: 'bg-surfaceHover hover:bg-border',
    },
    {
      label: 'Verify Code',
      icon: '✅',
      description: 'Run verification checks',
      path: '/verify',
      color: 'bg-surfaceHover hover:bg-border',
    },
    {
      label: 'View History',
      icon: '🕐',
      description: 'Browse past plans',
      path: '/history',
      color: 'bg-surfaceHover hover:bg-border',
    },
  ];

  return (
    <div className="ml-[220px] p-8">
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-text mb-6">Dashboard</h1>

        {loading ? (
          <div className="text-textMuted">Loading status...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-6 bg-surface border border-border rounded-lg">
                <div className="text-3xl font-bold text-primary mb-2">
                  {status?.plans || 0}
                </div>
                <div className="text-sm text-textMuted">Total Plans</div>
              </div>
              <div className="p-6 bg-surface border border-border rounded-lg">
                <div className="text-3xl font-bold text-warning mb-2">
                  {status?.proposals || 0}
                </div>
                <div className="text-sm text-textMuted">Total Proposals</div>
              </div>
              <div className="p-6 bg-surface border border-border rounded-lg">
                <div className="text-3xl font-bold text-success mb-2">
                  {status?.approved || 0}
                </div>
                <div className="text-sm text-textMuted">Approved</div>
              </div>
              <div className="p-6 bg-surface border border-border rounded-lg">
                <div className="text-3xl font-bold text-textMuted mb-2">
                  {status?.pending || 0}
                </div>
                <div className="text-sm text-textMuted">Pending</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold text-text mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className={`p-6 rounded-lg text-left transition-colors ${action.color}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{action.icon}</span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-text mb-1">
                          {action.label}
                        </h3>
                        <p className="text-sm text-textMuted">{action.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Getting Started */}
            {status && status.plans === 0 && (
              <div className="mt-8 p-6 bg-surface border border-border rounded-lg">
                <h2 className="text-lg font-semibold text-text mb-3">Getting Started</h2>
                <ol className="space-y-2 text-sm text-textMuted">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <span>Create a new plan by describing your task</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <span>Review the generated plan steps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <span>Generate code proposals based on the plan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">4.</span>
                    <span>Review and approve the code changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">5.</span>
                    <span>Run verification to ensure everything works</span>
                  </li>
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
