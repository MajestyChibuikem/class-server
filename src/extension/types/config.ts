/**
 * Configuration types for the extension
 */

export interface ClassroomSyncConfig {
  server: {
    port: number;
    requireAuth: boolean;
  };
  sync: {
    debounceMs: number;
    includePatterns: string[];
    excludePatterns: string[];
    maxFileSize: number;
    rememberFilters: boolean;
  };
  student: {
    autoReconnect: boolean;
  };
}

export interface SessionConfig {
  sessionId: string;
  token?: string;
  port: number;
  startTime: number;
}

export interface StudentSessionConfig {
  teacherUrl: string;
  connected: boolean;
  currentFile?: string;
}
