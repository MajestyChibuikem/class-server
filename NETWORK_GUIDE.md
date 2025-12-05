# Network Connection Guide

## ✅ Yes, it works on other devices!

Students can connect from **any device on the same network** (WiFi/LAN) - laptops, tablets, phones, etc.

## How It Works

The server binds to `0.0.0.0`, which means it accepts connections from:
- ✅ This computer (localhost)
- ✅ Other devices on the same WiFi network
- ✅ Other devices on the same LAN

## Finding Your Network URL

1. **Start a teaching session**
2. **Click the status bar** or run: `Classroom: Show Connection Info (Teacher)`
3. **Look for "Network URL"** - it will show something like:
   - `http://192.168.1.100:8765`
   - `http://10.0.0.5:8765`

## Testing on Other Devices

### Same WiFi Network
1. Make sure teacher laptop and student devices are on the **same WiFi network**
2. On student device, open browser
3. Enter the Network URL from teacher
4. Should connect immediately!

### Different Networks
- ❌ Won't work across different WiFi networks
- ❌ Won't work over the internet (unless you set up port forwarding)
- ✅ Only works on the same local network (WiFi/LAN)

## Troubleshooting Network Connections

### Problem: "Network IP not detected"

**Why this happens:**
- Not connected to WiFi/LAN
- Only on VPN
- Network adapter issues

**Solution:**
- Connect to WiFi or LAN
- Check network settings
- Try disconnecting VPN
- Localhost URL will still work for testing on same computer

### Problem: "Students can't connect from other devices"

**Check these:**

1. **Same Network?**
   - Teacher and students must be on the same WiFi/LAN
   - Check WiFi network name matches

2. **Firewall Blocking?**
   - macOS: System Settings > Firewall (may need to allow Node/VSCode)
   - Windows: Windows Defender Firewall (may need to allow port)
   - Try temporarily disabling firewall to test

3. **Port Blocked?**
   - Check if port 8765 (or your configured port) is open
   - Some networks block certain ports

4. **Correct URL?**
   - Must use Network URL, not localhost
   - Format: `http://[IP]:[PORT]`
   - Example: `http://192.168.1.100:8765`

### Problem: "Connection timeout"

**Solutions:**
- Verify Network IP is correct (check connection info)
- Try pinging the IP from student device
- Check firewall isn't blocking
- Verify server is still running

## Finding Your IP Address Manually

If the extension doesn't detect your network IP, you can find it manually:

### macOS/Linux:
```bash
ifconfig | grep "inet "
# or
ip addr show
```

Look for IP starting with `192.168.` or `10.0.` (not `127.0.0.1`)

### Windows:
```cmd
ipconfig
```

Look for "IPv4 Address" under your WiFi adapter (not "127.0.0.1")

## Testing Checklist

- [ ] Teacher and student devices on same WiFi network
- [ ] Server shows Network URL (not just localhost)
- [ ] Network URL format: `http://[IP]:[PORT]`
- [ ] Firewall allows connections
- [ ] Student can open URL in browser
- [ ] Connection shows "Connected to teacher"
- [ ] File sync works from teacher to student

## Security Notes

⚠️ **Important Security Considerations:**

1. **Local Network Only**
   - Server only binds to local network (0.0.0.0)
   - Won't be accessible from the internet unless configured

2. **No Authentication (by default)**
   - Anyone on your network can connect
   - Consider enabling authentication for production use

3. **File Filtering**
   - Default excludes sensitive files (.env, *.key, etc.)
   - Review filter settings before syncing

4. **Trust Your Network**
   - Only use on trusted networks (classroom, office)
   - Don't use on public/open WiFi

## Port Configuration

Default port is **8765**. To change:

1. Open VSCode Settings
2. Search for: `classroomSync.server.port`
3. Change to desired port (1024-65535)
4. Restart teaching session

Make sure the new port isn't blocked by firewall or network policies.

