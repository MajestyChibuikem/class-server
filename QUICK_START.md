# Quick Start - Testing the Extension

## 🚀 Fastest Way to Test

### 1. Build the Extension
```bash
npm run build
```

### 2. Launch Extension Development Host
1. Open this project in VSCode
2. Press **F5** (or Run > Start Debugging)
3. A new VSCode window opens - this is your "Extension Development Host"

### 3. Start Teaching Session (Teacher Mode)
In the Extension Development Host window:
1. Open any folder with code files
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
3. Type: `Classroom: Start Teaching Session`
4. Press Enter
5. You'll see a notification with connection URLs

### 4. Connect as Student (Browser)
1. Copy the "Browser URL" from the notification (e.g., `http://192.168.1.100:8765`)
2. Open it in any browser (Chrome, Firefox, Safari, etc.)
3. You should see "Connected to teacher"

### 5. Test Real-time Sync
1. In the Extension Development Host (teacher):
   - Open a code file (`.ts`, `.js`, `.py`, etc.)
   - Start typing code
2. In the browser (student):
   - You should see the file appear
   - You should see your typing updates after ~500ms
   - File switches are instant!

## 📋 Status Bar

Look at the bottom-left of VSCode:
- **Teacher mode**: Shows "Classroom: X Students"
- **Student mode**: Shows "Classroom: Connected" or "Disconnected"
- **Inactive**: Shows "Classroom Sync"

## 🔍 Quick Commands

Access via `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows):

**Teacher:**
- `Classroom: Start Teaching Session (Teacher)`
- `Classroom: Stop Teaching Session (Teacher)`
- `Classroom: Show Connection Info (Teacher)`
- `Classroom: Configure Synced Files (Teacher)`

**Student:**
- `Classroom: Connect to Teaching Session (Student)`
- `Classroom: Disconnect from Session (Student)`

## 🐛 Troubleshooting

**Extension not loading?**
- Check Output panel: View > Output > Select "Log (Extension Host)"
- Look for build errors

**Can't connect?**
- Check firewall settings
- Verify the IP address in connection info
- Try `localhost` if testing on same machine

**File not syncing?**
- Check if file is excluded (`.env`, `node_modules`, etc.)
- Check Output console for errors
- Verify file size is under 1MB

## 📚 Full Testing Guide

See [TESTING.md](./TESTING.md) for comprehensive testing instructions.

