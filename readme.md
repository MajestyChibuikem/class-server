# Classroom Code Sync

Classroom Code Sync is a Visual Studio Code extension for broadcasting an instructor's active file to students in real time. The instructor runs a local HTTP/WebSocket server from VS Code; students can follow the shared code in a browser or in another VS Code window.

## What it does

- **Teacher sessions:** Start and stop a teaching session from the VS Code Command Palette. The server listens on the configured port and supports up to 150 concurrent clients.
- **Live code broadcast:** The active editor's file is sent when the teacher switches files. Edits to that file are sent after a configurable debounce delay (500 ms by default).
- **Browser student view:** Students open the teacher's HTTP URL on a phone, tablet, or computer. The page shows the current file, syntax highlighting and line numbers, connection status, and a button to copy the code.
- **VS Code student view:** Students can connect using the teacher's WebSocket URL. Incoming code appears in a read-only virtual document that updates as the teacher shares files. Students can use **Classroom: Copy Current File to Workspace (Student)** to save the latest received content into their own workspace.
- **Connection panel:** Starting a session opens a panel with a QR code and shareable URLs, a live student count, and a stop-session button. The QR code opens the browser viewer.
- **File controls:** Include and exclude glob patterns control which files may be shared. By default, common sensitive and generated files are excluded, binary files are skipped, and files over 1 MB are not sent.
- **Reconnect handling:** Browser and VS Code student clients attempt to reconnect after an interruption, with increasing delays. Student clients also send periodic heartbeats.

The extension broadcasts the **active text editor's content**; it does not synchronize student edits back to the teacher or copy entire workspaces.

## Requirements

- Visual Studio Code 1.85.0 or later
- Node.js and npm to build or run the extension from source

## Build and run from source

```bash
npm install
npm run build
```

Open the project folder in VS Code and press **F5** (Run > Start Debugging) to launch an Extension Development Host. The extension can then be tested in that separate VS Code window.

Useful development commands:

```bash
npm run watch    # Rebuild when source files change
npm run compile  # Run the TypeScript compiler
npm run lint     # Lint the TypeScript source
```

## Start a teaching session

1. In the Extension Development Host, open the folder containing the code to share.
2. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux).
3. Run **Classroom: Start Teaching Session (Teacher)**.
4. Use the connection panel's QR code or **WiFi URL** for browser students. For a student using VS Code, share the **WebSocket URL** instead.
5. To end the session, use the panel's **Stop Session** button or run **Classroom: Stop Teaching Session (Teacher)**.

The status bar shows the session's student count. Click it to reopen the connection panel. **Classroom: Show Connection Info (Teacher)** also opens the panel.

## Connect as a student

### Browser

Open the teacher's HTTP/WiFi URL in a browser. The browser viewer connects to the WebSocket server at the same host and port. Students can scan the QR code displayed in the teacher's connection panel to open this page.

### VS Code

In the student's VS Code window, run **Classroom: Connect to Teaching Session (Student)** and enter the teacher's WebSocket URL (`ws://...` or `wss://...`). The shared file appears in a read-only `classroom-sync` document. To keep a local copy, run **Classroom: Copy Current File to Workspace (Student)** after code has been received.

## Commands

| Command | Purpose |
| --- | --- |
| **Classroom: Start Teaching Session (Teacher)** | Start a teacher server and open the connection panel. |
| **Classroom: Stop Teaching Session (Teacher)** | Stop the server and disconnect clients. |
| **Classroom: Show Connection Info (Teacher)** | Show the URLs, QR code, and connected-student count. |
| **Classroom: Configure Synced Files (Teacher)** | Add or remove file exclusion patterns. |
| **Classroom: Connect to Teaching Session (Student)** | Connect this VS Code window to a teacher using a WebSocket URL. |
| **Classroom: Disconnect from Session (Student)** | Disconnect the VS Code student client. |
| **Classroom: Copy Current File to Workspace (Student)** | Save the latest received code as a workspace file. |

## Settings

Open VS Code Settings and search for `classroomSync`.

| Setting | Default | Description |
| --- | --- | --- |
| `classroomSync.server.port` | `8765` | HTTP/WebSocket server port (1024–65535). |
| `classroomSync.server.requireAuth` | `false` | Authentication option currently present in settings. **Token validation is not implemented**, so enabling this setting does not protect the server. |
| `classroomSync.sync.debounceMs` | `500` | Delay before broadcasting edits to the active file (100–5000 ms). File switches are sent immediately. |
| `classroomSync.sync.includePatterns` | `[]` | Optional glob allowlist. When non-empty, a file must match at least one pattern to be shared. |
| `classroomSync.sync.excludePatterns` | See below | Glob patterns excluded from sharing. Exclusions take precedence over includes. |
| `classroomSync.sync.maxFileSize` | `1048576` | Maximum file content size in bytes (1 KB–10 MB). |

Default exclusions:

```text
**/.env
**/.env.*
**/node_modules/**
**/.git/**
**/*.key
**/*.pem
**/*.p12
**/*.pfx
**/credentials.json
**/.vscode/**
```

The **Configure Synced Files** command manages exclusion patterns; include patterns and other options can be changed in VS Code Settings. Untitled files, files outside the workspace (when a workspace folder applies), likely binary files, and files above the size limit are not broadcast.

## Network access

The server binds to `0.0.0.0` and can accept connections from devices that can reach the host and port. On a local network, share the network URL shown in the connection panel. For remote students, a VPN or a tunneling service that forwards HTTP and WebSocket traffic to the configured port may be used. The remote connection walkthroughs are in [REMOTE_CONNECTION_GUIDE.md](./REMOTE_CONNECTION_GUIDE.md) and [REMOTE_SETUP.md](./REMOTE_SETUP.md); see [NETWORK_GUIDE.md](./NETWORK_GUIDE.md) for local-network details.

**Security:** Anyone who can reach the server may connect and receive the shared files. The server does not currently enforce authentication, even when `classroomSync.server.requireAuth` is enabled. Carefully review the active file and filter settings, use a trusted network, and stop the session when finished. Do not expose the server to an untrusted network.

## More guides

- [QUICK_START.md](./QUICK_START.md) — quick development and manual test walkthrough
- [TESTING.md](./TESTING.md) — detailed testing guide
- [NETWORK_GUIDE.md](./NETWORK_GUIDE.md) — connecting on a local network
- [REMOTE_CONNECTION_GUIDE.md](./REMOTE_CONNECTION_GUIDE.md) — remote connection approaches
- [REMOTE_SETUP.md](./REMOTE_SETUP.md) — quick remote setup
