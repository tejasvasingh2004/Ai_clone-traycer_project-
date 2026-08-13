import { useEffect } from 'react';
import {
  FolderKanban,
  GitBranch,
  MessageSquare,
  Zap,
  Clock,
  TrendingUp,
  ChevronRight,
  Circle,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
};


export function Dashboard() {
  const { setCurrentPage, systemStatus, plans, fetchStatus, fetchPlans } = useApp();

  useEffect(() => {
    fetchStatus();
    fetchPlans();
  }, [fetchStatus, fetchPlans]);

  const recentPlans = plans.slice(0, 3);
  const activities = plans
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((plan) => ({
      id: plan.id,
      action: 'Created',
      target: plan.taskName,
      time: formatTimeAgo(plan.createdAt),
      type: 'create' as const,
    }));

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Welcome back</h1>
          <p className="text-gray-400">Your AI-powered development workspace is ready.</p>
        </div>
        {systemStatus && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            <span className="text-sm text-green-400">All systems operational</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl glass border border-white/5 hover:border-white/10 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 group-hover:border-blue-500/30 transition-colors">
              <FolderKanban className="w-5 h-5 text-blue-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <h3 className="text-2xl font-semibold text-white mb-1">{systemStatus?.plans || 0}</h3>
          <p className="text-sm text-gray-400">Plans</p>
        </div>

        <div className="p-6 rounded-xl glass border border-white/5 hover:border-white/10 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 group-hover:border-cyan-500/30 transition-colors">
              <GitBranch className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-xs text-cyan-400 px-2 py-1 rounded-full bg-cyan-500/10">+3 new</span>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-1">{systemStatus?.proposals || 0}</h3>
          <p className="text-sm text-gray-400">Proposals</p>
        </div>

        <div className="p-6 rounded-xl glass border border-white/5 hover:border-white/10 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 group-hover:border-purple-500/30 transition-colors">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-purple-400 px-2 py-1 rounded-full bg-purple-500/10">+15 today</span>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-1">{systemStatus?.approved || 0}</h3>
          <p className="text-sm text-gray-400">Approved</p>
        </div>

        <div className="p-6 rounded-xl glass border border-white/5 hover:border-white/10 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 group-hover:border-green-500/30 transition-colors">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-green-400 px-2 py-1 rounded-full bg-green-500/10">98.5% success</span>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-1">{systemStatus?.pending || 0}</h3>
          <p className="text-sm text-gray-400">Pending</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Repositories */}
        <div className="lg:col-span-2 p-6 rounded-xl glass border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Repositories</h2>
            <button
              onClick={() => setCurrentPage('repositories')}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-400 transition-colors"
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {recentPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {plan.taskName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{plan.filesToModify.length} files</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-3">{plan.rationale || plan.steps[0]}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full bg-blue-500`} />
                    <span className="text-sm text-gray-400">TypeScript</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-sm">{formatTimeAgo(plan.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="p-6 rounded-xl glass border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          </div>

          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="text-gray-400">{activity.action}</span>{' '}
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage('history')}
            className="w-full mt-6 py-2.5 rounded-lg border border-white/5 text-sm text-gray-400 hover:text-white hover:border-white/10 transition-all"
          >
            View All Activity
          </button>
        </div>
      </div>

      {/* Quick Start Templates */}
      <div className="p-6 rounded-xl glass border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-6">Quick Start Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setCurrentPage('templates')}
            className="p-6 rounded-lg bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/20 hover:border-blue-500/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">⚛️</span>
            </div>
            <h3 className="font-medium text-white mb-1">React + TypeScript</h3>
            <p className="text-sm text-gray-400">Vite-powered React app with TypeScript</p>
          </button>

          <button
            onClick={() => setCurrentPage('templates')}
            className="p-6 rounded-lg bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/20 hover:border-green-500/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🐍</span>
            </div>
            <h3 className="font-medium text-white mb-1">Python FastAPI</h3>
            <p className="text-sm text-gray-400">Fast backend with Python FastAPI</p>
          </button>

          <button
            onClick={() => setCurrentPage('templates')}
            className="p-6 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/20 hover:border-purple-500/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🦀</span>
            </div>
            <h3 className="font-medium text-white mb-1">Rust Web Server</h3>
            <p className="text-sm text-gray-400">High-performance Rust web server</p>
          </button>
        </div>
      </div>
    </div>
  );
}
