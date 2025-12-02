import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Provides file content for synchronization
 * Handles reading and preparing file content for transmission
 */
export class ContentProvider {
  /**
   * Get file content and metadata
   * @param document The text document
   * @returns File content info or null if file cannot be read
   */
  async getFileContent(document: vscode.TextDocument): Promise<{
    content: string;
    language: string;
    fileName: string;
    filePath: string;
  } | null> {
    try {
      // Get content from document
      const content = document.getText();
      const fileName = path.basename(document.fileName);
      const filePath = document.uri.fsPath;

      // Determine language from document language ID
      const language = this.getLanguageName(document.languageId);

      return {
        content,
        language,
        fileName,
        filePath,
      };
    } catch (error) {
      console.error('Error getting file content:', error);
      return null;
    }
  }

  /**
   * Get file content from file system (for when document is not open)
   * @param fileUri File URI
   * @returns File content info or null if file cannot be read
   */
  async getFileContentFromFS(fileUri: vscode.Uri): Promise<{
    content: string;
    language: string;
    fileName: string;
    filePath: string;
  } | null> {
    try {
      const filePath = fileUri.fsPath;
      const fileName = path.basename(filePath);
      
      // Read file content
      const content = await fs.promises.readFile(filePath, 'utf-8');

      // Determine language from file extension
      const language = this.getLanguageFromExtension(filePath);

      return {
        content,
        language,
        fileName,
        filePath,
      };
    } catch (error) {
      console.error('Error reading file from filesystem:', error);
      return null;
    }
  }

  /**
   * Get language name from VSCode language ID
   */
  private getLanguageName(languageId: string): string {
    const languageMap: { [key: string]: string } = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'typescriptreact': 'typescript',
      'javascriptreact': 'javascript',
      'python': 'python',
      'java': 'java',
      'csharp': 'csharp',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'markdown': 'markdown',
      'yaml': 'yaml',
      'xml': 'xml',
      'shellscript': 'bash',
      'powershell': 'powershell',
      'sql': 'sql',
      'go': 'go',
      'rust': 'rust',
      'php': 'php',
      'ruby': 'ruby',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'dart': 'dart',
      'vue': 'vue',
    };

    return languageMap[languageId] || languageId || 'plaintext';
  }

  /**
   * Get language name from file extension
   */
  private getLanguageFromExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const extMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.json': 'json',
      '.md': 'markdown',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.sh': 'bash',
      '.bash': 'bash',
      '.ps1': 'powershell',
      '.sql': 'sql',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.dart': 'dart',
      '.vue': 'vue',
    };

    return extMap[ext] || 'plaintext';
  }
}

