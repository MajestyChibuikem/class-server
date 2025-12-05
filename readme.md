# VSCode Classroom Code Sync Extension - Implementation Plan

## Overview

Build a VSCode extension that enables real-time code viewing for classroom teaching. The instructor starts a local WebSocket server from VSCode, and up to 50 students can connect via browser to view live code updates as the instructor types.

## Requirements Summary

- **Teacher Mode**: Start local WebSocket server, select which files to sync, broadcast changes
- **Student Mode**: Connect via browser (read-only), receive real-time updates
- **Scale**: Support ~50 concurrent student connections
- **Sync**: Files sync as teacher switches between them, with file filtering control
- **Fresh Project**: Starting from empty directory

## Architecture

### High-Level Design

```
Teacher VSCode → WebSocket Server → Student Browsers (50 clients)
                  (Local Network)
```

### Technology Stack

- **VSCode Extension API** (1.85.0+)
- **WebSocket Server**: `ws` library (^8.14.0)
- **TypeScript** (5.3+)
- **Build Tool**: esbuild
- **Additional**: Express (static content), QRCode (connection sharing), ip (network detection)

### Communication Protocol

**Teacher → Students Messages**:
- `file_update`: Content changes (debounced 500ms)
- `file_switch`: Active file changed
- `connected`: Initial connection success
- `server_closing`: Server shutdown

**Students → Teacher Messages**:
- `auth`: Optional authentication
- `ping`: Heartbeat (every 30s)

## Project Structure

```
class-server/
├── src/
│   ├── extension/
│   │   ├── extension.ts              # Main entry point
│   │   ├── commands/
│   │   │   ├── startServer.ts        # Start server command
│   │   │   ├── stopServer.ts         # Stop server command
│   │   │   └── configureFiles.ts     # File filtering UI
│   │   ├── server/
│   │   │   ├── WebSocketServer.ts    # WebSocket server
│   │   │   ├── ConnectionManager.ts  # Client tracking
│   │   │   └── MessageBroker.ts      # Message routing
│   │   ├── sync/
│   │   │   ├── FileSyncManager.ts    # File change tracking
│   │   │   ├── FileFilter.ts         # Include/exclude logic
│   │   │   └── ContentProvider.ts    # File content preparation
│   │   └── ui/
│   │       ├── ConnectionPanel.ts    # Connection info webview
│   │       └── StatusBar.ts          # Status bar integration
│   └── client/
│       ├── index.html                # Student viewer
│       ├── styles.css                # Student viewer styles
│       └── client.js                 # WebSocket client logic
├── package.json                      # Extension manifest
├── tsconfig.json                     # TypeScript config
└── esbuild.js                        # Build script
```

## Core Components

### 1. Extension Entry Point (`extension.ts`)

- Activate on `onStartupFinished` or command
- Register commands (start/stop/configure)
- Initialize status bar
- Manage server lifecycle

### 2. WebSocket Server (`WebSocketServer.ts`)

- Create WebSocket server on port 8765 (configurable)
- Serve static HTML client via HTTP
- Handle WebSocket upgrade requests
- Broadcast messages to all connected clients
- Graceful shutdown

### 3. Connection Manager (`ConnectionManager.ts`)

- Track active WebSocket connections (up to 50)
- Assign unique IDs to clients
- Implement heartbeat/timeout (30s ping, 60s timeout)
- Provide connection statistics
- Clean up disconnected clients

### 4. File Sync Manager (`FileSyncManager.ts`)

- Listen to `vscode.window.onDidChangeActiveTextEditor` (file switch)
- Listen to `vscode.workspace.onDidChangeTextDocument` (edits)
- Debounce rapid changes (500ms)
- Check file against filter rules
- Trigger message broadcast via MessageBroker

### 5. File Filter (`FileFilter.ts`)

- Support glob patterns for include/exclude
- Default exclusions: `**/.env`, `**/node_modules/**`, `**/.git/**`, `**/*.key`
- Persist configuration in workspace settings
- Provide UI for pattern management

### 6. Student Client (`client/index.html`)

- Vanilla JavaScript (no framework)
- WebSocket connection with auto-reconnect
- Syntax highlighting using Prism.js
- Connection status indicator
- Responsive design for tablets/laptops

### 7. Connection Panel (`ConnectionPanel.ts`)

- WebView panel showing connection URL
- QR code for easy mobile access
- Real-time connection count
- Copy URL and Stop Server buttons

## Implementation Phases

### Phase 1: Foundation
1. Initialize npm project with TypeScript
2. Configure build system (esbuild)
3. Create basic extension structure
4. Register commands and status bar
5. Test extension activation

### Phase 2: WebSocket Server
1. Implement WebSocketServer class
2. Set up HTTP server for static content
3. Create basic ConnectionManager
4. Test server start/stop and basic connections

### Phase 3: Student Client
1. Build HTML/CSS/JS client
2. Implement WebSocket connection logic
3. Add auto-reconnect with exponential backoff
4. Create connection status UI

### Phase 4: File Synchronization
1. Implement FileSyncManager with VSCode listeners
2. Add debouncing logic
3. Implement MessageBroker for broadcasting
4. Test end-to-end file sync

### Phase 5: File Filtering & Security
1. Implement FileFilter with glob matching
2. Add default security exclusions
3. Create file configuration UI
4. Test filtering rules

### Phase 6: UI Polish
1. Implement ConnectionPanel with QR code
2. Add syntax highlighting to client (Prism.js)
3. Enhance status bar with connection count
4. Add theme toggle to student viewer

### Phase 7: Testing & Documentation
1. Write unit tests for core components
2. Test with 50 concurrent connections
3. Write comprehensive README
4. Create demo/screenshots

## Security Measures

1. **File Access Control**:
   - Only sync files matching configured patterns
   - Default blacklist for sensitive files (.env, *.key, etc.)
   - Never sync outside workspace boundary

2. **Network Security**:
   - Bind to local network interface only
   - Optional token authentication
   - Rate limiting on connection attempts

3. **Content Security**:
   - Read-only client (no code execution)
   - File size limits (1MB default)
   - Binary file blocking

## Configuration Settings

- `classroomSync.server.port`: Default port (8765)
- `classroomSync.server.requireAuth`: Token authentication (default: false)
- `classroomSync.sync.debounceMs`: Debounce delay (500ms)
- `classroomSync.sync.includePatterns`: Files to include (glob)
- `classroomSync.sync.excludePatterns`: Files to exclude (glob)
- `classroomSync.sync.maxFileSize`: Max file size (1MB)

## Key Design Decisions

### WebSocket over HTTP Polling
- Lower latency and bandwidth
- Native browser support
- Industry standard for real-time apps

### Vanilla `ws` Library vs Socket.io
- Simpler, fewer dependencies
- Better performance for our use case
- Smaller bundle size

### Browser Client vs VSCode Extension for Students
- No installation required
- Works on tablets/phones
- Easier classroom setup

### Debouncing vs Throttling
- Waits for pause before syncing
- Better UX (no flickering)
- File switches bypass debounce for immediacy

## Critical Files to Create

1. `package.json` - Extension manifest with commands, settings, dependencies
2. `src/extension/extension.ts` - Main orchestrator
3. `src/extension/server/WebSocketServer.ts` - Network communication
4. `src/extension/sync/FileSyncManager.ts` - File change tracking
5. `src/extension/server/ConnectionManager.ts` - Client lifecycle
6. `src/client/index.html` - Student viewer
7. `src/extension/sync/FileFilter.ts` - Security filtering
8. `src/extension/ui/ConnectionPanel.ts` - Teacher UI

## Remote Connections

The extension supports connections from **anywhere** using tunneling services:

- **Same Network:** Automatic - works with local network IP
- **Different Networks:** Use tunneling (ngrok, localtunnel, etc.) - see [REMOTE_CONNECTION_GUIDE.md](./REMOTE_CONNECTION_GUIDE.md)
- **VSCode to VSCode:** Students can connect via WebSocket URL from any network

The extension accepts any valid URL, so it works seamlessly with:
- ✅ Local network IPs
- ✅ Tunneling service URLs (ngrok, localtunnel)
- ✅ VPN IPs
- ✅ Port-forwarded URLs

See [REMOTE_SETUP.md](./REMOTE_SETUP.md) for quick setup instructions.

## Next Steps

[This section will be updated based on user feedback]
