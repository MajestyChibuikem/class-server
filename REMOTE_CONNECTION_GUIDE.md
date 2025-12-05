# Remote Connection Guide - Connecting Across Different Networks

Yes! You can connect students from **different networks** using several methods. Here are your options:

## Option 1: Tunneling Service (Easiest - Recommended) 🚀

Use a tunneling service to create a public URL that forwards to your local server.

### Using ngrok (Free & Easy)

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from: https://ngrok.com/download
   ```

2. **Create free account** (optional but recommended):
   - Go to https://ngrok.com
   - Sign up for free account
   - Get your auth token

3. **Start your teaching session:**
   - In VSCode, start the teaching session
   - Note the port (default: 8765)

4. **Create tunnel:**
   ```bash
   ngrok http 8765
   ```

5. **Share the ngrok URL:**
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   - Students can use this URL from anywhere!
   - For WebSocket: use `wss://abc123.ngrok.io`

### Using localtunnel (No Signup Required)

1. **Install localtunnel:**
   ```bash
   npm install -g localtunnel
   ```

2. **Start your teaching session** (port 8765)

3. **Create tunnel:**
   ```bash
   lt --port 8765
   ```

4. **Share the URL:**
   - Copy the URL shown (e.g., `https://xyz.loca.lt`)
   - Students can connect from anywhere!

### Using Cloudflare Tunnel (Free)

1. **Install cloudflared:**
   ```bash
   # macOS
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Start your teaching session** (port 8765)

3. **Create tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:8765
   ```

4. **Share the Cloudflare URL**

## Option 2: Port Forwarding (Requires Router Access)

If you have access to your router, you can forward a port to make your server accessible.

### Steps:

1. **Find your public IP:**
   - Visit: https://whatismyipaddress.com
   - Note your public IP address

2. **Configure router port forwarding:**
   - Log into router admin panel
   - Forward external port (e.g., 8765) to your computer's local IP:8765
   - Set protocol to TCP

3. **Start teaching session** on your computer

4. **Share connection:**
   - Give students: `http://[YOUR_PUBLIC_IP]:8765`
   - ⚠️ **Warning:** This exposes your server to the internet - use with caution!

### Security Considerations:
- Only use on trusted networks
- Consider enabling authentication (`classroomSync.server.requireAuth: true`)
- Use firewall rules to limit access

## Option 3: VPN (Most Secure)

Connect all devices to the same VPN network.

### Popular VPN Options:
- **Tailscale** (Free for personal use, easy setup)
- **WireGuard** (Open source, fast)
- **ZeroTier** (Free tier available)

Once connected to VPN, use the VPN IP address just like local network.

## Option 4: VSCode Live Share (Alternative)

VSCode has built-in **Live Share** extension for remote collaboration, but it's different from this extension:
- Live Share: Full collaboration (editing, debugging)
- Classroom Sync: One-way broadcast (teacher → students)

## Comparison

| Method | Ease | Security | Cost | Speed |
|--------|------|----------|------|-------|
| **Tunneling (ngrok)** | ⭐⭐⭐⭐⭐ | Medium | Free/Paid | Fast |
| **Port Forwarding** | ⭐⭐ | Low | Free | Fast |
| **VPN** | ⭐⭐⭐ | High | Free/Paid | Medium |
| **Same Network** | ⭐⭐⭐⭐⭐ | High | Free | Fastest |

## Recommended: ngrok Setup

### Quick Start with ngrok:

```bash
# 1. Install
brew install ngrok  # or download from ngrok.com

# 2. Authenticate (optional but recommended)
ngrok config add-authtoken YOUR_TOKEN

# 3. Start tunnel when teaching session is running
ngrok http 8765

# 4. Share the HTTPS URL with students
# Example: https://abc123.ngrok.io
```

### Benefits:
- ✅ Works immediately
- ✅ HTTPS/WSS automatically
- ✅ No router configuration
- ✅ Temporary URLs (more secure)
- ✅ Works from anywhere

### Students connect:
- Browser: `https://abc123.ngrok.io`
- WebSocket: `wss://abc123.ngrok.io`

## Implementation Note

The extension currently works with **any URL**, so:
- ✅ Local network URLs work automatically
- ✅ Tunneling service URLs work automatically
- ✅ VPN IPs work automatically
- ✅ Port-forwarded URLs work automatically

Just share the appropriate URL based on your setup!

## Security Best Practices for Remote Access

1. **Use HTTPS/WSS when possible** (tunneling services provide this)
2. **Enable authentication** in settings:
   ```json
   "classroomSync.server.requireAuth": true
   ```
3. **Use temporary URLs** (tunneling services)
4. **Limit file access** (check filter settings)
5. **Don't share URLs publicly** - only with trusted students
6. **Stop server when done** - don't leave it running

## Troubleshooting Remote Connections

### Problem: "Connection refused"
- Check if tunnel is running
- Verify port is correct
- Check if server is still running

### Problem: "Cannot connect"
- Verify URL is correct (include https:// or http://)
- Check if tunnel expired (some tunnels have time limits)
- Try refreshing tunnel and getting new URL

### Problem: "Slow connection"
- Tunneling adds latency (expected)
- Try different tunneling service
- Use VPN for better performance

## Quick Reference

**For same network:** Use network IP (automatic)  
**For different networks:** Use tunneling service (ngrok recommended)  
**For security:** Use VPN or enable authentication  
**For easiest setup:** Use ngrok with free account

