import { useEffect } from 'react';
import {
  Files,
  GitBranch,
  Search,
  Puzzle,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';

/**
 * VS Code-style activity bar — the narrow icon strip at the far left edge.
 * Only rendered when inside the repository-editor page.
 *
 * Implemented:
 *   Explorer      — toggles the file-tree sidebar panel
 *   Source Control — real git-status changed-file count badge
 *   Search        — real content grep across repository files
 *
 * Not implemented (clearly disabled, tooltip explains):
 *   Extensions    — no extensions system
 */
export function ActivityBar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    selectedRepository,
    gitStatus,
    fetchGitStatus,
    sidebarTab,
    setSidebarTab,
  } = useApp();

  // Poll git status every 5 seconds while a repo is open
  useEffect(() => {
    if (!selectedRepository) return;
    fetchGitStatus(selectedRepository.id);
    const interval = setInterval(() => fetchGitStatus(selectedRepository.id), 5000);
    return () => clearInterval(interval);
  }, [selectedRepository?.id, fetchGitStatus]);

  const handleExplorerClick = () => {
    if (sidebarCollapsed) {
      toggleSidebar();
    } else if (sidebarTab === 'explorer') {
      toggleSidebar(); // Toggle close if clicking already active tab
      return;
    }
    setSidebarTab('explorer');
  };

  const handleSourceControlClick = () => {
    if (selectedRepository) {
      fetchGitStatus(selectedRepository.id);
    }
    if (sidebarCollapsed) {
      toggleSidebar();
    } else if (sidebarTab === 'source-control') {
      toggleSidebar(); // Toggle close if clicking already active tab
      return;
    }
    setSidebarTab('source-control');
  };

  const handleSearchClick = () => {
    if (sidebarCollapsed) {
      toggleSidebar();
    } else if (sidebarTab === 'search') {
      toggleSidebar();
      return;
    }
    setSidebarTab('search');
  };

  const changeCount = gitStatus?.count ?? 0;

  return (
    <div className="w-12 flex-shrink-0 flex flex-col items-center py-2 gap-1 bg-[#0a0a0f] border-r border-white/5 z-20">
      {/* Explorer */}
      <button
        id="activity-bar-explorer-btn"
        onClick={handleExplorerClick}
        title="Explorer"
        className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
          !sidebarCollapsed && sidebarTab === 'explorer'
            ? 'text-white bg-white/10 border-l-2 border-blue-400'
            : 'text-gray-500 hover:text-white hover:bg-white/5'
        }`}
      >
        <Files className="w-5 h-5" />
      </button>

      {/* Source Control — real git status badge & view */}
      <button
        id="activity-bar-source-control-btn"
        onClick={handleSourceControlClick}
        title={`Source Control${changeCount > 0 ? ` (${changeCount} changes)` : ''}`}
        className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
          !sidebarCollapsed && sidebarTab === 'source-control'
            ? 'text-white bg-white/10 border-l-2 border-blue-400'
            : 'text-gray-500 hover:text-white hover:bg-white/5'
        }`}
      >
        <GitBranch className="w-5 h-5" />
        {changeCount > 0 && (
          <span
            id="source-control-badge"
            className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none"
          >
            {changeCount > 99 ? '99+' : changeCount}
          </span>
        )}
      </button>

      {/* Search — real content grep search */}
      <button
        id="activity-bar-search-btn"
        onClick={handleSearchClick}
        title="Search across files"
        className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
          !sidebarCollapsed && sidebarTab === 'search'
            ? 'text-white bg-white/10 border-l-2 border-blue-400'
            : 'text-gray-500 hover:text-white hover:bg-white/5'
        }`}
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Extensions — disabled */}
      <button
        disabled
        title="Extensions (not yet implemented)"
        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-700 cursor-not-allowed"
      >
        <Puzzle className="w-5 h-5" />
      </button>
    </div>
  );
}
