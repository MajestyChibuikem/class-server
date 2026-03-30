import * as http from 'http';
import { WebSocketServer as WSWebSocketServer, WebSocket } from 'ws';
import * as vscode from 'vscode';
import { nanoid } from 'nanoid';
import { ConnectionManager } from './ConnectionManager';
import { MessageBroker } from './MessageBroker';
import { MessageType, AuthMessage } from '../types/messages';
import { SessionConfig } from '../types/config';

/**
 * WebSocket server for classroom code synchronization
 * Serves HTML client for browser-based students and handles WebSocket connections
 * Supports both browser and VSCode extension-based student connections
 */
export class WebSocketServer {
  private httpServer?: http.Server;
  private wsServer?: WSWebSocketServer;
  private connectionManager: ConnectionManager;
  private messageBroker: MessageBroker;
  private sessionConfig?: SessionConfig;
  private onConnectionCountChange?: (count: number) => void;

  constructor(
    private port: number,
    private requireAuth: boolean = false,
    private extensionContext: vscode.ExtensionContext
  ) {
    this.connectionManager = new ConnectionManager();
    this.messageBroker = new MessageBroker(this.connectionManager);
    this.setupConnectionCallbacks();
  }

  /**
   * Start the HTTP and WebSocket servers
   */
  async start(): Promise<{ url: string; localUrl: string }> {
    return new Promise((resolve, reject) => {
      try {
        // Create session ID
        const sessionId = nanoid();

        // Create session config
        this.sessionConfig = {
          sessionId,
          port: this.port,
          startTime: Date.now(),
        };

        // Create HTTP server
        this.httpServer = http.createServer((req, res) => {
          this.handleHttpRequest(req, res);
        });

        // Create WebSocket server
        this.wsServer = new WSWebSocketServer({
          server: this.httpServer,
          perMessageDeflate: false, // Disable compression for lower latency
        });

        // Handle WebSocket connections
        this.wsServer.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
          this.handleWebSocketConnection(ws, req);
        });

        // Start listening
        this.httpServer.listen(this.port, '0.0.0.0', () => {
          const localUrl = `http://localhost:${this.port}`;
          const wsUrl = `ws://localhost:${this.port}`;
          
          // Get local network IP (we'll implement this next)
          resolve({
            url: wsUrl,
            localUrl: localUrl,
          });
        });

        this.httpServer.on('error', (error: Error & { code?: string }) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.port} is already in use. Please choose a different port.`));
          } else {
            reject(error);
          }
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * Stop the servers
   */
  async stop(): Promise<void> {
    // Broadcast server closing message
    if (this.connectionManager.getConnectionCount() > 0) {
      this.messageBroker.broadcastServerClosing('Server is shutting down');
      // Give clients a moment to receive the message
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Close WebSocket server
    if (this.wsServer) {
      return new Promise((resolve) => {
        this.connectionManager.disconnectAll();
        
        this.wsServer!.close(() => {
          this.wsServer = undefined;
          
          // Close HTTP server
          if (this.httpServer) {
            this.httpServer.close(() => {
              this.httpServer = undefined;
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    }
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connectionManager.getConnectionCount();
  }

  /**
   * Get session configuration
   */
  getSessionConfig(): SessionConfig | undefined {
    return this.sessionConfig;
  }

  /**
   * Set callback for connection count changes
   */
  setConnectionCountCallback(callback: (count: number) => void): void {
    this.onConnectionCountChange = callback;
  }

  /**
   * Get message broker for broadcasting messages
   */
  getMessageBroker(): MessageBroker {
    return this.messageBroker;
  }

  /**
   * Handle HTTP requests (for serving static client)
   * Supports both browser-based and VSCode extension-based students
   */
  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Serve the HTML client for browser-based students
    if (req.url === '/' || req.url === '/index.html') {
      this.serveClientHTML(res);
    } else {
      // 404 for other routes
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  /**
   * Serve the client HTML page for browser-based students
   */
  private serveClientHTML(res: http.ServerResponse): void {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Classroom Code Sync</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-vsc-dark-plus.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.css">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1e1e1e;
            color: #d4d4d4;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        header {
            background: #252526;
            border-bottom: 1px solid #3e3e42;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        header h1 {
            font-size: 14px;
            font-weight: 600;
            color: #4ec9b0;
            white-space: nowrap;
        }
        #file-badge {
            background: #094771;
            border: 1px solid #1177bb;
            border-radius: 3px;
            padding: 2px 8px;
            font-size: 12px;
            color: #cce7ff;
            font-family: 'Consolas', monospace;
            display: none;
        }
        #lang-badge {
            background: #3c3c3c;
            border-radius: 3px;
            padding: 2px 8px;
            font-size: 11px;
            color: #858585;
            display: none;
        }
        #copy-btn {
            margin-left: auto;
            background: #0e639c;
            border: none;
            border-radius: 3px;
            padding: 4px 12px;
            color: #fff;
            font-size: 12px;
            cursor: pointer;
            display: none;
        }
        #copy-btn:hover { background: #1177bb; }
        #status-bar {
            padding: 6px 16px;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #status-bar.connected { background: #1b3a28; color: #4ec9b0; border-bottom: 1px solid #2a5c3e; }
        #status-bar.disconnected { background: #3c1f1f; color: #f48771; border-bottom: 1px solid #6e3030; }
        #status-bar.connecting { background: #2a2a1e; color: #dcdcaa; border-bottom: 1px solid #5a5a30; }
        .dot {
            width: 7px; height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .connected .dot { background: #4ec9b0; }
        .disconnected .dot { background: #f48771; }
        .connecting .dot { background: #dcdcaa; animation: pulse 1s infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        #code-wrap {
            flex: 1;
            overflow: auto;
            padding: 0;
        }
        pre[class*="language-"] {
            margin: 0;
            border-radius: 0;
            background: #1e1e1e !important;
            min-height: 100%;
            font-size: 14px;
            line-height: 1.6;
        }
        #empty-msg {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 300px;
            color: #555;
            font-size: 14px;
            font-style: italic;
        }
        @media (max-width: 600px) {
            pre[class*="language-"] { font-size: 12px; }
        }
    </style>
</head>
<body>
    <header>
        <h1>Classroom Code Sync</h1>
        <span id="file-badge"></span>
        <span id="lang-badge"></span>
        <button id="copy-btn" onclick="copyCode()">Copy</button>
    </header>
    <div id="status-bar" class="connecting"><span class="dot"></span><span id="status-text">Connecting...</span></div>
    <div id="code-wrap">
        <div id="empty-msg">Waiting for the teacher to start sharing code...</div>
        <pre id="code-pre" class="line-numbers language-plaintext" style="display:none"><code id="code-el"></code></pre>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js"></script>
    <script>
        Prism.plugins.autoloader.languages_path = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';

        const statusBar = document.getElementById('status-bar');
        const statusText = document.getElementById('status-text');
        const fileBadge = document.getElementById('file-badge');
        const langBadge = document.getElementById('lang-badge');
        const copyBtn = document.getElementById('copy-btn');
        const emptyMsg = document.getElementById('empty-msg');
        const codePre = document.getElementById('code-pre');
        const codeEl = document.getElementById('code-el');

        let reconnectAttempts = 0;
        let reconnectTimer = null;
        let countdownTimer = null;
        let currentContent = '';
        const MAX_RECONNECT = 20;
        const BASE_DELAY = 1000;
        const MAX_DELAY = 30000;

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = protocol + '//' + location.host;

        function setStatus(cls, text) {
            statusBar.className = cls;
            statusText.textContent = text;
        }

        function updateCode(content, language, fileName) {
            currentContent = content;
            if (fileName) {
                fileBadge.textContent = fileName;
                fileBadge.style.display = '';
            }
            if (language) {
                langBadge.textContent = language;
                langBadge.style.display = '';
                codePre.className = 'line-numbers language-' + language;
            }
            codeEl.textContent = content;
            Prism.highlightElement(codeEl);
            emptyMsg.style.display = 'none';
            codePre.style.display = '';
            copyBtn.style.display = '';
        }

        function copyCode() {
            navigator.clipboard.writeText(currentContent).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy', 1500);
            });
        }

        function scheduleReconnect() {
            if (reconnectAttempts >= MAX_RECONNECT) {
                setStatus('disconnected', 'Disconnected — refresh the page to try again');
                return;
            }
            const delay = Math.min(BASE_DELAY * Math.pow(1.5, reconnectAttempts), MAX_DELAY);
            reconnectAttempts++;
            let remaining = Math.ceil(delay / 1000);
            setStatus('connecting', 'Reconnecting in ' + remaining + 's...');
            if (countdownTimer) clearInterval(countdownTimer);
            countdownTimer = setInterval(() => {
                remaining--;
                if (remaining > 0) {
                    setStatus('connecting', 'Reconnecting in ' + remaining + 's...');
                } else {
                    clearInterval(countdownTimer);
                }
            }, 1000);
            reconnectTimer = setTimeout(() => { connect(); }, delay);
        }

        function connect() {
            if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
            if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
            setStatus('connecting', 'Connecting...');

            let ws;
            try { ws = new WebSocket(wsUrl); } catch(e) {
                setStatus('disconnected', 'Invalid server URL');
                return;
            }

            let pingInterval;

            ws.onopen = () => {
                reconnectAttempts = 0;
                setStatus('connected', 'Connected to teacher');
                pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                    }
                }, 25000);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'connected') {
                        setStatus('connected', 'Connected — Session active');
                    } else if (msg.type === 'file_update' || msg.type === 'file_switch') {
                        if (msg.content !== undefined) {
                            updateCode(msg.content, msg.language || 'plaintext', msg.fileName);
                        }
                    } else if (msg.type === 'server_closing') {
                        setStatus('disconnected', 'Session ended by teacher');
                        clearInterval(pingInterval);
                    }
                } catch(e) { console.error('Message parse error', e); }
            };

            ws.onerror = () => setStatus('disconnected', 'Connection error');

            ws.onclose = () => {
                clearInterval(pingInterval);
                scheduleReconnect();
            };
        }

        connect();
    </script>
</body>
</html>`;

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
    });
    res.end(html);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleWebSocketConnection(ws: WebSocket, req: http.IncomingMessage): void {
    // Add connection (ConnectionManager enforces the 150-client limit)
    const clientId = this.connectionManager.addConnection(ws);
    if (!clientId) {
      ws.close(1008, 'Maximum connections reached');
      return;
    }

    console.log(`New client connected: ${clientId} (Total: ${this.connectionManager.getConnectionCount()})`);
    this.onConnectionCountChange?.(this.connectionManager.getConnectionCount());

    // Send initial connected message
    if (this.sessionConfig) {
      this.messageBroker.sendConnected(clientId, this.sessionConfig.sessionId);
    }

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const rawMessage = data.toString();
        const message = JSON.parse(rawMessage);

        // Handle authentication if required
        if (this.requireAuth && message.type === MessageType.AUTH) {
          const authMessage = message as AuthMessage;
          // TODO: Validate token
          // For now, accept all connections
        }

        // Handle message routing
        this.messageBroker.handleStudentMessage(clientId, rawMessage);
      } catch (error) {
        console.error(`Error handling message from client ${clientId}:`, error);
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId} (Total: ${this.connectionManager.getConnectionCount()})`);
      this.onConnectionCountChange?.(this.connectionManager.getConnectionCount());
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });
  }

  /**
   * Setup callbacks for connection manager events
   */
  private setupConnectionCallbacks(): void {
    // We'll update connection count when it changes
    // This is handled by checking periodically or on connect/disconnect events
  }

  /**
   * Dispose of the server
   */
  dispose(): void {
    this.stop().catch((error) => {
      console.error('Error disposing server:', error);
    });
  }
}

