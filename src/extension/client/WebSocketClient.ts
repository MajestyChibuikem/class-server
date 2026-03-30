import * as vscode from 'vscode';
import { WebSocket } from 'ws';

export interface FileUpdate {
  filePath: string;
  fileName: string;
  language: string;
  content: string;
}

type FileUpdateListener = (update: FileUpdate) => void;
type ConnectedListener = (sessionId: string) => void;
type DisconnectedListener = () => void;

/**
 * WebSocket client for student VSCode mode.
 * Connects to the teacher's server and fires events when code is received.
 */
export class WebSocketClient {
  private ws?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private pingTimer?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private disposed = false;

  private readonly MAX_RECONNECT = 20;
  private readonly BASE_DELAY = 1000;
  private readonly MAX_DELAY = 30000;

  private fileUpdateListeners: FileUpdateListener[] = [];
  private connectedListeners: ConnectedListener[] = [];
  private disconnectedListeners: DisconnectedListener[] = [];

  constructor(private readonly url: string) {}

  /**
   * Connect to the teacher's WebSocket server.
   */
  connect(): void {
    if (this.disposed) return;
    this.clearTimers();

    try {
      this.ws = new WebSocket(this.url);
    } catch (e: any) {
      vscode.window.showErrorMessage(`Invalid WebSocket URL: ${e.message}`);
      return;
    }

    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.startPing();
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'connected') {
          this.connectedListeners.forEach(l => l(msg.sessionId || ''));
        } else if (msg.type === 'file_update' || msg.type === 'file_switch') {
          const update: FileUpdate = {
            filePath: msg.filePath || '',
            fileName: msg.fileName || 'untitled',
            language: msg.language || 'plaintext',
            content: msg.content ?? '',
          };
          this.fileUpdateListeners.forEach(l => l(update));
        }
      } catch (e) {
        console.error('WebSocketClient message error:', e);
      }
    });

    this.ws.on('close', () => {
      this.clearPing();
      if (!this.disposed) {
        this.disconnectedListeners.forEach(l => l());
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err) => {
      console.error('WebSocketClient error:', err.message);
    });
  }

  /**
   * Disconnect and stop reconnecting.
   */
  disconnect(): void {
    this.disposed = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  onFileUpdate(listener: FileUpdateListener): void {
    this.fileUpdateListeners.push(listener);
  }

  onConnected(listener: ConnectedListener): void {
    this.connectedListeners.push(listener);
  }

  onDisconnected(listener: DisconnectedListener): void {
    this.disconnectedListeners.push(listener);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT) return;
    const delay = Math.min(this.BASE_DELAY * Math.pow(1.5, this.reconnectAttempts), this.MAX_DELAY);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      if (!this.disposed) this.connect();
    }, delay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 25000);
  }

  private clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }

  private clearTimers(): void {
    this.clearPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}
