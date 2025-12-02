/**
 * Message types for WebSocket communication between teacher and students
 */

export enum MessageType {
  // Teacher → Students
  CONNECTED = 'connected',
  FILE_UPDATE = 'file_update',
  FILE_SWITCH = 'file_switch',
  STATS = 'stats',
  SERVER_CLOSING = 'server_closing',

  // Students → Teacher
  AUTH = 'auth',
  PING = 'ping',
  PONG = 'pong',
}

/**
 * Base message interface
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

/**
 * Initial connection success message (Teacher → Student)
 */
export interface ConnectedMessage extends BaseMessage {
  type: MessageType.CONNECTED;
  sessionId: string;
  teacherName?: string;
}

/**
 * File content update message (Teacher → Student)
 */
export interface FileUpdateMessage extends BaseMessage {
  type: MessageType.FILE_UPDATE;
  filePath: string;
  fileName: string;
  language: string;
  content: string;
  cursorPosition?: {
    line: number;
    character: number;
  };
}

/**
 * File selection change message (Teacher → Student)
 */
export interface FileSwitchMessage extends BaseMessage {
  type: MessageType.FILE_SWITCH;
  filePath: string;
  fileName: string;
  language: string;
  content: string;
  cursorPosition?: {
    line: number;
    character: number;
  };
}

/**
 * Connection statistics message (Teacher → Students)
 */
export interface StatsMessage extends BaseMessage {
  type: MessageType.STATS;
  connectedStudents: number;
}

/**
 * Server shutdown notification (Teacher → Students)
 */
export interface ServerClosingMessage extends BaseMessage {
  type: MessageType.SERVER_CLOSING;
  message: string;
}

/**
 * Authentication message (Student → Teacher)
 */
export interface AuthMessage extends BaseMessage {
  type: MessageType.AUTH;
  token?: string;
  studentName?: string;
}

/**
 * Heartbeat ping message (Student → Teacher)
 */
export interface PingMessage extends BaseMessage {
  type: MessageType.PING;
}

/**
 * Heartbeat pong message (Teacher → Student)
 */
export interface PongMessage extends BaseMessage {
  type: MessageType.PONG;
}

/**
 * Union type of all possible teacher → student messages
 */
export type TeacherMessage =
  | ConnectedMessage
  | FileUpdateMessage
  | FileSwitchMessage
  | StatsMessage
  | ServerClosingMessage
  | PongMessage;

/**
 * Union type of all possible student → teacher messages
 */
export type StudentMessage = AuthMessage | PingMessage;

/**
 * Union type of all possible messages
 */
export type Message = TeacherMessage | StudentMessage;
