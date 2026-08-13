import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  FolderKanban,
  GitBranch,
  Clock,
  Edit,
  Trash2,
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

export function Workspaces() {
  const { setCurrentPage, setSelectedPlanId, plans, deletePlan, fetchPlans } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredWorkspaces = plans.filter((w) =>
    w.taskName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this workspace plan?')) {
      try {
        await deletePlan(id);
      } catch (err) {
        alert('Failed to delete workspace plan');
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage('plan-creator');
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Workspaces</h1>
          <p className="text-gray-400">Organize your projects and repositories into workspaces.</p>
        </div>
        <button 
          onClick={() => setCurrentPage('plan-creator')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Workspace
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
            placeholder="Search workspaces..."
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/5 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="p-6 rounded-xl glass border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
            onClick={() => { setSelectedPlanId(workspace.id); setCurrentPage('workspace'); }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {workspace.taskName}
                  </h3>
                  <p className="text-sm text-gray-500">{workspace.filesToModify.length} files</p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleEdit}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, workspace.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">{workspace.rationale || workspace.steps[0]}</p>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>{workspace.filesToModify.length} files</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimeAgo(workspace.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
