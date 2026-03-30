import * as vscode from 'vscode';
import { StatusBarManager, Mode } from './ui/StatusBar';
import { ConnectionPanel } from './ui/ConnectionPanel';
import { WebSocketServer } from './server/WebSocketServer';
import { getLocalNetworkIP, formatConnectionUrls } from './server/NetworkUtils';
import { FileSyncManager } from './sync/FileSyncManager';
import { WebSocketClient } from './client/WebSocketClient';
import { VirtualDocumentProvider } from './client/VirtualDocumentProvider';

let statusBar: StatusBarManager;
let serverInstance: WebSocketServer | null = null;
let fileSyncManager: FileSyncManager | null = null;
let connectionPanel: ConnectionPanel | null = null;

let studentClient: WebSocketClient | null = null;
let virtualDocProvider: VirtualDocumentProvider | null = null;
let virtualDocRegistration: vscode.Disposable | null = null;
let lastFileUpdate: { content: string; language: string; fileName: string } | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('Classroom Code Sync extension is now active');

  statusBar = new StatusBarManager();
  context.subscriptions.push(statusBar);

  // Register virtual document provider for student mode
  virtualDocProvider = new VirtualDocumentProvider();
  virtualDocRegistration = vscode.workspace.registerTextDocumentContentProvider(
    VirtualDocumentProvider.scheme,
    virtualDocProvider
  );
  context.subscriptions.push(virtualDocRegistration);

  // Teacher commands
  context.subscriptions.push(
    vscode.commands.registerCommand('classroomSync.teacher.startServer', () => startTeacherServer(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('classroomSync.teacher.stopServer', () => stopTeacherServer())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('classroomSync.teacher.configureFiles', () => configureFiles())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('classroomSync.teacher.showConnection', () => showConnectionInfo(context))
  );

  // Student commands
  context.subscriptions.push(
    vscode.commands.registerCommand('classroomSync.student.connect', () => connectAsStudent())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('classroomSync.student.disconnect', () => disconnectStudent())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('classroomSync.student.copyToWorkspace', () => copyToWorkspace())
  );
}

// ---------------------------------------------------------------------------
// Teacher: Start
// ---------------------------------------------------------------------------
async function startTeacherServer(context: vscode.ExtensionContext): Promise<void> {
  if (studentClient) {
    vscode.window.showWarningMessage('Disconnect from student mode first.');
    return;
  }
  if (serverInstance) {
    vscode.window.showInformationMessage('Teaching session already running.');
    return;
  }

  try {
    statusBar.showLoading('Starting...');

    const config = vscode.workspace.getConfiguration('classroomSync');
    const port = config.get<number>('server.port', 8765);
    const requireAuth = config.get<boolean>('server.requireAuth', false);

    serverInstance = new WebSocketServer(port, requireAuth, context);

    const messageBroker = serverInstance.getMessageBroker();
    fileSyncManager = new FileSyncManager(messageBroker);
    fileSyncManager.start();

    await serverInstance.start();

    const localIP = getLocalNetworkIP();
    const urls = formatConnectionUrls(port, localIP);

    statusBar.setMode(Mode.TEACHER);
    statusBar.setConnectionCount(0);

    // Open the connection panel immediately
    await openConnectionPanel(urls, context);

  } catch (error: any) {
    statusBar.showError('Failed to start');
    vscode.window.showErrorMessage(`Failed to start session: ${error.message}`);
    serverInstance = null;
  }
}

// ---------------------------------------------------------------------------
// Teacher: Stop
// ---------------------------------------------------------------------------
async function stopTeacherServer(): Promise<void> {
  if (!serverInstance) {
    vscode.window.showInformationMessage('No session running.');
    return;
  }

  try {
    if (fileSyncManager) {
      fileSyncManager.stop();
      fileSyncManager.dispose();
      fileSyncManager = null;
    }

    if (connectionPanel) {
      connectionPanel.dispose();
      connectionPanel = null;
    }

    await serverInstance.stop();
    serverInstance.dispose();
    serverInstance = null;
    statusBar.setMode(Mode.INACTIVE);
    vscode.window.showInformationMessage('Teaching session stopped.');
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to stop session: ${error.message}`);
    if (fileSyncManager) { fileSyncManager.dispose(); fileSyncManager = null; }
    serverInstance = null;
  }
}

// ---------------------------------------------------------------------------
// Teacher: Configure files
// ---------------------------------------------------------------------------
async function configureFiles(): Promise<void> {
  const config = vscode.workspace.getConfiguration('classroomSync.sync');
  const excludePatterns: string[] = config.get<string[]>('excludePatterns', []);

  const items: vscode.QuickPickItem[] = excludePatterns.map(p => ({
    label: p,
    description: 'excluded',
    picked: true,
  }));

  const ADD_NEW = '$(add) Add new pattern...';
  const REMOVE_SELECTED = '$(trash) Remove selected patterns';

  const action = await vscode.window.showQuickPick(
    [
      { label: ADD_NEW, description: 'Add a new glob exclusion pattern' },
      { label: REMOVE_SELECTED, description: 'Remove one or more patterns from the exclusion list' },
      ...items,
    ],
    {
      placeHolder: 'Current exclude patterns (click to manage)',
      title: 'Configure Synced Files',
    }
  );

  if (!action) return;

  if (action.label === ADD_NEW) {
    const pattern = await vscode.window.showInputBox({
      prompt: 'Enter glob pattern to exclude (e.g. **/*.secret)',
      placeHolder: '**/.env',
    });
    if (pattern) {
      const updated = [...excludePatterns, pattern];
      await config.update('excludePatterns', updated, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(`Added exclusion: ${pattern}`);
    }
  } else if (action.label === REMOVE_SELECTED) {
    const toRemove = await vscode.window.showQuickPick(
      excludePatterns.map(p => ({ label: p })),
      { canPickMany: true, placeHolder: 'Select patterns to remove' }
    );
    if (toRemove && toRemove.length > 0) {
      const removeSet = new Set(toRemove.map(i => i.label));
      const updated = excludePatterns.filter(p => !removeSet.has(p));
      await config.update('excludePatterns', updated, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(`Removed ${toRemove.length} pattern(s).`);
    }
  }
}

// ---------------------------------------------------------------------------
// Teacher: Show connection info
// ---------------------------------------------------------------------------
async function showConnectionInfo(context: vscode.ExtensionContext): Promise<void> {
  if (!serverInstance) {
    vscode.window.showWarningMessage('No session running.');
    return;
  }

  const sessionConfig = serverInstance.getSessionConfig();
  if (!sessionConfig) return;

  const localIP = getLocalNetworkIP();
  const urls = formatConnectionUrls(sessionConfig.port, localIP);
  await openConnectionPanel(urls, context);
}

async function openConnectionPanel(
  urls: { httpUrl: string; wsUrl: string; httpLocalUrl: string; wsLocalUrl: string },
  context: vscode.ExtensionContext
): Promise<void> {
  if (!serverInstance) return;

  const httpUrl = urls.httpUrl;
  const wsUrl = urls.wsUrl;
  const httpLocalUrl = urls.httpLocalUrl;

  connectionPanel = await ConnectionPanel.show(
    httpUrl,
    wsUrl,
    httpLocalUrl,
    () => serverInstance?.getConnectionCount() ?? 0,
    () => stopTeacherServer(),
    context
  );
}

// ---------------------------------------------------------------------------
// Student: Connect
// ---------------------------------------------------------------------------
async function connectAsStudent(): Promise<void> {
  if (serverInstance) {
    vscode.window.showWarningMessage('Stop the teaching session first.');
    return;
  }
  if (studentClient) {
    vscode.window.showInformationMessage('Already connected to a session.');
    return;
  }

  const url = await vscode.window.showInputBox({
    prompt: 'Enter teacher WebSocket URL',
    placeHolder: 'ws://192.168.1.x:8765',
    validateInput: (v) => {
      if (!v) return 'URL is required';
      if (!v.startsWith('ws://') && !v.startsWith('wss://')) return 'Must start with ws:// or wss://';
      return null;
    },
  });

  if (!url) return;

  statusBar.showLoading('Connecting...');

  studentClient = new WebSocketClient(url);

  studentClient.onConnected((sessionId) => {
    statusBar.setMode(Mode.STUDENT);
    statusBar.setConnected(true);
    vscode.window.showInformationMessage(`Connected to teaching session${sessionId ? ` (${sessionId})` : ''}.`);
  });

  studentClient.onDisconnected(() => {
    statusBar.setConnected(false);
  });

  studentClient.onFileUpdate((update) => {
    lastFileUpdate = { content: update.content, language: update.language, fileName: update.fileName };

    if (virtualDocProvider) {
      virtualDocProvider.update(update.content, update.language, update.fileName);

      // Open the virtual document (will reuse existing tab if already open)
      const uri = virtualDocProvider.uri;
      vscode.workspace.openTextDocument(uri).then((doc) => {
        vscode.window.showTextDocument(doc, {
          viewColumn: vscode.ViewColumn.Active,
          preserveFocus: true,
          preview: true,
        });
      });
    }
  });

  studentClient.connect();
}

// ---------------------------------------------------------------------------
// Student: Disconnect
// ---------------------------------------------------------------------------
async function disconnectStudent(): Promise<void> {
  if (!studentClient) {
    vscode.window.showInformationMessage('Not connected to any session.');
    return;
  }

  studentClient.disconnect();
  studentClient = null;
  lastFileUpdate = null;
  statusBar.setMode(Mode.INACTIVE);
  vscode.window.showInformationMessage('Disconnected from teaching session.');
}

// ---------------------------------------------------------------------------
// Student: Copy to workspace
// ---------------------------------------------------------------------------
async function copyToWorkspace(): Promise<void> {
  if (!lastFileUpdate) {
    vscode.window.showWarningMessage('No code received yet. Connect and wait for the teacher to share a file.');
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return;
  }

  const targetFolder = workspaceFolders[0].uri;
  const suggestedName = lastFileUpdate.fileName.replace(/[/\\]/g, '_');

  const fileName = await vscode.window.showInputBox({
    prompt: 'Save as filename',
    value: suggestedName,
  });

  if (!fileName) return;

  const targetUri = vscode.Uri.joinPath(targetFolder, fileName);
  const encoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(targetUri, encoder.encode(lastFileUpdate.content));

  const doc = await vscode.workspace.openTextDocument(targetUri);
  await vscode.window.showTextDocument(doc);
  vscode.window.showInformationMessage(`Saved to ${fileName}`);
}

// ---------------------------------------------------------------------------
// Deactivate
// ---------------------------------------------------------------------------
export function deactivate() {
  if (fileSyncManager) { fileSyncManager.dispose(); fileSyncManager = null; }
  if (connectionPanel) { connectionPanel.dispose(); connectionPanel = null; }
  if (serverInstance) {
    serverInstance.stop().catch(console.error);
    serverInstance.dispose();
    serverInstance = null;
  }
  if (studentClient) { studentClient.disconnect(); studentClient = null; }
  if (virtualDocProvider) { virtualDocProvider.dispose(); virtualDocProvider = null; }
}
