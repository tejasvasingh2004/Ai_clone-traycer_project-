import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Maximize2,
  Minimize2,
  FolderOpen,
  Terminal as TerminalIcon,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  FilePlus,
  FolderPlus,
  RefreshCw,
  ChevronsUpDown,
  X,
  Check,
  Plus,
  Minus,
  Trash2,
  FileCode,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { FileTree } from './FileTree';
import { FileEditor } from './FileEditor';
import { DiffViewer } from './DiffViewer';
import { api } from '../../api/client';
import { splitGitStatusLines, type GitFileStatus } from '../../utils/gitStatus';

/** Small inline dialog that captures a filename or folder name */
function NameInputOverlay({
  label,
  placeholder,
  onConfirm,
  onCancel,
}: {
  label: string;
  placeholder: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-center gap-2 px-3 py-2 bg-[#111827] border-b border-blue-500/40 shadow-lg">
      <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none border-b border-blue-500/60"
      />
      <button
        onClick={() => value.trim() && onConfirm(value.trim())}
        className="p-1 rounded text-green-400 hover:bg-white/10"
        title="Confirm"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={onCancel} className="p-1 rounded text-gray-500 hover:bg-white/10" title="Cancel">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function RepositoryEditor() {
  const {
    selectedRepository,
    repositoryFileTree,
    fetchRepositoryFileTree,
    setCurrentPage,
    editorMode,
    setEditorMode,
    sidebarCollapsed,
    toggleSidebar,
    aiPanelOpen,
    toggleAiPanel,
    terminalOpen,
    toggleTerminal,
    selectedFile,
    setSelectedFile,
    addTerminalEntry,
    createFile,
    createFolder,
    collapseAllNodes,
    sidebarTab,
    gitStatus,
    fetchGitStatus,
    gitStageFile,
    gitUnstageFile,
    gitDiscardFile,
    gitCommit,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [overlay, setOverlay] = useState<'file' | 'folder' | null>(null);
  const [explorerError, setExplorerError] = useState<string | null>(null);

  // Real Content Search state
  const [searchContentQuery, setSearchContentQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ path: string; line: number; text: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Source Control commit state
  const [commitMessage, setCommitMessage] = useState('');
  const [isGeneratingCommitMsg, setIsGeneratingCommitMsg] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const handleContentSearch = async (q: string) => {
    setSearchContentQuery(q);
    if (!q.trim() || !selectedRepository) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.searchRepository(selectedRepository.id, q.trim());
      setSearchResults(res.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateCommitMsg = async () => {
    if (!selectedRepository) return;
    setIsGeneratingCommitMsg(true);
    try {
      const res = await api.gitGenerateCommitMsg(selectedRepository.id);
      setCommitMessage(res.message);
    } catch {
      setCommitMessage('chore: update code files');
    } finally {
      setIsGeneratingCommitMsg(false);
    }
  };

  const handleCommitSubmit = async () => {
    if (!commitMessage.trim() || !selectedRepository) return;
    setIsCommitting(true);
    try {
      await gitCommit(selectedRepository.id, commitMessage.trim());
      setCommitMessage('');
    } catch (e: any) {
      setExplorerError(e.message || 'Failed to commit');
    } finally {
      setIsCommitting(false);
    }
  };

  // Fetch the file tree and git status when the component mounts or repository changes
  useEffect(() => {
    if (selectedRepository) {
      fetchRepositoryFileTree(selectedRepository.id);
      fetchGitStatus(selectedRepository.id);
    }
  }, [selectedRepository, fetchRepositoryFileTree, fetchGitStatus]);

  // Clean up selected file on unmount
  useEffect(() => {
    return () => {
      setSelectedFile(null);
    };
  }, [setSelectedFile]);

  // Filter tree helper function
  const filteredTree = useMemo(() => {
    const safeTree = Array.isArray(repositoryFileTree) ? repositoryFileTree : [];
    if (!searchQuery) return safeTree;
    const lowerQuery = searchQuery.toLowerCase();

    const filterNodes = (nodes: any[]): any[] => {
      if (!Array.isArray(nodes)) return [];
      return nodes
        .map((node) => {
          if (!node || !node.name || typeof node.name !== 'string') return null;
          if (node.type === 'file') {
            return node.name.toLowerCase().includes(lowerQuery) ? node : null;
          }

          const filteredChildren = filterNodes(node.children || []);
          if (filteredChildren.length > 0) {
            return {
              ...node,
              isExpanded: true,
              children: filteredChildren,
            };
          }

          return node.name.toLowerCase().includes(lowerQuery)
            ? { ...node, children: [] }
            : null;
        })
        .filter(Boolean);
    };

    return filterNodes(safeTree);
  }, [repositoryFileTree, searchQuery]);

  if (!selectedRepository) {
    return (
      <div className="h-full flex items-center justify-center bg-[#050508] text-gray-400">
        <div className="text-center p-8 rounded-xl glass border border-white/5 max-w-sm">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-blue-500 opacity-80" />
          <h2 className="text-xl font-semibold text-white mb-2">No Repository Selected</h2>
          <p className="text-sm text-gray-500 mb-6">
            Please choose a repository from the list to view its code and start editing.
          </p>
          <button
            onClick={() => setCurrentPage('repositories')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Repositories
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    setCurrentPage('repositories');
  };

  const toggleFullscreen = () => {
    if (editorMode === 'fullscreen') {
      setEditorMode('default');
      if (!aiPanelOpen) toggleAiPanel();
    } else {
      setEditorMode('fullscreen');
      if (aiPanelOpen) toggleAiPanel();
    }
  };

  const handleToggleTerminal = () => {
    if (!terminalOpen && selectedRepository) {
      addTerminalEntry({
        id: Date.now().toString(),
        command: '',
        output: `Initialized terminal session for repository: ${selectedRepository.name}\nShell directory set to: repositories/${selectedRepository.id}\nType any shell command (e.g. dir, node -v, git status) to execute inside the repo.`,
        status: 'completed',
        timestamp: new Date().toISOString(),
      });
    }
    toggleTerminal();
  };

  const handleNewFile = async (name: string) => {
    setOverlay(null);
    setExplorerError(null);
    try {
      await createFile(selectedRepository.id, name);
    } catch (e: any) {
      setExplorerError(e.message || 'Failed to create file');
    }
  };

  const handleNewFolder = async (name: string) => {
    setOverlay(null);
    setExplorerError(null);
    try {
      await createFolder(selectedRepository.id, name);
    } catch (e: any) {
      setExplorerError(e.message || 'Failed to create folder');
    }
  };

  const handleRefresh = () => {
    if (selectedRepository) {
      fetchRepositoryFileTree(selectedRepository.id);
      fetchGitStatus(selectedRepository.id);
    }
  };

  const gitFileLists = useMemo(() => {
    const lines = gitStatus?.files ?? [];
    return splitGitStatusLines(lines);
  }, [gitStatus]);

  const openFileDiff = async (filePath: string, isDeleted: boolean) => {
    if (isDeleted || !selectedRepository) return;
    try {
      const diffRes = await api.getGitFileDiff(selectedRepository.id, filePath);
      setSelectedFile({
        id: `diff-${filePath}`,
        name: filePath.split('/').pop() || filePath,
        path: filePath,
        type: 'diff',
        content: diffRes.diff,
      });
    } catch {}
  };

  const renderGitFileRow = (file: GitFileStatus, showStage: boolean, showUnstage: boolean) => {
    const { path: filePath, displayStatus, isUntracked, isStaged } = file;
    const isDeleted = file.indexStatus === 'D' || file.workTreeStatus === 'D';

    return (
      <div
        key={`${showStage ? 'staged' : 'unstaged'}-${filePath}`}
        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-white/5 text-xs group transition-colors"
      >
        <div
          className="flex items-center gap-1.5 flex-1 truncate cursor-pointer"
          onClick={() => openFileDiff(filePath, isDeleted)}
        >
          <span className="truncate text-gray-300 font-mono text-[11px] group-hover:text-white">
            {filePath}
          </span>
          <span
            className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono ${
              isUntracked
                ? 'bg-green-500/20 text-green-400'
                : isDeleted
                ? 'bg-red-500/20 text-red-400'
                : isStaged
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {displayStatus}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {showStage && (
            <button
              onClick={() => selectedRepository && gitStageFile(selectedRepository.id, filePath)}
              className="p-1 rounded text-gray-400 hover:text-green-400 hover:bg-white/10"
              title="Stage Changes (+)"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
          {showUnstage && (
            <button
              onClick={() => selectedRepository && gitUnstageFile(selectedRepository.id, filePath)}
              className="p-1 rounded text-gray-400 hover:text-yellow-400 hover:bg-white/10"
              title="Unstage Changes (-)"
            >
              <Minus className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => openFileDiff(filePath, isDeleted)}
            className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-white/10"
            title="View Diff"
          >
            <FileCode className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (selectedRepository && window.confirm(`Discard changes to ${filePath}? This action cannot be undone.`)) {
                gitDiscardFile(selectedRepository.id, filePath);
              }
            }}
            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-white/10"
            title="Discard Changes"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#050508] text-gray-300 overflow-hidden select-none">
      {/* Upper Navigation Bar / Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0f] border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-400 hover:text-white transition-all"
            title="Back to Repositories"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">
                {selectedRepository.name}
              </h2>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                repo
              </span>
            </div>
            <p className="text-[11px] text-gray-500 truncate max-w-xs sm:max-w-md">
              {selectedRepository.url}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-lg transition-all ${
              sidebarCollapsed
                ? 'text-gray-500 hover:text-white hover:bg-white/5'
                : 'text-blue-400 bg-blue-500/10 border border-blue-500/10'
            }`}
            title={sidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
          >
            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <button
            onClick={handleToggleTerminal}
            className={`p-2 rounded-lg transition-all ${
              terminalOpen
                ? 'text-blue-400 bg-blue-500/10 border border-blue-500/10'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle Integrated Terminal"
          >
            <TerminalIcon className="w-4 h-4" />
          </button>

          <button
            onClick={toggleAiPanel}
            className={`p-2 rounded-lg transition-all ${
              aiPanelOpen
                ? 'text-blue-400 bg-blue-500/10 border border-blue-500/10'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
            title="Toggle AI Chat Panel"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            title={editorMode === 'fullscreen' ? 'Exit Zen Mode' : 'Zen Mode (Fullscreen)'}
          >
            {editorMode === 'fullscreen' ? (
              <Minimize2 className="w-4 h-4 text-blue-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side File Tree / Source Control panel */}
        {!sidebarCollapsed && (
          <div className="w-64 flex flex-col bg-[#07070a] border-r border-white/5 flex-shrink-0">
            {sidebarTab === 'explorer' ? (
              <>
                {/* Explorer header with VS Code-style controls */}
                <div className="px-3 py-2 border-b border-white/5 bg-[#0a0a0f] relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Explorer</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        id="explorer-new-file-btn"
                        onClick={() => { setOverlay('file'); setExplorerError(null); }}
                        className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="New File"
                      >
                        <FilePlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id="explorer-new-folder-btn"
                        onClick={() => { setOverlay('folder'); setExplorerError(null); }}
                        className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="New Folder"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id="explorer-refresh-btn"
                        onClick={handleRefresh}
                        className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="Refresh Explorer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id="explorer-collapse-btn"
                        onClick={collapseAllNodes}
                        className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="Collapse All"
                      >
                        <ChevronsUpDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/5">
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search files..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none"
                    />
                  </div>

                  {/* Inline name-input overlay */}
                  {overlay === 'file' && (
                    <NameInputOverlay
                      label="New file:"
                      placeholder="filename.ts"
                      onConfirm={handleNewFile}
                      onCancel={() => setOverlay(null)}
                    />
                  )}
                  {overlay === 'folder' && (
                    <NameInputOverlay
                      label="New folder:"
                      placeholder="folder-name"
                      onConfirm={handleNewFolder}
                      onCancel={() => setOverlay(null)}
                    />
                  )}
                </div>

                {/* Error message */}
                {explorerError && (
                  <div className="px-3 py-1.5 text-xs text-red-400 bg-red-900/20 border-b border-red-500/20">
                    {explorerError}
                  </div>
                )}

                {/* File tree navigation list */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                  {filteredTree.length === 0 ? (
                    <div className="text-center text-xs text-gray-600 mt-8">
                      No matching files
                    </div>
                  ) : (
                    <FileTree nodes={filteredTree} />
                  )}
                </div>
              </>
            ) : sidebarTab === 'search' ? (
              /* Content Search View */
              <div className="flex-1 flex flex-col overflow-hidden" id="search-panel">
                <div className="px-3 py-2 border-b border-white/5 bg-[#0a0a0f] flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Search Content</span>
                  <span className="text-[10px] text-gray-500 font-mono">{searchResults.length} results</span>
                </div>

                <div className="p-3 border-b border-white/5 bg-[#0a0a0f]">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/5 focus-within:border-blue-500/50">
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                    <input
                      id="search-input-box"
                      type="text"
                      value={searchContentQuery}
                      onChange={(e) => handleContentSearch(e.target.value)}
                      placeholder="Search text in files..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin" id="search-results-list">
                  {isSearching ? (
                    <div className="text-center text-xs text-gray-500 mt-8">Searching repository...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center text-xs text-gray-600 mt-8">
                      {searchContentQuery ? 'No results found' : 'Type to search across files'}
                    </div>
                  ) : (
                    searchResults.map((res, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-md hover:bg-white/5 text-xs cursor-pointer group transition-colors border border-transparent hover:border-white/5"
                        onClick={async () => {
                          if (selectedRepository) {
                            try {
                              const content = await api.getFileContent(selectedRepository.id, res.path);
                              setSelectedFile({
                                id: res.path,
                                name: res.path.split('/').pop() || res.path,
                                path: res.path,
                                type: 'file',
                                content,
                                targetLine: res.line,
                              });
                            } catch {}
                          }
                        }}
                      >
                        <div className="flex items-center justify-between font-mono text-[11px] text-blue-400 group-hover:text-blue-300">
                          <span className="truncate">{res.path}</span>
                          <span className="text-gray-500 text-[10px]">L{res.line}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5 opacity-80 group-hover:opacity-100">
                          {res.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Source Control View with Full Actions */
              <div className="flex-1 flex flex-col overflow-hidden" id="source-control-panel">
                <div className="px-3 py-2 border-b border-white/5 bg-[#0a0a0f] flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Source Control</span>
                  <button
                    onClick={() => selectedRepository && fetchGitStatus(selectedRepository.id)}
                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                    title="Refresh Status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Error message */}
                {explorerError && (
                  <div className="px-3 py-1.5 text-xs text-red-400 bg-red-900/20 border-b border-red-500/20">
                    {explorerError}
                  </div>
                )}

                {/* Commit Message Box & Action Controls */}
                <div className="p-3 border-b border-white/5 bg-[#0a0a0f] space-y-2">
                  <div className="relative">
                    <textarea
                      id="commit-message-input"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message..."
                      rows={2}
                      className="w-full p-2 bg-white/5 border border-white/10 rounded-md text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500/50 resize-none font-mono"
                    />
                    <button
                      id="generate-commit-msg-btn"
                      onClick={handleGenerateCommitMsg}
                      disabled={isGeneratingCommitMsg}
                      className="absolute bottom-2 right-2 p-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                      title="AI Generate Commit Message"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    id="commit-submit-btn"
                    onClick={handleCommitSubmit}
                    disabled={isCommitting || !commitMessage.trim() || gitFileLists.staged.length === 0}
                    title={gitFileLists.staged.length === 0 ? "Nothing staged" : ""}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Commit Staged</span>
                  </button>
                </div>

                <div className="px-3 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs text-gray-400 font-medium">
                  <span>Staged Changes</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                    {gitFileLists.staged.length}
                  </span>
                </div>

                <div className="max-h-32 overflow-y-auto p-2 space-y-1 scrollbar-thin border-b border-white/5">
                  {gitFileLists.staged.length === 0 ? (
                    <div className="text-center text-xs text-gray-600 py-2">No staged changes</div>
                  ) : (
                    gitFileLists.staged.map((file) => renderGitFileRow(file, false, true))
                  )}
                </div>

                <div className="px-3 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs text-gray-400 font-medium">
                  <span>Changes</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                    {gitFileLists.unstaged.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin" id="source-control-file-list">
                  {gitFileLists.unstaged.length === 0 ? (
                    <div className="text-center text-xs text-gray-600 mt-8">
                      No unstaged changes in working tree
                    </div>
                  ) : (
                    gitFileLists.unstaged.map((file) => renderGitFileRow(file, true, false))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Center Code Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile?.type === 'diff' ? (
            <DiffViewer diff={selectedFile.content} fileName={selectedFile.name} />
          ) : (
            <FileEditor />
          )}
        </div>
      </div>
    </div>
  );
}
export default RepositoryEditor;
