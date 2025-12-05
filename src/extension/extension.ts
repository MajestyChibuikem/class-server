import * as vscode from 'vscode';
import { StatusBarManager, Mode } from './ui/StatusBar';
import { WebSocketServer } from './server/WebSocketServer';
import { getLocalNetworkIP, formatConnectionUrls } from './server/NetworkUtils';
import { FileSyncManager } from './sync/FileSyncManager';

// Placeholder imports - will be implemented in subsequent phases
// import { WebSocketClient } from './client/WebSocketClient';
// import { VirtualDocumentProvider } from './client/VirtualDocumentProvider';

let statusBar: StatusBarManager;
let serverInstance: WebSocketServer | null = null;
let fileSyncManager: FileSyncManager | null = null;
let clientInstance: any = null; // WebSocketClient instance
let connectionCountTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Classroom Code Sync extension is now active');

  // Initialize status bar
  statusBar = new StatusBarManager();
  context.subscriptions.push(statusBar);

  // Register teacher commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'classroomSync.teacher.startServer',
      () => startTeacherServer(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'classroomSync.teacher.stopServer',
      () => stopTeacherServer()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'classroomSync.teacher.configureFiles',
      () => configureFiles()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'classroomSync.teacher.showConnection',
      () => showConnectionInfo()
    )
  );

  // Register student commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'classroomSync.student.connect',
      () => connectAsStudent(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'classroomSync.student.disconnect',
      () => disconnectStudent()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'classroomSync.student.copyToWorkspace',
      () => copyToWorkspace()
    )
  );
}

/**
 * Start teaching session (teacher mode)
 */
async function startTeacherServer(context: vscode.ExtensionContext): Promise<void> {
  if (clientInstance) {
    vscode.window.showWarningMessage(
      'You are currently connected as a student. Disconnect first before starting a teaching session.'
    );
    return;
  }

  if (serverInstance) {
    vscode.window.showInformationMessage('Teaching session is already running');
    return;
  }

  try {
    statusBar.showLoading('Starting teaching session...');

    // Get configuration
    const config = vscode.workspace.getConfiguration('classroomSync');
    const port = config.get<number>('server.port', 8765);
    const requireAuth = config.get<boolean>('server.requireAuth', false);

    // Create and start WebSocket server
    serverInstance = new WebSocketServer(port, requireAuth, context);

    // Create and start file sync manager
    const messageBroker = serverInstance.getMessageBroker();
    fileSyncManager = new FileSyncManager(messageBroker);
    fileSyncManager.start();

    // Set up connection count callback
    startConnectionCountMonitoring();

    // Start the server
    const { url, localUrl } = await serverInstance.start();

    // Get local network IP for display
    const localIP = getLocalNetworkIP();
    const urls = formatConnectionUrls(port, localIP);

    statusBar.setMode(Mode.TEACHER);
    statusBar.setConnectionCount(0);

    // Show success message with connection info
    const httpUrl = localIP ? urls.httpUrl : localUrl;
    vscode.window.showInformationMessage(
      `Teaching session started! Students can connect via browser (${httpUrl}) or VSCode extension.`,
      'Show Connection Info'
    ).then((selection) => {
      if (selection === 'Show Connection Info') {
        showConnectionInfo();
      }
    });
  } catch (error: any) {
    statusBar.showError('Failed to start');
    vscode.window.showErrorMessage(`Failed to start teaching session: ${error.message}`);
    serverInstance = null;
  }
}

/**
 * Stop teaching session (teacher mode)
 */
async function stopTeacherServer(): Promise<void> {
  if (!serverInstance) {
    vscode.window.showInformationMessage('No teaching session is currently running');
    return;
  }

  try {
    stopConnectionCountMonitoring();

    // Stop file sync manager
    if (fileSyncManager) {
      fileSyncManager.stop();
      fileSyncManager.dispose();
      fileSyncManager = null;
    }

    await serverInstance.stop();
    serverInstance.dispose();
    serverInstance = null;
    statusBar.setMode(Mode.INACTIVE);
    vscode.window.showInformationMessage('Teaching session stopped');
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to stop teaching session: ${error.message}`);
    
    // Clean up on error
    if (fileSyncManager) {
      fileSyncManager.dispose();
      fileSyncManager = null;
    }
    serverInstance = null;
  }
}

/**
 * Configure file filters (teacher mode)
 */
async function configureFiles(): Promise<void> {
  // TODO: Implement file configuration UI
  vscode.window.showInformationMessage(
    'File configuration will be implemented in Phase 4'
  );
}

/**
 * Show connection information (teacher mode)
 */
async function showConnectionInfo(): Promise<void> {
  if (!serverInstance) {
    vscode.window.showWarningMessage('No teaching session is currently running');
    return;
  }

  const sessionConfig = serverInstance.getSessionConfig();
  if (!sessionConfig) {
    vscode.window.showWarningMessage('Session configuration not available');
    return;
  }

  const connectionCount = serverInstance.getConnectionCount();
  const localIP = getLocalNetworkIP();
  const urls = formatConnectionUrls(sessionConfig.port, localIP);

  // TODO: Implement connection panel with QR code (Phase 6)
  // For now, show a simple information message
  const httpUrl = localIP ? urls.httpUrl : urls.httpLocalUrl;
  const wsUrl = localIP ? urls.wsUrl : urls.wsLocalUrl;
  
  // Create detailed info message
  let info = `Connected Students: ${connectionCount}/50\n\n`;
  
  if (localIP) {
    info += `🌐 Network URL (same WiFi/LAN):\n${httpUrl}\n\n`;
    info += `📱 Students on the same network can use this URL\n\n`;
    info += `🖥️  Localhost URL (this computer only):\n${urls.httpLocalUrl}\n\n`;
    info += `🔌 WebSocket URL (VSCode students): ${wsUrl}\n\n`;
    info += `📍 Your Network IP: ${localIP}\n\n`;
    info += `🌍 For remote connections (different networks):\n`;
    info += `   Use tunneling service (ngrok, localtunnel, etc.)\n`;
    info += `   See REMOTE_CONNECTION_GUIDE.md for details`;
  } else {
    info += `⚠️  Network IP not detected\n\n`;
    info += `📱 Using localhost (only works on this computer):\n${httpUrl}\n\n`;
    info += `💡 Tip: Connect to WiFi/LAN for network access\n\n`;
    info += `🌍 For remote connections:\n`;
    info += `   Use tunneling service (ngrok, localtunnel, etc.)\n`;
    info += `   See REMOTE_CONNECTION_GUIDE.md for details`;
  }

  vscode.window.showInformationMessage(
    info,
    localIP ? 'Copy Network URL' : 'Copy Localhost URL',
    localIP ? 'Copy Localhost URL' : undefined,
    'Copy WebSocket URL'
  ).then((selection) => {
    if (selection === 'Copy Network URL') {
      vscode.env.clipboard.writeText(httpUrl);
      vscode.window.showInformationMessage(`Network URL copied! Students on the same WiFi can use: ${httpUrl}`);
    } else if (selection === 'Copy Localhost URL') {
      vscode.env.clipboard.writeText(urls.httpLocalUrl);
      vscode.window.showInformationMessage('Localhost URL copied to clipboard!');
    } else if (selection === 'Copy WebSocket URL') {
      vscode.env.clipboard.writeText(wsUrl);
      vscode.window.showInformationMessage('WebSocket URL copied to clipboard!');
    }
  });
}

/**
 * Connect to teaching session (student mode)
 */
async function connectAsStudent(context: vscode.ExtensionContext): Promise<void> {
  if (serverInstance) {
    vscode.window.showWarningMessage(
      'You are currently running a teaching session. Stop it first before connecting as a student.'
    );
    return;
  }

  if (clientInstance) {
    vscode.window.showInformationMessage('You are already connected to a teaching session');
    return;
  }

  try {
    // Get teacher's connection URL from user
    const url = await vscode.window.showInputBox({
      prompt: 'Enter teacher connection URL (e.g., ws://192.168.1.100:8765)',
      placeHolder: 'ws://192.168.1.100:8765',
      validateInput: (value) => {
        if (!value) {
          return 'URL is required';
        }
        if (!value.startsWith('ws://') && !value.startsWith('wss://')) {
          return 'URL must start with ws:// or wss://';
        }
        return null;
      },
    });

    if (!url) {
      return; // User cancelled
    }

    statusBar.showLoading('Connecting to teaching session...');

    // TODO: Implement WebSocket client connection
    vscode.window.showInformationMessage(
      'Student mode: Client connection will be implemented in Phase 5'
    );

    statusBar.setMode(Mode.STUDENT);
    statusBar.setConnected(false);
  } catch (error: any) {
    statusBar.showError('Connection failed');
    vscode.window.showErrorMessage(`Failed to connect: ${error.message}`);
  }
}

/**
 * Disconnect from teaching session (student mode)
 */
async function disconnectStudent(): Promise<void> {
  if (!clientInstance) {
    vscode.window.showInformationMessage('You are not connected to any teaching session');
    return;
  }

  try {
    // TODO: Implement client disconnection
    clientInstance = null;
    statusBar.setMode(Mode.INACTIVE);
    vscode.window.showInformationMessage('Disconnected from teaching session');
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to disconnect: ${error.message}`);
  }
}

/**
 * Copy current synced file to workspace (student mode)
 */
async function copyToWorkspace(): Promise<void> {
  if (!clientInstance) {
    vscode.window.showWarningMessage('You are not connected to any teaching session');
    return;
  }

  // TODO: Implement copy to workspace functionality
  vscode.window.showInformationMessage(
    'Copy to workspace will be implemented in Phase 7'
  );
}

/**
 * Start monitoring connection count and update status bar
 */
function startConnectionCountMonitoring(): void {
  stopConnectionCountMonitoring(); // Clear any existing timer

  connectionCountTimer = setInterval(() => {
    if (serverInstance) {
      const count = serverInstance.getConnectionCount();
      statusBar.setConnectionCount(count);
    }
  }, 1000); // Update every second
}

/**
 * Stop monitoring connection count
 */
function stopConnectionCountMonitoring(): void {
  if (connectionCountTimer) {
    clearInterval(connectionCountTimer);
    connectionCountTimer = undefined;
  }
}

export function deactivate() {
  stopConnectionCountMonitoring();

  if (fileSyncManager) {
    fileSyncManager.dispose();
    fileSyncManager = null;
  }

  if (serverInstance) {
    serverInstance.stop().catch((error) => {
      console.error('Error stopping server on deactivate:', error);
    });
    serverInstance.dispose();
    serverInstance = null;
  }

  if (clientInstance) {
    // TODO: Clean up client
    clientInstance = null;
  }
}
