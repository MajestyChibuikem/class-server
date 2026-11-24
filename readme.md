# Classroom Code Sync

Classroom Code Sync is a Visual Studio Code extension built for Computer Science classrooms and computer labs. It broadcasts an instructor's active file to students' VS Code windows in real time and provides an automated, tamper-proof attendance system using a distributed cryptographic ledger.

Students view the shared code directly on their own laptop screens without having to raise their heads or squint at a distant projector screen.

---

## Key Features

### 1. Live Code Broadcasting & Native Split-Screen
- **Zero Projector Strain**: Students follow live coding on their own laptop screens inside their native VS Code environment.
- **Dual-Pane 13-Inch Layout**:
  - **Left Pane (Total Code)**: The complete file. Students can scroll up or down freely to inspect imports, helper functions, and types at their own pace.
  - **Right Pane (Live Focus)**: Automatically follows the teacher in real time. Highlights the teacher's active cursor line and text selections, auto-scrolling to keep the current explanation in view.
- **Instant File Switches & Debounced Edits**: Switching files broadcasts immediately; typing edits are debounced (500 ms by default) to minimize network traffic on busy classroom Wi-Fi.
- **Save to Workspace**: Students can use **Classroom: Copy Current File to Workspace (Student)** to save the broadcasted code directly into their local project.

### 2. Automated Attendance & Distributed Ledger
- **No Manual Roll Calls**: Attendance is collected automatically over the local LAN without disrupting the lecture.
- **Strict "One Device, One Attendance"**: Each student's identity is cryptographically bound to their laptop's unique hardware identifier (`vscode.env.machineId`). If a student attempts to check in a friend using the same laptop, the server rejects the request.
- **Randomized Check-In**: The server triggers a silent attendance challenge at an unpredictable moment during the lecture. Only students whose laptops are actively connected and running VS Code are verified as present.
- **"Everyone Carries the Ledger" (Distributed Cryptographic Storage)**:
  - Each check-in is linked using an append-only $\text{SHA-256}$ hash chain.
  - When attendance is finalized, the server silently broadcasts the sealed ledger to **every connected student's laptop**.
  - Every student's VS Code stores a local, tamper-evident digital copy of the day's attendance block for proof-of-attendance and disaster recovery (if the teacher's laptop is lost or damaged).

### 3. Offline-First Outbox Dispatcher
- **100% Local LAN Operation**: The extension requires zero internet access during class. Code streaming and attendance run over the local classroom Wi-Fi router or hotspot.
- **Long-Term Offline Queue**: If the lecturer's laptop is offline for days or weeks, sealed session ledgers are safely encrypted on disk (`globalStorageUri`).
- **Automatic Background Sync**: Once the lecturer connects to the internet (at home or the office), the background outbox worker automatically flushes pending ledgers to the remote institutional attendance server with idempotency (no duplicate records).

### 4. Security & Privacy
- **Workspace Boundary Enforcement**: Files outside the teacher's workspace folder are never shared.
- **Automatic Exclusions**: Sensitive files (`.env*`, `*.key`, `*.pem`, `credentials.json`, `node_modules/`, `.git/`, etc.) and binary files are blocked from broadcasting by default.
- **Read-Only Virtual Documents**: The synchronized code is served via VS Code's `classroom-sync://` virtual document scheme, preventing students from accidentally modifying the synchronized buffer.

---

## Requirements

- **Visual Studio Code**: Version 1.85.0 or later
- **Operating System**: macOS, Windows, or Linux
- **Network**: Local Area Network (Wi-Fi router, local network, or laptop mobile hotspot) connecting the teacher and students

---

## Getting Started

### 1. Build and Run from Source

```bash
npm install
npm run build
```

To run and debug the extension:
1. Open the project folder in VS Code.
2. Press **F5** (or Run > Start Debugging) to launch an Extension Development Host window.

---

## Teacher Guide

1. Open the folder containing the lecture code in VS Code.
2. Open the Command Palette (`Cmd+Shift+P` on macOS, `Ctrl+Shift+P` on Windows/Linux).
3. Run **Classroom: Start Teaching Session (Teacher)**.
4. The **Connection Panel** opens, displaying:
   - The WebSocket connection URL (e.g. `ws://192.168.1.50:8765`).
   - A live count of connected students.
   - Attendance status and current ledger hash.
   - A **Trigger Attendance Now** button (for on-demand check-in during testing).
5. Share the WebSocket URL with students.
6. Open any code file and start teaching. Switch files or highlight code—students will see the updates on their screens instantly.
7. When class is over, click **Stop Session** in the panel or run **Classroom: Stop Teaching Session (Teacher)**. The session ledger is sealed and queued for dispatch.

---

## Student Guide

1. Open VS Code on your laptop.
2. Run **Classroom: Connect to Teaching Session (Student)**.
3. If connecting for the first time, VS Code will prompt you for:
   - **Full Name** (e.g., *Jane Doe*)
   - **Student / Matriculation ID** (e.g., *CSC/2022/0142*)
4. Enter the teacher's WebSocket URL (e.g., `ws://192.168.1.50:8765`).
5. Two side-by-side tabs will open:
   - **Total Code**: Scroll and review the entire file freely.
   - **Live Focus**: Stays locked to the teacher's cursor and highlights.
6. **Attendance**: You do not need to do anything. During class, your VS Code will silently respond to the teacher's randomized check-in challenge and save the synchronized class attendance ledger locally.
7. To save the code locally at any point, run **Classroom: Copy Current File to Workspace (Student)**.
8. To disconnect, run **Classroom: Disconnect from Session (Student)**.

---

## Commands

| Command | Role | Description |
| :--- | :--- | :--- |
| `classroomSync.teacher.startServer` | Teacher | Start teaching session and open the connection panel. |
| `classroomSync.teacher.stopServer` | Teacher | Stop session, seal the attendance ledger, and disconnect students. |
| `classroomSync.teacher.showConnection` | Teacher | Reveal the connection panel with live student count & ledger status. |
| `classroomSync.teacher.triggerAttendance` | Teacher | Trigger an immediate attendance challenge check-in. |
| `classroomSync.teacher.configureFiles` | Teacher | Manage file exclusion patterns. |
| `classroomSync.student.connect` | Student | Connect to a teacher's session using their WebSocket URL. |
| `classroomSync.student.disconnect` | Student | Disconnect from the current session. |
| `classroomSync.student.copyToWorkspace` | Student | Save the currently received code into the local workspace. |
| `classroomSync.student.updateProfile` | Student | Update saved Full Name and Student ID. |

---

## Settings

Configure settings in VS Code Preferences (`Cmd+,` or `Ctrl+,`), searching for `classroomSync`.

| Setting | Default | Description |
| :--- | :--- | :--- |
| `classroomSync.server.port` | `8765` | WebSocket server port (1024–65535). |
| `classroomSync.sync.debounceMs` | `500` | Typing debounce delay in milliseconds (100–5000 ms). |
| `classroomSync.sync.includePatterns` | `[]` | Optional allowlist glob patterns. When non-empty, only matching files are synced. |
| `classroomSync.sync.excludePatterns` | *(See below)* | Glob patterns excluded from sync. Exclusions take precedence over includes. |
| `classroomSync.sync.maxFileSize` | `1048576` | Maximum file size in bytes (1 MB default). |
| `classroomSync.student.name` | `""` | Student's full name for attendance check-in. |
| `classroomSync.student.id` | `""` | Student's ID / Matriculation number for attendance check-in. |
| `classroomSync.attendance.serverUrl` | `""` | Optional remote API endpoint to upload sealed attendance ledgers. |
| `classroomSync.attendance.randomMin` | `5` | Minimum minutes into the class before randomized check-in triggers. |
| `classroomSync.attendance.randomMax` | `30` | Maximum minutes into the class before randomized check-in triggers. |

### Default Exclusions

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

---

## Classroom Network Setup

- **Same Wi-Fi Network**: Both the teacher and students must be on the same local network.
- **Campus Wi-Fi Tip (Client Isolation)**: Many campus Wi-Fi networks block peer-to-peer communication between laptops. If students cannot connect to the teacher's IP:
  1. Turn on the teacher's laptop **Wi-Fi Hotspot** (or a smartphone hotspot / portable travel router).
  2. Have students connect their laptops to that hotspot.
  3. No internet connection is required—code streaming and attendance ledger syncing work 100% locally.
