import { useState, useEffect } from 'react';
import {
  Rocket,
  Search,
  Clock,
  CheckCircle,
  GitBranch,
  RefreshCcw,
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


export function Deployments() {
  const { proposals, fetchProposals, rollbackProposal } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const approvedProposals = proposals.filter(p => p.approved);
  const filteredDeployments = approvedProposals.filter((d) =>
    d.filePath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRollback = async (id: string) => {
    if (confirm('Are you sure you want to rollback (revert) this deployment?')) {
      try {
        await rollbackProposal(id);
        await fetchProposals();
      } catch (err) {
        alert('Failed to rollback deployment');
      }
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Deployments</h1>
          <p className="text-gray-400">Monitor and manage your deployments.</p>
        </div>
        <button 
          onClick={() => fetchProposals()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-300 hover:border-white/10 transition-all"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deployments..."
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/5 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Deployments List */}
      <div className="space-y-3">
        {filteredDeployments.map((deployment) => (
          <div
            key={deployment.id}
            className="p-5 rounded-xl glass border border-white/5 hover:border-white/10 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white">{deployment.filePath}</h3>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Deployed</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{deployment.operation === 'create' ? 'Create' : 'Modify'}</span>
                    </div>
                    <span className="text-gray-600">•</span>
                    <span>#{deployment.id.slice(0, 7)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleRollback(deployment.id)}
                  title="Rollback deployment"
                  className="px-3 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25 hover:text-red-300 transition-all flex items-center gap-1 font-medium"
                >
                  Rollback
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimeAgo(deployment.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl glass border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-gray-400">Active Deployments</span>
          </div>
          <p className="text-2xl font-semibold text-white">
            {approvedProposals.length}
          </p>
        </div>

      </div>
    </div>
  );
}
