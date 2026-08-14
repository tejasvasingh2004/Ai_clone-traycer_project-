import { useState, Fragment, useEffect } from 'react';
import {
  File,
  GitBranch,
  Search,
  X,
  Circle,
  CheckCircle,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { StagedProposal } from '../../types/backend';


interface FileTreeItemProps {
  proposal: StagedProposal;
  onFileClick: (proposal: StagedProposal) => void;
}

function FileTreeItem({ proposal, onFileClick }: FileTreeItemProps) {
  const getFileColor = () => {
    const ext = proposal.filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
        return 'text-blue-400';
      case 'jsx':
      case 'js':
        return 'text-yellow-400';
      case 'css':
        return 'text-pink-400';
      case 'json':
        return 'text-yellow-500';
      case 'md':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  const handleClick = () => {
    onFileClick(proposal);
  };

  const isActive = false;

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1 py-1.5 px-2 hover:bg-white/5 transition-colors group ${
          isActive ? 'bg-white/10' : ''
        }`}
      >
        <span className="w-3" />
        <File className="w-4 h-4 text-gray-400" />
        <span className={`text-sm flex-1 text-left ${getFileColor()}`}>
          {proposal.filePath.split('/').pop()}
        </span>
        {!proposal.approved && <Circle className="w-2 h-2 fill-yellow-400 text-yellow-400" />}
      </button>
    </div>
  );
}

interface EditorTabProps {
  proposal: StagedProposal;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

function EditorTab({ proposal, isActive, onClick, onClose }: EditorTabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 border-r border-white/5 group transition-colors ${
        isActive ? 'bg-[#1a1a24] text-white' : 'bg-[#12121a] text-gray-400 hover:bg-white/5'
      }`}
    >
      <File className="w-3.5 h-3.5" />
      <span className="text-sm">{proposal.filePath.split('/').pop()}</span>
      {!proposal.approved && <Circle className="w-1.5 h-1.5 fill-yellow-400 text-yellow-400 ml-1" />}
      <button
        onClick={onClose}
        className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </button>
  );
}

export function CodeWorkspace() {
  const { proposals, approveProposal, selectedPlanId, fetchProposals } = useApp();
  const [openTabs, setOpenTabs] = useState<StagedProposal[]>([]);
  const [activeTab, setActiveTab] = useState<StagedProposal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleFileClick = (proposal: StagedProposal) => {
    setActiveTab(proposal);
    if (!openTabs.find((t) => t.id === proposal.id)) {
      setOpenTabs([...openTabs, proposal]);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, proposal: StagedProposal) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t.id !== proposal.id);
    setOpenTabs(newTabs);
    if (activeTab?.id === proposal.id) {
      setActiveTab(newTabs[newTabs.length - 1] || null);
    }
  };

  const filteredProposals = (Array.isArray(proposals) ? proposals : []).filter((p) => {
    const matchesSearch = p.filePath.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = selectedPlanId ? p.planId === selectedPlanId : true;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="h-full flex flex-col bg-[#0f0f15]">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0a0a0f]">
        <div className="flex items-center gap-2 text-sm">
          <GitBranch className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">main</span>
          <span className="text-gray-600">/</span>
          {activeTab && (
            <>
              {activeTab.filePath.split('/').filter(Boolean).map((part: string, i: number, arr: string[]) => (
                <Fragment key={i}>
                  <span className={i === arr.length - 1 ? 'text-white' : 'text-gray-400'}>
                    {part}
                  </span>
                  {i < arr.length - 1 && <span className="text-gray-600">/</span>}
                </Fragment>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 border-r border-white/5 flex flex-col bg-[#0a0a0f]">
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-2 text-xs text-gray-500 uppercase tracking-wider px-4 py-2">
              Proposals
            </div>
            {filteredProposals.map((proposal) => (
              <FileTreeItem key={proposal.id} proposal={proposal} onFileClick={handleFileClick} />
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center bg-[#12121a] border-b border-white/5 overflow-x-auto">
            {openTabs.map((proposal) => (
              <EditorTab
                key={proposal.id}
                proposal={proposal}
                isActive={activeTab?.id === proposal.id}
                onClick={() => setActiveTab(proposal)}
                onClose={(e) => handleCloseTab(e, proposal)}
              />
            ))}
          </div>

          {/* Code Editor */}
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-auto bg-[#1a1a24] scrollbar-thin">
              {activeTab ? (
                <div className="min-w-max">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#12121a]">
                    <span className="text-sm text-gray-400">{activeTab.filePath}</span>
                    {!activeTab.approved && (
                      <button
                        onClick={() => approveProposal(activeTab.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all text-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                    )}
                  </div>
                  {/* Editor Content */}
                  <pre className="font-mono text-sm leading-6 py-4">
                    {activeTab.newContent.split('\n').map((line, i) => (
                      <div key={i} className="flex hover:bg-white/5 transition-colors">
                        <span className="w-12 text-right pr-4 text-gray-600 select-none">{i + 1}</span>
                        <code className="text-gray-300">{line}</code>
                      </div>
                    ))}
                  </pre>
                  {/* Diff View */}
                  {activeTab.diff && (
                    <div className="border-t border-white/5 p-4">
                      <h3 className="text-sm font-semibold text-white mb-2">Diff</h3>
                      <pre className="font-mono text-xs text-gray-400 whitespace-pre-wrap">
                        {activeTab.diff}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <File className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>Select a proposal to view its contents</p>
                  </div>
                </div>
              )}
            </div>

            {/* Minimap */}
            <div className="w-24 bg-[#12121a] border-l border-white/5 hidden lg:block">
              <div className="p-2 opacity-30">
                {activeTab?.newContent.split('\n').slice(0, 100).map((_, i) => (
                  <div key={i} className="h-0.5 bg-gray-600 my-0.5 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#050508] border-t border-white/5 text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />
            main
          </span>
          <span>Synced</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{activeTab?.operation || 'Modify'}</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>
    </div>
  );
}
