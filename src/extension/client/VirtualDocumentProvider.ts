import * as vscode from 'vscode';

export const SCHEME = 'classroom-sync';

/**
 * Provides a read-only virtual document that displays the teacher's current file.
 * URI format: classroom-sync://<fileName>
 */
export class VirtualDocumentProvider implements vscode.TextDocumentContentProvider {
  private content = '';
  private language = 'plaintext';
  private fileName = 'teacher-code';

  private readonly _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  static readonly scheme = SCHEME;

  /**
   * The URI for the virtual document (always the same — one shared view).
   */
  get uri(): vscode.Uri {
    return vscode.Uri.parse(`${SCHEME}://${this.fileName}`);
  }

  /**
   * Update content and fire change event so VSCode reloads the document.
   */
  update(content: string, language: string, fileName: string): void {
    this.content = content;
    this.language = language;
    this.fileName = fileName.replace(/[/\\]/g, '_'); // sanitize for URI
    this._onDidChange.fire(this.uri);
  }

  provideTextDocumentContent(_uri: vscode.Uri): string {
    return this.content;
  }

  getLanguage(): string {
    return this.language;
  }

  getFileName(): string {
    return this.fileName;
  }

  getCurrentContent(): string {
    return this.content;
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
