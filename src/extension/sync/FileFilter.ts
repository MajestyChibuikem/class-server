import * as vscode from 'vscode';
import * as path from 'path';
import { minimatch } from 'minimatch';

/**
 * File filter for security and sync control
 * Supports glob patterns for include/exclude rules
 */
export class FileFilter {
  private includePatterns: string[] = [];
  private excludePatterns: string[] = [];
  private maxFileSize: number = 1048576; // 1MB default

  constructor() {
    this.loadConfiguration();
  }

  /**
   * Load configuration from VSCode settings
   */
  loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('classroomSync.sync');
    this.includePatterns = config.get<string[]>('includePatterns', []);
    this.excludePatterns = config.get<string[]>('excludePatterns', [
      '**/.env',
      '**/.env.*',
      '**/node_modules/**',
      '**/.git/**',
      '**/*.key',
      '**/*.pem',
      '**/*.p12',
      '**/*.pfx',
      '**/credentials.json',
      '**/.vscode/**',
    ]);
    this.maxFileSize = config.get<number>('maxFileSize', 1048576);
  }

  /**
   * Check if a file should be synced
   * @param filePath Full path to the file
   * @param workspaceFolder Workspace folder to check boundaries
   * @returns true if file should be synced, false otherwise
   */
  shouldSyncFile(filePath: string, workspaceFolder?: vscode.WorkspaceFolder): boolean {
    // Reload configuration in case it changed
    this.loadConfiguration();

    // Normalize file path
    const normalizedPath = path.normalize(filePath);

    // Check workspace boundary
    if (workspaceFolder) {
      const workspacePath = path.normalize(workspaceFolder.uri.fsPath);
      if (!normalizedPath.startsWith(workspacePath)) {
        return false; // File is outside workspace
      }
    }

    // Convert to relative path for pattern matching
    const relativePath = workspaceFolder
      ? path.relative(workspaceFolder.uri.fsPath, normalizedPath)
      : normalizedPath;

    // Normalize path separators for cross-platform compatibility
    const patternPath = relativePath.replace(/\\/g, '/');

    // Check exclude patterns first (more restrictive)
    for (const excludePattern of this.excludePatterns) {
      if (minimatch(patternPath, excludePattern, { dot: true })) {
        return false; // Explicitly excluded
      }
    }

    // If include patterns are specified, file must match at least one
    if (this.includePatterns.length > 0) {
      let matched = false;
      for (const includePattern of this.includePatterns) {
        if (minimatch(patternPath, includePattern, { dot: true })) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        return false; // Doesn't match any include pattern
      }
    }

    // Check if file is binary (by extension)
    if (this.isBinaryFile(filePath)) {
      return false;
    }

    return true;
  }

  /**
   * Check if file size is within limits
   */
  isFileSizeValid(fileSize: number): boolean {
    return fileSize <= this.maxFileSize;
  }

  /**
   * Check if a file is likely binary based on extension
   */
  private isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      '.exe', '.dll', '.so', '.dylib', '.bin',
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv',
      '.woff', '.woff2', '.ttf', '.eot',
      '.db', '.sqlite', '.sqlite3',
    ];

    const ext = path.extname(filePath).toLowerCase();
    return binaryExtensions.includes(ext);
  }

  /**
   * Get exclude patterns
   */
  getExcludePatterns(): string[] {
    return [...this.excludePatterns];
  }

  /**
   * Get include patterns
   */
  getIncludePatterns(): string[] {
    return [...this.includePatterns];
  }

  /**
   * Get max file size
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }
}

