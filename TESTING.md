# Testing Guide for Classroom Code Sync Extension

This guide will help you test the extension in development mode.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Verify build works:**
   ```bash
   npm run build
   ```
   This should create a `dist/extension.js` file without errors.

## Testing Setup

### Option 1: Debug in VSCode (Recommended)

1. **Open the project in VSCode:**
   - Open the `class-server` folder in VSCode

2. **Start the build watcher:**
   - Press `F5` or go to Run > Start Debugging
   - This will:
     - Build the extension in watch mode
     - Open a new "Extension Development Host" VSCode window
     - Load your extension in that window

3. **In the Extension Development Host window:**
   - This is where you'll test the extension
   - You'll see the extension is loaded and active

### Option 2: Manual Build and Load

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Package and install (for production testing):**
   ```bash
   npm run build -- --production
   vsce package
   code --install-extension classroom-code-sync-0.1.0.vsix
   ```

## Testing Teacher Mode

### Step 1: Start a Teaching Session

1. **In the Extension Development Host window:**
   - Open any workspace/folder (or create a test folder with some code files)

2. **Start the server:**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type: `Classroom: Start Teaching Session (Teacher)`
   - Press Enter

3. **Verify server started:**
   - Check the status bar (bottom left) - should show "Classroom: No Students" or "Classroom: 0 Students"
   - You should see a notification: "Teaching session started! Students can connect..."
   - The notification will show the HTTP URL (for browsers) and WebSocket URL (for VSCode)

4. **Check connection info:**
   - Click the status bar item, OR
   - Run command: `Classroom: Show Connection Info (Teacher)`
   - You should see connection URLs and IP address

### Step 2: Test File Synchronization

1. **Open a code file:**
   - Open any `.ts`, `.js`, `.py`, or other text file in the workspace
   - Students should immediately see this file when they connect

2. **Make edits:**
   - Type some code in the file
   - Wait ~500ms after stopping typing
   - Students should see the updates appear (debounced)

3. **Switch files:**
   - Open a different file
   - Students should immediately see the new file (no debounce on file switch)

### Step 3: Test File Filtering

1. **Try opening excluded files:**
   - Open a `.env` file or a file in `node_modules/`
   - These should NOT sync to students (by default)

2. **Verify filtering works:**
   - Check browser console or VSCode output for any sync messages
   - Excluded files should not appear

## Testing Student Mode (Browser)

### Step 1: Connect via Browser

1. **Get the connection URL:**
   - From teacher window, run: `Classroom: Show Connection Info (Teacher)`
   - Copy the "Browser URL" (e.g., `http://192.168.1.100:8765`)

2. **Open in browser:**
   - Open the URL in any browser (Chrome, Firefox, Safari, etc.)
   - Works on desktop, tablet, or phone!

3. **Verify connection:**
   - You should see: "Connected to teacher"
   - Status should be green

4. **Watch code updates:**
   - When teacher opens a file, you should see it appear
   - When teacher types, you should see updates after ~500ms
   - When teacher switches files, you should see new file immediately

### Step 2: Test Multiple Browser Connections

1. **Open multiple browser tabs/windows:**
   - Each one connects as a separate student
   - All should see the same code updates
   - Check connection count in teacher status bar

2. **Test reconnection:**
   - Close browser tab
   - Reopen URL
   - Should reconnect automatically
   - Browser shows auto-reconnect countdown

## Testing Student Mode (VSCode Extension)

### Step 1: Connect via VSCode

1. **Open a separate VSCode window:**
   - Open a new VSCode window (File > New Window)
   - This will be your "student" window

2. **Get WebSocket URL:**
   - From teacher window, run: `Classroom: Show Connection Info (Teacher)`
   - Copy the "WebSocket URL" (e.g., `ws://192.168.1.100:8765`)

3. **Connect as student:**
   - In student VSCode window, press `Cmd+Shift+P`
   - Type: `Classroom: Connect to Teaching Session (Student)`
   - Paste the WebSocket URL when prompted

4. **Verify connection:**
   - Status bar should show: "Classroom: Connected"
   - Status should be green/prominent

**Note:** VSCode student mode is currently a placeholder and will be fully implemented in Phase 5/7.

## Testing Edge Cases

### Test 1: Max Connections
1. Start teacher session
2. Connect 50 browser tabs/windows
3. Try connecting a 51st - should be rejected
4. Teacher should see "50 Students" in status bar

### Test 2: Server Shutdown
1. Start teacher session with students connected
2. Run: `Classroom: Stop Teaching Session (Teacher)`
3. Students should receive "server_closing" message
4. Browser clients should show disconnection message

### Test 3: Network IP Detection
1. Start teacher session
2. Check connection info
3. Should show local network IP (e.g., 192.168.1.x)
4. If only localhost, network IP detection might have failed

### Test 4: Port Already in Use
1. Start teacher session on port 8765
2. Try starting another session (should fail)
3. Change port in settings and try again

## Debugging Tips

### Check Extension Output
1. In original VSCode window (where you pressed F5):
   - Go to View > Output
   - Select "Log (Extension Host)" from dropdown
   - Look for console.log messages and errors

### Check WebSocket Server
1. Look for messages like:
   - "New client connected: [id] (Total: X)"
   - "Client disconnected: [id]"
   - Connection errors

### Check File Sync
1. Look for messages about:
   - File sync attempts
   - Filter rejections
   - Content provider errors

### Browser Console
1. Open browser DevTools (F12)
2. Check Console tab for:
   - WebSocket connection status
   - Received messages
   - Errors

### Network Tab
1. In browser DevTools > Network tab
2. Filter by "WS" (WebSocket)
3. Should see active WebSocket connection
4. Can view message frames

## Common Issues

### Issue: "Port already in use"
**Solution:** 
- Change port in settings: `classroomSync.server.port`
- Or stop other instances using that port

### Issue: "No students can connect"
**Solution:**
- Check firewall settings
- Verify IP address is correct
- Try using `localhost` if on same machine
- Check if server actually started (look at status bar)

### Issue: "File changes not syncing"
**Solution:**
- Check if file matches filter patterns
- Verify file size is under limit (1MB default)
- Check Output console for errors
- Ensure server is running and has connections

### Issue: "Browser shows 'Connecting...' forever"
**Solution:**
- Check WebSocket URL is correct
- Verify server is running
- Check browser console for errors
- Try refreshing page

## Quick Test Checklist

- [ ] Extension builds without errors
- [ ] Extension loads in Extension Development Host
- [ ] Status bar appears
- [ ] Teacher can start server
- [ ] Connection info shows URLs and IP
- [ ] Browser can connect via HTTP URL
- [ ] Browser shows "Connected" status
- [ ] File opens when teacher opens it
- [ ] File updates when teacher types (after debounce)
- [ ] File switches immediately when teacher switches
- [ ] Multiple browsers can connect simultaneously
- [ ] Connection count updates correctly
- [ ] Excluded files don't sync
- [ ] Server can be stopped cleanly
- [ ] Students receive disconnection message

## Next Steps

Once basic testing works:
- Test with actual classroom scenario (multiple devices)
- Test with different file types
- Test with large files (near 1MB limit)
- Test with complex file structures
- Test performance with many concurrent connections

