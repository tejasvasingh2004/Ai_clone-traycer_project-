import { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useApp } from '../../store/AppContext';

export function Terminal() {
  const {
    terminalMinimized,
    toggleTerminal,
    setTerminalMinimized,
    selectedRepository,
  } = useApp();

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  const cwd = selectedRepository ? `repositories/${selectedRepository.id}` : 'workspace';

  // Initialize XTerm and WebSocket connection
  useEffect(() => {
    if (terminalMinimized || !terminalRef.current) return;

    // Create xterm instance
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#1f6feb',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const repoId = selectedRepository ? selectedRepository.id : 'default';
    setIsConnected(true);
    term.writeln(`\x1b[32mTerminal initialized\x1b[0m (${cwd})`);
    term.write(`\r\n$ `);

    let currentInput = '';

    // Forward xterm input
    const dataDisposable = term.onData(async (data) => {
      if (data === '\r') { // Enter
        term.writeln('');
        const cmd = currentInput.trim();
        currentInput = '';
        if (cmd) {
          try {
            // we need to dynamically import api or just use fetch directly to avoid dependency cycles if there is any.
            // but we can just use the global api since it's already used elsewhere.
            // wait, we don't have api imported here! Let's just use standard fetch for simplicity.
            const response = await fetch(`/api/repositories/${repoId}/terminal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command: cmd }),
            });
            if (response.ok) {
              const resData = await response.json();
              if (resData.output) {
                const lines = resData.output.split('\n');
                lines.forEach((line: string) => term.writeln(line.replace(/\r/g, '')));
              }
            } else {
              term.writeln(`\x1b[31mError: Failed to execute command\x1b[0m`);
            }
          } catch (e: any) {
            term.writeln(`\x1b[31mError: ${e.message}\x1b[0m`);
          }
        }
        term.write(`\r\n$ `);
      } else if (data === '\x7f' || data === '\b') { // Backspace
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\u0003') { // Ctrl+C
        currentInput = '';
        term.writeln('^C');
        term.write(`\r\n$ `);
      } else if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7E) || data >= '\u00a0') {
        currentInput += data;
        term.write(data);
      }
    });

    const resizeDisposable = term.onResize((size) => {
      // Nothing needed since HTTP terminal is stateless
    });

    const handleWindowResize = () => {
      try {
        fitAddon.fit();
      } catch {}
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      dataDisposable.dispose();
      resizeDisposable.dispose();
      window.removeEventListener('resize', handleWindowResize);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [terminalMinimized, selectedRepository?.id]);

  // Re-fit on layout changes
  useEffect(() => {
    if (!terminalMinimized && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch {}
      }, 100);
    }
  }, [terminalMinimized]);

  const reconnect = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.writeln(`\x1b[32mTerminal cleared\x1b[0m`);
      xtermRef.current.write(`\r\n$ `);
    }
  };

  return (
    <div
      className={`border-t border-white/5 bg-[#0a0a0f] flex flex-col transition-all duration-300 ${
        terminalMinimized ? 'h-10' : 'h-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-[#161b22] px-3 py-1.5 border-b border-white/5 text-gray-300">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">Terminal</span>
          <span className="text-xs text-gray-500 ml-2">{cwd}</span>
          <span
            className={`inline-block w-2 h-2 rounded-full ml-2 ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={reconnect}
            className="p-1 rounded hover:bg-white/10"
            title="Reconnect terminal session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTerminalMinimized(!terminalMinimized)}
            className="p-1 rounded hover:bg-white/10"
            title={terminalMinimized ? 'Expand terminal' : 'Minimize terminal'}
          >
            {terminalMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleTerminal}
            className="p-1 rounded hover:bg-white/10"
            title="Close terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body – xterm container */}
      {!terminalMinimized && (
        <div className="flex-1 bg-[#0d1117] p-1 overflow-hidden">
          <div ref={terminalRef} className="w-full h-full" />
        </div>
      )}
    </div>
  );
}
