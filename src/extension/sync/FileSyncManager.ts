import * as vscode from 'vscode';
import { MessageBroker } from '../server/MessageBroker';
import { FileFilter } from './FileFilter';
import { ContentProvider } from './ContentProvider';

/**
 * Manages file synchronization between teacher and students
 * Listens to file changes and broadcasts updates via MessageBroker
 */
export class FileSyncManager {
  private fileFilter: FileFilter;
  private contentProvider: ContentProvider;
  private activeEditor?: vscode.TextEditor;
  private currentDocument?: vscode.TextDocument;
  private debounceTimer?: NodeJS.Timeout;
  private subscriptions: vscode.Disposable[] = [];

  constructor(private messageBroker: MessageBroker) {
    this.fileFilter = new FileFilter();
    this.contentProvider = new ContentProvider();
  }

  /**
   * Start listening to file changes
   */
  start(): void {
    // Listen to active editor changes (file switches)
    const editorChangeSubscription = vscode.window.onDidChangeActiveTextEditor(
      (editor) => this.handleEditorChange(editor)
    );
    this.subscriptions.push(editorChangeSubscription);

    // Listen to document changes (file edits)
    const documentChangeSubscription = vscode.workspace.onDidChangeTextDocument(
      (event) => this.handleDocumentChange(event)
    );
    this.subscriptions.push(documentChangeSubscription);

    // Handle initial editor if one is already open
    if (vscode.window.activeTextEditor) {
      this.handleEditorChange(vscode.window.activeTextEditor);
    }

    // Listen to configuration changes to reload filters
    const configChangeSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('classroomSync.sync')) {
        this.fileFilter.loadConfiguration();
        // Re-sync current file if it's still open
        if (this.currentDocument) {
          this.syncFileSwitch(this.currentDocument);
        }
      }
    });
    this.subscriptions.push(configChangeSubscription);
  }

  /**
   * Stop listening to file changes
   */
  stop(): void {
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    // Dispose of all subscriptions
    this.subscriptions.forEach((sub) => sub.dispose());
    this.subscriptions = [];

    this.activeEditor = undefined;
    this.currentDocument = undefined;
  }

  /**
   * Handle active editor change (file switch)
   */
  private async handleEditorChange(editor: vscode.TextEditor | undefined): Promise<void> {
    this.activeEditor = editor;

    if (!editor || !editor.document) {
      return;
    }

    const document = editor.document;

    // Clear any pending debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    // Check if this is a different document
    if (this.currentDocument?.uri.toString() !== document.uri.toString()) {
      this.currentDocument = document;
      await this.syncFileSwitch(document);
    }
  }

  /**
   * Handle document content changes (edits)
   */
  private async handleDocumentChange(event: vscode.TextDocumentChangeEvent): Promise<void> {
    // Only handle changes to the current active document
    if (!this.currentDocument || event.document.uri.toString() !== this.currentDocument.uri.toString()) {
      return;
    }

    // Ignore changes that don't affect document content (like cursor movements)
    if (event.contentChanges.length === 0) {
      return;
    }

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Get debounce delay from configuration
    const config = vscode.workspace.getConfiguration('classroomSync.sync');
    const debounceMs = config.get<number>('debounceMs', 500);

    // Debounce file updates
    this.debounceTimer = setTimeout(async () => {
      await this.syncFileUpdate(this.currentDocument!);
    }, debounceMs);
  }

  /**
   * Sync file switch (immediate, no debounce)
   */
  private async syncFileSwitch(document: vscode.TextDocument): Promise<void> {
    // Check if file should be synced
    if (!this.shouldSyncFile(document)) {
      return;
    }

    try {
      // Get file content
      const fileInfo = await this.contentProvider.getFileContent(document);
      if (!fileInfo) {
        return;
      }

      // Get cursor position if available
      let cursorPosition: { line: number; character: number } | undefined;
      if (this.activeEditor) {
        const selection = this.activeEditor.selection;
        cursorPosition = {
          line: selection.active.line,
          character: selection.active.character,
        };
      }

      // Broadcast file switch message
      this.messageBroker.broadcastFileSwitch(
        fileInfo.filePath,
        fileInfo.fileName,
        fileInfo.language,
        fileInfo.content,
        cursorPosition
      );
    } catch (error) {
      console.error('Error syncing file switch:', error);
    }
  }

  /**
   * Sync file update (debounced)
   */
  private async syncFileUpdate(document: vscode.TextDocument): Promise<void> {
    // Check if file should be synced
    if (!this.shouldSyncFile(document)) {
      return;
    }

    try {
      // Get file content
      const fileInfo = await this.contentProvider.getFileContent(document);
      if (!fileInfo) {
        return;
      }

      // Get cursor position if available
      let cursorPosition: { line: number; character: number } | undefined;
      if (this.activeEditor) {
        const selection = this.activeEditor.selection;
        cursorPosition = {
          line: selection.active.line,
          character: selection.active.character,
        };
      }

      // Broadcast file update message
      this.messageBroker.broadcastFileUpdate(
        fileInfo.filePath,
        fileInfo.fileName,
        fileInfo.language,
        fileInfo.content,
        cursorPosition
      );
    } catch (error) {
      console.error('Error syncing file update:', error);
    }
  }

  /**
   * Check if file should be synced based on filter rules
   */
  private shouldSyncFile(document: vscode.TextDocument): boolean {
    // Skip untitled documents
    if (document.isUntitled) {
      return false;
    }

    // Skip closed documents
    if (document.isClosed) {
      return false;
    }

    // Get workspace folder
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    // Check file filter
    if (!this.fileFilter.shouldSyncFile(document.uri.fsPath, workspaceFolder || undefined)) {
      return false;
    }

    // Check file size
    const fileSize = document.getText().length; // Character count (approximation)
    if (!this.fileFilter.isFileSizeValid(fileSize)) {
      return false;
    }

    return true;
  }

  /**
   * Manually trigger sync of current file
   */
  async syncCurrentFile(): Promise<void> {
    if (this.currentDocument) {
      await this.syncFileSwitch(this.currentDocument);
    }
  }

  /**
   * Dispose of the file sync manager
   */
  dispose(): void {
    this.stop();
  }
}

