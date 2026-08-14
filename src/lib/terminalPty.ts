import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { resolve } from 'path';
import { existsSync } from 'fs';
import * as pty from 'node-pty';

/**
 * Sanitize process environment to prevent exposing sensitive tokens in shell sessions
 */
function getSanitizedEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>;
  const sensitiveKeys = ['GITHUB_TOKEN', 'GH_TOKEN', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY'];
  for (const key of sensitiveKeys) {
    delete env[key];
  }
  env.TERM = 'xterm-256color';
  env.COLORTERM = 'truecolor';
  return env;
}

/**
 * Setup WebSocket PTY server on HTTP server instance
 */
export function setupTerminalWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    if (url.includes('/terminal/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, request) => {
    const url = request.url || '';
    let repositoryId: string | null = null;

    // Extract repositoryId from path /api/repositories/:id/terminal/ws or query parameter
    const pathMatch = url.match(/\/repositories\/([^\/]+)\/terminal\/ws/);
    if (pathMatch && pathMatch[1]) {
      repositoryId = pathMatch[1];
    } else {
      // In custom server request.url is relative, we can prefix a dummy origin
      const urlObj = new URL(url, 'http://localhost');
      repositoryId = urlObj.searchParams.get('repositoryId');
    }

    // Default to workspace root if no repo specified
    // HLD §2: files live in `repositories/<id>/` at the project root.
    let repoPath = process.cwd(); 
    
    if (repositoryId && repositoryId !== 'default') {
      const targetPath = resolve(process.cwd(), 'repositories', repositoryId);
      if (existsSync(targetPath)) {
        repoPath = targetPath;
      }
    }

    // Determine OS default shell
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? (process.env.COMSPEC || 'cmd.exe') : (process.env.SHELL || 'bash');
    const args = isWindows ? [] : ['-l'];

    let ptyProcess: pty.IPty | null = null;
    try {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: repoPath,
        env: getSanitizedEnv(),
      });
    } catch (err: any) {
      console.error('Failed to spawn PTY shell:', err);
      ws.send(`\r\nError spawning terminal shell: ${err.message}\r\n`);
      ws.close();
      return;
    }

    // Send initial cwd notification or hello banner
    ws.send(`\r\n\x1b[32m[Traycer PTY Shell Initialized]\x1b[0m Working Directory: ${repoPath}\r\n\r\n`);

    // Forward PTY output -> WebSocket client
    const ptyDataListener = ptyProcess.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const ptyExitListener = ptyProcess.onExit(({ exitCode, signal }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\r\nProcess exited with code ${exitCode}${signal ? ` (signal ${signal})` : ''}\r\n`);
        ws.close();
      }
    });

    // Forward WebSocket client input -> PTY
    ws.on('message', (message: string | Buffer) => {
      if (!ptyProcess) return;
      const str = message.toString();

      // Check if message is a control JSON payload (e.g. resize event)
      if (str.startsWith('{') && str.endsWith('}')) {
        try {
          const payload = JSON.parse(str);
          if (payload.type === 'resize' && payload.cols && payload.rows) {
            ptyProcess.resize(payload.cols, payload.rows);
            return;
          }
          if (payload.type === 'input' && payload.data) {
            ptyProcess.write(payload.data);
            return;
          }
        } catch {
          // Not JSON, fall through to writing raw string
        }
      }

      ptyProcess.write(str);
    });

    // Cleanup on WebSocket connection close
    ws.on('close', () => {
      if (ptyProcess) {
        try {
          ptyDataListener.dispose();
          ptyExitListener.dispose();
          ptyProcess.kill();
        } catch {}
      }
    });
  });

  return wss;
}
