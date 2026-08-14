import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Sparkles,
  Play,
  CheckCircle2,
  Bot,
  User,
  Copy,
  Check,
  Paperclip,
  X,
  PlusCircle,
  History as HistoryIcon,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { ChatMessage } from '../../types';
import { api } from '../../api/client';
import { comparePlanToExecution, formatReviewReport } from '../../utils/planReview';

/** Extract shell commands from AI message content.
 * Matches: lines starting with $ or ``` bash/sh fenced blocks.
 */
function extractCommands(content: string): string[] {
  const commands: string[] = [];
  const fenced = content.matchAll(/```(?:bash|sh|shell)\s*\n([^`]+)```/gi);
  for (const m of fenced) {
    commands.push(...m[1].split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#')));
  }
  const dollarLines = content.split('\n').filter(l => l.trim().startsWith('$ '));
  for (const l of dollarLines) {
    commands.push(l.trim().slice(2).trim());
  }
  return [...new Set(commands)];
}

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    session_id: 'session-1',
    role: 'assistant',
    content: 'Hello! I\'m your AI coding assistant. I can help you Plan, Execute, and Review code changes across your repository. What would you like to build or modify today?',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

interface MessageBubbleProps {
  message: ChatMessage;
  onRunCommand?: (cmd: string) => void;
  onRevertPlan?: (planId: string) => void;
}

function MessageBubble({ message, onRunCommand, onRevertPlan }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const commands = !isUser ? extractCommands(message.content) : [];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-gradient-to-br from-green-500 to-cyan-500'
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-blue-400" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`px-4 py-3 rounded-xl ${
            isUser
              ? 'bg-blue-500/20 border border-blue-500/30 text-white'
              : 'bg-white/5 border border-white/5 text-gray-200'
          }`}
        >
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{message.content.replace(/\[REVERT_PLAN:[^\]]+\]/g, '').trim()}</pre>
        </div>

        {!isUser && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {commands.map((cmd, i) => (
              <button
                key={i}
                onClick={() => onRunCommand?.(cmd)}
                title={`Run in Terminal: ${cmd}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs hover:bg-green-500/20 transition-all"
              >
                <Play className="w-3 h-3" />
                <span className="font-mono truncate max-w-[140px]">{cmd}</span>
              </button>
            ))}
            {message.content.match(/\[REVERT_PLAN:([^\]]+)\]/) && (
              <button
                onClick={() => onRevertPlan?.(message.content.match(/\[REVERT_PLAN:([^\]]+)\]/)![1])}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-all"
              >
                <HistoryIcon className="w-3 h-3" />
                <span>Revert Execution</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Modal for picking files from repo tree to attach as context */
function FilePickerModal({
  tree,
  onSelect,
  onClose,
}: {
  tree: any[];
  onSelect: (node: any) => void;
  onClose: () => void;
}) {
  const renderNodes = (nodes: any[]) => {
    if (!Array.isArray(nodes)) return null;
    return nodes.map((node) => {
      if (node.type === 'folder') {
        return (
          <div key={node.id} className="ml-2">
            <div className="text-xs font-semibold text-gray-400 py-1">{node.name}/</div>
            {node.children && renderNodes(node.children)}
          </div>
        );
      }
      return (
        <div
          key={node.id}
          onClick={() => onSelect(node)}
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10 text-xs text-gray-300 cursor-pointer font-mono"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span className="truncate">{node.path}</span>
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e131f] border border-white/10 rounded-xl w-full max-w-md p-4 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-400" />
            Attach File Context
          </h3>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
          {tree.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">No repository files loaded</div>
          ) : (
            renderNodes(tree)
          )}
        </div>
      </div>
    </div>
  );
}

export function AIAssistant() {
  const {
    aiPanelOpen,
    toggleAiPanel,
    chatMessages,
    addChatMessage,
    createPlan,
    generateCode,
    approveAll,
    selectedRepository,
    terminalOpen,
    toggleTerminal,
    addTerminalEntry,
    runTerminalCommand,
    lastGeneratedPlan,
    setLastGeneratedPlan,
    attachedFiles,
    attachFile,
    detachFile,
    clearAttachedFiles,
    gitStatus,
    fetchGitStatus,
    fetchRepositoryFileTree,
    repositoryFileTree,
    startNewTask,
    loadTaskSession,
    savedTaskSessions,
  } = useApp();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showExecuteOptions, setShowExecuteOptions] = useState(false);
  const [directPromptInput, setDirectPromptInput] = useState('');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const allMessages = useMemo(() => [...mockMessages, ...chatMessages], [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [allMessages, isTyping]);

  // 1. PLAN Workflow Action
  const handlePlanAction = async (taskDesc?: string) => {
    const promptToUse = taskDesc || input.trim();
    if (!promptToUse) return;

    // Construct context with attached files if any
    let fullPrompt = promptToUse;
    if (attachedFiles.length > 0) {
      const attachedText = attachedFiles.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n');
      if (attachedText.length > 15000) {
        setContextError('Attached file context exceeds 15,000 character budget limit!');
        return;
      }
      fullPrompt = `ATTACHED CONTEXT:\n${attachedText}\n\nUSER TASK:\n${promptToUse}`;
    }

    setContextError(null);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      session_id: 'session-1',
      role: 'user',
      content: promptToUse,
      created_at: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    if (!taskDesc) setInput('');
    clearAttachedFiles();
    setIsTyping(true);

    try {
      const operationId = `ai-plan-${Date.now()}`;
      const plan = await createPlan(fullPrompt, false, operationId);
      setLastGeneratedPlan(plan as any);

      const steps = Array.isArray(plan?.steps) ? plan.steps : [];
      const filesToModify = Array.isArray(plan?.filesToModify) ? plan.filesToModify : [];

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: `📋 PLAN GENERATED\n\nTask: ${plan?.taskName ?? 'Untitled Task'}\n\nSteps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}${filesToModify.length ? `\n\nFiles to Modify:\n${filesToModify.map(f => `- ${f}`).join('\n')}` : ''}\n\nRationale:\n${plan?.rationale ?? 'Plan generated successfully.'}`,
        created_at: new Date().toISOString(),
      };
      addChatMessage(aiMsg);
    } catch (e: any) {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: `Error generating plan: ${e.message || 'Unknown error'}`,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  // 2. EXECUTE Workflow Action
  const handleExecutePlanOption = async () => {
    setShowExecuteOptions(false);
    if (!lastGeneratedPlan) {
      addChatMessage({
        id: Date.now().toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: '⚠️ No generated plan found! Please click "Plan" to create a plan first or choose "Execute Direct Prompt".',
        created_at: new Date().toISOString(),
      });
      return;
    }

    setIsTyping(true);
    addChatMessage({
      id: Date.now().toString(),
      session_id: 'session-1',
      role: 'user',
      content: `⚡ Execute Plan: ${lastGeneratedPlan.taskName}`,
      created_at: new Date().toISOString(),
    });

    try {
      const repoId = selectedRepository?.id;
      const genResult = await generateCode(lastGeneratedPlan.id, `op-exec-${Date.now()}`);
      const approveResult = await approveAll();
      if (repoId) {
        await fetchGitStatus(repoId);
        await fetchRepositoryFileTree(repoId);
      }

      const proposalCount = genResult.proposals?.length ?? 0;
      const deletedList = approveResult.deleted?.length
        ? `\nDeleted from disk:\n${approveResult.deleted.map(f => `- ${f}`).join('\n')}`
        : '';
      const modifiedList = approveResult.modified?.length
        ? `\nModified on disk:\n${approveResult.modified.map(f => `- ${f}`).join('\n')}`
        : '';
      const failedList = approveResult.failures?.length
        ? `\nFailed:\n${approveResult.failures.map(f => `- ${f.filePath}: ${f.error}`).join('\n')}`
        : '';
      const statusLine = approveResult.success
        ? '🚀 PLAN EXECUTED SUCCESSFULLY!'
        : '⚠️ PLAN EXECUTED WITH FAILURES';
      addChatMessage({
        id: (Date.now() + 1).toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: `${statusLine}\n\nExecuted Plan: ${lastGeneratedPlan.taskName}\nGenerated Proposals: ${proposalCount}\nApplied: ${approveResult.approved}, Failed: ${approveResult.failed}${deletedList}${modifiedList}${failedList}\nRun "Review" to verify intent matching.\n\n[REVERT_PLAN:${lastGeneratedPlan.id}]`,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: `Error executing plan: ${e.message || 'Execution failed'}`,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteDirectPromptOption = async (directInstruction: string) => {
    setShowExecuteOptions(false);
    setDirectPromptInput('');
    if (!directInstruction.trim()) return;

    setIsTyping(true);
    addChatMessage({
      id: Date.now().toString(),
      session_id: 'session-1',
      role: 'user',
      content: `⚡ Direct Execute: ${directInstruction}`,
      created_at: new Date().toISOString(),
    });

    try {
      const repoId = selectedRepository?.id;
      // Synthesize minimal implicit plan internally
      const implicitPlan = await createPlan(directInstruction, true, `op-dir-${Date.now()}`);
      setLastGeneratedPlan(implicitPlan as any);

      const genResult = await generateCode(implicitPlan.id, `op-gen-${Date.now()}`);
      const approveResult = await approveAll();

      if (repoId) {
        await fetchGitStatus(repoId);
        await fetchRepositoryFileTree(repoId);
      }

      const deletedList = approveResult.deleted?.length
        ? `\nDeleted from disk:\n${approveResult.deleted.map(f => `- ${f}`).join('\n')}`
        : '';
      const modifiedList = approveResult.modified?.length
        ? `\nModified on disk:\n${approveResult.modified.map(f => `- ${f}`).join('\n')}`
        : '';
      const failedList = approveResult.failures?.length
        ? `\nFailed:\n${approveResult.failures.map(f => `- ${f.filePath}: ${f.error}`).join('\n')}`
        : '';
      const statusLine = approveResult.success
        ? '🚀 DIRECT EXECUTION COMPLETED!'
        : '⚠️ DIRECT EXECUTION COMPLETED WITH FAILURES';
      addChatMessage({
        id: (Date.now() + 1).toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: `${statusLine}\n\nTask: ${implicitPlan.taskName}\nProposals Generated: ${genResult.proposals?.length ?? 0}\nApplied: ${approveResult.approved}, Failed: ${approveResult.failed}${deletedList}${modifiedList}${failedList}\n\n[REVERT_PLAN:${implicitPlan.id}]`,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: `Error during direct execution: ${e.message || 'Execution failed'}`,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  // 3. REVIEW Workflow Action
  const handleReviewAction = async () => {
    const freshStatus = selectedRepository
      ? await fetchGitStatus(selectedRepository.id)
      : gitStatus;

    const plannedFiles = lastGeneratedPlan?.filesToModify || [];
    const comparison = comparePlanToExecution(plannedFiles, freshStatus?.files || []);

    addChatMessage({
      id: Date.now().toString(),
      session_id: 'session-1',
      role: 'user',
      content: '🔍 Review Execution vs Plan',
      created_at: new Date().toISOString(),
    });

    addChatMessage({
      id: (Date.now() + 1).toString(),
      session_id: 'session-1',
      role: 'assistant',
      content: formatReviewReport(lastGeneratedPlan?.taskName, comparison),
      created_at: new Date().toISOString(),
    });
  };

  // Revert Plan Handler
  const handleRevertPlan = useCallback(async (planId: string) => {
    setIsTyping(true);
    addChatMessage({
      id: Date.now().toString(),
      session_id: 'session-1',
      role: 'user',
      content: `↩️ Revert Execution`,
      created_at: new Date().toISOString(),
    });
    
    try {
      const result = await api.revertPlan(planId, selectedRepository?.id);
      
      const revertedList = result.reverted.length 
        ? `\nReverted Files:\n${result.reverted.map(f => `- ${f}`).join('\n')}` 
        : '\nNo files reverted.';
      
      const failedList = result.failed.length 
        ? `\nFailed to revert:\n${result.failed.map(f => `- ${f}`).join('\n')}` 
        : '';

      if (selectedRepository) {
        await fetchGitStatus(selectedRepository.id);
        await fetchRepositoryFileTree(selectedRepository.id);
      }
      
      addChatMessage({
        id: (Date.now() + 1).toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: `⏪ REVERT COMPLETED\n${revertedList}${failedList}`,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        session_id: 'session-1',
        role: 'assistant',
        content: `Error reverting plan: ${e.message}`,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  }, [selectedRepository, fetchGitStatus, fetchRepositoryFileTree, addChatMessage]);

  // Run shell command in terminal
  const handleRunInTerminal = useCallback(async (cmd: string) => {
    if (!terminalOpen) toggleTerminal();
    if (!selectedRepository) {
      addTerminalEntry({ id: Date.now().toString(), command: cmd, output: 'No repository selected.', status: 'error', timestamp: new Date().toISOString() });
      return;
    }
    addTerminalEntry({ id: Date.now().toString(), command: cmd, output: 'Running...', status: 'running', timestamp: new Date().toISOString() });
    try {
      const result = await runTerminalCommand(selectedRepository.id, cmd);
      addTerminalEntry({ id: (Date.now() + 1).toString(), command: '', output: result.output || '(no output)', status: result.status, timestamp: new Date().toISOString() });
    } catch (e: any) {
      addTerminalEntry({ id: (Date.now() + 1).toString(), command: '', output: `Error: ${e.message}`, status: 'error', timestamp: new Date().toISOString() });
    }
  }, [terminalOpen, toggleTerminal, selectedRepository, addTerminalEntry, runTerminalCommand]);

  // Attach File Handler
  const handleSelectFileToAttach = async (node: any) => {
    setShowFilePicker(false);
    if (!selectedRepository) return;
    try {
      const content = await api.getFileContent(selectedRepository.id, node.path);
      attachFile({ path: node.path, name: node.name, content });
    } catch (e) {
      console.error('Failed to read attached file content', e);
    }
  };

  if (!aiPanelOpen) return null;

  return (
    <div className="w-96 bg-[#0a0a0f] border-l border-white/5 flex flex-col h-screen select-none relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#050508]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <p className="text-[10px] text-gray-500">Plan • Execute • Review</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => startNewTask()}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Start New Task / Chat"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            title="Task History"
          >
            <HistoryIcon className="w-4 h-4" />
          </button>
          <button
            onClick={toggleAiPanel}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Drawer Overlay */}
      {showHistoryDrawer && (
        <div className="absolute top-12 left-0 right-0 z-40 bg-[#0e131f] border-b border-white/10 p-3 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
            <span>Saved Task Sessions</span>
            <button onClick={() => setShowHistoryDrawer(false)} className="p-1 text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
            {savedTaskSessions.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-3">No saved task history</div>
            ) : (
              savedTaskSessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => {
                    loadTaskSession(sess.id);
                    setShowHistoryDrawer(false);
                  }}
                  className="p-2 rounded hover:bg-white/10 text-xs text-gray-300 cursor-pointer transition-colors"
                >
                  <div className="font-semibold text-white truncate">{sess.name}</div>
                  <div className="text-[10px] text-gray-500">{new Date(sess.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Core Workflow Buttons (PLAN, EXECUTE, REVIEW) */}
      <div className="p-3 border-b border-white/5 bg-[#07070a]">
        <div className="grid grid-cols-3 gap-2">
          <button
            id="ai-workflow-plan-btn"
            onClick={() => handlePlanAction()}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition-all"
            title="Create a plan for the task"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plan</span>
          </button>

          <button
            id="ai-workflow-execute-btn"
            onClick={() => setShowExecuteOptions(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 text-green-400 text-xs font-semibold transition-all"
            title="Execute generated plan or direct prompt"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Execute</span>
          </button>

          <button
            id="ai-workflow-review-btn"
            onClick={handleReviewAction}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-400 text-xs font-semibold transition-all"
            title="Review plan vs actual modified files"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Review</span>
          </button>
        </div>
      </div>

      {/* Execute Option Selector Dialog */}
      {showExecuteOptions && (
        <div className="p-3 border-b border-green-500/30 bg-green-950/20 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-green-400 font-semibold">
            <span>Select Execution Mode:</span>
            <button onClick={() => setShowExecuteOptions(false)} className="text-gray-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            id="exec-option-plan"
            onClick={handleExecutePlanOption}
            className="w-full text-left p-2 rounded bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 text-xs text-white transition-all"
          >
            <div className="font-semibold text-green-300">1. Execute Generated Plan</div>
            <div className="text-[10px] text-gray-400 truncate">
              {lastGeneratedPlan ? lastGeneratedPlan.taskName : '(No plan generated yet)'}
            </div>
          </button>

          <div className="space-y-1 pt-1">
            <div className="text-[11px] font-semibold text-gray-300">2. Execute Direct Prompt:</div>
            <div className="flex gap-1">
              <input
                type="text"
                value={directPromptInput}
                onChange={(e) => setDirectPromptInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteDirectPromptOption(directPromptInput)}
                placeholder="e.g. Add add() function to math.js..."
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-500 outline-none"
              />
              <button
                id="exec-option-direct-submit"
                onClick={() => handleExecuteDirectPromptOption(directPromptInput)}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {allMessages.map((message) => (
          <MessageBubble key={message.id} message={message} onRunCommand={handleRunInTerminal} onRevertPlan={handleRevertPlan} />
        ))}

        {isTyping && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Error Banner */}
      {contextError && (
        <div className="px-3 py-1.5 text-xs text-red-400 bg-red-900/30 border-t border-red-500/30 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1">{contextError}</span>
          <button onClick={() => setContextError(null)} className="text-gray-400 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Attached Files Chips */}
      {attachedFiles.length > 0 && (
        <div className="px-3 py-1.5 border-t border-white/5 bg-[#07070a] flex flex-wrap gap-1">
          {attachedFiles.map((file) => (
            <span
              key={file.path}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-500/30"
            >
              <FileText className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button onClick={() => detachFile(file.path)} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-white/5 bg-[#050508]">
        <div className="flex items-center gap-2">
          <button
            id="ai-attach-file-btn"
            onClick={() => {
              if (selectedRepository) fetchRepositoryFileTree(selectedRepository.id);
              setShowFilePicker(true);
            }}
            className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Attach file context (Paperclip)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            id="ai-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePlanAction()}
            placeholder="Type task or question..."
            className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-all"
          />

          <button
            id="ai-send-btn"
            onClick={() => handlePlanAction()}
            disabled={!input.trim() || isTyping}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
            title="Send task"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* File Picker Overlay Modal */}
      {showFilePicker && (
        <FilePickerModal
          tree={repositoryFileTree}
          onSelect={handleSelectFileToAttach}
          onClose={() => setShowFilePicker(false)}
        />
      )}
    </div>
  );
}
export default AIAssistant;
