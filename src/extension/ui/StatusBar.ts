import * as vscode from 'vscode';

export enum Mode {
  TEACHER = 'teacher',
  STUDENT = 'student',
  INACTIVE = 'inactive',
}

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentMode: Mode = Mode.INACTIVE;
  private connectionCount: number = 0;
  private isConnected: boolean = false;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  /**
   * Set the current mode (teacher/student/inactive)
   */
  setMode(mode: Mode): void {
    this.currentMode = mode;
    this.updateStatusBar();
  }

  /**
   * Update connection count (teacher mode)
   */
  setConnectionCount(count: number): void {
    this.connectionCount = count;
    if (this.currentMode === Mode.TEACHER) {
      this.updateStatusBar();
    }
  }

  /**
   * Update connection status (student mode)
   */
  setConnected(connected: boolean): void {
    this.isConnected = connected;
    if (this.currentMode === Mode.STUDENT) {
      this.updateStatusBar();
    }
  }

  /**
   * Show error state
   */
  showError(message: string): void {
    this.statusBarItem.text = `$(error) Classroom: ${message}`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.errorBackground'
    );
    this.statusBarItem.command = undefined;
  }

  /**
   * Show loading state
   */
  showLoading(message: string): void {
    this.statusBarItem.text = `$(loading~spin) ${message}`;
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.command = undefined;
  }

  /**
   * Update status bar based on current state
   */
  private updateStatusBar(): void {
    this.statusBarItem.backgroundColor = undefined;

    switch (this.currentMode) {
      case Mode.TEACHER:
        if (this.connectionCount === 0) {
          this.statusBarItem.text = '$(broadcast) Classroom: No Students';
        } else {
          const plural = this.connectionCount === 1 ? 'Student' : 'Students';
          this.statusBarItem.text = `$(broadcast) Classroom: ${this.connectionCount} ${plural}`;
        }
        this.statusBarItem.tooltip = 'Click to show connection info';
        this.statusBarItem.command = 'classroomSync.teacher.showConnection';
        break;

      case Mode.STUDENT:
        if (this.isConnected) {
          this.statusBarItem.text = '$(vm-connect) Classroom: Connected';
          this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.prominentBackground'
          );
          this.statusBarItem.tooltip = 'Connected to teacher - Click to disconnect';
          this.statusBarItem.command = 'classroomSync.student.disconnect';
        } else {
          this.statusBarItem.text = '$(vm-outline) Classroom: Disconnected';
          this.statusBarItem.tooltip = 'Click to connect to a teaching session';
          this.statusBarItem.command = 'classroomSync.student.connect';
        }
        break;

      case Mode.INACTIVE:
      default:
        this.statusBarItem.text = '$(broadcast) Classroom Sync';
        this.statusBarItem.tooltip = 'Start a teaching session or connect as student';
        this.statusBarItem.command = undefined;
        break;
    }
  }

  /**
   * Dispose of the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
