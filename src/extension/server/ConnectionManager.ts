import { WebSocket } from 'ws';
import { nanoid } from 'nanoid';

/**
 * Represents a connected student/client
 */
export interface ClientConnection {
  id: string;
  ws: WebSocket;
  connectedAt: number;
  lastPing: number;
  isAlive: boolean;
}

/**
 * Manages WebSocket connections for the teaching session
 * Supports up to 50 concurrent connections with heartbeat/timeout
 */
export class ConnectionManager {
  private connections: Map<string, ClientConnection> = new Map();
  private readonly maxConnections: number = 50;
  private readonly pingInterval: number = 30000; // 30 seconds
  private readonly timeoutInterval: number = 60000; // 60 seconds
  private pingTimer?: NodeJS.Timeout;
  private timeoutTimer?: NodeJS.Timeout;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add a new client connection
   * @returns client ID if added, null if max connections reached
   */
  addConnection(ws: WebSocket): string | null {
    if (this.connections.size >= this.maxConnections) {
      return null;
    }

    const clientId = nanoid();
    const connection: ClientConnection = {
      id: clientId,
      ws,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      isAlive: true,
    };

    this.connections.set(clientId, connection);

    // Set up connection event handlers
    ws.on('pong', () => {
      const conn = this.connections.get(clientId);
      if (conn) {
        conn.isAlive = true;
        conn.lastPing = Date.now();
      }
    });

    ws.on('close', () => {
      this.removeConnection(clientId);
    });

    ws.on('error', () => {
      this.removeConnection(clientId);
    });

    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeConnection(clientId: string): boolean {
    const connection = this.connections.get(clientId);
    if (connection) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
      this.connections.delete(clientId);
      return true;
    }
    return false;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get all active connections
   */
  getAllConnections(): ClientConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get a specific connection by ID
   */
  getConnection(clientId: string): ClientConnection | undefined {
    return this.connections.get(clientId);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: string): void {
    const deadConnections: string[] = [];

    this.connections.forEach((conn, clientId) => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        try {
          conn.ws.send(message);
        } catch (error) {
          console.error(`Error sending message to client ${clientId}:`, error);
          deadConnections.push(clientId);
        }
      } else {
        deadConnections.push(clientId);
      }
    });

    // Clean up dead connections
    deadConnections.forEach((clientId) => this.removeConnection(clientId));
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: string): boolean {
    const connection = this.connections.get(clientId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(message);
        return true;
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        this.removeConnection(clientId);
        return false;
      }
    }
    return false;
  }

  /**
   * Update last ping time for a client
   */
  updatePing(clientId: string): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      connection.lastPing = Date.now();
      connection.isAlive = true;
    }
  }

  /**
   * Start heartbeat mechanism to detect dead connections
   */
  private startHeartbeat(): void {
    this.pingTimer = setInterval(() => {
      this.connections.forEach((conn) => {
        if (!conn.isAlive) {
          // Client didn't respond to ping, remove it
          this.removeConnection(conn.id);
          return;
        }

        // Mark as potentially dead, wait for pong
        conn.isAlive = false;
        if (conn.ws.readyState === WebSocket.OPEN) {
          conn.ws.ping();
        }
      });
    }, this.pingInterval);

    // Check for timeouts
    this.timeoutTimer = setInterval(() => {
      const now = Date.now();
      this.connections.forEach((conn) => {
        if (now - conn.lastPing > this.timeoutInterval) {
          // Client hasn't pinged in timeout interval, remove it
          this.removeConnection(conn.id);
        }
      });
    }, this.timeoutInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
    if (this.timeoutTimer) {
      clearInterval(this.timeoutTimer);
      this.timeoutTimer = undefined;
    }
  }

  /**
   * Close all connections and clean up
   */
  disconnectAll(): void {
    this.connections.forEach((conn) => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.close();
      }
    });
    this.connections.clear();
    this.stopHeartbeat();
  }

  /**
   * Dispose of the connection manager
   */
  dispose(): void {
    this.disconnectAll();
  }
}

