import { ConnectionManager } from './ConnectionManager';
import {
  Message,
  MessageType,
  TeacherMessage,
  ConnectedMessage,
  FileUpdateMessage,
  FileSwitchMessage,
  StatsMessage,
  ServerClosingMessage,
  PongMessage,
} from '../types/messages';

/**
 * Message broker for routing and broadcasting messages between teacher and students
 */
export class MessageBroker {
  constructor(private connectionManager: ConnectionManager) {}

  /**
   * Send a message to all connected students
   */
  broadcast(message: TeacherMessage): void {
    const json = JSON.stringify(message);
    this.connectionManager.broadcast(json);
  }

  /**
   * Send connected message to a specific student
   */
  sendConnected(clientId: string, sessionId: string, teacherName?: string): void {
    const message: ConnectedMessage = {
      type: MessageType.CONNECTED,
      timestamp: Date.now(),
      sessionId,
      teacherName,
    };
    this.connectionManager.sendToClient(clientId, JSON.stringify(message));
  }

  /**
   * Broadcast file update to all students
   */
  broadcastFileUpdate(
    filePath: string,
    fileName: string,
    language: string,
    content: string,
    cursorPosition?: { line: number; character: number }
  ): void {
    const message: FileUpdateMessage = {
      type: MessageType.FILE_UPDATE,
      timestamp: Date.now(),
      filePath,
      fileName,
      language,
      content,
      cursorPosition,
    };
    this.broadcast(message);
  }

  /**
   * Broadcast file switch to all students
   */
  broadcastFileSwitch(
    filePath: string,
    fileName: string,
    language: string,
    content: string,
    cursorPosition?: { line: number; character: number }
  ): void {
    const message: FileSwitchMessage = {
      type: MessageType.FILE_SWITCH,
      timestamp: Date.now(),
      filePath,
      fileName,
      language,
      content,
      cursorPosition,
    };
    this.broadcast(message);
  }

  /**
   * Broadcast connection statistics
   */
  broadcastStats(): void {
    const message: StatsMessage = {
      type: MessageType.STATS,
      timestamp: Date.now(),
      connectedStudents: this.connectionManager.getConnectionCount(),
    };
    this.broadcast(message);
  }

  /**
   * Broadcast server closing notification
   */
  broadcastServerClosing(reason: string = 'Server is closing'): void {
    const message: ServerClosingMessage = {
      type: MessageType.SERVER_CLOSING,
      timestamp: Date.now(),
      message: reason,
    };
    this.broadcast(message);
  }

  /**
   * Send pong response to a specific client
   */
  sendPong(clientId: string): void {
    const message: PongMessage = {
      type: MessageType.PONG,
      timestamp: Date.now(),
    };
    this.connectionManager.sendToClient(clientId, JSON.stringify(message));
  }

  /**
   * Handle incoming message from a student
   */
  handleStudentMessage(clientId: string, rawMessage: string): void {
    try {
      const message: Message = JSON.parse(rawMessage);

      switch (message.type) {
        case MessageType.PING:
          // Update ping time and send pong
          this.connectionManager.updatePing(clientId);
          this.sendPong(clientId);
          break;

        case MessageType.AUTH:
          // Authentication handled by WebSocketServer
          break;

        default:
          console.warn(`Unknown message type from client ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Error parsing message from client ${clientId}:`, error);
    }
  }
}

