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
    // Basic HTML client for students using browsers
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Classroom Code Sync - Student Viewer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        h1 {
            color: #4ec9b0;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #858585;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .status {
            padding: 12px;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 500;
        }
        .status.connected {
            background: #264f78;
            border: 1px solid #4ec9b0;
            color: #4ec9b0;
        }
        .status.disconnected {
            background: #5a1d1d;
            border: 1px solid #f48771;
            color: #f48771;
        }
        .file-info {
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 10px 15px;
            margin: 15px 0;
            font-size: 13px;
            color: #858585;
        }
        #code-container {
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 15px;
            margin-top: 20px;
            min-height: 300px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-x: auto;
        }
        #code-container:empty::before {
            content: 'Waiting for code updates from teacher...';
            color: #858585;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Classroom Code Sync - Student Viewer</h1>
        <div class="subtitle">Real-time code viewing for classroom teaching</div>
        <div id="status" class="status disconnected">
            Connecting...
        </div>
        <div id="file-info" class="file-info" style="display: none;">
            <strong>File:</strong> <span id="file-name">-</span>
        </div>
        <div id="code-container"></div>
    </div>
    <script>
        const statusEl = document.getElementById('status');
        const codeEl = document.getElementById('code-container');
        const fileInfoEl = document.getElementById('file-info');
        const fileNameEl = document.getElementById('file-name');
        
        let reconnectAttempts = 0;
        let reconnectTimer = null;
        const maxReconnectAttempts = 10;
        const baseReconnectDelay = 1000; // 1 second
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = protocol + '//' + window.location.host;
        
        function connect() {
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                statusEl.textContent = 'Connected to teacher';
                statusEl.className = 'status connected';
                reconnectAttempts = 0;
                
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
            };
            
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('Received message:', message);
                    
                    if (message.type === 'connected') {
                        statusEl.textContent = 'Connected to teacher - Session: ' + (message.sessionId || 'Active');
                        statusEl.className = 'status connected';
                    } else if (message.type === 'file_update' || message.type === 'file_switch') {
                        if (message.fileName) {
                            fileNameEl.textContent = message.fileName;
                            fileInfoEl.style.display = 'block';
                        }
                        if (message.content !== undefined) {
                            codeEl.textContent = message.content;
                        }
                    } else if (message.type === 'server_closing') {
                        statusEl.textContent = 'Teacher session ending: ' + (message.message || 'Server closing');
                        statusEl.className = 'status disconnected';
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                statusEl.textContent = 'Connection error';
                statusEl.className = 'status disconnected';
            };
            
            ws.onclose = () => {
                statusEl.textContent = 'Disconnected from teacher';
                statusEl.className = 'status disconnected';
                
                // Auto-reconnect with exponential backoff
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts - 1);
                    statusEl.textContent = 'Disconnected. Reconnecting in ' + Math.ceil(delay / 1000) + 's...';
                    
                    reconnectTimer = setTimeout(() => {
                        connect();
                    }, delay);
                } else {
                    statusEl.textContent = 'Disconnected. Please refresh the page.';
                }
            };
            
            // Send ping every 30 seconds to keep connection alive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ 
                        type: 'ping', 
                        timestamp: Date.now() 
                    }));
                } else {
                    clearInterval(pingInterval);
                }
            }, 30000);
        }
        
        // Start connection
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
    // Check if we've reached max connections
    if (this.connectionManager.getConnectionCount() >= 50) {
      ws.close(1008, 'Maximum connections reached');
      return;
    }

    // Add connection
    const clientId = this.connectionManager.addConnection(ws);
    if (!clientId) {
      ws.close(1008, 'Maximum connections reached');
      return;
    }

    console.log(`New client connected: ${clientId} (Total: ${this.connectionManager.getConnectionCount()})`);

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

