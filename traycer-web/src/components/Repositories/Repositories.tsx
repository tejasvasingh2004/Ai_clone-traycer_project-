import { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  MoreVertical,
  Github,
  CheckCircle,
  AlertCircle,
  Filter,
  Star,
  Lock,
  Clock,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';

const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Just now';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
};

export function Repositories() {
  const { repositories, removeRepository, fetchRepositories, setSelectedRepository, setCurrentPage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);
  const [filter, setFilter] = useState<'all' | 'ready' | 'importing' | 'error'>('all');

  const filteredRepos = repositories.filter((repo) => {
    const matchesSearch = `${repo.name} ${repo.url} ${repo.language}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || repo.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleOpenRepo = (repo: any) => {
    if (repo.status === 'ready') {
      setSelectedRepository(repo);
      setCurrentPage('repository-editor');
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Repositories</h1>
          <p className="text-gray-400">Manage all your imported repositories in one place.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories..."
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/5 text-white placeholder-gray-500 focus:border-blue-500/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'ready' | 'importing' | 'error')}
            className="bg-transparent text-white text-sm outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="ready">Ready</option>
            <option value="importing">Importing</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredRepos.length === 0 ? (
          <div className="p-8 rounded-xl glass border border-white/5 text-center text-gray-400">
            No repositories imported yet.
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <div
              key={repo.id}
              onClick={() => handleOpenRepo(repo)}
              className={`p-5 rounded-xl glass border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group ${
                repo.status === 'ready' ? 'cursor-pointer' : 'opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center mt-0.5">
                    <Github className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-white transition-colors ${
                        repo.status === 'ready' ? 'group-hover:text-blue-400' : ''
                      }`}>
                        {repo.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${
                          repo.status === 'ready'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : repo.status === 'importing'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {repo.status === 'ready' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : repo.status === 'importing' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {repo.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{repo.url}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRepository(repo.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    <span>{repo.stars}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{repo.language}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{repo.is_private ? 'Private' : 'Public'}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Created {formatTimeAgo(repo.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
