import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  LayoutTemplate,
  Rocket,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Github,
  User,
  Sparkles,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { PageType } from '../../types';

const navItems: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workspaces', label: 'Workspaces', icon: FolderKanban },
  { id: 'repositories', label: 'Repositories', icon: GitBranch },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'deployments', label: 'Deployments', icon: Rocket },
  { id: 'plan-creator', label: 'New Plan', icon: Sparkles },
  { id: 'verify', label: 'Verify', icon: CheckCircle },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, currentPage, setCurrentPage } = useApp();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const goToPage = (page: PageType) => {
    setCurrentPage(page);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[#0a0a0f] border-r border-white/5 flex flex-col transition-all duration-300 z-40 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center glow-blue flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="animate-fade-in">
              <h1 className="font-semibold text-white tracking-tight">CodeFlow AI</h1>
              <p className="text-xs text-gray-500">AI-Powered IDE</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 space-y-2 border-b border-white/5">
        <button
          onClick={() => goToPage('plan-creator')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/20 text-blue-400 hover:from-blue-600/30 hover:to-cyan-600/30 transition-all ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span className="text-sm font-medium">New Workspace</span>}
        </button>

        <button
          type="button"
          onClick={() => goToPage('github-import')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10 transition-all ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <Github className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-sm font-medium">
              Import from GitHub
            </span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => goToPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
              {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="mx-3 mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Collapse</span>
          </>
        )}
      </button>

      {/* User Profile */}
      <div className="p-3 border-t border-white/5 relative">
        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 text-left animate-fade-in">
              <p className="text-sm font-medium text-white">John Developer</p>
              <p className="text-xs text-gray-500">Pro Plan</p>
            </div>
          )}
        </button>

        {showProfileMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 p-2 rounded-lg bg-[#151520] border border-white/10 animate-fade-in">
            <button
              onClick={() => { goToPage('settings'); setShowProfileMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:bg-white/5 text-sm"
            >
              <Settings className="w-4 h-4" />
              Account Settings
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
