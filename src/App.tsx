"use client";

import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { CodeWorkspace } from './components/CodeWorkspace/CodeWorkspace';
import { AIAssistant } from './components/AIAssistant/AIAssistant';
import { Terminal } from './components/Terminal/Terminal';
import { GitHubImport } from './components/GitHubImport/GitHubImport';
import { Workspaces } from './components/Workspaces/Workspaces';
import { Repositories } from './components/Repositories/Repositories';
import { Deployments } from './components/Deployments/Deployments';
import { Templates } from './components/Templates/Templates';
import { Settings } from './components/Settings/Settings';
import { PlanCreator } from './components/PlanCreator/PlanCreator';
import { Verify } from './components/Verify/Verify';
import { History } from './components/History/History';
import { RepositoryEditor } from './components/RepositoryEditor/RepositoryEditor';
import { ActivityBar } from './components/Sidebar/ActivityBar';
import { PanelErrorBoundary } from './components/ErrorBoundary/PanelErrorBoundary';
import { LoginForm } from './components/LoginForm';
import { authService } from './services/auth';


function MainContentWrapper() {
  const { sidebarCollapsed, terminalOpen, currentPage, editorMode } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'workspaces':
        return <Workspaces />;
      case 'github-import':
        return <GitHubImport />;
      case 'repositories':
        return <Repositories />;
      case 'templates':
        return <Templates />;
      case 'deployments':
        return <Deployments />;
      case 'settings':
        return <Settings />;
      case 'workspace':
        return <CodeWorkspace />;
      case 'plan-creator':
        return <PlanCreator />;
      case 'verify':
        return <Verify />;
      case 'history':
        return <History />;
      case 'repository-editor':
        return (
          <PanelErrorBoundary panelName="Repository Editor">
            <RepositoryEditor />
          </PanelErrorBoundary>
        );
      default:
        return <Dashboard />;
    }
  };

  const isWorkspace = currentPage === 'workspace' || currentPage === 'repository-editor';
  const isFullscreen = currentPage === 'repository-editor' && editorMode === 'fullscreen';

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {!isFullscreen && <Sidebar />}

      <main
        className={`transition-all duration-300 ${
          isFullscreen ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <div className="flex h-screen">
          {/* Activity Bar — only shown in repository editor */}
          {isWorkspace && !isFullscreen && (
            <PanelErrorBoundary panelName="Activity Bar">
              <ActivityBar />
            </PanelErrorBoundary>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 overflow-y-auto ${isWorkspace ? 'overflow-hidden' : ''}`}>
              {!isWorkspace && (
                <div className="relative min-h-full">
                  {/* Background gradient */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    {renderPage()}
                  </div>
                </div>
              )}

              {isWorkspace && renderPage()}
            </div>

            {/* Terminal */}
            {terminalOpen && (
              <PanelErrorBoundary panelName="Terminal">
                <Terminal />
              </PanelErrorBoundary>
            )}
          </div>

          {/* AI Assistant Panel */}
          <PanelErrorBoundary panelName="AI Assistant">
            <AIAssistant />
          </PanelErrorBoundary>
        </div>
      </main>

      {/* Toast Container */}
      <div id="toast-container" className="fixed top-4 right-4 z-50 space-y-2" />
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    authService.refreshToken()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  if (isAuthenticated === null) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#050508] text-white">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <AppProvider>
      <MainContentWrapper />
    </AppProvider>
  );
}

export default App;
